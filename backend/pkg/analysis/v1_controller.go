package analysis

import (
	"log"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"stockox-backend/database/models"
	"stockox-backend/database/repositories"
	"stockox-backend/pkg/errors"
	"stockox-backend/pkg/websocket"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// StockMockData defines financial details of a stock
type StockMockData struct {
	Ticker         string  `json:"ticker"`
	CompanyName    string  `json:"company_name"`
	Sector         string  `json:"sector"`
	Industry       string  `json:"industry"`
	MarketCap      string  `json:"market_cap"`
	CurrentPrice   float64 `json:"current_price"`
	DailyChange    float64 `json:"daily_change"`
	DailyChangePct float64 `json:"daily_change_pct"`
	Volume         string  `json:"volume"`
	FiftyTwoWHigh  float64 `json:"fifty_two_w_high"`
	FiftyTwoWLow   float64 `json:"fifty_two_w_low"`
	PERatio        float64 `json:"pe_ratio"`
	EPS            float64 `json:"eps"`
	Revenue        string  `json:"revenue"`
	DebtRatio      float64 `json:"debt_ratio"`
	AIScore        int     `json:"ai_score"`
	Recommendation string  `json:"recommendation"`
	Logo           string  `json:"logo"`
	Overview       string  `json:"overview"`
}

// Global mock catalog
var StockCatalog = map[string]StockMockData{
	"NVDA": {
		Ticker:         "NVDA",
		CompanyName:    "NVIDIA Corp.",
		Sector:         "Technology",
		Industry:       "Semiconductors",
		MarketCap:      "3.15 Trillion",
		CurrentPrice:   128.50,
		DailyChange:    5.20,
		DailyChangePct: 4.21,
		Volume:         "45.2 Million",
		FiftyTwoWHigh:  140.76,
		FiftyTwoWLow:   39.23,
		PERatio:        72.5,
		EPS:            1.77,
		Revenue:        "26.04 Billion",
		DebtRatio:      0.18,
		AIScore:        92,
		Recommendation: "BUY",
		Logo:           "https://logo.clearbit.com/nvidia.com",
		Overview:       "NVIDIA Corporation designs graphics processing units (GPUs) for the gaming and professional markets, as well as system on a chip units (SoCs) for the mobile computing and automotive market. NVIDIA has expanded its focus to artificial intelligence, cloud computing, and automated driving.",
	},
	"AAPL": {
		Ticker:         "AAPL",
		CompanyName:    "Apple Inc.",
		Sector:         "Technology",
		Industry:       "Consumer Electronics",
		MarketCap:      "2.85 Trillion",
		CurrentPrice:   178.45,
		DailyChange:    2.03,
		DailyChangePct: 1.15,
		Volume:         "52.1 Million",
		FiftyTwoWHigh:  199.62,
		FiftyTwoWLow:   164.08,
		PERatio:        28.4,
		EPS:            6.43,
		Revenue:        "90.75 Billion",
		DebtRatio:      1.45,
		AIScore:        82,
		Recommendation: "BUY",
		Logo:           "https://logo.clearbit.com/apple.com",
		Overview:       "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide. The company is best known for its hardware products, including the iPhone, iPad, Mac, Apple Watch, and services including Apple Music, iCloud, and Apple Pay.",
	},
	"TSLA": {
		Ticker:         "TSLA",
		CompanyName:    "Tesla Inc.",
		Sector:         "Consumer Cyclical",
		Industry:       "Auto Manufacturers",
		MarketCap:      "670.4 Billion",
		CurrentPrice:   210.80,
		DailyChange:    -5.18,
		DailyChangePct: -2.40,
		Volume:         "88.4 Million",
		FiftyTwoWHigh:  299.29,
		FiftyTwoWLow:   138.80,
		PERatio:        61.2,
		EPS:            3.44,
		Revenue:        "21.30 Billion",
		DebtRatio:      0.08,
		AIScore:        64,
		Recommendation: "HOLD",
		Logo:           "https://logo.clearbit.com/tesla.com",
		Overview:       "Tesla, Inc. designs, develops, manufactures, sells, and leases fully electric vehicles, energy generation and storage systems, and offers services related to its products. The company is a pioneer in sustainable transport, automated driving software, and commercial scale energy grids.",
	},
	"MSFT": {
		Ticker:         "MSFT",
		CompanyName:    "Microsoft Corp.",
		Sector:         "Technology",
		Industry:       "Infrastructure Software",
		MarketCap:      "3.10 Trillion",
		CurrentPrice:   415.50,
		DailyChange:    3.50,
		DailyChangePct: 0.85,
		Volume:         "22.8 Million",
		FiftyTwoWHigh:  430.82,
		FiftyTwoWLow:   315.18,
		PERatio:        36.2,
		EPS:            11.06,
		Revenue:        "61.86 Billion",
		DebtRatio:      0.28,
		AIScore:        88,
		Recommendation: "BUY",
		Logo:           "https://logo.clearbit.com/microsoft.com",
		Overview:       "Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide. Its Productivity and Business Processes segment includes Office, Exchange, SharePoint, Microsoft Teams, Skype, and LinkedIn. It is a major leader in cloud computing via Microsoft Azure and AI tools.",
	},
	"AMD": {
		Ticker:         "AMD",
		CompanyName:    "Advanced Micro Devices",
		Sector:         "Technology",
		Industry:       "Semiconductors",
		MarketCap:      "262.1 Billion",
		CurrentPrice:   162.30,
		DailyChange:    -3.23,
		DailyChangePct: -1.95,
		Volume:         "48.5 Million",
		FiftyTwoWHigh:  227.30,
		FiftyTwoWLow:   93.12,
		PERatio:        330.0,
		EPS:            0.49,
		Revenue:        "5.47 Billion",
		DebtRatio:      0.03,
		AIScore:        71,
		Recommendation: "HOLD",
		Logo:           "https://logo.clearbit.com/amd.com",
		Overview:       "Advanced Micro Devices, Inc. operates as a semiconductor company worldwide. It operates in two segments, Computing and Graphics; and Enterprise, Embedded, and Semi-Custom. The company offers x86 microprocessors, chipsets, discrete and integrated graphics processing units, and AI compute chips.",
	},
	"AMZN": {
		Ticker:         "AMZN",
		CompanyName:    "Amazon.com Inc.",
		Sector:         "Consumer Cyclical",
		Industry:       "Internet Retail",
		MarketCap:      "1.87 Trillion",
		CurrentPrice:   180.15,
		DailyChange:    1.55,
		DailyChangePct: 0.87,
		Volume:         "35.1 Million",
		FiftyTwoWHigh:  191.70,
		FiftyTwoWLow:   118.35,
		PERatio:        41.5,
		EPS:            4.34,
		Revenue:        "143.31 Billion",
		DebtRatio:      0.38,
		AIScore:        85,
		Recommendation: "BUY",
		Logo:           "https://logo.clearbit.com/amazon.com",
		Overview:       "Amazon.com, Inc. engages in the retail sale of consumer products and subscriptions in North America and internationally. It operates through three segments: North America, International, and Amazon Web Services (AWS). AWS provides secure cloud hosting and infrastructure solutions worldwide.",
	},
	"GOOGL": {
		Ticker:         "GOOGL",
		CompanyName:    "Alphabet Inc.",
		Sector:         "Technology",
		Industry:       "Internet Content & Information",
		MarketCap:      "2.18 Trillion",
		CurrentPrice:   175.40,
		DailyChange:    2.10,
		DailyChangePct: 1.21,
		Volume:         "28.2 Million",
		FiftyTwoWHigh:  189.38,
		FiftyTwoWLow:   115.35,
		PERatio:        26.8,
		EPS:            6.54,
		Revenue:        "80.54 Billion",
		DebtRatio:      0.06,
		AIScore:        86,
		Recommendation: "BUY",
		Logo:           "https://logo.clearbit.com/google.com",
		Overview:       "Alphabet Inc. offers various platforms and services in the United States, Europe, the Americas, and the Asia-Pacific. It operates through Google Services, Google Cloud, and Other Bets segments. It is famous for its search engine Google, YouTube platform, Android OS, and Gemini AI systems.",
	},
	"META": {
		Ticker:         "META",
		CompanyName:    "Meta Platforms Inc.",
		Sector:         "Technology",
		Industry:       "Internet Content & Information",
		MarketCap:      "1.25 Trillion",
		CurrentPrice:   495.20,
		DailyChange:    -4.80,
		DailyChangePct: -0.96,
		Volume:         "18.4 Million",
		FiftyTwoWHigh:  531.49,
		FiftyTwoWLow:   260.00,
		PERatio:        27.5,
		EPS:            18.00,
		Revenue:        "36.45 Billion",
		DebtRatio:      0.12,
		AIScore:        89,
		Recommendation: "BUY",
		Logo:           "https://logo.clearbit.com/meta.com",
		Overview:       "Meta Platforms, Inc. focuses on building products that enable people to connect and share through mobile devices, personal computers, virtual reality headsets, and wearables. It operates in two segments: Family of Apps (Facebook, Instagram, Messenger, WhatsApp) and Reality Labs (VR/AR hardware).",
	},
	"NFLX": {
		Ticker:         "NFLX",
		CompanyName:    "Netflix Inc.",
		Sector:         "Communication Services",
		Industry:       "Entertainment",
		MarketCap:      "268.4 Billion",
		CurrentPrice:   620.30,
		DailyChange:    8.45,
		DailyChangePct: 1.38,
		Volume:         "3.5 Million",
		FiftyTwoWHigh:  639.00,
		FiftyTwoWLow:   382.00,
		PERatio:        43.2,
		EPS:            14.35,
		Revenue:        "9.37 Billion",
		DebtRatio:      0.65,
		AIScore:        80,
		Recommendation: "BUY",
		Logo:           "https://logo.clearbit.com/netflix.com",
		Overview:       "Netflix, Inc. provides entertainment services with paid memberships in approximately 190 countries. It offers TV series, documentaries, feature films, and mobile games across various genres and languages. It allows members to watch content through internet-connected screens.",
	},
}

// V1Controller implements API endpoints for module 3
type V1Controller struct {
	db            *gorm.DB
	analysisRepo  repositories.AnalysisRepository
	watchlistRepo repositories.WatchlistRepository
	agentRepo     repositories.AgentRepository
	wsHub         *websocket.Hub
}

func NewV1Controller(
	db *gorm.DB,
	analysisRepo repositories.AnalysisRepository,
	watchlistRepo repositories.WatchlistRepository,
	agentRepo repositories.AgentRepository,
	wsHub *websocket.Hub,
) *V1Controller {
	return &V1Controller{
		db:            db,
		analysisRepo:  analysisRepo,
		watchlistRepo: watchlistRepo,
		agentRepo:     agentRepo,
		wsHub:         wsHub,
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
		Ticker string `json:"ticker" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.BadRequestError(c, "Valid ticker parameter is required in request body")
		return
	}

	ticker := strings.ToUpper(req.Ticker)
	stock, exists := StockCatalog[ticker]
	if !exists {
		errors.BadRequestError(c, "Requested stock ticker is not in catalog: "+ticker)
		return
	}

	sessionID := uuid.New()

	// 1. Create AnalysisSession record
	session := &models.AnalysisSession{
		ID:              sessionID,
		UserID:          userID,
		Ticker:          ticker,
		CompanyName:     stock.CompanyName,
		Recommendation:  "HOLD", // Initial placeholder
		ConfidenceScore: 0,
		RiskLevel:       "MEDIUM",
		Summary:         "Multi-agent committee audit initiated in background...",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	if err := ctrl.analysisRepo.CreateSession(session); err != nil {
		errors.InternalServerError(c, "Failed to register analysis session: "+err.Error())
		return
	}

	// 2. Start simulation goroutine
	go ctrl.runSimulatedCommittee(session, stock)

	c.JSON(http.StatusAccepted, gin.H{
		"status":       "started",
		"session_id":   session.ID,
		"ticker":       ticker,
		"company_name": stock.CompanyName,
	})
}

// GetAnalysisDetails handles GET /api/v1/analysis/:id
func (ctrl *V1Controller) GetAnalysisDetails(c *gin.Context) {
	idStr := c.Param("id")
	sessionID, err := uuid.Parse(idStr)
	if err != nil {
		errors.BadRequestError(c, "Invalid analysis session ID format")
		return
	}

	session, err := ctrl.analysisRepo.GetSessionByID(sessionID)
	if err != nil {
		errors.BadRequestError(c, "Analysis session not found: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, session)
}

// GetAgentMessages handles GET /api/v1/analysis/:id/agents
func (ctrl *V1Controller) GetAgentMessages(c *gin.Context) {
	idStr := c.Param("id")
	sessionID, err := uuid.Parse(idStr)
	if err != nil {
		errors.BadRequestError(c, "Invalid analysis session ID format")
		return
	}

	messages, err := ctrl.analysisRepo.GetAgentMessages(sessionID)
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve agent debate logs: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, messages)
}

// GetRecentAnalyses handles GET /api/v1/analysis/recent
func (ctrl *V1Controller) GetRecentAnalyses(c *gin.Context) {
	sessions, err := ctrl.analysisRepo.GetRecentSessions(10)
	if err != nil {
		errors.InternalServerError(c, "Failed to load recent sessions: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, sessions)
}

// GetWatchlist handles GET /api/v1/watchlist
func (ctrl *V1Controller) GetWatchlist(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	items, err := ctrl.watchlistRepo.GetByUserID(userID)
	if err != nil {
		errors.InternalServerError(c, "Failed to fetch watchlist: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, items)
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

// runSimulatedCommittee steps through agents one by one with delays, broadcasting WebSocket logs
func (ctrl *V1Controller) runSimulatedCommittee(session *models.AnalysisSession, stock StockMockData) {
	log.Printf("[SIM-ANALYSIS] Launching committee debate for ticker: %s", stock.Ticker)

	agents := []struct {
		ID      string
		Name    string
		Type    string // research, analysis, decision, warning, risk
		Task    string
		Message string
		Result  string
	}{
		{
			ID:      "research",
			Name:    "Research Agent",
			Type:    "research",
			Task:    "Initiate fundamental profile audit and market positioning analysis for " + stock.Ticker,
			Message: "Reviewing profit margins, capital expenditure pipelines, and competitive moat strength in " + stock.Sector + "...",
			Result:  "Fundamental profile audited. Stable margins verified with high sector tailwinds.",
		},
		{
			ID:      "news",
			Name:    "News Agent",
			Type:    "analysis",
			Task:    "Scan media coverage, public social metrics, and analyst ratings for " + stock.Ticker,
			Message: "Analyzing recent press statements, regulatory filings, and media sentiment counts...",
			Result:  "Media sentiment score is highly supportive (+0.78 metrics index) on " + stock.Ticker + " compute assets.",
		},
		{
			ID:      "fundamental",
			Name:    "Fundamental Agent",
			Type:    "analysis",
			Task:    "Execute valuation models (discounted cash flow, sector multiples) for " + stock.Ticker,
			Message: "Recalculating PEG ratio, forward P/E of " + stock.Ticker + " and EPS trends relative to revenue targets...",
			Result:  "Valuation metrics processed. Fair value indicators imply positive growth upside.",
		},
		{
			ID:      "technical",
			Name:    "Technical Agent",
			Type:    "analysis",
			Task:    "Audit pricing charts, EMA crossovers, and volume indices for " + stock.Ticker,
			Message: "Checking support bounds and breakout resistances relative to short-term moving averages...",
			Result:  "Technical breakout markers verified above standard support threshold.",
		},
		{
			ID:      "risk",
			Name:    "Risk Agent",
			Type:    "risk",
			Task:    "Assess downside risk, systemic beta, and volatility exposure indices",
			Message: "Modeling Value-at-Risk (VaR) scenarios and debt-to-equity leverage metrics under standard stress...",
			Result:  "Volatility metrics aligned within compliance limits; downside debt exposures minimized.",
		},
		{
			ID:      "committee",
			Name:    "Committee Agent",
			Type:    "decision",
			Task:    "Consolidate individual agent findings and synthesize advisory recommendation",
			Message: "Aggregating analyst ratings and weighting agent signal outputs for consensus resolution...",
			Result:  "Committee review finalized. Signal resolution matched: " + stock.Recommendation + ".",
		},
	}

	for _, a := range agents {
		// Update DB status of the agent
		_ = ctrl.agentRepo.UpdateStatus(a.Name, "thinking")

		// Broadcast Agent Started Event
		ctrl.wsHub.Broadcast("agent_started", websocket.AgentStartedEvent{
			AgentID:   a.ID,
			AgentName: a.Name,
			Task:      a.Task,
			Timestamp: time.Now(),
		})

		time.Sleep(900 * time.Millisecond)

		// Update DB status to analyzing
		_ = ctrl.agentRepo.UpdateStatus(a.Name, "analyzing")

		// Broadcast Agent Message
		ctrl.wsHub.Broadcast("agent_message", websocket.AgentMessageEvent{
			AgentID:   a.ID,
			AgentName: a.Name,
			Message:   a.Message,
			Status:    "RUNNING",
			Timestamp: time.Now(),
		})

		// Save agent message to DB
		_, _ = ctrl.analysisRepo.LogAgentMessage(session.ID, a.Name, a.Message, a.Type)

		time.Sleep(1000 * time.Millisecond)

		// Update DB status to completed
		_ = ctrl.agentRepo.UpdateStatus(a.Name, "completed")

		// Broadcast Agent Completed Event
		ctrl.wsHub.Broadcast("agent_completed", websocket.AgentCompletedEvent{
			AgentID:   a.ID,
			AgentName: a.Name,
			Status:    "SUCCESS",
			Result:    a.Result,
			Timestamp: time.Now(),
		})

		// Save completed result log to DB
		_, _ = ctrl.analysisRepo.LogAgentMessage(session.ID, a.Name, a.Result, a.Type)

		time.Sleep(300 * time.Millisecond)
	}

	// 3. Finalize Session Recommendation
	riskLvl := "LOW"
	if stock.DebtRatio > 0.8 || stock.PERatio > 50.0 {
		riskLvl = "HIGH"
	} else if stock.DebtRatio > 0.4 || stock.PERatio > 30.0 {
		riskLvl = "MEDIUM"
	}

	// Calculate a realistic target price based on upside/downside
	upsideMult := 1.05
	if stock.Recommendation == "BUY" {
		upsideMult = 1.10 + rand.Float64()*0.05
	} else if stock.Recommendation == "SELL" {
		upsideMult = 0.85 + rand.Float64()*0.05
	} else {
		upsideMult = 0.98 + rand.Float64()*0.04
	}
	targetPrice := stock.CurrentPrice * upsideMult

	// Update session details
	session.Recommendation = stock.Recommendation
	session.ConfidenceScore = stock.AIScore
	session.RiskLevel = riskLvl
	session.Summary = "Stockox AI committee completed structured evaluation. The final consensus score is " +
		strings.ToUpper(stock.Recommendation) + " with a rating of " + stock.Recommendation +
		". Supporting indicators include bullish technical momentum, strong media sentiment and low volatility index."

	// Update DB record
	ctrl.db.Save(session)

	// Also insert target price in recommendations table
	rec := models.Recommendation{
		ID:                uuid.New(),
		AnalysisSessionID: session.ID,
		Ticker:            stock.Ticker,
		Recommendation:    stock.Recommendation,
		ConfidenceScore:   stock.AIScore,
		TargetPrice:       targetPrice,
		RiskLevel:         riskLvl,
		CreatedAt:         time.Now(),
	}
	ctrl.db.Create(&rec)

	// Broadcast Analysis Completed Event
	ctrl.wsHub.Broadcast("analysis_completed", websocket.AnalysisCompletedEvent{
		Ticker:          stock.Ticker,
		Recommendation:  stock.Recommendation,
		ConfidenceScore: stock.AIScore,
		RiskLevel:       riskLvl,
		Timestamp:       time.Now(),
	})

	log.Printf("[SIM-ANALYSIS] Committee audit complete for %s. Signals compiled.", stock.Ticker)
}
