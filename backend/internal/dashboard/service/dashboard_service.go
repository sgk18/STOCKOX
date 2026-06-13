package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"stockox-backend/database/models"
	"stockox-backend/database/repositories"
	"stockox-backend/internal/dashboard/dto"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type DashboardService interface {
	GetDashboard(userID uuid.UUID) (*dto.DashboardResponse, error)
	GetPortfolioSummary(userID uuid.UUID) (*dto.PortfolioResponse, error)
	GetWatchlist(userID uuid.UUID) ([]dto.WatchlistResponse, error)
	GetMarketOverview() ([]dto.MarketOverviewResponse, error)
	GetAgentActivity() ([]dto.AgentActivityResponse, error)
	GetAgentStatuses() ([]dto.AgentStatusResponse, error)
	GetRecentAnalyses() ([]dto.AnalysisResponse, error)
	GetOpportunities() ([]dto.OpportunityResponse, error)
}

type dashboardService struct {
	portRepo      repositories.PortfolioRepository
	watchRepo     repositories.WatchlistRepository
	marketRepo    repositories.MarketRepository
	agentRepo     repositories.AgentRepository
	analysisRepo  repositories.AnalysisRepository
	rdb           *redis.Client
	ctx           context.Context
}

func NewDashboardService(
	portRepo repositories.PortfolioRepository,
	watchRepo repositories.WatchlistRepository,
	marketRepo repositories.MarketRepository,
	agentRepo repositories.AgentRepository,
	analysisRepo repositories.AnalysisRepository,
	rdb *redis.Client,
) DashboardService {
	return &dashboardService{
		portRepo:     portRepo,
		watchRepo:    watchRepo,
		marketRepo:   marketRepo,
		agentRepo:    agentRepo,
		analysisRepo: analysisRepo,
		rdb:          rdb,
		ctx:          context.Background(),
	}
}

func (s *dashboardService) GetDashboard(userID uuid.UUID) (*dto.DashboardResponse, error) {
	// 1. Try to read from Redis cache
	cacheKey := fmt.Sprintf("dashboard:%s", userID.String())
	if s.rdb != nil {
		if cachedVal, err := s.rdb.Get(s.ctx, cacheKey).Result(); err == nil {
			var resp dto.DashboardResponse
			if err := json.Unmarshal([]byte(cachedVal), &resp); err == nil {
				log.Printf("[CACHE-HIT] Loaded dashboard for user %s from Redis", userID)
				return &resp, nil
			}
		}
	}

	log.Printf("[CACHE-MISS] Querying database to build dashboard for user %s", userID)

	// 2. Fetch all parameters in parallel or sequentially (sequential for clarity and safety in standard Go GORM)
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

	resp := &dto.DashboardResponse{
		Portfolio:      *portSummary,
		Watchlist:      watchItems,
		MarketOverview: marketSnapshot,
		AgentActivity:  activities,
		AgentStatuses:  statuses,
		RecentAnalyses: analyses,
		Opportunities:  opps,
	}

	// 3. Write back to Redis cache (TTL: 60s)
	if s.rdb != nil {
		if serialized, err := json.Marshal(resp); err == nil {
			s.rdb.Set(s.ctx, cacheKey, serialized, 60*time.Second)
		}
	}

	return resp, nil
}

func (s *dashboardService) GetPortfolioSummary(userID uuid.UUID) (*dto.PortfolioResponse, error) {
	port, err := s.portRepo.GetByUserID(userID)
	if err != nil {
		return nil, err
	}
	return &dto.PortfolioResponse{
		Value:              port.TotalValue,
		ChangePercent:      port.DailyChangePercent,
		ChangeAmount:       port.DailyChange,
	}, nil
}

func (s *dashboardService) GetWatchlist(userID uuid.UUID) ([]dto.WatchlistResponse, error) {
	items, err := s.watchRepo.GetByUserID(userID)
	if err != nil {
		return nil, err
	}
	res := make([]dto.WatchlistResponse, len(items))
	for i, item := range items {
		res[i] = dto.WatchlistResponse{
			Ticker:      item.Ticker,
			CompanyName: item.CompanyName,
			AddedAt:     item.CreatedAt,
		}
	}
	return res, nil
}

func (s *dashboardService) GetMarketOverview() ([]dto.MarketOverviewResponse, error) {
	// 1. Try Redis cache
	cacheKey := "market_overview"
	if s.rdb != nil {
		if cachedVal, err := s.rdb.Get(s.ctx, cacheKey).Result(); err == nil {
			var resp []dto.MarketOverviewResponse
			if err := json.Unmarshal([]byte(cachedVal), &resp); err == nil {
				return resp, nil
			}
		}
	}

	// 2. Database query
	snapshots, err := s.marketRepo.GetSnapshots()
	if err != nil {
		return nil, err
	}

	res := make([]dto.MarketOverviewResponse, len(snapshots))
	for i, snap := range snapshots {
		res[i] = dto.MarketOverviewResponse{
			Symbol:        snap.Symbol,
			Name:          getMarketName(snap.Symbol),
			Price:         snap.Price,
			Change:        snap.Change,
			ChangePercent: snap.ChangePercent,
			UpdatedAt:     snap.UpdatedAt,
		}
	}

	// 3. Write cache (TTL: 5 mins)
	if s.rdb != nil {
		if serialized, err := json.Marshal(res); err == nil {
			s.rdb.Set(s.ctx, cacheKey, serialized, 5*time.Minute)
		}
	}

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
