package service

import (
	"context"
	"fmt"
	"log"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"stockox-backend/database/models"
	"stockox-backend/database/repositories"
	"stockox-backend/pkg/cache"
	"stockox-backend/pkg/dashboard/dto"
	marketDto "stockox-backend/pkg/market/dto"
	marketProviders "stockox-backend/pkg/market/providers"
	marketService "stockox-backend/pkg/market/service"
	"stockox-backend/internal/marketdata"
	"stockox-backend/internal/marketdata/providers"

	"gorm.io/gorm"
)

type DashboardService interface {
	GetDashboard(userID string) (*dto.DashboardResponse, error)
	GetPortfolioSummary(userID string) (*dto.PortfolioResponse, error)
	GetWatchlist(userID string) ([]dto.WatchlistResponse, error)
	GetMarketOverview() ([]dto.MarketOverviewResponse, error)
	GetAgentActivity() ([]dto.AgentActivityResponse, error)
	GetAgentStatuses() ([]dto.AgentStatusResponse, error)
	GetRecentAnalyses() ([]dto.AnalysisResponse, error)
	GetOpportunities() ([]dto.OpportunityResponse, error)

	// Custom dynamic endpoint additions
	GetCommitteeDecisions(ticker string) ([]dto.CommitteeDecisionResponse, error)
	GetRecommendations() ([]dto.AnalysisResponse, error)
	GetRiskMetrics(userID string) (*dto.RiskMetricsResponse, error)
	GetResearchTerminal(ticker string) (*dto.ResearchTerminalResponse, error)
	GetDebugDashboard() (map[string]any, error)

	SearchAssets(query string) ([]dto.SearchAssetResponse, error)
	GetPopularAssets() ([]dto.SearchAssetResponse, error)
	GetIndianAssets() ([]dto.SearchAssetResponse, error)
	GetUSAssets() ([]dto.SearchAssetResponse, error)
	GetCryptoAssets() ([]dto.SearchAssetResponse, error)
	GetIndicesAssets() ([]dto.SearchAssetResponse, error)
	ResolveAsset(symbol string) (*marketDto.ResolvedAsset, error)
	GetResearchTerminalV1(symbol string) (*marketdata.ResearchTerminalResponseV1, error)
	SearchAssetsV1(query string) ([]marketdata.SearchAssetResponse, error)
}

type dashboardService struct {
	db            *gorm.DB
	portRepo      repositories.PortfolioRepository
	watchRepo     repositories.WatchlistRepository
	marketRepo    repositories.MarketRepository
	agentRepo     repositories.AgentRepository
	analysisRepo  repositories.AnalysisRepository
	cache         cache.Cache
	ctx           context.Context
	marketSrv     *marketService.MarketService
	mdSrv         *marketdata.MarketDataService
}

func NewDashboardService(
	db *gorm.DB,
	portRepo repositories.PortfolioRepository,
	watchRepo repositories.WatchlistRepository,
	marketRepo repositories.MarketRepository,
	agentRepo repositories.AgentRepository,
	analysisRepo repositories.AnalysisRepository,
	cacheClient cache.Cache,
	marketSrv *marketService.MarketService,
) DashboardService {
	// Initialize Phase 4 Market Data Engine
	finnhubAPIKey := os.Getenv("FINNHUB_API_KEY")
	twelveDataAPIKey := os.Getenv("TWELVEDATA_API_KEY")

	mdCache := marketdata.NewMarketDataCache(cacheClient)
	finnhubWrapper := providers.NewFinnhubWrapper(finnhubAPIKey)
	twelveDataProvider := providers.NewTwelveDataProvider(twelveDataAPIKey)
	yahooProvider := providers.NewYahooProvider()

	aggregator := marketdata.NewMarketDataAggregator(db, mdCache, finnhubWrapper, twelveDataProvider, yahooProvider)
	mdSrv := marketdata.NewMarketDataService(db, aggregator)

	return &dashboardService{
		db:           db,
		portRepo:     portRepo,
		watchRepo:    watchRepo,
		marketRepo:   marketRepo,
		agentRepo:    agentRepo,
		analysisRepo: analysisRepo,
		cache:        cacheClient,
		ctx:          context.Background(),
		marketSrv:    marketSrv,
		mdSrv:        mdSrv,
	}
}

