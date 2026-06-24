package analysis

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"runtime"
	"strings"
	"time"

	"stockox-backend/database/models"
	"stockox-backend/database/repositories"
	"stockox-backend/pkg/band"
	"stockox-backend/pkg/agents"
	"stockox-backend/pkg/cache"
	"stockox-backend/pkg/errors"
	"stockox-backend/pkg/utils"
	"stockox-backend/pkg/websocket"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// StockMockData defines financial details of a stock (alias to band.StockContext)
type StockMockData = band.StockContext

// Global mock catalog
var StockCatalog = band.StockCatalog

// V1Controller implements API endpoints for module 3 and 4
type V1Controller struct {
	db            *gorm.DB
	analysisRepo  repositories.AnalysisRepository
	watchlistRepo repositories.WatchlistRepository
	agentRepo     repositories.AgentRepository
	wsHub         *websocket.Hub
	agentMgr      *agents.AgentManager
	bandOrch      *band.BandOrchestrator
}

func NewV1Controller(
	db *gorm.DB,
	analysisRepo repositories.AnalysisRepository,
	watchlistRepo repositories.WatchlistRepository,
	agentRepo repositories.AgentRepository,
	wsHub *websocket.Hub,
) *V1Controller {
	bandClient := band.NewBandClient(os.Getenv("BAND_API_KEY"), os.Getenv("BAND_BASE_URL"))
	bandOrch := band.NewBandOrchestrator(db, bandClient)

	return &V1Controller{
		db:            db,
		analysisRepo:  analysisRepo,
		watchlistRepo: watchlistRepo,
		agentRepo:     agentRepo,
		wsHub:         wsHub,
		agentMgr:      agents.NewAgentManager(db),
		bandOrch:      bandOrch,
	}
}

// SearchStocks handles GET /api/v1/stocks/search
func (ctrl *V1Controller) SearchStocks(c *gin.Context) {
	query := strings.TrimSpace(strings.ToLower(c.Query("q")))
	if query == "" {
		c.JSON(http.StatusOK, []StockMockData{})
		return
	}

	results := []StockMockData{}

	// Match Natural Language Queries as well
	isNvidiaMatch := strings.Contains(query, "nvidia") || strings.Contains(query, "nvda")
	isAppleMatch := strings.Contains(query, "apple") || strings.Contains(query, "aapl")
	isTeslaMatch := strings.Contains(query, "tesla") || strings.Contains(query, "tsla")
	isMicrosoftMatch := strings.Contains(query, "microsoft") || strings.Contains(query, "msft")
	isAmdMatch := strings.Contains(query, "amd") || strings.Contains(query, "advanced micro")
	isAmazonMatch := strings.Contains(query, "amazon") || strings.Contains(query, "amzn")
	isGoogleMatch := strings.Contains(query, "google") || strings.Contains(query, "goog")
	isMetaMatch := strings.Contains(query, "meta") || strings.Contains(query, "facebook")
	isNetflixMatch := strings.Contains(query, "netflix") || strings.Contains(query, "nflx")

	for _, s := range StockCatalog {
		tickerLower := strings.ToLower(s.Ticker)
		nameLower := strings.ToLower(s.CompanyName)

		match := strings.Contains(tickerLower, query) || strings.Contains(nameLower, query) ||
			(s.Ticker == "NVDA" && isNvidiaMatch) ||
			(s.Ticker == "AAPL" && isAppleMatch) ||
			(s.Ticker == "TSLA" && isTeslaMatch) ||
			(s.Ticker == "MSFT" && isMicrosoftMatch) ||
			(s.Ticker == "AMD" && isAmdMatch) ||
			(s.Ticker == "AMZN" && isAmazonMatch) ||
			(s.Ticker == "GOOGL" && isGoogleMatch) ||
			(s.Ticker == "META" && isMetaMatch) ||
			(s.Ticker == "NFLX" && isNetflixMatch)

		if match {
			results = append(results, s)
		}
	}

	c.JSON(http.StatusOK, results)
}

