package agents

import (
	"context"
	"log"
	"math/rand"
	"sync"
	"time"

	"stockox-backend/database/models"
	"stockox-backend/pkg/cache"
	"stockox-backend/pkg/eventbus"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AgentManager coordinates the startup, tracking, and simulation lifecycles of AI agents
type AgentManager struct {
	db       *gorm.DB
	bus      *eventbus.EventBus
	activeMu sync.Mutex
	active   map[uuid.UUID]chan struct{} // Cancel channels for active sessions
}

func NewAgentManager(db *gorm.DB) *AgentManager {
	return &AgentManager{
		db:     db,
		bus:    eventbus.GetBus(),
		active: make(map[uuid.UUID]chan struct{}),
	}
}

// StartAgent initializes a simulated agent execution (no database writes for deprecated table)
func (am *AgentManager) StartAgent(sessionID uuid.UUID, agentName string) (map[string]any, error) {
	// Emit agent_started event to websockets
	payload := map[string]interface{}{
		"session_id": sessionID,
		"agent_name": agentName,
		"status":     "thinking",
		"timestamp":  time.Now(),
	}
	am.emitAndLogEvent(sessionID, "agent_started", agentName, payload)

	return map[string]any{"session_id": sessionID, "agent_name": agentName}, nil
}

// UpdateAgentStatus transitions agent through intermediate status codes over websockets
func (am *AgentManager) UpdateAgentStatus(sessionID uuid.UUID, agentName string, status string, activity string) error {
	eventType := "agent_" + status
	payload := map[string]interface{}{
		"session_id": sessionID,
		"agent_name": agentName,
		"status":     status,
		"message":    activity,
		"timestamp":  time.Now(),
	}
	am.emitAndLogEvent(sessionID, eventType, agentName, payload)

	return nil
}

// CompleteAgent marks agent execution as successful over websockets
func (am *AgentManager) CompleteAgent(sessionID uuid.UUID, agentName string, result string) error {
	now := time.Now()
	payload := map[string]interface{}{
		"session_id": sessionID,
		"agent_name": agentName,
		"status":     "completed",
		"result":     result,
		"timestamp":  now,
	}
	am.emitAndLogEvent(sessionID, "agent_completed", agentName, payload)

	return nil
}

// FailAgent records execution errors over websockets
func (am *AgentManager) FailAgent(sessionID uuid.UUID, agentName string, errText string) error {
	now := time.Now()
	payload := map[string]interface{}{
		"session_id": sessionID,
		"agent_name": agentName,
		"status":     "error",
		"error":      errText,
		"timestamp":  now,
	}
	am.emitAndLogEvent(sessionID, "agent_error", agentName, payload)

	return nil
}

// EmitAndLogMessage publishes a live message log from an agent and records it in analysis_logs
func (am *AgentManager) EmitAndLogMessage(ticker string, sessionID uuid.UUID, agentName string, msg string, msgType string) {
	msgModel := models.AnalysisLog{
		ID:              uuid.New(),
		Ticker:          ticker,
		AgentName:       agentName,
		Message:         msg,
		MessageType:     msgType,
		ConfidenceScore: 80,
		CreatedAt:       time.Now(),
	}
	_ = am.db.Create(&msgModel).Error

	payload := map[string]interface{}{
		"session_id":   sessionID,
		"agent_name":   agentName,
		"message":      msg,
		"message_type": msgType,
		"timestamp":    time.Now(),
	}
	am.emitAndLogEvent(sessionID, "agent_message", agentName, payload)
}

func (am *AgentManager) emitAndLogEvent(sessionID uuid.UUID, eventType string, agentName string, payload interface{}) {
	event := eventbus.NewEvent(eventType, payload)
	// Publish to event bus channels
	am.bus.Publish("agent_events", event)
}

// StopAnalysis cancels an active session run
func (am *AgentManager) StopAnalysis(sessionID uuid.UUID) {
	am.activeMu.Lock()
	defer am.activeMu.Unlock()

	if cancel, ok := am.active[sessionID]; ok {
		close(cancel)
		delete(am.active, sessionID)
		log.Printf("[AgentManager] Cancel signal sent to session: %s", sessionID)
	}
}

// RunSimulatedCommittee runs the entire multi-agent simulation lifecycle in a consolidated way
func (am *AgentManager) RunSimulatedCommittee(sessionID uuid.UUID, ticker string, stock models.MarketSnapshot, companyName string, aiscore int, recSignal string, debtRatio float64, peRatio float64) {
	am.activeMu.Lock()
	cancelChan := make(chan struct{})
	am.active[sessionID] = cancelChan
	am.activeMu.Unlock()

	defer func() {
		am.activeMu.Lock()
		delete(am.active, sessionID)
		am.activeMu.Unlock()
	}()

	log.Printf("[AgentManager] Launching committee simulation for ticker %s, session: %s", ticker, sessionID)

	// Emit analysis_started event
	startedEvent := eventbus.NewEvent("analysis_started", map[string]interface{}{
		"session_id":   sessionID,
		"ticker":       ticker,
		"company_name": companyName,
		"timestamp":    time.Now(),
	})
	am.bus.Publish("analysis_events", startedEvent)

	agentsList := []struct {
		Name    string
		Type    string // research, analysis, decision, warning, risk
		Task    string
		Message string
		Result  string
	}{
		{
			Name:    "Research Agent",
			Type:    "research",
			Task:    "Initiate fundamental profile audit and market positioning analysis for " + ticker,
			Message: "Reviewing profit margins, capital expenditure pipelines, and competitive moat strength in sector...",
			Result:  "Fundamental profile audited. Stable margins verified with high sector tailwinds.",
		},
		{
			Name:    "News Agent",
			Type:    "analysis",
			Task:    "Scan media coverage, public social metrics, and analyst ratings for " + ticker,
			Message: "Analyzing recent press statements, regulatory filings, and media sentiment counts...",
			Result:  "Media sentiment score is highly supportive (+0.78 metrics index) on compute assets.",
		},
		{
			Name:    "Fundamental Agent",
			Type:    "analysis",
			Task:    "Execute valuation models (discounted cash flow, sector multiples) for " + ticker,
			Message: "Recalculating PEG ratio, forward P/E and EPS trends relative to revenue targets...",
			Result:  "Valuation metrics processed. Fair value indicators imply positive growth upside.",
		},
		{
			Name:    "Technical Agent",
			Type:    "analysis",
			Task:    "Audit pricing charts, EMA crossovers, and volume indices for " + ticker,
			Message: "Checking support bounds and breakout resistances relative to short-term moving averages...",
			Result:  "Technical breakout markers verified above standard support threshold.",
		},
		{
			Name:    "Risk Agent",
			Type:    "risk",
			Task:    "Assess downside risk, systemic beta, and volatility exposure indices",
			Message: "Modeling Value-at-Risk (VaR) scenarios and debt-to-equity leverage metrics under standard stress...",
			Result:  "Volatility metrics aligned within compliance limits; downside debt exposures minimized.",
		},
		{
			Name:    "Committee Agent",
			Type:    "decision",
			Task:    "Consolidate individual agent findings and synthesize advisory recommendation",
			Message: "Aggregating analyst ratings and weighting agent signal outputs for consensus resolution...",
			Result:  "Committee review finalized. Signal resolution matched: " + recSignal + ".",
		},
	}

	for _, a := range agentsList {
		select {
		case <-cancelChan:
			log.Printf("[AgentManager] Session %s cancelled during %s run", sessionID, a.Name)
			failEvent := eventbus.NewEvent("analysis_failed", map[string]interface{}{
				"session_id": sessionID,
				"ticker":     ticker,
				"error":      "Analysis was manually stopped or cancelled",
				"timestamp":  time.Now(),
			})
			am.bus.Publish("analysis_events", failEvent)
			return
		default:
		}

		_, _ = am.StartAgent(sessionID, a.Name)
		time.Sleep(800 * time.Millisecond)

		_ = am.UpdateAgentStatus(sessionID, a.Name, "analyzing", a.Message)
		am.EmitAndLogMessage(ticker, sessionID, a.Name, a.Message, a.Type)
		time.Sleep(1000 * time.Millisecond)

		_ = am.CompleteAgent(sessionID, a.Name, a.Result)
		am.EmitAndLogMessage(ticker, sessionID, a.Name, a.Result, a.Type)
		time.Sleep(300 * time.Millisecond)
	}

	// Finalize recommendation
	riskLvl := "LOW"
	if debtRatio > 0.8 || peRatio > 50.0 {
		riskLvl = "HIGH"
	} else if debtRatio > 0.4 || peRatio > 30.0 {
		riskLvl = "MEDIUM"
	}

	upsideMult := 1.05
	if recSignal == "BUY" {
		upsideMult = 1.10 + rand.Float64()*0.05
	} else if recSignal == "SELL" {
		upsideMult = 0.85 + rand.Float64()*0.05
	} else {
		upsideMult = 0.98 + rand.Float64()*0.04
	}
	targetPrice := stock.Price * upsideMult

	// Save to DB recommendations
	rec := models.Recommendation{
		ID:                uuid.New(),
		Ticker:            ticker,
		Recommendation:    recSignal,
		ConfidenceScore:   aiscore,
		TargetPrice:       targetPrice,
		RiskLevel:         riskLvl,
		AgentReasoning:    companyName + " operates under high growth index benchmarks. Institutional consensus verified.",
		ResearchScore:     aiscore,
		TechnicalScore:    aiscore,
		NewsScore:         aiscore,
		RiskScore:         78,
		CommitteeScore:    aiscore,
		InvestmentHorizon: "Medium Term (6-12 months)",
		CreatedAt:         time.Now(),
	}
	am.db.Create(&rec)

	// Save to DB committee_analyses
	commAnalysis := models.CommitteeAnalysis{
		Ticker:            ticker,
		Recommendation:    recSignal,
		ConfidenceScore:   aiscore,
		ResearchVote:      "BUY",
		TechnicalVote:     "BUY",
		NewsVote:          "HOLD",
		RiskVote:          "BUY",
		ValuationVote:     "HOLD",
		ResearchSummary:   companyName + " consensus audit successfully complete.",
		TechnicalSummary:  "Technical indicators processed.",
		NewsSummary:       "News sentiment indicators parsed.",
		RiskSummary:       "Volatility margins reviewed.",
		ValuationSummary:  "Multiple ratios reviewed.",
		CreatedAt:         time.Now(),
	}
	am.db.Create(&commAnalysis)

	// Emit recommendation_generated event
	recEvent := eventbus.NewEvent("recommendation_generated", map[string]interface{}{
		"session_id":       sessionID,
		"ticker":           ticker,
		"recommendation":   recSignal,
		"confidence_score": aiscore,
		"target_price":     targetPrice,
		"risk_level":       riskLvl,
		"timestamp":        time.Now(),
	})
	am.bus.Publish("analysis_events", recEvent)

	// Emit analysis_completed event
	summaryText := companyName + " AI audit completed."
	compEvent := eventbus.NewEvent("analysis_completed", map[string]interface{}{
		"session_id":       sessionID,
		"ticker":           ticker,
		"recommendation":   recSignal,
		"confidence_score": aiscore,
		"risk_level":       riskLvl,
		"summary":          summaryText,
		"timestamp":        time.Now(),
	})
	am.bus.Publish("analysis_events", compEvent)

	// Invalidate cache
	_ = cache.Shared.Delete(context.Background(), cache.KeyAnalysis(ticker))
	log.Printf("[AgentManager] Successfully completed simulation for session %s", sessionID)
}