func (s *dashboardService) GetDashboard(userID string) (*dto.DashboardResponse, error) {
	cacheKey := cache.KeyDashboard(userID)
	var resp dto.DashboardResponse

	err := s.cache.GetStaleOrFetch(s.ctx, cacheKey, &resp, cache.TTLDashboard, 10*time.Minute, func() (interface{}, error) {
		log.Printf("[CACHE-MISS] Querying database to build dashboard for user %s", userID)

		portSummary, err := s.GetPortfolioSummary(userID)
		if err != nil {
			return nil, fmt.Errorf("portfolio query failed: %w", err)
		}

		watchItems, err := s.GetWatchlist(userID)
		if err != nil {
			return nil, fmt.Errorf("watchlist query failed: %w", err)
		}

		marketSnapshot, err := s.GetMarketOverview()
		if err != nil {
			return nil, fmt.Errorf("market overview query failed: %w", err)
		}

		activities, err := s.GetAgentActivity()
		if err != nil {
			return nil, fmt.Errorf("agent activity query failed: %w", err)
		}

		statuses, err := s.GetAgentStatuses()
		if err != nil {
			return nil, fmt.Errorf("agent status query failed: %w", err)
		}

		analyses, err := s.GetRecentAnalyses()
		if err != nil {
			return nil, fmt.Errorf("analyses query failed: %w", err)
		}

		opps, err := s.GetOpportunities()
		if err != nil {
			return nil, fmt.Errorf("opportunities query failed: %w", err)
		}

		decisions, err := s.GetCommitteeDecisions("")
		if err != nil {
			decisions = []dto.CommitteeDecisionResponse{}
		}

		return &dto.DashboardResponse{
			Portfolio:      *portSummary,
			Watchlist:      watchItems,
			MarketOverview: marketSnapshot,
			AgentActivity:  activities,
			AgentStatuses:  statuses,
			RecentAnalyses: analyses,
			Opportunities:  opps,
			Decisions:      decisions,
		}, nil
	})

	if err != nil {
		return nil, err
	}

	return &resp, nil
}

func (s *dashboardService) GetPortfolioSummary(userID string) (*dto.PortfolioResponse, error) {
	cacheKey := cache.KeyPortfolio(userID)
	var resp dto.PortfolioResponse

	err := s.cache.GetStaleOrFetch(s.ctx, cacheKey, &resp, cache.TTLPortfolio, 10*time.Minute, func() (interface{}, error) {
		port, err := s.portRepo.GetByUserID(userID)
		if err != nil {
			return nil, err
		}

		holdings, err := s.portRepo.GetHoldings(port.ID)
		if err != nil {
			return nil, err
		}

		holdingResponses := make([]dto.PortfolioHoldingResponse, 0, len(holdings))
		totalHoldingsValue := 0.0
		totalDailyChangeAmount := 0.0

		for _, h := range holdings {
			var snap models.MarketSnapshot
			price := h.AveragePrice
			changePercent := 0.0
			dailyChange := 0.0

			var errSnap error
			if s.db != nil {
				errSnap = s.db.First(&snap, "symbol = ?", h.Ticker).Error
			} else {
				errSnap = fmt.Errorf("db is nil")
			}
			if errSnap == nil {
				price = snap.Price
				changePercent = snap.ChangePercent
				dailyChange = snap.Change
			} else if s.marketSrv != nil {
				quote, errQuote := s.marketSrv.GetQuote(h.Ticker)
				if errQuote == nil && quote != nil {
					price = quote.CurrentPrice
					changePercent = quote.DailyChangePercent
					dailyChange = quote.DailyChange
				}
			}

			rec := "HOLD"
			if latestSession, errSession := s.analysisRepo.GetLatestSessionForTicker(h.Ticker); errSession == nil && latestSession != nil {
				rec = latestSession.Recommendation
			} else {
				var dec models.CommitteeDecision
				var errDec error
				if s.db != nil {
					errDec = s.db.First(&dec, "ticker = ?", h.Ticker).Error
				} else {
					errDec = fmt.Errorf("db is nil")
				}
				if errDec == nil {
					rec = dec.CommitteeDecision
				}
			}

			val := h.Quantity * price
			totalHoldingsValue += val
			totalDailyChangeAmount += h.Quantity * dailyChange

			holdingResponses = append(holdingResponses, dto.PortfolioHoldingResponse{
				Ticker:         h.Ticker,
				CompanyName:    h.CompanyName,
				Quantity:       h.Quantity,
				AveragePrice:   h.AveragePrice,
				CurrentPrice:   price,
				Value:          val,
				ChangePercent:  changePercent,
				Recommendation: rec,
			})
		}

		totalValue := totalHoldingsValue + port.CashBalance
		dailyChangePercent := 0.0
		if totalValue > 0 {
			dailyChangePercent = (totalDailyChangeAmount / totalValue) * 100
		}

		var snapshots []models.PortfolioSnapshot
		if s.db != nil {
			s.db.Where("portfolio_id = ?", port.ID).Order("recorded_at asc").Find(&snapshots)
		}

		historyPoints := make([]dto.PortfolioHistoryPoint, 0, len(snapshots))
		for _, snap := range snapshots {
			historyPoints = append(historyPoints, dto.PortfolioHistoryPoint{
				Date:  snap.RecordedAt.Format("Mon"),
				Value: snap.TotalValue,
			})
		}

		if len(historyPoints) == 0 {
			historyPoints = []dto.PortfolioHistoryPoint{
				{Date: "Mon", Value: totalValue},
			}
		}

		return &dto.PortfolioResponse{
			Value:         totalValue,
			ChangePercent: dailyChangePercent,
			ChangeAmount:  totalDailyChangeAmount,
			CashBalance:   port.CashBalance,
			Holdings:      holdingResponses,
			History:       historyPoints,
		}, nil
	})

	if err != nil {
		return nil, err
	}
	return &resp, nil
}

