package band

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"stockox-backend/database/models"
	"stockox-backend/pkg/cache"
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

func (o *BandOrchestrator) RunWorkflow(sessionID uuid.UUID, userID string, symbol string) (string, error) {
	log.Printf("[BAND-ORCHESTRATOR] Starting multi-agent debate coordination workflow for symbol: %s (session: %s, user: %s)", symbol, sessionID, userID)

	// Fetch stock details from internal StockCatalog
	stockCtx, exists := StockCatalog[symbol]
	if !exists {
		// Fallback default
		stockCtx = StockContext{
			Ticker:         symbol,
			CompanyName:    symbol + " Corp",
			CurrentPrice:   150.0,
			FiftyTwoWHigh:  200.0,
			FiftyTwoWLow:   100.0,
			PERatio:        25.0,
			DebtRatio:      0.25,
			AIScore:        75,
			Recommendation: "HOLD",
		}
	}

	// 1. Create a room name analysis-{symbol}
	roomName := fmt.Sprintf("analysis-%s", symbol)
	roomID, err := o.client.CreateRoom(roomName, symbol)
	if err != nil {
		if o.db != nil {
			o.db.Model(&models.AnalysisSession{}).Where("id = ?", sessionID).Updates(map[string]interface{}{
				"status":       "failed",
				"agent_status": "failed",
				"summary":      "Failed to create Band room: " + err.Error(),
				"updated_at":   time.Now(),
			})
		}
		return "", fmt.Errorf("failed to create Band room: %w", err)
	}

	// Start orchestration goroutine to prevent HTTP request timeouts
	go func() {
		ctx := context.Background()

		// Update GORM status to running
		if o.db != nil {
			o.db.Model(&models.AnalysisSession{}).Where("id = ?", sessionID).Updates(map[string]interface{}{
				"status":       "running",
				"agent_status": "thinking",
				"room_id":      roomID,
				"debate_round": 1,
				"updated_at":   time.Now(),
			})
		}

		// Publish analysis_started event
		o.bus.Publish("analysis_events", eventbus.NewEvent("analysis_started", map[string]interface{}{
			"session_id": sessionID.String(),
			"room_id":    roomID,
			"ticker":     symbol,
			"timestamp":  time.Now(),
		}))

		agentsList := GetAgents()

		// Invite all agents to the room
		for _, a := range agentsList {
			_ = o.client.InviteAgent(roomID, a.Name())
		}

		// ROUND 1: Independent Analysis
		log.Printf("[BAND-ORCHESTRATOR] Room %s: Executing Round 1 (Independent Analysis)", roomID)
		if o.db != nil {
			o.db.Model(&models.AnalysisSession{}).Where("id = ?", sessionID).Updates(map[string]interface{}{
				"debate_round": 1,
				"updated_at":   time.Now(),
			})
		}

		for idx, a := range agentsList {
			if a.Name() == "Committee Agent" {
				continue // Committee only runs in Round 3
			}

			// Broadcast agent_started event
			o.bus.Publish("agent_events", eventbus.NewEvent("agent_started", map[string]interface{}{
				"session_id": sessionID.String(),
				"room_id":    roomID,
				"ticker":     symbol,
				"agent_name": a.Name(),
				"status":     "thinking",
				"round":      1,
				"timestamp":  time.Now(),
			}))

			if o.db != nil {
				o.db.Model(&models.AnalysisSession{}).Where("id = ?", sessionID).Updates(map[string]interface{}{
					"current_agent":    a.Name(),
					"agent_status":     "thinking",
					"progress_percent": 5 + idx*8, // R1 goes from 5% to ~37%
					"updated_at":       time.Now(),
				})
			}

			// Computational latency simulation
			time.Sleep(1000 * time.Millisecond)

			// Execute analysis
			output, err := a.Analyze(ctx, symbol, stockCtx, nil)
			if err != nil {
				o.handleAgentError(sessionID, roomID, a.Name(), err)
				return
			}

			// Send to Band Room
			msg := &BandMessage{
				Agent:          a.Name(),
				Symbol:         symbol,
				Analysis:       output.Reasoning,
				Recommendation: output.Signal,
				Confidence:     output.Confidence,
				Timestamp:      time.Now(),
				Round:          1,
				Signal:         output.Signal,
				Evidence:       output.Evidence,
			}
			_ = o.client.SendMessage(roomID, msg)

			// Persist in DB
			if o.db != nil {
				sid := sessionID
				logRec := &models.AnalysisLog{
					ID:              uuid.New(),
					SessionID:       &sid,
					Ticker:          symbol,
					AgentName:       a.Name(),
					Message:         output.Reasoning,
					MessageType:     output.Signal,
					ConfidenceScore: output.Confidence,
					Round:           1,
					Signal:          output.Signal,
					Evidence:        strings.Join(output.Evidence, ", "),
					CreatedAt:       time.Now(),
				}
				_ = o.db.Create(logRec).Error
			}

			// Publish events
			o.bus.Publish("agent_events", eventbus.NewEvent("agent_message", map[string]interface{}{
				"session_id":       sessionID.String(),
				"room_id":          roomID,
				"ticker":           symbol,
				"agent_name":       a.Name(),
				"message":          output.Reasoning,
				"message_type":     output.Signal,
				"confidence_score": output.Confidence,
				"round":            1,
				"timestamp":        time.Now(),
			}))

			o.bus.Publish("agent_events", eventbus.NewEvent("agent_completed", map[string]interface{}{
				"session_id": sessionID.String(),
				"room_id":    roomID,
				"ticker":     symbol,
				"agent_name": a.Name(),
				"status":     "completed",
				"result":     output.Signal,
				"round":      1,
				"timestamp":  time.Now(),
			}))

			if o.db != nil {
				o.db.Model(&models.AnalysisSession{}).Where("id = ?", sessionID).Updates(map[string]interface{}{
					"agent_status": "completed",
					"updated_at":   time.Now(),
				})
			}
			time.Sleep(300 * time.Millisecond)
		}

		// ROUND 2: Cross-Agent Review
		log.Printf("[BAND-ORCHESTRATOR] Room %s: Executing Round 2 (Cross-Agent Review)", roomID)
		if o.db != nil {
			o.db.Model(&models.AnalysisSession{}).Where("id = ?", sessionID).Updates(map[string]interface{}{
				"debate_round": 2,
				"updated_at":   time.Now(),
			})
		}

		for idx, a := range agentsList {
			if a.Name() == "Committee Agent" {
				continue
			}

			o.bus.Publish("agent_events", eventbus.NewEvent("agent_started", map[string]interface{}{
				"session_id": sessionID.String(),
				"room_id":    roomID,
				"ticker":     symbol,
				"agent_name": a.Name(),
				"status":     "revising",
				"round":      2,
				"timestamp":  time.Now(),
			}))

			if o.db != nil {
				o.db.Model(&models.AnalysisSession{}).Where("id = ?", sessionID).Updates(map[string]interface{}{
					"current_agent":    a.Name(),
					"agent_status":     "revising",
					"progress_percent": 45 + idx*10, // R2 goes from 45% to ~85%
					"updated_at":       time.Now(),
				})
			}

			time.Sleep(1000 * time.Millisecond)

			// Get all history (Round 1 messages)
			history, _ := o.client.GetMessages(roomID)

			output, err := a.Analyze(ctx, symbol, stockCtx, history)
			if err != nil {
				o.handleAgentError(sessionID, roomID, a.Name(), err)
				return
			}

			// Send to Band Room
			msg := &BandMessage{
				Agent:          a.Name(),
				Symbol:         symbol,
				Analysis:       output.Reasoning,
				Recommendation: output.Signal,
				Confidence:     output.Confidence,
				Timestamp:      time.Now(),
				Round:          2,
				Signal:         output.Signal,
				Evidence:       output.Evidence,
			}
			_ = o.client.SendMessage(roomID, msg)

			// Persist in DB
			if o.db != nil {
				sid := sessionID
				logRec := &models.AnalysisLog{
					ID:              uuid.New(),
					SessionID:       &sid,
					Ticker:          symbol,
					AgentName:       a.Name(),
					Message:         output.Reasoning,
					MessageType:     output.Signal,
					ConfidenceScore: output.Confidence,
					Round:           2,
					Signal:          output.Signal,
					Evidence:        strings.Join(output.Evidence, ", "),
					CreatedAt:       time.Now(),
				}
				_ = o.db.Create(logRec).Error
			}

			// Publish events
			o.bus.Publish("agent_events", eventbus.NewEvent("agent_message", map[string]interface{}{
				"session_id":       sessionID.String(),
				"room_id":          roomID,
				"ticker":           symbol,
				"agent_name":       a.Name(),
				"message":          output.Reasoning,
				"message_type":     output.Signal,
				"confidence_score": output.Confidence,
				"round":            2,
				"timestamp":        time.Now(),
			}))

			o.bus.Publish("agent_events", eventbus.NewEvent("agent_completed", map[string]interface{}{
				"session_id": sessionID.String(),
				"room_id":    roomID,
				"ticker":     symbol,
				"agent_name": a.Name(),
				"status":     "completed",
				"result":     output.Signal,
				"round":      2,
				"timestamp":  time.Now(),
			}))

			if o.db != nil {
				o.db.Model(&models.AnalysisSession{}).Where("id = ?", sessionID).Updates(map[string]interface{}{
					"agent_status": "completed",
					"updated_at":   time.Now(),
				})
			}
			time.Sleep(300 * time.Millisecond)
		}

		// ROUND 3: Committee Resolution
		log.Printf("[BAND-ORCHESTRATOR] Room %s: Executing Round 3 (Committee Resolution)", roomID)
		if o.db != nil {
			o.db.Model(&models.AnalysisSession{}).Where("id = ?", sessionID).Updates(map[string]interface{}{
				"debate_round": 3,
				"updated_at":   time.Now(),
			})
		}

		commAgent := &CommitteeAgent{}

		o.bus.Publish("agent_events", eventbus.NewEvent("agent_started", map[string]interface{}{
			"session_id": sessionID.String(),
			"room_id":    roomID,
			"ticker":     symbol,
			"agent_name": commAgent.Name(),
			"status":     "aggregating",
			"round":      3,
			"timestamp":  time.Now(),
		}))

		if o.db != nil {
			o.db.Model(&models.AnalysisSession{}).Where("id = ?", sessionID).Updates(map[string]interface{}{
				"current_agent":    commAgent.Name(),
				"agent_status":     "aggregating",
				"progress_percent": 90,
				"updated_at":       time.Now(),
			})
		}

		time.Sleep(1200 * time.Millisecond)

		// Get full messages history (R1 + R2)
		fullHistory, _ := o.client.GetMessages(roomID)

		output, err := commAgent.Analyze(ctx, symbol, stockCtx, fullHistory)
		if err != nil {
			o.handleAgentError(sessionID, roomID, commAgent.Name(), err)
			return
		}

		// Send final Committee message to Band Room
		msg := &BandMessage{
			Agent:          commAgent.Name(),
			Symbol:         symbol,
			Analysis:       output.Reasoning,
			Recommendation: output.Signal,
			Confidence:     output.Confidence,
			Timestamp:      time.Now(),
			Round:          3,
			Signal:         output.Signal,
			Evidence:       output.Evidence,
		}
		_ = o.client.SendMessage(roomID, msg)

		// Save final Committee analysis log
		if o.db != nil {
			sid := sessionID
			logRec := &models.AnalysisLog{
				ID:              uuid.New(),
				SessionID:       &sid,
				Ticker:          symbol,
				AgentName:       commAgent.Name(),
				Message:         output.Reasoning,
				MessageType:     output.Signal,
				ConfidenceScore: output.Confidence,
				Round:           3,
				Signal:          output.Signal,
				Evidence:        strings.Join(output.Evidence, ", "),
				CreatedAt:       time.Now(),
			}
			_ = o.db.Create(logRec).Error
		}

		// Calculate VoteResult breakdown from messages
		var votesBreakdown []AgentVote
		r1History, _ := o.client.GetMessages(roomID)
		weights := map[string]float64{
			"Research Agent":  0.25,
			"Technical Agent": 0.20,
			"News Agent":      0.20,
			"Risk Agent":      0.15,
		}

		var researchVote, techVote, newsVote, riskVote string
		var researchSum, techSum, newsSum, riskSum string

		for _, m := range r1History {
			if m.Round == 2 {
				w, ok := weights[m.Agent]
				if ok {
					votesBreakdown = append(votesBreakdown, AgentVote{
						Agent:      m.Agent,
						Signal:     m.Signal,
						Confidence: m.Confidence,
						Weight:     w,
					})
				}
				switch m.Agent {
				case "Research Agent":
					researchVote = m.Signal
					researchSum = m.Analysis
				case "Technical Agent":
					techVote = m.Signal
					techSum = m.Analysis
				case "News Agent":
					newsVote = m.Signal
					newsSum = m.Analysis
				case "Risk Agent":
					riskVote = m.Signal
					riskSum = m.Analysis
				}
			}
		}

		// Include Committee vote
		votesBreakdown = append(votesBreakdown, AgentVote{
			Agent:      "Committee Agent",
			Signal:     output.Signal,
			Confidence: 85,
			Weight:     0.20,
		})

		voteResult := ComputeWeightedVote(votesBreakdown)

		// Generate the data-driven Final Report
		finalReport := GenerateFinalReport(symbol, stockCtx, r1History, voteResult)

		// Persist everything in DB
		if o.db != nil {
			// 1. Save Recommendation record
			rec := models.Recommendation{
				ID:                uuid.New(),
				Ticker:            symbol,
				Recommendation:    voteResult.Recommendation,
				ConfidenceScore:   voteResult.ConfidenceScore,
				TargetPrice:       finalReport.TargetPrice,
				RiskLevel:         stockCtx.Recommendation, // maps to "BUY", "HOLD", or "MEDIUM" defaults
				AgentReasoning:    finalReport.ExecutiveSummary,
				ResearchScore:     int(float64(voteResult.ConfidenceScore) * 0.9),
				TechnicalScore:    int(float64(voteResult.ConfidenceScore) * 0.8),
				NewsScore:         int(float64(voteResult.ConfidenceScore) * 0.85),
				RiskScore:         int(float64(voteResult.ConfidenceScore) * 0.75),
				CommitteeScore:    voteResult.ConfidenceScore,
				InvestmentHorizon: finalReport.InvestmentHorizon,
				CreatedAt:         time.Now(),
			}
			_ = o.db.Create(&rec).Error

			// 2. Save CommitteeAnalysis record
			sid := sessionID
			commAnalysis := models.CommitteeAnalysis{
				SessionID:         &sid,
				Ticker:            symbol,
				Recommendation:    voteResult.Recommendation,
				ConfidenceScore:   voteResult.ConfidenceScore,
				ResearchVote:      researchVote,
				TechnicalVote:     techVote,
				NewsVote:          newsVote,
				RiskVote:          riskVote,
				ValuationVote:     output.Signal, // Committee agent's signal
				ResearchSummary:   researchSum,
				TechnicalSummary:  techSum,
				NewsSummary:       newsSum,
				RiskSummary:       riskSum,
				ValuationSummary:  output.Reasoning,
				RoomID:            roomID,
				TargetPrice:       finalReport.TargetPrice,
				ExecutiveSummary:  finalReport.ExecutiveSummary,
				BullCase:          finalReport.BullCase,
				BearCase:          finalReport.BearCase,
				InvestmentHorizon: finalReport.InvestmentHorizon,
				CreatedAt:         time.Now(),
			}
			_ = o.db.Create(&commAnalysis).Error

			// 3. Update AnalysisSession record to completed
			o.db.Model(&models.AnalysisSession{}).Where("id = ?", sessionID).Updates(map[string]interface{}{
				"status":           "completed",
				"progress_percent": 100,
				"current_agent":    "Committee Agent",
				"agent_status":     "completed",
				"recommendation":   voteResult.Recommendation,
				"confidence_score": voteResult.ConfidenceScore,
				"summary":          finalReport.ExecutiveSummary,
				"target_price":     finalReport.TargetPrice,
				"bull_case":        finalReport.BullCase,
				"bear_case":        finalReport.BearCase,
				"executive_summary": finalReport.ExecutiveSummary,
				"updated_at":       time.Now(),
			})

			// Invalidate/Refresh cache
			_ = cache.Shared.Delete(ctx, fmt.Sprintf("committee:%s", symbol))
			_ = cache.Shared.Delete(ctx, cache.KeyAnalysis(symbol))
			_ = cache.Shared.Delete(ctx, cache.KeyDashboard(userID))
		}

		// Broadcast agent message + completion for Committee
		o.bus.Publish("agent_events", eventbus.NewEvent("agent_message", map[string]interface{}{
			"session_id":       sessionID.String(),
			"room_id":          roomID,
			"ticker":           symbol,
			"agent_name":       commAgent.Name(),
			"message":          output.Reasoning,
			"message_type":     output.Signal,
			"confidence_score": output.Confidence,
			"round":            3,
			"timestamp":        time.Now(),
		}))

		o.bus.Publish("agent_events", eventbus.NewEvent("agent_completed", map[string]interface{}{
			"session_id": sessionID.String(),
			"room_id":    roomID,
			"ticker":     symbol,
			"agent_name": commAgent.Name(),
			"status":     "completed",
			"result":     output.Signal,
			"round":      3,
			"timestamp":  time.Now(),
		}))

		// Broadcast final recommendation_generated event
		o.bus.Publish("analysis_events", eventbus.NewEvent("recommendation_generated", map[string]interface{}{
			"room_id":          roomID,
			"ticker":           symbol,
			"recommendation":   voteResult.Recommendation,
			"confidence_score": voteResult.ConfidenceScore,
			"target_price":     finalReport.TargetPrice,
			"timestamp":        time.Now(),
		}))

		// Broadcast analysis_completed event
		o.bus.Publish("analysis_events", eventbus.NewEvent("analysis_completed", map[string]interface{}{
			"room_id":          roomID,
			"ticker":           symbol,
			"recommendation":   voteResult.Recommendation,
			"confidence_score": voteResult.ConfidenceScore,
			"summary":          finalReport.ExecutiveSummary,
			"timestamp":        time.Now(),
		}))

		log.Printf("[BAND-ORCHESTRATOR] Multi-agent debate workflow successfully completed for %s in room %s", symbol, roomID)
	}()

	return roomID, nil
}

func (o *BandOrchestrator) handleAgentError(sessionID uuid.UUID, roomID string, agentName string, err error) {
	log.Printf("[BAND-ORCHESTRATOR-ERR] Agent %s failed: %v", agentName, err)
	if o.db != nil {
		o.db.Model(&models.AnalysisSession{}).Where("id = ?", sessionID).Updates(map[string]interface{}{
			"status":       "failed",
			"agent_status": "failed",
			"summary":      fmt.Sprintf("Agent %s failed: %s", agentName, err.Error()),
			"updated_at":   time.Now(),
		})
	}
	o.bus.Publish("agent_events", eventbus.NewEvent("agent_error", map[string]interface{}{
		"room_id":    roomID,
		"agent_name": agentName,
		"status":     "error",
		"error":      err.Error(),
		"timestamp":  time.Now(),
	}))
}
