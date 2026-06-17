package service

import (
	"errors"
	"testing"
	"time"

	"stockox-backend/database/models"
	"stockox-backend/database/repositories"
	"stockox-backend/pkg/cache"

	"github.com/google/uuid"
)

// Define Mocks matching the new repository interfaces

type mockPortfolioRepo struct {
	repositories.PortfolioRepository
	getByUserIDFn func(userID string) (*models.Portfolio, error)
	getHoldingsFn func(portfolioID uuid.UUID) ([]models.PortfolioHolding, error)
}

func (m *mockPortfolioRepo) GetByUserID(userID string) (*models.Portfolio, error) {
	if m.getByUserIDFn != nil {
		return m.getByUserIDFn(userID)
	}
	return nil, errors.New("method not mocked")
}

func (m *mockPortfolioRepo) GetHoldings(portfolioID uuid.UUID) ([]models.PortfolioHolding, error) {
	if m.getHoldingsFn != nil {
		return m.getHoldingsFn(portfolioID)
	}
	return nil, errors.New("method not mocked")
}

type mockWatchlistRepo struct {
	repositories.WatchlistRepository
	getByUserIDFn func(userID string) ([]models.Watchlist, error)
}

func (m *mockWatchlistRepo) GetByUserID(userID string) ([]models.Watchlist, error) {
	if m.getByUserIDFn != nil {
		return m.getByUserIDFn(userID)
	}
	return nil, errors.New("method not mocked")
}

type mockMarketRepo struct {
	repositories.MarketRepository
	getSnapshotsFn func() ([]models.MarketSnapshot, error)
}

func (m *mockMarketRepo) GetSnapshots() ([]models.MarketSnapshot, error) {
	if m.getSnapshotsFn != nil {
		return m.getSnapshotsFn()
	}
	return nil, errors.New("method not mocked")
}

type mockAgentRepo struct {
	repositories.AgentRepository
}

type mockAnalysisRepo struct {
	repositories.AnalysisRepository
	getRecentAgentMessagesFn func(limit int) ([]models.AnalysisLog, error)
}

func (m *mockAnalysisRepo) GetRecentAgentMessages(limit int) ([]models.AnalysisLog, error) {
	if m.getRecentAgentMessagesFn != nil {
		return m.getRecentAgentMessagesFn(limit)
	}
	return nil, errors.New("method not mocked")
}

// Test Suite Executions

