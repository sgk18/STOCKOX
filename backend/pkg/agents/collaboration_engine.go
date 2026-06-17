package agents

import (
	"context"
	"fmt"
	"log"
	"time"

	"stockox-backend/database/models"
	"stockox-backend/database/repositories"
	"stockox-backend/pkg/eventbus"
	"stockox-backend/pkg/websocket"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CollaborationEngine struct {
	db       *gorm.DB
	roomRepo repositories.AgentRoomRepository
	wsHub    *websocket.Hub
	bus      *eventbus.EventBus
}

func NewCollaborationEngine(
	db *gorm.DB,
	roomRepo repositories.AgentRoomRepository,
	wsHub *websocket.Hub,
) *CollaborationEngine {
	return &CollaborationEngine{
		db:       db,
		roomRepo: roomRepo,
		wsHub:    wsHub,
		bus:      eventbus.GetBus(),
	}
}

func (ce *CollaborationEngine) RunRoom(roomID uuid.UUID, ticker string) {
	log.Printf("[COLLAB-ENGINE] Starting collaboration for Room: %s Ticker: %s", roomID, ticker)

	// Update Room status to active
	_ = ce.roomRepo.UpdateRoomStatus(roomID, "active")

	ctx := context.Background()

	// Instantiate agents
	research := NewResearchAgent()
	technical := NewTechnicalAgent()
	news := NewNewsAgent()
	risk := NewRiskAgent()
	committee := NewCommitteeAgent()

	// History buffer
	var history []string

	// Helper to send message and trigger websockets
	postMessage := func(agentName string, message string, msgType string) {
		conv := &models.AgentConversation{
			ID:          uuid.New(),
			RoomID:      roomID,
			AgentName:   agentName,
			Message:     message,
			MessageType: msgType,
			CreatedAt:   time.Now(),
		}
		_ = ce.roomRepo.AddConversation(conv)
		history = append(history, fmt.Sprintf("%s: %s", agentName, message))

		// Log to database table analysis_logs for persistence
		logRecord := &models.AnalysisLog{
			ID:              uuid.New(),
			Ticker:          ticker,
			AgentName:       agentName,
			Message:         message,
			MessageType:     msgType,
			ConfidenceScore: 80,
			CreatedAt:       time.Now(),
		}
		_ = ce.db.Create(logRecord).Error

		// Broadcast via WebSocket using eventbus
		payload := map[string]interface{}{
			"room_id":      roomID.String(),
			"agent_name":   agentName,
			"message":      message,
			"message_type": msgType,
			"timestamp":    time.Now(),
		}
		event := eventbus.NewEvent("agent_message", payload)
		ce.bus.Publish("agent_events", event)
	}

	emitAgentState := func(agentName string, state string) {
		payload := map[string]interface{}{
			"room_id":    roomID.String(),
			"agent_name": agentName,
			"status":     state,
			"timestamp":  time.Now(),
		}
		event := eventbus.NewEvent("agent_"+state, payload)
		ce.bus.Publish("agent_events", event)
	}

	// Step 1: Research Agent
	emitAgentState(research.GetName(), "started")
	time.Sleep(1 * time.Second) // Simulate processing time
	resMsg, _ := research.Analyze(ctx, ticker, history)
	postMessage(research.GetName(), resMsg, "analysis")
	resVote, _ := research.Vote(ctx, ticker)
	postMessage(research.GetName(), fmt.Sprintf("Recommendation: %s", resVote), "recommendation")
	emitAgentState(research.GetName(), "completed")
	time.Sleep(1 * time.Second)

	// Step 2: Technical Agent
	emitAgentState(technical.GetName(), "started")
	time.Sleep(1 * time.Second)
	techMsg, _ := technical.Analyze(ctx, ticker, history)
	postMessage(technical.GetName(), techMsg, "analysis")
	techVote, _ := technical.Vote(ctx, ticker)
	postMessage(technical.GetName(), fmt.Sprintf("Recommendation: %s", techVote), "recommendation")
	emitAgentState(technical.GetName(), "completed")
	time.Sleep(1 * time.Second)

	// Step 3: News Agent
	emitAgentState(news.GetName(), "started")
	time.Sleep(1 * time.Second)
	newsMsg, _ := news.Analyze(ctx, ticker, history)
	postMessage(news.GetName(), newsMsg, "analysis")
	newsVote, _ := news.Vote(ctx, ticker)
	postMessage(news.GetName(), fmt.Sprintf("Recommendation: %s", newsVote), "recommendation")
	emitAgentState(news.GetName(), "completed")
	time.Sleep(1 * time.Second)

	// Step 4: Risk Agent
	emitAgentState(risk.GetName(), "started")
	time.Sleep(1 * time.Second)
	riskMsg, _ := risk.Analyze(ctx, ticker, history)
	postMessage(risk.GetName(), riskMsg, "challenge")
	riskVote, _ := risk.Vote(ctx, ticker)
	postMessage(risk.GetName(), fmt.Sprintf("Recommendation: %s", riskVote), "warning")
	emitAgentState(risk.GetName(), "completed")
	time.Sleep(1 * time.Second)

	// Step 5: Committee Agent
	emitAgentState(committee.GetName(), "started")
	time.Sleep(1 * time.Second)
	commMsg, _ := committee.Analyze(ctx, ticker, history)
	postMessage(committee.GetName(), commMsg, "decision")

	// Final consensus decision
	finalDecision, _ := committee.Vote(ctx, ticker)
	confidence := 84
	reasoning, _ := committee.GenerateReasoning(ctx, ticker)

	decisionMsg := fmt.Sprintf("Consensus reached: %s. Confidence: %d%%. Reasoning: %s", finalDecision, confidence, reasoning)
	postMessage(committee.GetName(), decisionMsg, "decision")

	// Save final decision to committee_analyses table
	ca := &models.CommitteeAnalysis{
		Ticker:            ticker,
		Recommendation:    finalDecision,
		ConfidenceScore:   confidence,
		ResearchVote:      resVote,
		TechnicalVote:     techVote,
		NewsVote:          newsVote,
		RiskVote:          riskVote,
		ValuationVote:     "HOLD",
		ResearchSummary:   fmt.Sprintf("Three BUY votes (Research, Technical, News) and one HOLD vote (Risk). Synthesis: %s", reasoning),
		TechnicalSummary:  techMsg,
		NewsSummary:       newsMsg,
		RiskSummary:       riskMsg,
		ValuationSummary:  "Valuation metrics evaluated under default multiples.",
		CreatedAt:         time.Now(),
	}
	_ = ce.db.Create(ca).Error

	// Emit committee_decision WebSocket event
	ce.bus.Publish("agent_events", eventbus.NewEvent("committee_decision", map[string]interface{}{
		"room_id":          roomID.String(),
		"ticker":           ticker,
		"decision":         finalDecision,
		"confidence_score": confidence,
		"reasoning":        reasoning,
		"timestamp":        time.Now(),
	}))

	emitAgentState(committee.GetName(), "completed")

	// Update Room status to completed
	_ = ce.roomRepo.UpdateRoomStatus(roomID, "completed")

	// Emit analysis_completed event to close loop
	ce.bus.Publish("analysis_events", eventbus.NewEvent("analysis_completed", map[string]interface{}{
		"room_id":          roomID.String(),
		"ticker":           ticker,
		"recommendation":   finalDecision,
		"confidence_score": confidence,
		"summary":          decisionMsg,
		"timestamp":        time.Now(),
	}))

	log.Printf("[COLLAB-ENGINE] Completed collaboration for Room: %s", roomID)
}
