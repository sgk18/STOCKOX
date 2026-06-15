package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"stockox-backend/pkg/eventbus"
	"stockox-backend/pkg/middleware"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  2048,
	WriteBufferSize: 2048,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for dev/hackathon purposes
	},
}

// Client represents a connected websocket client
type Client struct {
	hub       *Hub
	conn      *websocket.Conn
	send      chan []byte
	userID    string
	userEmail string
}

// Hub maintains active clients and broadcasts messages
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
	bus        *eventbus.EventBus
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		bus:        eventbus.GetBus(),
	}
}

// SubscribeToEventBus hooks the WebSocket Hub to the internal EventBus channels
func (h *Hub) SubscribeToEventBus() {
	channels := []string{"analysis_events", "agent_events", "market_events", "portfolio_events"}
	for _, chName := range channels {
		go func(cName string) {
			eventChan := h.bus.Subscribe(cName)
			for ev := range eventChan {
				h.BroadcastEvent(ev)
			}
		}(chName)
	}
}

func (h *Hub) Run() {
	log.Println("[WS-HUB] Starting WebSocket hub manager")
	
	// Hook to external EventBus
	h.SubscribeToEventBus()

	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			clientCount := len(h.clients)
			h.mu.Unlock()
			log.Printf("[WS-HUB] Client connected (User: %s). Total active: %d", client.userID, clientCount)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				clientCount := len(h.clients)
				log.Printf("[WS-HUB] Client disconnected. Total active: %d", clientCount)
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					h.mu.RUnlock()
					h.mu.Lock()
					if _, ok := h.clients[client]; ok {
						delete(h.clients, client)
						close(client.send)
					}
					h.mu.Unlock()
					h.mu.RLock()
				}
			}
			h.mu.RUnlock()
		}
	}
}

// BroadcastEvent formats and broadcasts a BaseEvent to all active client connections
func (h *Hub) BroadcastEvent(event eventbus.BaseEvent) {
	bytes, err := json.Marshal(event)
	if err != nil {
		log.Printf("[WS-HUB] Error marshaling broadcast event: %v", err)
		return
	}

	select {
	case h.broadcast <- bytes:
	default:
		// Queue full, drop or process non-blocking
	}
}

// ServeWS upgrades HTTP to WebSocket and registers the client connection
func ServeWS(hub *Hub, c *gin.Context) {
	// 1. Authenticate WebSocket Connection
	tokenStr := c.Query("token")
	if tokenStr == "" {
		// Try reading from Authorization Header
		authHeader := c.GetHeader("Authorization")
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			tokenStr = authHeader[7:]
		}
	}

	appEnv := os.Getenv("APP_ENV")
	if appEnv == "" {
		appEnv = "development"
	}

	var userID string
	var email string
	var err error

	if tokenStr != "" {
		userID, email, err = middleware.VerifyJWTToken(tokenStr)
		if err != nil {
			log.Printf("[WS-AUTH-ERR] Token verification failed: %v", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: " + err.Error()})
			return
		}
	} else {
		// No token provided
		if appEnv == "development" {
			userID = "user_000000000000000000000000001"
			email = "suryachalam.vm@bsccmh.christuniversity.in"
			log.Println("[WS-AUTH-WARN] No token provided, falling back to default user in development mode")
		} else {
			log.Println("[WS-AUTH-ERR] Token is required for production WebSocket connections")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Token is required"})
			return
		}
	}

	// 2. Upgrade connection
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[WS-ERR] Failed to upgrade HTTP connection: %v", err)
		return
	}

	client := &Client{
		hub:       hub,
		conn:      conn,
		send:      make(chan []byte, 512),
		userID:    userID,
		userEmail: email,
	}
	client.hub.register <- client

	// Start read/write pumps
	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(1024)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WS-ERR] Unexpected close error: %v", err)
			}
			break
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(45 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued events to the current packet
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// StartSimulator triggers a goroutine generating realistic real-time events.
// Updated to publish directly to the EventBus, enabling seamless Redis distribution.
func (h *Hub) StartSimulator() {
	go func() {
		tickers := []string{"NVDA", "AAPL", "MSFT", "TSLA", "AMD", "AMZN"}
		prices := map[string]float64{
			"NVDA": 128.50,
			"AAPL": 178.20,
			"MSFT": 415.10,
			"TSLA": 175.40,
			"AMD":  162.30,
			"AMZN": 180.15,
		}

		log.Println("[WS-SIMULATOR] Starting live simulation loop publishing to EventBus")
		for {
			time.Sleep(time.Duration(4+randInt(6)) * time.Second)

			// Ensure we have active connections somewhere before generating logs
			h.mu.RLock()
			clientCount := len(h.clients)
			h.mu.RUnlock()
			if clientCount == 0 {
				continue
			}

			symbol := tickers[randInt(len(tickers))]
			basePrice := prices[symbol]
			pct := (randFloat() - 0.48) * 0.01 // Small wiggle
			change := basePrice * pct
			newPrice := basePrice + change
			prices[symbol] = newPrice

			eventPayload := map[string]interface{}{
				"symbol":         symbol,
				"price":          newPrice,
				"change":         change,
				"change_percent": pct * 100,
				"timestamp":      time.Now(),
			}

			event := eventbus.NewEvent("market_data_updated", eventPayload)
			h.bus.Publish("market_events", event)
		}
	}()
}

// Helper mathematical functions
func randInt(n int) int {
	return int(time.Now().UnixNano() % int64(n))
}

func randFloat() float64 {
	return float64(time.Now().UnixNano()%1000) / 1000.0
}