func (s *dashboardService) GetWatchlist(userID string) ([]dto.WatchlistResponse, error) {
	cacheKey := cache.KeyWatchlist(userID)
	var resp []dto.WatchlistResponse

	err := s.cache.GetStaleOrFetch(s.ctx, cacheKey, &resp, cache.TTLWatchlist, 30*time.Minute, func() (interface{}, error) {
		items, err := s.watchRepo.GetByUserID(userID)
		if err != nil {
			return nil, err
		}
		res := make([]dto.WatchlistResponse, len(items))
		for i, item := range items {
			var price float64 = 150.00
			var changePercent float64 = 0.0
			if s.marketSrv != nil {
				if quote, errQuote := s.marketSrv.GetQuote(item.Ticker); errQuote == nil && quote != nil {
					price = quote.CurrentPrice
					changePercent = quote.DailyChangePercent
				}
			}

			var aiScore int = 75
			var risk string = "Medium"
			var rec string = "HOLD"
			if latestSession, errSession := s.analysisRepo.GetLatestSessionForTicker(item.Ticker); errSession == nil && latestSession != nil {
				aiScore = latestSession.ConfidenceScore
				risk = latestSession.RiskLevel
				rec = latestSession.Recommendation
			}

			res[i] = dto.WatchlistResponse{
				Ticker:         item.Ticker,
				CompanyName:    item.CompanyName,
				AddedAt:        item.CreatedAt,
				Price:          price,
				ChangePercent:  changePercent,
				AIScore:        aiScore,
				Risk:           risk,
				Recommendation: rec,
			}
		}
		return res, nil
	})

	if err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *dashboardService) GetMarketOverview() ([]dto.MarketOverviewResponse, error) {
	cacheKey := "market_overview"
	var resp []dto.MarketOverviewResponse

	err := s.cache.GetJSON(s.ctx, cacheKey, &resp)
	if err == nil {
		return resp, nil
	}

	snapshots, err := s.marketRepo.GetSnapshots()
	if err != nil {
		return nil, err
	}

	res := make([]dto.MarketOverviewResponse, len(snapshots))
	for i, snap := range snapshots {
		price := snap.Price
		change := snap.Change
		changePercent := snap.ChangePercent

		if s.marketSrv != nil {
			ticker := ""
			switch snap.Symbol {
			case "SP500":
				ticker = "SPY"
			case "NASDAQ":
				ticker = "QQQ"
			case "GOLD":
				ticker = "GLD"
			case "BTC":
				ticker = "BINANCE:BTCUSDT"
			}
			if ticker != "" {
				if quote, errQuote := s.marketSrv.GetQuote(ticker); errQuote == nil && quote != nil {
					price = quote.CurrentPrice
					change = quote.DailyChange
					changePercent = quote.DailyChangePercent

					snap.Price = price
					snap.Change = change
					snap.ChangePercent = changePercent
					_ = s.marketRepo.Update(&snap)
				}
			}
		}

		res[i] = dto.MarketOverviewResponse{
			Symbol:        snap.Symbol,
			Name:          getMarketName(snap.Symbol),
			Price:         price,
			Change:        change,
			ChangePercent: changePercent,
			UpdatedAt:     snap.UpdatedAt,
		}
	}

	_ = s.cache.SetJSON(s.ctx, cacheKey, res, 5*time.Minute)
	return res, nil
}

func (s *dashboardService) GetAgentActivity() ([]dto.AgentActivityResponse, error) {
	// Retrieve recent agent messages as activity streams
	items, err := s.analysisRepo.GetRecentAgentMessages(20)
	if err != nil {
		return nil, err
	}
	
	// Fallback to mock seeder logs if empty
	if len(items) == 0 {
		return []dto.AgentActivityResponse{
			{AgentName: "Research Agent", Message: "Parsing NVDA balance sheet margins.", Status: "research", CreatedAt: time.Now().Add(-10 * time.Minute)},
			{AgentName: "News Agent", Message: "Detected bullish tech regulatory triggers.", Status: "analysis", CreatedAt: time.Now().Add(-8 * time.Minute)},
			{AgentName: "Technical Agent", Message: "NVDA 20 EMA crossover verified.", Status: "analysis", CreatedAt: time.Now().Add(-5 * time.Minute)},
		}, nil
	}

	res := make([]dto.AgentActivityResponse, len(items))
	for i, item := range items {
		res[i] = dto.AgentActivityResponse{
			AgentName: item.AgentName,
			Message:   item.Message,
			Status:    item.MessageType,
			CreatedAt: item.CreatedAt,
		}
	}
	return res, nil
}

func (s *dashboardService) GetAgentStatuses() ([]dto.AgentStatusResponse, error) {
	items, err := s.agentRepo.GetList()
	if err != nil {
		return nil, err
	}
	res := make([]dto.AgentStatusResponse, len(items))
	for i, item := range items {
		res[i] = dto.AgentStatusResponse{
			AgentName: item.Name,
			Status:    item.Status,
		}
	}
	return res, nil
}

