package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"stockox-backend/internal/agents"
	"stockox-backend/internal/analysis"
	"stockox-backend/internal/market"
	"stockox-backend/internal/portfolio"
	"stockox-backend/internal/watchlist"
)

// Define Mocks matching the repository interfaces

type mockPortfolioRepo struct {
	portfolio.PortfolioRepository
	getByUserIDFn func(userID uint) (*portfolio.Portfolio, error)
	getUserByIDFn func(userID uint) (*portfolio.User, error)
}

func (m *mockPortfolioRepo) GetByUserID(userID uint) (*portfolio.Portfolio, error) {
	if m.getByUserIDFn != nil {
		return m.getByUserIDFn(userID)
	}
	return nil, errors.New("method not mocked")
}

func (m *mockPortfolioRepo) GetUserByID(userID uint) (*portfolio.User, error) {
	if m.getUserByIDFn != nil {
		return m.getUserByIDFn(userID)
	}
	return nil, errors.New("method not mocked")
}

type mockWatchlistRepo struct {
	watchlist.WatchlistRepository
	getByUserIDFn func(userID uint) ([]watchlist.Watchlist, error)
	addFn         func(userID uint, ticker, companyName string) (*watchlist.Watchlist, error)
	removeFn      func(userID uint, ticker string) error
}

func (m *mockWatchlistRepo) GetByUserID(userID uint) ([]watchlist.Watchlist, error) {
	if m.getByUserIDFn != nil {
		return m.getByUserIDFn(userID)
	}
	return nil, errors.New("method not mocked")
}

func (m *mockWatchlistRepo) Add(userID uint, ticker, companyName string) (*watchlist.Watchlist, error) {
	if m.addFn != nil {
		return m.addFn(userID, ticker, companyName)
	}
	return nil, errors.New("method not mocked")
}

func (m *mockWatchlistRepo) Remove(userID uint, ticker string) error {
	if m.removeFn != nil {
		return m.removeFn(userID, ticker)
	}
	return errors.New("method not mocked")
}

type mockMarketRepo struct {
	market.MarketRepository
	getSnapshotsFn func() ([]market.MarketSnapshot, error)
	getBySymbolFn  func(symbol string) (*market.MarketSnapshot, error)
}

func (m *mockMarketRepo) GetSnapshots() ([]market.MarketSnapshot, error) {
	if m.getSnapshotsFn != nil {
		return m.getSnapshotsFn()
	}
	return nil, errors.New("method not mocked")
}

func (m *mockMarketRepo) GetBySymbol(symbol string) (*market.MarketSnapshot, error) {
	if m.getBySymbolFn != nil {
		return m.getBySymbolFn(symbol)
	}
	return nil, errors.New("method not mocked")
}

type mockAgentRepo struct {
	agents.AgentRepository
	getActivitiesFn func(limit int) ([]agents.AgentActivity, error)
	getStatusesFn   func() ([]agents.AgentStatus, error)
	logActivityFn   func(agentName, activityType, message, status string) (*agents.AgentActivity, error)
	updateStatusFn  func(agentName, status string) error
}

func (m *mockAgentRepo) GetActivities(limit int) ([]agents.AgentActivity, error) {
	if m.getActivitiesFn != nil {
		return m.getActivitiesFn(limit)
	}
	return nil, errors.New("method not mocked")
}

func (m *mockAgentRepo) GetStatuses() ([]agents.AgentStatus, error) {
	if m.getStatusesFn != nil {
		return m.getStatusesFn()
	}
	return nil, errors.New("method not mocked")
}

func (m *mockAgentRepo) LogActivity(agentName, activityType, message, status string) (*agents.AgentActivity, error) {
	if m.logActivityFn != nil {
		return m.logActivityFn(agentName, activityType, message, status)
	}
	return nil, errors.New("method not mocked")
}

func (m *mockAgentRepo) UpdateStatus(agentName, status string) error {
	if m.updateStatusFn != nil {
		return m.updateStatusFn(agentName, status)
	}
	return errors.New("method not mocked")
}

type mockAnalysisRepo struct {
	analysis.AnalysisRepository
	getRecentSessionsFn func(limit int) ([]analysis.AnalysisSession, error)
	logSessionFn         func(userID uint, ticker, recommendation string, confidenceScore int, riskLevel string) (*analysis.AnalysisSession, error)
}

func (m *mockAnalysisRepo) GetRecentSessions(limit int) ([]analysis.AnalysisSession, error) {
	if m.getRecentSessionsFn != nil {
		return m.getRecentSessionsFn(limit)
	}
	return nil, errors.New("method not mocked")
}

func (m *mockAnalysisRepo) LogSession(userID uint, ticker, recommendation string, confidenceScore int, riskLevel string) (*analysis.AnalysisSession, error) {
	if m.logSessionFn != nil {
		return m.logSessionFn(userID, ticker, recommendation, confidenceScore, riskLevel)
	}
	return nil, errors.New("method not mocked")
}

// Test Suite Executions

