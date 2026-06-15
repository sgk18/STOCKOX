package eventbus

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// BaseEvent is the envelope for all distributed event streams in Stockox
type BaseEvent struct {
	ID        string      `json:"id"`
	Type      string      `json:"type"`
	Timestamp time.Time   `json:"timestamp"`
	Payload   interface{} `json:"payload"`
}

// EventBus coordinates publishing, subscribing, broadcasting, and fan-out of events.
type EventBus struct {
	mu          sync.RWMutex
	subscribers map[string][]chan BaseEvent
	rdb         *redis.Client
	ctx         context.Context
	cancel      context.CancelFunc
}

var (
	globalBus *EventBus
	busOnce   sync.Once
)

// GetBus retrieves the global EventBus instance
func GetBus() *EventBus {
	busOnce.Do(func() {
		ctx, cancel := context.WithCancel(context.Background())
		globalBus = &EventBus{
			subscribers: make(map[string][]chan BaseEvent),
			ctx:         ctx,
			cancel:      cancel,
		}
	})
	return globalBus
}

// Init initializes the EventBus with a Redis client for distributed Pub/Sub
func (eb *EventBus) Init(rdb *redis.Client) {
	eb.mu.Lock()
	eb.rdb = rdb
	eb.mu.Unlock()

	if rdb != nil {
		log.Println("[EventBus] Initialized with Redis Pub/Sub backend support")
	} else {
		log.Println("[EventBus] Initialized in local-only memory fallback mode (Redis disabled)")
	}
}

// NewEvent helper creates a BaseEvent with auto UUID and timestamp
func NewEvent(eventType string, payload interface{}) BaseEvent {
	return BaseEvent{
		ID:        uuid.New().String(),
		Type:      eventType,
		Timestamp: time.Now(),
		Payload:   payload,
	}
}

// Publish sends an event onto a channel (Redis pub/sub or local fallback)
func (eb *EventBus) Publish(channel string, event BaseEvent) {
	eb.mu.RLock()
	rdb := eb.rdb
	eb.mu.RUnlock()

	// 1. If Redis is available, publish to Redis Pub/Sub
	if rdb != nil {
		bytes, err := json.Marshal(event)
		if err != nil {
			log.Printf("[EventBus-ERR] Failed to serialize event for Redis: %v", err)
			return
		}

		err = rdb.Publish(eb.ctx, channel, string(bytes)).Err()
		if err != nil {
			log.Printf("[EventBus-ERR] Redis Publish failed on channel %s: %v", channel, err)
			// Fallback to local dispatch directly
			eb.localDispatch(channel, event)
		}
		return
	}

	// 2. Local fallback dispatch
	eb.localDispatch(channel, event)
}

// Subscribe registers a subscriber channel to a specific event topic
func (eb *EventBus) Subscribe(channelName string) chan BaseEvent {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	ch := make(chan BaseEvent, 128)
	eb.subscribers[channelName] = append(eb.subscribers[channelName], ch)

	// If using Redis, start a background subscriber goroutine if it's the first subscriber
	if eb.rdb != nil && len(eb.subscribers[channelName]) == 1 {
		go eb.redisListenLoop(channelName)
	}

	return ch
}

// Unsubscribe removes a channel from the subscription list
func (eb *EventBus) Unsubscribe(channelName string, ch chan BaseEvent) {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	subs, ok := eb.subscribers[channelName]
	if !ok {
		return
	}

	for i, sub := range subs {
		if sub == ch {
			// Close the channel and remove from slice
			close(ch)
			eb.subscribers[channelName] = append(subs[:i], subs[i+1:]...)
			break
		}
	}
}

func (eb *EventBus) localDispatch(channel string, event BaseEvent) {
	eb.mu.RLock()
	subs, ok := eb.subscribers[channel]
	eb.mu.RUnlock()

	if !ok {
		return
	}

	for _, sub := range subs {
		select {
		case sub <- event:
		default:
			// Buffer full, skip to avoid blocking execution
		}
	}
}

func (eb *EventBus) redisListenLoop(channelName string) {
	eb.mu.RLock()
	rdb := eb.rdb
	eb.mu.RUnlock()

	if rdb == nil {
		return
	}

	pubsub := rdb.Subscribe(eb.ctx, channelName)
	defer pubsub.Close()

	log.Printf("[EventBus] Started listening to Redis channel: %s", channelName)

	ch := pubsub.Channel()
	for {
		select {
		case <-eb.ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}

			var event BaseEvent
			if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
				log.Printf("[EventBus-ERR] Failed to deserialize message from Redis: %v", err)
				continue
			}

			// Deliver locally
			eb.localDispatch(channelName, event)
		}
	}
}

// Close cancels the context and unsubscribes all active listeners
func (eb *EventBus) Close() {
	eb.cancel()
	eb.mu.Lock()
	defer eb.mu.Unlock()

	for channelName, subs := range eb.subscribers {
		for _, ch := range subs {
			close(ch)
		}
		delete(eb.subscribers, channelName)
	}
}