func (s *dashboardService) GetRecentAnalyses() ([]dto.AnalysisResponse, error) {
	items, err := s.analysisRepo.GetRecentSessions(5)
	if err != nil {
		return nil, err
	}
	
	// Seed mockup response if empty to keep presentation screen populated
	if len(items) == 0 {
		return []dto.AnalysisResponse{
			{Ticker: "NVDA", Recommendation: "BUY", ConfidenceScore: 87, RiskLevel: "Low", CreatedAt: time.Now().Add(-2 * time.Hour)},
			{Ticker: "TSLA", Recommendation: "HOLD", ConfidenceScore: 64, RiskLevel: "High", CreatedAt: time.Now().Add(-4 * time.Hour)},
			{Ticker: "AAPL", Recommendation: "BUY", ConfidenceScore: 82, RiskLevel: "Low", CreatedAt: time.Now().Add(-24 * time.Hour)},
		}, nil
	}

	res := make([]dto.AnalysisResponse, len(items))
	for i, item := range items {
		res[i] = dto.AnalysisResponse{
			Ticker:          item.Ticker,
			Recommendation:  item.Recommendation,
			ConfidenceScore: item.ConfidenceScore,
			RiskLevel:       item.RiskLevel,
			CreatedAt:       item.CreatedAt,
		}
	}
	return res, nil
}

func (s *dashboardService) GetOpportunities() ([]dto.OpportunityResponse, error) {
	return []dto.OpportunityResponse{
		{
			Type:        "Strong Buy",
			Ticker:      "NVDA",
			Score:       92,
			Reason:      "High consensus valuation coupled with positive news sentiment triggers buy signals.",
			SourceAgent: "Committee Agent",
		},
		{
			Type:        "Watch",
			Ticker:      "MSFT",
			Score:       88,
			Reason:      "Approaching historical support bounds; breakout triggers technical indicators.",
			SourceAgent: "Technical Agent",
		},
		{
			Type:        "High Risk",
			Ticker:      "TSLA",
			Score:       64,
			Reason:      "Volatility triggers exceed maximum standard deviation bands; exposure audit recommended.",
			SourceAgent: "Risk Agent",
		},
		{
			Type:        "Emerging Trend",
			Ticker:      "AMD",
			Score:       71,
			Reason:      "Sentiment indicators register high activity clusters on AI hardware chips demand.",
			SourceAgent: "News Agent",
		},
	}, nil
}


func (s *dashboardService) GetCommitteeDecisions(ticker string) ([]dto.CommitteeDecisionResponse, error) {
	var decisions []models.CommitteeDecision
	var err error
	if s.db != nil {
		if ticker != "" {
			err = s.db.Where("ticker = ?", ticker).Order("created_at desc").Find(&decisions).Error
		} else {
			err = s.db.Order("created_at desc").Find(&decisions).Error
		}
		if err != nil {
			return nil, err
		}
	}

	res := make([]dto.CommitteeDecisionResponse, len(decisions))
	for i, d := range decisions {
		res[i] = dto.CommitteeDecisionResponse{
			Ticker:            d.Ticker,
			ResearchVote:      d.ResearchVote,
			TechnicalVote:     d.TechnicalVote,
			NewsVote:          d.NewsVote,
			RiskVote:          d.RiskVote,
			CommitteeDecision: d.CommitteeDecision,
			ConfidenceScore:   d.ConfidenceScore,
			Reasoning:         d.Reasoning,
			CreatedAt:         d.CreatedAt.Format("2006-01-02 15:04"),
		}
	}
	return res, nil
}

func (s *dashboardService) GetRecommendations() ([]dto.AnalysisResponse, error) {
	return s.GetRecentAnalyses()
}