func TestGetDashboard_Success(t *testing.T) {
	ctx := context.Background()
	_ = ctx

	// 1. Mock DB Records
	now := time.Now()
	mockPort := &portfolio.Portfolio{
		UserID:             1,
		TotalValue:         250000.00,
		DailyChange:        1500.00,
		DailyChangePercent: 0.60,
	}

	mockWatch := []watchlist.Watchlist{
		{UserID: 1, Ticker: "TSLA", CompanyName: "Tesla Inc.", AddedAt: now},
		{UserID: 1, Ticker: "NVDA", CompanyName: "NVIDIA Corp", AddedAt: now},
	}

	mockMarket := []market.MarketSnapshot{
		{Symbol: "SP500", Name: "S&P 500", Price: 5000.0, Change: 10.0, ChangePercent: 0.2, UpdatedAt: now},
	}

	mockActivity := []agents.AgentActivity{
		{AgentName: "Technical Agent", ActivityType: "technical", Message: "Breakout NVDA", Status: "success", CreatedAt: now},
	}

	mockStatuses := []agents.AgentStatus{
		{AgentName: "Technical Agent", Status: "idle"},
	}

	mockAnalyses := []analysis.AnalysisSession{
		{UserID: 1, Ticker: "NVDA", Recommendation: "BUY", ConfidenceScore: 90, RiskLevel: "Medium", CreatedAt: now},
	}

	// 2. Wire Mocks
	portRepo := &mockPortfolioRepo{
		getByUserIDFn: func(userID uint) (*portfolio.Portfolio, error) {
			return mockPort, nil
		},
	}
	watchRepo := &mockWatchlistRepo{
		getByUserIDFn: func(userID uint) ([]watchlist.Watchlist, error) {
			return mockWatch, nil
		},
	}
	marketRepo := &mockMarketRepo{
		getSnapshotsFn: func() ([]market.MarketSnapshot, error) {
			return mockMarket, nil
		},
	}
	agentRepo := &mockAgentRepo{
		getActivitiesFn: func(limit int) ([]agents.AgentActivity, error) {
			return mockActivity, nil
		},
		getStatusesFn: func() ([]agents.AgentStatus, error) {
			return mockStatuses, nil
		},
	}
	analysisRepo := &mockAnalysisRepo{
		getRecentSessionsFn: func(limit int) ([]analysis.AnalysisSession, error) {
			return mockAnalyses, nil
		},
	}

	// 3. Instantiate Service under nil Redis client (direct database fallback pathway testing)
	srv := NewDashboardService(portRepo, watchRepo, marketRepo, agentRepo, analysisRepo, nil)

	// 4. Execute Service Call
	resp, err := srv.GetDashboard(1)
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
	if len(resp.AgentActivity) != 1 {
		t.Errorf("Expected agent activities 1, got %d", len(resp.AgentActivity))
	}
	if resp.AgentActivity[0].AgentName != "Technical Agent" {
		t.Errorf("Expected agent name Technical Agent, got %s", resp.AgentActivity[0].AgentName)
	}
	if len(resp.AgentStatuses) != 1 {
		t.Errorf("Expected agent status items 1, got %d", len(resp.AgentStatuses))
	}
	if len(resp.RecentAnalyses) != 1 {
		t.Errorf("Expected recent analyses 1, got %d", len(resp.RecentAnalyses))
	}
	if resp.RecentAnalyses[0].Ticker != "NVDA" {
		t.Errorf("Expected analysis ticker NVDA, got %s", resp.RecentAnalyses[0].Ticker)
	}
	if len(resp.Opportunities) == 0 {
		t.Errorf("Expected opportunities, got 0")
	}
}

func TestGetDashboard_RepoError(t *testing.T) {
	// 1. Mock DB returning error on watchlist query
	portRepo := &mockPortfolioRepo{
		getByUserIDFn: func(userID uint) (*portfolio.Portfolio, error) {
			return &portfolio.Portfolio{UserID: 1}, nil
		},
	}
	watchRepo := &mockWatchlistRepo{
		getByUserIDFn: func(userID uint) ([]watchlist.Watchlist, error) {
			return nil, errors.New("db query failed")
		},
	}
	marketRepo := &mockMarketRepo{
		getSnapshotsFn: func() ([]market.MarketSnapshot, error) {
			return []market.MarketSnapshot{}, nil
		},
	}
	agentRepo := &mockAgentRepo{
		getActivitiesFn: func(limit int) ([]agents.AgentActivity, error) {
			return []agents.AgentActivity{}, nil
		},
		getStatusesFn: func() ([]agents.AgentStatus, error) {
			return []agents.AgentStatus{}, nil
		},
	}
	analysisRepo := &mockAnalysisRepo{
		getRecentSessionsFn: func(limit int) ([]analysis.AnalysisSession, error) {
			return []analysis.AnalysisSession{}, nil
		},
	}

	srv := NewDashboardService(portRepo, watchRepo, marketRepo, agentRepo, analysisRepo, nil)

	// 2. Execute and expect failure
	_, err := srv.GetDashboard(1)
	if err == nil {
		t.Fatal("Expected error on watchlist repository failure, got nil")
	}
}