func TestGetDashboard_Success(t *testing.T) {
	defaultUserID := "user_000000000000000000000000001"
	now := time.Now()

	// 1. Mock DB Records
	mockPort := &models.Portfolio{
		UserID:             defaultUserID,
		TotalValue:         250000.00,
		CashBalance:        250000.00,
		DailyChange:        1500.00,
		DailyChangePercent: 0.60,
	}

	mockWatch := []models.Watchlist{
		{UserID: defaultUserID, Ticker: "TSLA", CreatedAt: now},
		{UserID: defaultUserID, Ticker: "NVDA", CreatedAt: now},
	}

	mockMarket := []models.MarketSnapshot{
		{Symbol: "SP500", Price: 5000.0, Change: 10.0, ChangePercent: 0.2, UpdatedAt: now},
	}

	mockActivity := []models.AnalysisLog{
		{AgentName: "Technical Agent", Message: "Breakout NVDA", MessageType: "analysis", CreatedAt: now},
	}

	// 2. Wire Mocks
	portRepo := &mockPortfolioRepo{
		getByUserIDFn: func(userID string) (*models.Portfolio, error) {
			return mockPort, nil
		},
		getHoldingsFn: func(portfolioID uuid.UUID) ([]models.PortfolioHolding, error) {
			return []models.PortfolioHolding{}, nil
		},
	}
	watchRepo := &mockWatchlistRepo{
		getByUserIDFn: func(userID string) ([]models.Watchlist, error) {
			return mockWatch, nil
		},
	}
	marketRepo := &mockMarketRepo{
		getSnapshotsFn: func() ([]models.MarketSnapshot, error) {
			return mockMarket, nil
		},
	}
	agentRepo := &mockAgentRepo{}
	analysisRepo := &mockAnalysisRepo{
		getRecentAgentMessagesFn: func(limit int) ([]models.AnalysisLog, error) {
			return mockActivity, nil
		},
	}

	// 3. Instantiate Service
	srv := NewDashboardService(nil, portRepo, watchRepo, marketRepo, agentRepo, analysisRepo, cache.NewNoopCache(), nil)

	// 4. Execute Service Call
	resp, err := srv.GetDashboard(defaultUserID)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// 5. Assertions
	if resp.Portfolio.Value != mockPort.TotalValue {
		t.Errorf("Expected portfolio value %f, got %f", mockPort.TotalValue, resp.Portfolio.Value)
	}
	if len(resp.Watchlist) != 2 {
		t.Errorf("Expected watchlist count 2, got %d", len(resp.Watchlist))
	}
	if resp.Watchlist[0].Ticker != "TSLA" {
		t.Errorf("Expected first watchlist ticker TSLA, got %s", resp.Watchlist[0].Ticker)
	}
	if len(resp.MarketOverview) != 1 {
		t.Errorf("Expected market items 1, got %d", len(resp.MarketOverview))
	}
	if resp.MarketOverview[0].Symbol != "SP500" {
		t.Errorf("Expected market symbol SP500, got %s", resp.MarketOverview[0].Symbol)
	}
	if len(resp.AgentActivity) != 3 {
		t.Errorf("Expected agent activities 3, got %d", len(resp.AgentActivity))
	}
	if resp.AgentActivity[0].AgentName != "Research Agent" {
		t.Errorf("Expected agent name Research Agent, got %s", resp.AgentActivity[0].AgentName)
	}
	if len(resp.AgentStatuses) != 5 {
		t.Errorf("Expected agent status items 5, got %d", len(resp.AgentStatuses))
	}
	if len(resp.RecentAnalyses) != 3 {
		t.Errorf("Expected recent analyses 3, got %d", len(resp.RecentAnalyses))
	}
	if resp.RecentAnalyses[0].Ticker != "NVDA" {
		t.Errorf("Expected analysis ticker NVDA, got %s", resp.RecentAnalyses[0].Ticker)
	}
	if len(resp.Opportunities) == 0 {
		t.Errorf("Expected opportunities, got 0")
	}
}

func TestGetDashboard_RepoError(t *testing.T) {
	defaultUserID := "user_000000000000000000000000001"

	// 1. Mock DB returning error on watchlist query
	portRepo := &mockPortfolioRepo{
		getByUserIDFn: func(userID string) (*models.Portfolio, error) {
			return &models.Portfolio{UserID: defaultUserID}, nil
		},
		getHoldingsFn: func(portfolioID uuid.UUID) ([]models.PortfolioHolding, error) {
			return []models.PortfolioHolding{}, nil
		},
	}
	watchRepo := &mockWatchlistRepo{
		getByUserIDFn: func(userID string) ([]models.Watchlist, error) {
			return nil, errors.New("db query failed")
		},
	}
	marketRepo := &mockMarketRepo{
		getSnapshotsFn: func() ([]models.MarketSnapshot, error) {
			return []models.MarketSnapshot{}, nil
		},
	}
	agentRepo := &mockAgentRepo{}
	analysisRepo := &mockAnalysisRepo{
		getRecentAgentMessagesFn: func(limit int) ([]models.AnalysisLog, error) {
			return []models.AnalysisLog{}, nil
		},
	}

	srv := NewDashboardService(nil, portRepo, watchRepo, marketRepo, agentRepo, analysisRepo, cache.NewNoopCache(), nil)

	// 2. Execute and expect failure
	_, err := srv.GetDashboard(defaultUserID)
	if err == nil {
		t.Fatal("Expected error on watchlist repository failure, got nil")
	}
}