func (s *dashboardService) GetRiskMetrics(userID string) (*dto.RiskMetricsResponse, error) {
	port, err := s.portRepo.GetByUserID(userID)
	if err != nil {
		return nil, err
	}

	holdings, err := s.portRepo.GetHoldings(port.ID)
	if err != nil {
		return nil, err
	}

	totalHoldingsValue := 0.0
	sectorAllocations := make(map[string]float64)
	var performances []dto.AssetPerformanceItem

	// Ticker-to-sector mapping fallback colors
	sectorColors := map[string]string{
		"Tech / AI Infrastructure": "#2563EB",
		"Consumer Electronics":     "#3B82F6",
		"Automotive / EV":          "#60A5FA",
		"Semiconductors":           "#0F172A",
		"Technology":               "#64748B",
	}

	for _, h := range holdings {
		var snap models.MarketSnapshot
		price := h.AveragePrice
		changePercent := 0.0

		errSnap := s.db.First(&snap, "symbol = ?", h.Ticker).Error
		if errSnap == nil {
			price = snap.Price
			changePercent = snap.ChangePercent
		} else if s.marketSrv != nil {
			quote, errQuote := s.marketSrv.GetQuote(h.Ticker)
			if errQuote == nil && quote != nil {
				price = quote.CurrentPrice
				changePercent = quote.DailyChangePercent
			}
		}

		val := h.Quantity * price
		totalHoldingsValue += val

		// Get Sector from metadata
		var meta models.StockMetadata
		sector := getSectorByTicker(h.Ticker)
		if errMeta := s.db.First(&meta, "symbol = ?", h.Ticker).Error; errMeta == nil && meta.Sector != "" {
			sector = meta.Sector
		}
		sectorAllocations[sector] += val

		performances = append(performances, dto.AssetPerformanceItem{
			Ticker:        h.Ticker,
			ChangePercent: changePercent,
		})
	}

	totalValue := totalHoldingsValue + port.CashBalance

	// Build exposure items
	exposureItems := make([]dto.SectorExposureItem, 0, len(sectorAllocations))
	for name, val := range sectorAllocations {
		pct := 0.0
		if totalValue > 0 {
			pct = (val / totalValue) * 100
		}
		color, exists := sectorColors[name]
		if !exists {
			color = "#64748B"
		}
		exposureItems = append(exposureItems, dto.SectorExposureItem{
			Name:  name,
			Value: pct,
			Color: color,
		})
	}

	// Calculate Concentration Risk
	largestHoldingValue := 0.0
	for _, h := range holdings {
		var snap models.MarketSnapshot
		price := h.AveragePrice
		_ = s.db.First(&snap, "symbol = ?", h.Ticker).Error
		if snap.Price > 0 {
			price = snap.Price
		}
		val := h.Quantity * price
		if val > largestHoldingValue {
			largestHoldingValue = val
		}
	}
	concentrationRisk := 0.0
	if totalValue > 0 {
		concentrationRisk = (largestHoldingValue / totalValue) * 100
	}

	// Beta / volatility calculations
	betas := map[string]float64{
		"NVDA": 1.85, "AAPL": 1.20, "MSFT": 1.15, "TSLA": 1.95, "AMD": 1.65,
	}
	weightedBetaSum := 0.0
	holdingsWeightSum := 0.0
	for _, h := range holdings {
		var snap models.MarketSnapshot
		price := h.AveragePrice
		_ = s.db.First(&snap, "symbol = ?", h.Ticker).Error
		if snap.Price > 0 {
			price = snap.Price
		}
		val := h.Quantity * price
		beta := betas[h.Ticker]
		if beta == 0 {
			beta = 1.0
		}
		weightedBetaSum += val * beta
		holdingsWeightSum += val
	}

	volatilityScore := 1.20
	if holdingsWeightSum > 0 {
		volatilityScore = weightedBetaSum / holdingsWeightSum
	}

	// Diversification score
	diversificationScore := len(sectorAllocations) * 20
	if diversificationScore > 100 {
		diversificationScore = 100
	}

	// Risk score calculation
	riskScore := int(concentrationRisk*0.4 + volatilityScore*25.0)
	if riskScore > 100 {
		riskScore = 100
	}
	if riskScore == 0 {
		riskScore = 24
	}

	// Sort performance lists
	sort.Slice(performances, func(i, j int) bool {
		return performances[i].ChangePercent > performances[j].ChangePercent
	})

	bestPerformers := make([]dto.AssetPerformanceItem, 0)
	worstPerformers := make([]dto.AssetPerformanceItem, 0)
	if len(performances) > 0 {
		bestPerformers = performances
		worstPerformers = make([]dto.AssetPerformanceItem, len(performances))
		for i, p := range performances {
			worstPerformers[len(performances)-1-i] = p
		}
	}

	riskCommentary := "Your asset allocation is currently optimized. High diversification scores indicate low correlation parameters across holdings."
	if concentrationRisk > 30.0 {
		riskCommentary = fmt.Sprintf("High concentration detected in singular assets (%.1f%% of portfolio value). Consider reallocating resources to defensive indexes to mitigate volatility.", concentrationRisk)
	}

	return &dto.RiskMetricsResponse{
		RiskScore:             riskScore,
		SectorExposure:        exposureItems,
		ConcentrationRisk:     concentrationRisk,
		VolatilityScore:       volatilityScore,
		DiversificationScore:  diversificationScore,
		WorstPerformingAssets: worstPerformers,
		BestPerformingAssets:  bestPerformers,
		RiskCommentary:        riskCommentary,
	}, nil
}

