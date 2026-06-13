package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"stockox-backend/internal/agents"
	"stockox-backend/internal/analysis"
	"stockox-backend/internal/dashboard/dto"
	"stockox-backend/internal/market"
	"stockox-backend/internal/portfolio"
	"stockox-backend/internal/watchlist"

	"github.com/redis/go-redis/v9"
)

type DashboardService interface {
	GetDashboard(userID uint) (*dto.DashboardResponse, error)
	GetPortfolioSummary(userID uint) (*dto.PortfolioResponse, error)
	GetWatchlist(userID uint) ([]dto.WatchlistResponse, error)
	GetMarketOverview() ([]dto.MarketOverviewResponse, error)
	GetAgentActivity() ([]dto.AgentActivityResponse, error)
	GetAgentStatuses() ([]dto.AgentStatusResponse, error)
	GetRecentAnalyses() ([]dto.AnalysisResponse, error)
	GetOpportunities() ([]dto.OpportunityResponse, error)
}

type dashboardService struct {
	portRepo      portfolio.PortfolioRepository
	watchRepo     watchlist.WatchlistRepository
	marketRepo    market.MarketRepository
	agentRepo     agents.AgentRepository
	analysisRepo  analysis.AnalysisRepository
	rdb           *redis.Client
	ctx           context.Context
}

func NewDashboardService(
	portRepo portfolio.PortfolioRepository,
	watchRepo watchlist.WatchlistRepository,
	marketRepo market.MarketRepository,
	agentRepo agents.AgentRepository,
	analysisRepo analysis.AnalysisRepository,
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

func (s *dashboardService) GetDashboard(userID uint) (*dto.DashboardResponse, error) {
	// 1. Try to read from Redis cache
	cacheKey := fmt.Sprintf("dashboard:%d", userID)
	if s.rdb != nil {
		if cachedVal, err := s.rdb.Get(s.ctx, cacheKey).Result(); err == nil {
			var resp dto.DashboardResponse
			if err := json.Unmarshal([]byte(cachedVal), &resp); err == nil {
				log.Printf("[CACHE-HIT] Loaded dashboard for user %d from Redis", userID)
				return &resp, nil
			}
		}
	}

	log.Printf("[CACHE-MISS] Querying database to build dashboard for user %d", userID)

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

func (s *dashboardService) GetPortfolioSummary(userID uint) (*dto.PortfolioResponse, error) {
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

func (s *dashboardService) GetWatchlist(userID uint) ([]dto.WatchlistResponse, error) {
	items, err := s.watchRepo.GetByUserID(userID)
	if err != nil {
		return nil, err
	}
	res := make([]dto.WatchlistResponse, len(items))
	for i, item := range items {
		res[i] = dto.WatchlistResponse{
			Ticker:      item.Ticker,
			CompanyName: item.CompanyName,
			AddedAt:     item.AddedAt,
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
			Name:          snap.Name,
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
	items, err := s.agentRepo.GetActivities(20) // Retrieve last 20 activities
	if err != nil {
		return nil, err
	}
	res := make([]dto.AgentActivityResponse, len(items))
	for i, item := range items {
		res[i] = dto.AgentActivityResponse{
			AgentName: item.AgentName,
			Message:   item.Message,
			Status:    item.Status,
			CreatedAt: item.CreatedAt,
		}
	}
	return res, nil
}

func (s *dashboardService) GetAgentStatuses() ([]dto.AgentStatusResponse, error) {
	items, err := s.agentRepo.GetStatuses()
	if err != nil {
		return nil, err
	}
	res := make([]dto.AgentStatusResponse, len(items))
	for i, item := range items {
		res[i] = dto.AgentStatusResponse{
			AgentName: item.AgentName,
			Status:    item.Status,
		}
	}
	return res, nil
}

func (s *dashboardService) GetRecentAnalyses() ([]dto.AnalysisResponse, error) {
	items, err := s.analysisRepo.GetRecentSessions(5) // Retrieve last 5 sessions
	if err != nil {
		return nil, err
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
	// Synthesize opportunities dynamically based on agent statuses or GORM data.
	// For standard clean architecture presentation, we return structured mock opportunities,
	// aligned with the frontend's Opportunities board.
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
