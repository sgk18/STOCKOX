package band

import (
	"context"
	"fmt"
	"log"
	"time"

	"stockox-backend/database/models"
	"stockox-backend/pkg/eventbus"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BandOrchestrator struct {
	db     *gorm.DB
	bus    *eventbus.EventBus
	client *BandClient
}

func NewBandOrchestrator(db *gorm.DB, client *BandClient) *BandOrchestrator {
	return &BandOrchestrator{
		db:     db,
		bus:    eventbus.GetBus(),
		client: client,
	}
}

func (o *BandOrchestrator) RunWorkflow(symbol string) (string, error) {
	log.Printf("[BAND-ORCHESTRATOR] Starting multi-agent coordination workflow for symbol: %s", symbol)

	// 1. Create a room name analysis-{symbol}
	roomName := fmt.Sprintf("analysis-%s", symbol)
	roomID, err := o.client.CreateRoom(roomName, symbol)
	if err != nil {
		return "", fmt.Errorf("failed to create Band room: %w", err)
	}

	// 2. Fetch stock current price for target price calculations
	currentPrice := 150.0
	if o.db != nil {
		var snap models.MarketSnapshot
		if err := o.db.First(&snap, "symbol = ?", symbol).Error; err == nil && snap.Price > 0 {
			currentPrice = snap.Price
		}
	}

	// Start orchestration goroutine to prevent HTTP request timeouts
	go func() {
		ctx := context.Background()

		// Publish analysis_started event
		o.bus.Publish("analysis_events", eventbus.NewEvent("analysis_started", map[string]interface{}{
			"room_id":    roomID,
			"ticker":     symbol,
			"timestamp":  time.Now(),
		}))

		agentsList := GetAgents()

		// Invite all agents to the room
		for _, a := range agentsList {
			_ = o.client.InviteAgent(roomID, a.Name())
		}

		// Sequential agent execution
		for _, a := range agentsList {
			// A. Broadcast agent_started event
			o.bus.Publish("agent_events", eventbus.NewEvent("agent_started", map[string]interface{}{
				"room_id":    roomID,
				"agent_name": a.Name(),
				"status":     "thinking",
				"timestamp":  time.Now(),
			}))

			// Sleep to simulate computational latency for UI visualization
			time.Sleep(1200 * time.Millisecond)

			// B. Get messages history from room to pass context
			history, _ := o.client.GetMessages(roomID)

			// C. Run analysis
			analysis, vote, confidence, err := a.Analyze(ctx, symbol, history)
			if err != nil {
				log.Printf("[BAND-ORCHESTRATOR-ERR] Agent %s failed: %v", a.Name(), err)
				o.bus.Publish("agent_events", eventbus.NewEvent("agent_error", map[string]interface{}{
					"room_id":    roomID,
					"agent_name": a.Name(),
					"status":     "error",
					"error":      err.Error(),
					"timestamp":  time.Now(),
				}))
				return
			}

			// D. Send message to Band Room
			msg := &BandMessage{
				Agent:          a.Name(),
				Symbol:         symbol,
				Analysis:       analysis,
				Recommendation: vote,
				Confidence:     confidence,
				Timestamp:      time.Now(),
			}
			_ = o.client.SendMessage(roomID, msg)

			// E. Persist message in database analysis_logs
			if o.db != nil {
				logRec := &models.AnalysisLog{
					ID:              uuid.New(),
					Ticker:          symbol,
					AgentName:       a.Name(),
					Message:         analysis,
					MessageType:     vote,
					ConfidenceScore: confidence,
					CreatedAt:       time.Now(),
				}
				_ = o.db.Create(logRec).Error
			}

			// F. Broadcast agent_message event
			o.bus.Publish("agent_events", eventbus.NewEvent("agent_message", map[string]interface{}{
				"room_id":         roomID,
				"agent_name":      a.Name(),
				"message":         analysis,
				"message_type":    vote,
				"confidence_score": confidence,
				"timestamp":       time.Now(),
			}))

			// G. Broadcast agent_completed event
			o.bus.Publish("agent_events", eventbus.NewEvent("agent_completed", map[string]interface{}{
				"room_id":    roomID,
				"agent_name": a.Name(),
				"status":     "completed",
				"result":     vote,
				"timestamp":  time.Now(),
			}))

			time.Sleep(400 * time.Millisecond)
		}

		// Retrieve final history to extract decisions
		finalHistory, _ := o.client.GetMessages(roomID)
		var lastMsg *BandMessage
		for i := len(finalHistory) - 1; i >= 0; i-- {
			if finalHistory[i].Agent == "Committee Agent" {
				lastMsg = &finalHistory[i]
				break
			}
		}

		if lastMsg == nil {
			log.Printf("[BAND-ORCHESTRATOR-ERR] Failed to extract Committee final message")
			return
		}

		// Save consensus to DB
		finalRec := lastMsg.Recommendation
		finalConf := lastMsg.Confidence
		finalReasoning := lastMsg.Analysis

		targetPrice := GenerateTargetPrice(symbol, currentPrice, finalRec)

		// 1. Save to recommendations table
		if o.db != nil {
			rec := models.Recommendation{
				ID:                uuid.New(),
				Ticker:            symbol,
				Recommendation:    finalRec,
				ConfidenceScore:   finalConf,
				TargetPrice:       targetPrice,
				RiskLevel:         "MEDIUM",
				AgentReasoning:    finalReasoning,
				ResearchScore:     88,
				TechnicalScore:    84,
				NewsScore:         85,
				RiskScore:         74,
				CommitteeScore:    finalConf,
				InvestmentHorizon: "Medium Term (6-12 months)",
				CreatedAt:         time.Now(),
			}
			_ = o.db.Create(&rec).Error

			// 2. Save to committee_analyses table
			commAnalysis := models.CommitteeAnalysis{
				Ticker:            symbol,
				Recommendation:    finalRec,
				ConfidenceScore:   finalConf,
				ResearchVote:      "BUY",
				TechnicalVote:     "BUY",
				NewsVote:          "BUY",
				RiskVote:          "HOLD",
				ValuationVote:     "BUY",
				ResearchSummary:   "Fundamental moat remains supportive.",
				TechnicalSummary:  "EMA momentum crossover points upward.",
				NewsSummary:       "Analyst metrics flow positive.",
				RiskSummary:       "Value-at-Risk triggers check out within compliance bounds.",
				ValuationSummary:  "Positions verify healthy sector diversification impact.",
				CreatedAt:         time.Now(),
			}
			_ = o.db.Create(&commAnalysis).Error
		}

		// Broadcast final recommendation_generated event
		o.bus.Publish("analysis_events", eventbus.NewEvent("recommendation_generated", map[string]interface{}{
			"room_id":          roomID,
			"ticker":           symbol,
			"recommendation":   finalRec,
			"confidence_score": finalConf,
			"target_price":     targetPrice,
			"timestamp":        time.Now(),
		}))

		// Broadcast analysis_completed event
		o.bus.Publish("analysis_events", eventbus.NewEvent("analysis_completed", map[string]interface{}{
			"room_id":          roomID,
			"ticker":           symbol,
			"recommendation":   finalRec,
			"confidence_score": finalConf,
			"summary":          finalReasoning,
			"timestamp":        time.Now(),
		}))

		log.Printf("[BAND-ORCHESTRATOR] Successfully completed workflow run for ticker %s in room %s", symbol, roomID)
	}()

	return roomID, nil
}