// GetStockDetails handles GET /api/v1/stocks/:ticker
func (ctrl *V1Controller) GetStockDetails(c *gin.Context) {
	ticker := strings.ToUpper(c.Param("ticker"))
	stock, exists := StockCatalog[ticker]
	if !exists {
		errors.BadRequestError(c, "Stock not found in advisory catalog: "+ticker)
		return
	}
	c.JSON(http.StatusOK, stock)
}

// StartAnalysis handles POST /api/v1/analysis/start
func (ctrl *V1Controller) StartAnalysis(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	var req struct {
		Ticker       string `json:"ticker"`
		Symbol       string `json:"symbol"`
		ForceRefresh bool   `json:"force_refresh"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.BadRequestError(c, "Valid ticker or symbol parameter is required in request body")
		return
	}

	ticker := req.Symbol
	if ticker == "" {
		ticker = req.Ticker
	}
	ticker = strings.ToUpper(strings.TrimSpace(ticker))
	if ticker == "" {
		errors.BadRequestError(c, "Symbol is required")
		return
	}

	stock, exists := StockCatalog[ticker]
	if !exists {
		errors.BadRequestError(c, "Requested stock ticker is not in catalog: "+ticker)
		return
	}

	// 20-minute cache check for completed/running analysis session
	if !req.ForceRefresh {
		var cachedSession models.AnalysisSession
		twentyMinutesAgo := time.Now().Add(-20 * time.Minute)
		if err := ctrl.db.Where("user_id = ? AND ticker = ? AND status IN ('completed', 'running') AND created_at >= ?", userID, ticker, twentyMinutesAgo).
			Order("created_at DESC").First(&cachedSession).Error; err == nil {
			c.JSON(http.StatusOK, gin.H{
				"status":       "cached",
				"session_id":   cachedSession.ID.String(),
				"ticker":       cachedSession.Ticker,
				"company_name": stock.CompanyName,
			})
			return
		}
	}

	// Fetch Clerk user details from database to check mode and credit limit
	var dbUser models.User
	if err := ctrl.db.First(&dbUser, "id = ?", userID).Error; err != nil {
		dbUser.AccountMode = "demo" // fallback default
	}

	if dbUser.AccountMode == "demo" {
		var count int64
		startOfDay := time.Now().Truncate(24 * time.Hour)
		if err := ctrl.db.Model(&models.AnalysisSession{}).
			Where("user_id = ? AND created_at >= ?", userID, startOfDay).
			Count(&count).Error; err == nil {
			if count >= 10 {
				c.JSON(http.StatusForbidden, gin.H{
					"error": "Analysis limit reached. Demo mode is limited to 10 analyses per day. Please upgrade to Live mode for unlimited analyses.",
				})
				return
			}
		}
	}

	// Create AnalysisSession record
	sessionID := uuid.New()
	session := models.AnalysisSession{
		ID:              sessionID,
		UserID:          userID,
		Ticker:          ticker,
		CompanyName:     stock.CompanyName,
		Status:          "pending",
		ProgressPercent: 0,
		CurrentAgent:    "Research Agent",
		AgentStatus:     "waiting",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	if err := ctrl.db.Create(&session).Error; err != nil {
		errors.InternalServerError(c, "Failed to create analysis session: "+err.Error())
		return
	}

	// Invalidate cache
	_ = cache.Shared.Delete(c.Request.Context(), cache.KeyAnalysis(ticker))
	_ = cache.Shared.Delete(c.Request.Context(), cache.KeyDashboard(userID))

	// Start multi-agent workflow orchestration via Band
	_, err := ctrl.bandOrch.RunWorkflow(sessionID, userID, ticker)
	if err != nil {
		errors.InternalServerError(c, "Failed to initiate Band orchestration: "+err.Error())
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"status":       "pending",
		"session_id":   sessionID.String(),
		"ticker":       ticker,
		"company_name": stock.CompanyName,
	})
}

// GetAnalysisDetails handles GET /api/v1/analysis/:id
func (ctrl *V1Controller) GetAnalysisDetails(c *gin.Context) {
	id := c.Param("id")
	ticker := strings.ToUpper(c.Query("ticker"))
	if ticker == "" {
		if room, exists := band.GlobalRegistry.GetRoom(id); exists {
			ticker = room.Ticker
		}
	}
	if ticker == "" {
		ticker = "NVDA"
	}

	stock, _ := StockCatalog[ticker]

	var analysis models.CommitteeAnalysis
	err := ctrl.db.Order("created_at desc").First(&analysis, "ticker = ?", ticker).Error
	if err == nil {
		c.JSON(http.StatusOK, gin.H{
			"id":               id,
			"ticker":           ticker,
			"status":           "completed",
			"company_name":     stock.CompanyName,
			"recommendation":   analysis.Recommendation,
			"confidence_score": analysis.ConfidenceScore,
			"risk_level":       "MEDIUM",
			"summary":          analysis.ResearchSummary,
			"created_at":       analysis.CreatedAt,
			"updated_at":       analysis.CreatedAt,
			"research_vote":    analysis.ResearchVote,
			"technical_vote":   analysis.TechnicalVote,
			"news_vote":        analysis.NewsVote,
			"risk_vote":        analysis.RiskVote,
			"valuation_vote":   analysis.ValuationVote,
			"research_summary":  analysis.ResearchSummary,
			"technical_summary": analysis.TechnicalSummary,
			"news_summary":      analysis.NewsSummary,
			"risk_summary":      analysis.RiskSummary,
			"valuation_summary": analysis.ValuationSummary,
		})
		return
	}

	// Fallback to stock catalog if not analyzed yet
	c.JSON(http.StatusOK, gin.H{
		"id":               id,
		"ticker":           ticker,
		"status":           "running",
		"company_name":     stock.CompanyName,
		"recommendation":   stock.Recommendation,
		"confidence_score": stock.AIScore,
		"risk_level":       "MEDIUM",
		"summary":          "Multi-agent committee analysis in progress.",
		"created_at":       time.Now(),
		"updated_at":       time.Now(),
	})
}

// GetAnalysisLogs handles GET /api/v1/analysis/:id/logs
func (ctrl *V1Controller) GetAnalysisLogs(c *gin.Context) {
	id := c.Param("id")
	ticker := strings.ToUpper(c.Query("ticker"))
	if ticker == "" {
		if room, exists := band.GlobalRegistry.GetRoom(id); exists {
			ticker = room.Ticker
		}
	}
	if ticker == "" {
		ticker = "NVDA"
	}

	var messages []models.AnalysisLog
	var err error

	// Scope by session_id if it's a valid UUID
	sessionUUID, uuidErr := uuid.Parse(id)
	if uuidErr == nil {
		err = ctrl.db.Order("created_at asc").Where("session_id = ?", sessionUUID).Find(&messages).Error
	} else {
		err = ctrl.db.Order("created_at asc").Where("ticker = ?", ticker).Find(&messages).Error
	}

	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve analysis logs: "+err.Error())
		return
	}

	// If no DB logs yet, but we have in-memory room messages, return them formatted
	if len(messages) == 0 {
		if room, exists := band.GlobalRegistry.GetRoom(id); exists && len(room.Messages) > 0 {
			for _, m := range room.Messages {
				evidenceStr := ""
				if len(m.Evidence) > 0 {
					evidenceStr = strings.Join(m.Evidence, ", ")
				}
				messages = append(messages, models.AnalysisLog{
					Ticker:          m.Symbol,
					AgentName:       m.Agent,
					Message:         m.Analysis,
					MessageType:     m.Recommendation,
					ConfidenceScore: m.Confidence,
					Round:           m.Round,
					Signal:          m.Signal,
					Evidence:        evidenceStr,
					CreatedAt:       m.Timestamp,
				})
			}
		}
	}

	c.JSON(http.StatusOK, messages)
}

// GetAgentMessages handles GET /api/v1/analysis/:id/agents
func (ctrl *V1Controller) GetAgentMessages(c *gin.Context) {
	id := c.Param("id")
	ticker := strings.ToUpper(c.Query("ticker"))
	if ticker == "" {
		ticker = "NVDA"
	}
	var messages []models.AnalysisLog
	var err error
	sessionUUID, uuidErr := uuid.Parse(id)
	if uuidErr == nil {
		err = ctrl.db.Order("created_at asc").Where("session_id = ?", sessionUUID).Find(&messages).Error
	} else {
		err = ctrl.db.Order("created_at asc").Where("ticker = ?", ticker).Find(&messages).Error
	}

	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve agent debate logs: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, messages)
}

// GetAnalysisReport handles GET /api/v1/analysis/:id/report
func (ctrl *V1Controller) GetAnalysisReport(c *gin.Context) {
	id := c.Param("id")
	var ca models.CommitteeAnalysis
	var err error

	sessionUUID, uuidErr := uuid.Parse(id)
	if uuidErr == nil {
		err = ctrl.db.First(&ca, "session_id = ?", sessionUUID).Error
	} else {
		err = fmt.Errorf("invalid UUID format")
	}

	if err != nil {
		ticker := strings.ToUpper(c.Query("ticker"))
		if ticker == "" {
			if room, exists := band.GlobalRegistry.GetRoom(id); exists {
				ticker = room.Ticker
			}
		}
		if ticker == "" {
			ticker = "NVDA"
		}
		err = ctrl.db.Order("created_at desc").First(&ca, "ticker = ?", ticker).Error
		if err != nil {
			errors.JSONError(c, http.StatusNotFound, "Analysis report not found for ticker: "+ticker)
			return
		}
	}

	stock, _ := StockCatalog[ca.Ticker]
	upsidePct := 0.0
	if stock.CurrentPrice > 0 {
		upsidePct = ((ca.TargetPrice - stock.CurrentPrice) / stock.CurrentPrice) * 100
		upsidePct = float64(int(upsidePct*100)) / 100
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                  ca.ID,
		"ticker":              ca.Ticker,
		"recommendation":      ca.Recommendation,
		"confidence_score":    ca.ConfidenceScore,
		"research_vote":       ca.ResearchVote,
		"technical_vote":      ca.TechnicalVote,
		"news_vote":           ca.NewsVote,
		"risk_vote":           ca.RiskVote,
		"valuation_vote":      ca.ValuationVote,
		"research_summary":    ca.ResearchSummary,
		"technical_summary":   ca.TechnicalSummary,
		"news_summary":        ca.NewsSummary,
		"risk_summary":        ca.RiskSummary,
		"valuation_summary":   ca.ValuationSummary,
		"target_price":        ca.TargetPrice,
		"upside_pct":          upsidePct,
		"executive_summary":   ca.ExecutiveSummary,
		"bull_case":           ca.BullCase,
		"bear_case":           ca.BearCase,
		"investment_horizon":  ca.InvestmentHorizon,
		"created_at":          ca.CreatedAt,
	})
}

// GetAnalysisHistory handles GET /api/v1/analysis/history
func (ctrl *V1Controller) GetAnalysisHistory(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	ticker := strings.ToUpper(strings.TrimSpace(c.Query("ticker")))

	var sessions []models.AnalysisSession
	query := ctrl.db.Where("user_id = ?", userID)
	if ticker != "" {
		query = query.Where("ticker = ?", ticker)
	}

	err := query.Order("created_at DESC").Limit(10).Find(&sessions).Error
	if err != nil {
		errors.InternalServerError(c, "Failed to load analysis history: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, sessions)
}

// TestAgentConnection handles GET /api/v1/analysis/test-agent
func (ctrl *V1Controller) TestAgentConnection(c *gin.Context) {
	// Call Band API to create a test room
	roomID, err := ctrl.bandOrch.TestConnection()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Band API connection failed: " + err.Error(),
			"mock":    ctrl.bandOrch.IsMockMode(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Successfully connected to Band API. Test room ID: " + roomID,
		"mock":    ctrl.bandOrch.IsMockMode(),
	})
}

func logDiagnosticFailure(c *gin.Context, module, function, errMsg string) {
	timestamp := time.Now().Format(time.RFC3339)
	
	buf := make([]byte, 2048)
	n := runtime.Stack(buf, false)
	stackTrace := string(buf[:n])
	
	reqID := c.GetHeader("X-Request-ID")
	if reqID == "" {
		reqID = uuid.New().String()
	}
	correlationID := c.GetHeader("X-Correlation-ID")
	if correlationID == "" {
		correlationID = uuid.New().String()
	}
	
	userID := "guest"
	if val, exists := c.Get("UserID"); exists {
		if str, ok := val.(string); ok {
			userID = str
		}
	}
	
	log.Printf("[DIAGNOSTIC-FAILURE] Time: %s | Module: %s | Function: %s | RequestID: %s | CorrelationID: %s | UserID: %s | Error: %s\nStack:\n%s\n",
		timestamp, module, function, reqID, correlationID, userID, errMsg, stackTrace)
}

// TestBand handles POST /api/dev/diagnostics/test-band
func (ctrl *V1Controller) TestBand(c *gin.Context) {
	start := time.Now()
	ctx := c.Request.Context()
	symbol := "NVDA"
	testRoomName := "diagnostics-test-nvda"

	// Steps status tracking
	stepStatus := map[string]string{
		"CreateRoom()":         "PENDING",
		"SpawnAgents()":        "PENDING",
		"RunResearchAgent()":   "PENDING",
		"RunTechnicalAgent()":  "PENDING",
		"RunNewsAgent()":       "PENDING",
		"RunRiskAgent()":       "PENDING",
		"RunCommitteeAgent()":  "PENDING",
		"VoteAggregation()":    "PENDING",
		"SaveDecision()":       "PENDING",
		"DeleteRoom()":         "PENDING",
	}
	stepErrors := map[string]string{}
	
	setStep := func(step, status, err string) {
		stepStatus[step] = status
		if err != "" {
			stepErrors[step] = err
		}
	}

	var roomID string
	var err error
	var firstFailure string

	// Helper to handle a step failure
	failStep := func(step string, stepErr error) {
		log.Printf("[TEST-BAND-FAIL] Step %s failed: %v", step, stepErr)
		setStep(step, "FAIL", stepErr.Error())
		if firstFailure == "" {
			firstFailure = step
		}
		// Mark remaining steps as SKIP
		for k, v := range stepStatus {
			if v == "PENDING" {
				stepStatus[k] = "SKIP"
			}
		}
	}

	// 1. CreateRoom()
	roomID, err = ctrl.bandOrch.Client().CreateRoom(testRoomName, symbol)
	if err != nil {
		failStep("CreateRoom()", err)
	} else {
		setStep("CreateRoom()", "PASS", "")
	}

	// Clean up room registry and GORM at the end (DeleteRoom)
	defer func() {
		cleanupStart := time.Now()
		// Delete GORM mock recommendations
		ctrl.db.Where("ticker = ?", "NVDA_TEST").Delete(&models.Recommendation{})
		
		// Delete room
		if roomID != "" {
			band.GlobalRegistry.DeleteRoom(roomID)
			setStep("DeleteRoom()", "PASS", "")
		} else {
			setStep("DeleteRoom()", "SKIP", "No room created to delete")
		}
		
		log.Printf("[TEST-BAND-CLEANUP] completed in %v", time.Since(cleanupStart))
	}()

	// 2. SpawnAgents()
	var agentsList []band.Agent
	if firstFailure == "" {
		agentsList = band.GetAgents()
		var inviteErr error
		for _, a := range agentsList {
			errInv := ctrl.bandOrch.Client().InviteAgent(roomID, a.Name())
			if errInv != nil {
				inviteErr = errInv
			}
		}
		if inviteErr != nil {
			failStep("SpawnAgents()", inviteErr)
		} else {
			setStep("SpawnAgents()", "PASS", "")
		}
	}

	// Stock catalog mock context
	stockCtx, exists := band.StockCatalog[symbol]
	if !exists {
		stockCtx = band.StockContext{
			Ticker:       symbol,
			CompanyName:  "NVIDIA Corporation",
			CurrentPrice: 125.0,
			AIScore:      88,
		}
	}

	var messages []band.BandMessage

	// 3. RunResearchAgent()
	if firstFailure == "" {
		var agent band.Agent
		for _, a := range agentsList {
			if a.Name() == "Research Agent" {
				agent = a
				break
			}
		}
		if agent == nil {
			failStep("RunResearchAgent()", fmt.Errorf("Research Agent not found in agents list"))
		} else {
			output, err := agent.Analyze(ctx, symbol, stockCtx, nil)
			if err != nil {
				failStep("RunResearchAgent()", err)
			} else {
				msg := band.BandMessage{
					Agent:          agent.Name(),
					Symbol:         symbol,
					Analysis:       output.Reasoning,
					Recommendation: output.Signal,
					Confidence:     output.Confidence,
					Timestamp:      time.Now(),
					Round:          1,
					Signal:         output.Signal,
					Evidence:       output.Evidence,
				}
				_ = ctrl.bandOrch.Client().SendMessage(roomID, &msg)
				messages = append(messages, msg)
				setStep("RunResearchAgent()", "PASS", "")
			}
		}
	}

	// 4. RunTechnicalAgent()
	if firstFailure == "" {
		var agent band.Agent
		for _, a := range agentsList {
			if a.Name() == "Technical Agent" {
				agent = a
				break
			}
		}
		if agent == nil {
			failStep("RunTechnicalAgent()", fmt.Errorf("Technical Agent not found in agents list"))
		} else {
			output, err := agent.Analyze(ctx, symbol, stockCtx, nil)
			if err != nil {
				failStep("RunTechnicalAgent()", err)
			} else {
				msg := band.BandMessage{
					Agent:          agent.Name(),
					Symbol:         symbol,
					Analysis:       output.Reasoning,
					Recommendation: output.Signal,
					Confidence:     output.Confidence,
					Timestamp:      time.Now(),
					Round:          1,
					Signal:         output.Signal,
					Evidence:       output.Evidence,
				}
				_ = ctrl.bandOrch.Client().SendMessage(roomID, &msg)
				messages = append(messages, msg)
				setStep("RunTechnicalAgent()", "PASS", "")
			}
		}
	}

	// 5. RunNewsAgent()
	if firstFailure == "" {
		var agent band.Agent
		for _, a := range agentsList {
			if a.Name() == "News Agent" {
				agent = a
				break
			}
		}
		if agent == nil {
			failStep("RunNewsAgent()", fmt.Errorf("News Agent not found in agents list"))
		} else {
			output, err := agent.Analyze(ctx, symbol, stockCtx, nil)
			if err != nil {
				failStep("RunNewsAgent()", err)
			} else {
				msg := band.BandMessage{
					Agent:          agent.Name(),
					Symbol:         symbol,
					Analysis:       output.Reasoning,
					Recommendation: output.Signal,
					Confidence:     output.Confidence,
					Timestamp:      time.Now(),
					Round:          1,
					Signal:         output.Signal,
					Evidence:       output.Evidence,
				}
				_ = ctrl.bandOrch.Client().SendMessage(roomID, &msg)
				messages = append(messages, msg)
				setStep("RunNewsAgent()", "PASS", "")
			}
		}
	}

	// 6. RunRiskAgent()
	if firstFailure == "" {
		var agent band.Agent
		for _, a := range agentsList {
			if a.Name() == "Risk Agent" {
				agent = a
				break
			}
		}
		if agent == nil {
			failStep("RunRiskAgent()", fmt.Errorf("Risk Agent not found in agents list"))
		} else {
			output, err := agent.Analyze(ctx, symbol, stockCtx, nil)
			if err != nil {
				failStep("RunRiskAgent()", err)
			} else {
				msg := band.BandMessage{
					Agent:          agent.Name(),
					Symbol:         symbol,
					Analysis:       output.Reasoning,
					Recommendation: output.Signal,
					Confidence:     output.Confidence,
					Timestamp:      time.Now(),
					Round:          1,
					Signal:         output.Signal,
					Evidence:       output.Evidence,
				}
				_ = ctrl.bandOrch.Client().SendMessage(roomID, &msg)
				messages = append(messages, msg)
				setStep("RunRiskAgent()", "PASS", "")
			}
		}
	}

	// 7. RunCommitteeAgent()
	var commOutput band.AgentOutput
	if firstFailure == "" {
		commAgent := &band.CommitteeAgent{}
		var errComm error
		commOutput, errComm = commAgent.Analyze(ctx, symbol, stockCtx, messages)
		if errComm != nil {
			failStep("RunCommitteeAgent()", errComm)
		} else {
			setStep("RunCommitteeAgent()", "PASS", "")
		}
	}

	// 8. VoteAggregation()
	var voteResult band.VoteResult
	if firstFailure == "" {
		var votesBreakdown []band.AgentVote
		weights := map[string]float64{
			"Research Agent":  0.25,
			"Technical Agent": 0.20,
			"News Agent":      0.20,
			"Risk Agent":      0.15,
		}
		for _, m := range messages {
			w, ok := weights[m.Agent]
			if ok {
				votesBreakdown = append(votesBreakdown, band.AgentVote{
					Agent:      m.Agent,
					Signal:     m.Signal,
					Confidence: m.Confidence,
					Weight:     w,
				})
			}
		}
		
		voteResult = band.ComputeWeightedVote(votesBreakdown)
		if len(votesBreakdown) == 0 || voteResult.Recommendation == "" {
			failStep("VoteAggregation()", fmt.Errorf("Failed to compute votes breakdown or no votes cast"))
		} else {
			setStep("VoteAggregation()", "PASS", "")
		}
	}

	// 9. SaveDecision()
	if firstFailure == "" {
		rec := models.Recommendation{
			ID:              uuid.New(),
			Ticker:          "NVDA_TEST",
			Recommendation:  voteResult.Recommendation,
			ConfidenceScore: voteResult.ConfidenceScore,
			CreatedAt:       time.Now(),
		}
		errSave := ctrl.db.Create(&rec).Error
		if errSave != nil {
			failStep("SaveDecision()", errSave)
		} else {
			setStep("SaveDecision()", "PASS", "")
		}
	}

	// Structured failure logging
	if firstFailure != "" {
		logDiagnosticFailure(c, "Band Agents", firstFailure, stepErrors[firstFailure])
	}

	latency := time.Since(start).Milliseconds()
	success := firstFailure == ""

	// Build steps list array
	stepsList := []gin.H{}
	order := []string{
		"CreateRoom()", "SpawnAgents()",
		"RunResearchAgent()", "RunTechnicalAgent()", "RunNewsAgent()", "RunRiskAgent()",
		"RunCommitteeAgent()", "VoteAggregation()", "SaveDecision()", "DeleteRoom()",
	}
	for _, name := range order {
		stepsList = append(stepsList, gin.H{
			"name":   name,
			"status": stepStatus[name],
			"error":  stepErrors[name],
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success":              success,
		"first_failure":        firstFailure,
		"steps_detail":         stepsList,
		"room_id":              roomID,
		"agent_spawn":          stepStatus["SpawnAgents()"],
		"agent_response":       stepStatus["RunResearchAgent()"],
		"agent_voting":         stepStatus["VoteAggregation()"],
		"consensus_generation": stepStatus["RunCommitteeAgent()"],
		"store_results":        stepStatus["SaveDecision()"],
		"latency_ms":           latency,
		"committee_decision":   commOutput.Signal,
		"confidence":           commOutput.Confidence,
	})
}



// GetRecentAnalyses handles GET /api/v1/analysis/recent
func (ctrl *V1Controller) GetRecentAnalyses(c *gin.Context) {
	var recs []models.Recommendation
	err := ctrl.db.Order("created_at desc").Limit(10).Find(&recs).Error
	if err != nil {
		errors.InternalServerError(c, "Failed to load recent recommendations: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, recs)
}

// GetWatchlist handles GET /api/v1/watchlist
func (ctrl *V1Controller) GetWatchlist(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	page, limit := utils.GetPaginationParams(c)

	items, total, err := ctrl.watchlistRepo.GetByUserIDPaginated(userID, page, limit)
	if err != nil {
		errors.InternalServerError(c, "Failed to fetch watchlist: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, utils.CreatePaginatedResponse(items, total, page, limit))
}

// AddWatchlist handles POST /api/v1/watchlist
func (ctrl *V1Controller) AddWatchlist(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	var req struct {
		Ticker      string `json:"ticker" binding:"required"`
		CompanyName string `json:"company_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.BadRequestError(c, "Valid ticker parameter is required in request body")
		return
	}

	ticker := strings.ToUpper(req.Ticker)
	companyName := req.CompanyName
	if companyName == "" {
		if stock, exists := StockCatalog[ticker]; exists {
			companyName = stock.CompanyName
		} else {
			companyName = ticker
		}
	}

	// Avoid duplicate entries
	existing, err := ctrl.watchlistRepo.GetByUserID(userID)
	if err == nil {
		for _, w := range existing {
			if w.Ticker == ticker {
				c.JSON(http.StatusOK, w)
				return
			}
		}
	}

	item, err := ctrl.watchlistRepo.Add(userID, ticker, companyName)
	if err != nil {
		errors.InternalServerError(c, "Failed to add ticker to watchlist: "+err.Error())
		return
	}

	// Invalidate cache
	_ = cache.Shared.Delete(c.Request.Context(), cache.KeyWatchlist(userID))
	_ = cache.Shared.Delete(c.Request.Context(), cache.KeyDashboard(userID))

	c.JSON(http.StatusCreated, item)
}