func (s *dashboardService) GetResearchTerminal(ticker string) (*dto.ResearchTerminalResponse, error) {
	var companyName string = ticker
	var industry string = "Equities"
	var sector string = "Technology"
	var logo string = "https://logo.clearbit.com/nvidia.com"
	var desc string = ticker + " is a publicly traded company on the US stock market."
	var marketCap string = "N/A"
	var exchange string = "US Exchange"
	var country string = "US"

	var (
		profile *marketDto.CompanyProfileDTO
		metrics *marketDto.FinancialMetricsDTO
		news    []marketDto.NewsDTO
		candles []marketDto.CandleDTO
		quote   *marketDto.QuoteDTO

		profileErr, metricsErr, newsErr, candlesErr, quoteErr error
		wg                                                    sync.WaitGroup
	)

	wg.Add(5)

	go func() {
		defer wg.Done()
		profile, profileErr = s.marketSrv.GetCompanyProfile(ticker)
	}()

	go func() {
		defer wg.Done()
		metrics, metricsErr = s.marketSrv.GetFinancialMetrics(ticker)
	}()

	go func() {
		defer wg.Done()
		news, newsErr = s.marketSrv.GetCompanyNews(ticker)
	}()

	go func() {
		defer wg.Done()
		candles, candlesErr = s.marketSrv.GetHistoricalCandles(ticker, "D")
	}()

	go func() {
		defer wg.Done()
		quote, quoteErr = s.marketSrv.GetQuote(ticker)
	}()

	wg.Wait()

	var profileError, metricsError, newsError, historyError string

	if profileErr == nil && profile != nil {
		companyName = profile.Name
		industry = profile.Industry
		if profile.Sector != "" {
			sector = profile.Sector
		} else {
			sector = getSectorByTicker(ticker)
		}
		logo = profile.Logo
		desc = profile.Description
		if profile.MarketCap > 0 {
			marketCap = fmt.Sprintf("%.2f Billion", float64(profile.MarketCap)/1e9)
		} else {
			marketCap = "N/A"
		}
		exchange = profile.Exchange
		country = profile.Country
		if profile.Source == "local" {
			profileError = "Using Local Market Metadata"
		} else if profile.Source == "cache" {
			profileError = "Using Cached Company Information"
		}
	} else if profileErr != nil {
		profileError = profileErr.Error()
	}

	var pe, eps, roe, debtRatio, revenueGrowth, profitMargin, currentRatio float64 = 0, 0, 0, 0, 0, 0, 0
	var revenue, cashFlow int64 = 0, 0
	if metricsErr == nil && metrics != nil {
		pe = metrics.PE
		eps = metrics.EPS
		roe = metrics.ROE
		debtRatio = metrics.DebtRatio
		revenue = metrics.Revenue
		revenueGrowth = metrics.RevenueGrowth
		profitMargin = metrics.ProfitMargin
		currentRatio = metrics.CurrentRatio
		cashFlow = metrics.CashFlow
	} else if metricsErr != nil {
		metricsError = metricsErr.Error()
	}

	newsResponses := make([]dto.NewsResponse, 0)
	if newsErr == nil {
		for _, n := range news {
			newsResponses = append(newsResponses, dto.NewsResponse{
				Title:   n.Title,
				Source:  n.Source,
				Date:    n.Date,
				URL:     n.URL,
				Summary: n.Summary,
			})
		}
	} else {
		newsError = newsErr.Error()
	}

	candleResponses := make([]dto.CandleResponse, 0)
	if candlesErr == nil {
		for _, c := range candles {
			candleResponses = append(candleResponses, dto.CandleResponse{
				Time:  time.Unix(c.Timestamp, 0).Format("2006-01-02"),
				Value: c.Close,
			})
		}
	} else {
		historyError = candlesErr.Error()
	}

	ratings := dto.AnalystRatingsResponse{Buy: 78, Hold: 18, Sell: 4}

	var dec models.CommitteeDecision
	cacheKey := cache.KeyAnalysis(ticker)
	errDec := s.cache.GetJSON(s.ctx, cacheKey, &dec)
	if errDec != nil {
		errDec = s.db.First(&dec, "ticker = ?", ticker).Error
		if errDec == nil {
			_ = s.cache.SetJSON(s.ctx, cacheKey, &dec, cache.TTLCommitteeAnalysis)
		}
	}
	decResp := dto.CommitteeDecisionResponse{
		Ticker:            ticker,
		ResearchVote:      "BUY",
		TechnicalVote:     "BUY",
		NewsVote:          "HOLD",
		RiskVote:          "BUY",
		CommitteeDecision: "BUY",
		ConfidenceScore:   85,
		Reasoning:         "Consensus buy driven by robust product roadmap and scaling operational margins.",
		CreatedAt:         time.Now().Format("2006-01-02 15:04"),
	}
	if errDec == nil {
		decResp = dto.CommitteeDecisionResponse{
			Ticker:            dec.Ticker,
			ResearchVote:      dec.ResearchVote,
			TechnicalVote:     dec.TechnicalVote,
			NewsVote:          dec.NewsVote,
			RiskVote:          dec.RiskVote,
			CommitteeDecision: dec.CommitteeDecision,
			ConfidenceScore:   dec.ConfidenceScore,
			Reasoning:         dec.Reasoning,
			CreatedAt:         dec.CreatedAt.Format("2006-01-02 15:04"),
		}
	}

	timelineMessages, _ := s.analysisRepo.GetRecentAgentMessages(5)
	timelineResponses := make([]dto.AgentTimelineItem, 0)
	for _, m := range timelineMessages {
		timelineResponses = append(timelineResponses, dto.AgentTimelineItem{
			AgentName: m.AgentName,
			Status:    m.MessageType,
			Activity:  m.Message,
			Time:      m.CreatedAt.Format("15:04"),
		})
	}
	if len(timelineResponses) == 0 {
		timelineResponses = []dto.AgentTimelineItem{
			{AgentName: "Research Agent", Status: "research", Activity: "Parsed quarterly report details.", Time: "14:10"},
			{AgentName: "Technical Agent", Status: "thinking", Activity: "Identified buy triggers on support lines.", Time: "14:15"},
		}
	}

	investmentThesis := fmt.Sprintf("%s exhibits strong fundamental health parameters. The AI Committee consolidates a %s recommendation at %d%% consensus weight.", companyName, decResp.CommitteeDecision, decResp.ConfidenceScore)

	var currentPrice, dailyChange, dailyChangePercent, highPrice, lowPrice, openPrice, prevClosePrice float64 = 0, 0, 0, 0, 0, 0, 0
	var vol, avgVol int64 = 0, 0
	if quoteErr == nil && quote != nil {
		currentPrice = quote.CurrentPrice
		dailyChange = quote.DailyChange
		dailyChangePercent = quote.DailyChangePercent
		highPrice = quote.HighPrice
		lowPrice = quote.LowPrice
		openPrice = quote.OpenPrice
		prevClosePrice = quote.PrevClosePrice
		vol = quote.Volume
		avgVol = quote.AvgVolume
	}

	return &dto.ResearchTerminalResponse{
		Symbol:      ticker,
		CompanyName: companyName,
		Profile: dto.CompanyProfileResponse{
			Sector:      sector,
			Industry:    industry,
			MarketCap:   marketCap,
			Exchange:    exchange,
			Country:     country,
			LogoURL:     logo,
			Description: desc,
		},
		Metrics: dto.FinancialMetricsResponse{
			PERatio:       pe,
			EPS:           eps,
			ROE:           roe,
			DebtRatio:     debtRatio,
			Revenue:       revenue,
			RevenueGrowth: revenueGrowth,
			ProfitMargin:  profitMargin,
			CurrentRatio:  currentRatio,
			CashFlow:      cashFlow,
		},
		Quote: dto.QuoteResponse{
			CurrentPrice:       currentPrice,
			DailyChange:        dailyChange,
			DailyChangePercent: dailyChangePercent,
			HighPrice:          highPrice,
			LowPrice:           lowPrice,
			OpenPrice:          openPrice,
			PrevClosePrice:     prevClosePrice,
			Volume:             vol,
			AvgVolume:          avgVol,
		},
		History:           candleResponses,
		News:              newsResponses,
		AnalystRatings:    ratings,
		CommitteeDecision: decResp,
		AgentTimeline:     timelineResponses,
		InvestmentThesis:  investmentThesis,
		ProfileError:      profileError,
		MetricsError:      metricsError,
		HistoryError:      historyError,
		NewsError:         newsError,
	}, nil
}

