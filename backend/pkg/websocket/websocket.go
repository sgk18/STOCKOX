package websocket

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for dev/hackathon purposes
	},
}

// Event types
const (
	TypeAgentStarted      = "agent_started"
	TypeAgentCompleted    = "agent_completed"
	TypeAgentMessage      = "agent_message"
	TypeAnalysisCompleted = "analysis_completed"
	TypeMarketUpdate      = "market_update"
)

// WSEvent is the envelope for websocket messages
type WSEvent struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// Event payloads
type AgentStartedEvent struct {
	AgentID   string    `json:"agent_id"`
	AgentName string    `json:"agent_name"`
	Task      string    `json:"task"`
	Timestamp time.Time `json:"timestamp"`
}

type AgentCompletedEvent struct {
	AgentID   string    `json:"agent_id"`
	AgentName string    `json:"agent_name"`
	Status    string    `json:"status"` // success, error
	Result    string    `json:"result"`
	Timestamp time.Time `json:"timestamp"`
}

type AgentMessageEvent struct {
	AgentID   string    `json:"agent_id"`
	AgentName string    `json:"agent_name"`
	Message   string    `json:"message"`
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
}

type AnalysisCompletedEvent struct {
	Ticker          string    `json:"ticker"`
	Recommendation  string    `json:"recommendation"`
	ConfidenceScore int       `json:"confidence_score"`
	RiskLevel       string    `json:"risk_level"`
	Timestamp       time.Time `json:"timestamp"`
}

type MarketUpdateEvent struct {
	Symbol        string    `json:"symbol"`
	Price         float64   `json:"price"`
	Change        float64   `json:"change"`
	ChangePercent float64   `json:"change_percent"`
	Timestamp     time.Time `json:"timestamp"`
}

// Client represents a connected websocket client
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

// Hub maintains active clients and broadcasts messages
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.Mutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	log.Println("[WS-HUB] Starting WebSocket hub manager")
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Println("[WS-HUB] New client connection registered")

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				log.Println("[WS-HUB] Client connection unregistered")
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.Lock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

// Broadcast sends an event to all connected clients
func (h *Hub) Broadcast(eventType string, payload interface{}) {
	event := WSEvent{
		Type:    eventType,
		Payload: payload,
	}

	bytes, err := json.Marshal(event)
	if err != nil {
		log.Printf("[WS-HUB] Error marshaling event: %v", err)
		return
	}

	h.broadcast <- bytes
}

// StartSimulator triggers a goroutine generating realistic real-time events.
// This ensures that during presentation/hackathon testing, the dashboard UI elements
// automatically update with live tickers and logs, providing a "living system" look.
func (h *Hub) StartSimulator() {
	go func() {
		tickers := []string{"NVDA", "AAPL", "MSFT", "TSLA", "AMD", "AMZN"}
		agents := []struct {
			id   string
			name string
		}{
			{"research", "Research Agent"},
			{"technical", "Technical Agent"},
			{"sentiment", "Sentiment Agent"},
			{"risk", "Risk Agent"},
			{"committee", "Committee Agent"},
		}

		prices := map[string]float64{
			"NVDA": 128.50,
			"AAPL": 178.20,
			"MSFT": 415.10,
			"TSLA": 175.40,
			"AMD":  162.30,
			"AMZN": 180.15,
		}

		log.Println("[WS-SIMULATOR] Starting live simulation loop")
		for {
			time.Sleep(time.Duration(5+rand.Intn(7)) * time.Second)

			// Ensure we have active connections before broadcasting to save compute/logs
			h.mu.Lock()
			clientCount := len(h.clients)
			h.mu.Unlock()
			if clientCount == 0 {
				continue
			}

			// Random event type selector
			eventChoice := rand.Intn(5)
			switch eventChoice {
			case 0: // Market Price Tick Update
				symbol := tickers[rand.Intn(len(tickers))]
				basePrice := prices[symbol]
				pct := (rand.Float64() - 0.48) * 0.01 // Small wiggle
				change := basePrice * pct
				newPrice := basePrice + change
				prices[symbol] = newPrice

				h.Broadcast(TypeMarketUpdate, MarketUpdateEvent{
					Symbol:        symbol,
					Price:         newPrice,
					Change:        change,
					ChangePercent: pct * 100,
					Timestamp:     time.Now(),
				})

			case 1: // Agent Started Task
				agent := agents[rand.Intn(len(agents))]
				ticker := tickers[rand.Intn(len(tickers))]
				h.Broadcast(TypeAgentStarted, AgentStartedEvent{
					AgentID:   agent.id,
					AgentName: agent.name,
					Task:      "Audit correlation metrics and resistance zones for ticker: " + ticker,
					Timestamp: time.Now(),
				})

			case 2: // Agent Intermediate Message
				agent := agents[rand.Intn(len(agents))]
				messages := []string{
					"Analyzing balance sheet metrics...",
					"Parsing recent earnings call transcripts...",
					"Running MACD and Relative Strength Index indicators...",
					"Recalculating Sharpe Ratio and beta index models...",
					"Filtering Twitter and Reddit keyword frequencies...",
				}
				h.Broadcast(TypeAgentMessage, AgentMessageEvent{
					AgentID:   agent.id,
					AgentName: agent.name,
					Message:   messages[rand.Intn(len(messages))],
					Status:    "RUNNING",
					Timestamp: time.Now(),
				})

			case 3: // Agent Completed Task
				agent := agents[rand.Intn(len(agents))]
				results := []string{
					"Audit complete. Signal is neutral, standard deviation within norms.",
					"Audit complete. Discovered bullish breakout divergence pattern.",
					"Audit complete. Social sentiment remains highly supportive (+0.64 score).",
					"Audit complete. Asset risk exposure metrics successfully cataloged.",
				}
				h.Broadcast(TypeAgentCompleted, AgentCompletedEvent{
					AgentID:   agent.id,
					AgentName: agent.name,
					Status:    "SUCCESS",
					Result:    results[rand.Intn(len(results))],
					Timestamp: time.Now(),
				})

			case 4: // Consensus Completed Analysis
				ticker := tickers[rand.Intn(len(tickers))]
				recs := []string{"STRONG BUY", "BUY", "HOLD", "UNDERPERFORM"}
				risks := []string{"Low", "Medium", "High"}
				h.Broadcast(TypeAnalysisCompleted, AnalysisCompletedEvent{
					Ticker:          ticker,
					Recommendation:  recs[rand.Intn(len(recs))],
					ConfidenceScore: 65 + rand.Intn(30),
					RiskLevel:       risks[rand.Intn(len(risks))],
					Timestamp:       time.Now(),
				})
			}
		}
	}()
}

// ServeWS upgrades HTTP to WebSocket and registers the client connection
func ServeWS(hub *Hub, c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[WS-ERR] Failed to upgrade HTTP connection: %v", err)
		return
	}

	client := &Client{
		hub:  hub,
		conn: conn,
		send: make(chan []byte, 256),
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

	c.conn.SetReadLimit(512)
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
	ticker := time.NewTicker(54 * time.Second)
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

			// Add queued chat messages to the current websocket message.
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