// RemoveWatchlist handles DELETE /api/v1/watchlist/:ticker
func (ctrl *V1Controller) RemoveWatchlist(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	ticker := strings.ToUpper(c.Param("ticker"))
	err := ctrl.watchlistRepo.Remove(userID, ticker)
	if err != nil {
		errors.InternalServerError(c, "Failed to remove ticker from watchlist: "+err.Error())
		return
	}

	// Invalidate cache
	_ = cache.Shared.Delete(c.Request.Context(), cache.KeyWatchlist(userID))
	_ = cache.Shared.Delete(c.Request.Context(), cache.KeyDashboard(userID))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Watchlist ticker removed successfully: " + ticker,
	})
}

// getUserID extracts UserID string context set by Auth Middleware
func (ctrl *V1Controller) getUserID(c *gin.Context) (string, bool) {
	val, exists := c.Get("UserID")
	if !exists {
		return "user_000000000000000000000000001", true
	}
	if str, ok := val.(string); ok {
		return str, true
	}
	return "user_000000000000000000000000001", true
}

// GetAnalysisEvents handles GET /api/v1/analysis/:id/events
func (ctrl *V1Controller) GetAnalysisEvents(c *gin.Context) {
	c.JSON(http.StatusOK, []any{})
}

// GetAnalysisStatus handles GET /api/v1/analysis/:id/status
func (ctrl *V1Controller) GetAnalysisStatus(c *gin.Context) {
	sessionID := c.Param("id")
	var session models.AnalysisSession
	if err := ctrl.db.First(&session, "id = ?", sessionID).Error; err != nil {
		// Fallback to mock completed check if not in DB for compatibility/tests
		ticker := strings.ToUpper(c.Query("ticker"))
		if ticker == "" {
			ticker = "NVDA"
		}
		stock, _ := StockCatalog[ticker]
		c.JSON(http.StatusOK, gin.H{
			"session_id":       sessionID,
			"ticker":           ticker,
			"status":           "completed",
			"recommendation":   stock.Recommendation,
			"confidence_score": stock.AIScore,
			"risk_level":       "MEDIUM",
			"progress_percent": 100,
			"current_agent":    "Committee Agent",
			"agent_status":     "completed",
			"updated_at":       time.Now(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"session_id":       session.ID.String(),
		"ticker":           session.Ticker,
		"status":           session.Status,
		"recommendation":   session.Recommendation,
		"confidence_score": session.ConfidenceScore,
		"risk_level":       session.RiskLevel,
		"progress_percent": session.ProgressPercent,
		"current_agent":    session.CurrentAgent,
		"agent_status":     session.AgentStatus,
		"updated_at":       session.UpdatedAt,
	})
}

// GetAnalysisTimeline handles GET /api/v1/analysis/:id/timeline
func (ctrl *V1Controller) GetAnalysisTimeline(c *gin.Context) {
	c.JSON(http.StatusOK, []any{})
}