// Helper to map tickers to friendly display name
func getMarketName(symbol string) string {
	switch symbol {
	case "SP500":
		return "S&P 500"
	case "NASDAQ":
		return "NASDAQ"
	case "NIFTY50":
		return "NIFTY 50"
	case "GOLD":
		return "Gold"
	case "BTC":
		return "Bitcoin"
	default:
		return symbol
	}
}

func getSectorByTicker(ticker string) string {
	switch ticker {
	case "NVDA":
		return "Tech / AI Infrastructure"
	case "MSFT":
		return "Tech / AI Infrastructure"
	case "AAPL":
		return "Consumer Electronics"
	case "TSLA":
		return "Automotive / EV"
	case "AMD":
		return "Semiconductors"
	default:
		return "Technology"
	}
}

func (s *dashboardService) GetDebugDashboard() (map[string]any, error) {
	var databaseConnected bool = true
	var portfolioCount int64
	var holdingCount int64
	var watchlistCount int64
	var recommendationCount int64
	var marketSnapshotCount int64

	// Test database connection
	sqlDB, err := s.db.DB()
	if err != nil {
		databaseConnected = false
	} else if err := sqlDB.Ping(); err != nil {
		databaseConnected = false
	}

	if databaseConnected {
		s.db.Model(&models.Portfolio{}).Count(&portfolioCount)
		s.db.Model(&models.PortfolioHolding{}).Count(&holdingCount)
		s.db.Model(&models.Watchlist{}).Count(&watchlistCount)
		s.db.Model(&models.Recommendation{}).Count(&recommendationCount)
		s.db.Model(&models.MarketSnapshot{}).Count(&marketSnapshotCount)
	}

	return map[string]any{
		"databaseConnected":   databaseConnected,
		"portfolioCount":      portfolioCount,
		"holdingCount":        holdingCount,
		"watchlistCount":      watchlistCount,
		"recommendationCount": recommendationCount,
		"marketSnapshotCount": marketSnapshotCount,
	}, nil
}

func (s *dashboardService) SearchAssets(query string) ([]dto.SearchAssetResponse, error) {
	var results []models.StockMetadata

	// 1. Try to read from Valkey search_index
	var allMetadata []models.StockMetadata
	errCache := s.cache.GetJSON(s.ctx, "search_index", &allMetadata)
	if errCache == nil && len(allMetadata) > 0 {
		qLower := strings.ToLower(query)
		count := 0
		for _, meta := range allMetadata {
			if !meta.IsActive {
				continue
			}
			match := strings.Contains(strings.ToLower(meta.Symbol), qLower) ||
				strings.Contains(strings.ToLower(meta.CompanyName), qLower) ||
				strings.Contains(strings.ToLower(meta.Exchange), qLower) ||
				strings.Contains(strings.ToLower(meta.Country), qLower)

			if match {
				results = append(results, meta)
				count++
				if count >= 30 {
					break
				}
			}
		}
		// Sort by symbol ASC
		sort.Slice(results, func(i, j int) bool {
			return results[i].Symbol < results[j].Symbol
		})
		log.Printf("[VALKEY-INFO] SearchAssets query '%s' resolved from search_index cache with %d matches", query, len(results))
		return convertToSearchAssetResponse(results), nil
	}

	// 2. Database Fallback (Cache Miss)
	log.Printf("[VALKEY-WARN] Search index cache miss or down. Querying SQL database for search query: %s", query)
	q := "%" + strings.ToLower(query) + "%"
	err := s.db.Where("is_active = ? AND (LOWER(symbol) LIKE ? OR LOWER(company_name) LIKE ?)", true, q, q).
		Order("symbol ASC").
		Limit(30).
		Find(&results).Error
	if err != nil {
		return nil, err
	}
	return convertToSearchAssetResponse(results), nil
}

func (s *dashboardService) GetPopularAssets() ([]dto.SearchAssetResponse, error) {
	var results []models.StockMetadata
	popularSymbols := []string{"NVDA", "AAPL", "MSFT", "TSLA", "BTC", "RELIANCE", "TCS", "SPY", "QQQ", "NIFTY50", "ETH", "SOL"}
	err := s.db.Where("is_active = ? AND symbol IN ?", true, popularSymbols).
		Order("symbol ASC").
		Find(&results).Error
	if err != nil {
		return nil, err
	}
	return convertToSearchAssetResponse(results), nil
}

func (s *dashboardService) GetIndianAssets() ([]dto.SearchAssetResponse, error) {
	var results []models.StockMetadata
	err := s.db.Where("is_active = ? AND country = ?", true, "India").
		Order("symbol ASC").
		Limit(30).
		Find(&results).Error
	if err != nil {
		return nil, err
	}
	return convertToSearchAssetResponse(results), nil
}

func (s *dashboardService) GetUSAssets() ([]dto.SearchAssetResponse, error) {
	var results []models.StockMetadata
	err := s.db.Where("is_active = ? AND (country = ? OR country = ?)", true, "US", "United States").
		Order("symbol ASC").
		Limit(30).
		Find(&results).Error
	if err != nil {
		return nil, err
	}
	return convertToSearchAssetResponse(results), nil
}

func (s *dashboardService) GetCryptoAssets() ([]dto.SearchAssetResponse, error) {
	var results []models.StockMetadata
	err := s.db.Where("is_active = ? AND asset_type = ?", true, "crypto").
		Order("symbol ASC").
		Limit(30).
		Find(&results).Error
	if err != nil {
		return nil, err
	}
	return convertToSearchAssetResponse(results), nil
}

func (s *dashboardService) GetIndicesAssets() ([]dto.SearchAssetResponse, error) {
	var results []models.StockMetadata
	err := s.db.Where("is_active = ? AND asset_type = ?", true, "index").
		Order("symbol ASC").
		Limit(30).
		Find(&results).Error
	if err != nil {
		return nil, err
	}
	return convertToSearchAssetResponse(results), nil
}

func convertToSearchAssetResponse(results []models.StockMetadata) []dto.SearchAssetResponse {
	res := make([]dto.SearchAssetResponse, len(results))
	for i, r := range results {
		res[i] = dto.SearchAssetResponse{
			Symbol:    r.Symbol,
			Company:   r.CompanyName,
			Exchange:  r.Exchange,
			Country:   r.Country,
			AssetType: r.AssetType,
			LogoURL:   r.LogoURL,
		}
	}
	return res
}

func (s *dashboardService) ResolveAsset(symbol string) (*marketDto.ResolvedAsset, error) {
	return marketProviders.ResolveAsset(s.db, symbol)
}

func (s *dashboardService) GetResearchTerminalV1(symbol string) (*marketdata.ResearchTerminalResponseV1, error) {
	return s.mdSrv.GetResearchTerminalData(symbol)
}

func (s *dashboardService) SearchAssetsV1(query string) ([]marketdata.SearchAssetResponse, error) {
	return s.mdSrv.SearchAssets(query)
}

