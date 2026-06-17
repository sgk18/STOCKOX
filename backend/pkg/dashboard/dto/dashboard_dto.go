package dto

import "time"

type UserResponse struct {
	Name   string `json:"name"`
	Email  string `json:"email"`
	Avatar string `json:"avatar"`
	Role   string `json:"role"`
}

type PortfolioHoldingResponse struct {
	Ticker         string  `json:"ticker"`
	CompanyName    string  `json:"company_name"`
	Quantity       float64 `json:"quantity"`
	AveragePrice   float64 `json:"average_price"`
	CurrentPrice   float64 `json:"current_price"`
	Value          float64 `json:"value"`
	ChangePercent  float64 `json:"change_percent"`
	Recommendation string  `json:"recommendation"`
}

type PortfolioHistoryPoint struct {
	Date  string  `json:"date"`
	Value float64 `json:"value"`
}

type PortfolioResponse struct {
	Value              float64                    `json:"value"`
	ChangePercent      float64                    `json:"change_percent"`
	ChangeAmount       float64                    `json:"change_amount"`
	CashBalance        float64                    `json:"cash_balance"`
	Holdings           []PortfolioHoldingResponse `json:"holdings"`
	History            []PortfolioHistoryPoint    `json:"history"`
}

type WatchlistResponse struct {
	Ticker         string    `json:"ticker"`
	CompanyName    string    `json:"company_name"`
	AddedAt        time.Time `json:"added_at"`
	Price          float64   `json:"price"`
	ChangePercent  float64   `json:"change_percent"`
	AIScore        int       `json:"ai_score"`
	Risk           string    `json:"risk"`
	Recommendation string    `json:"recommendation"`
}

type MarketOverviewResponse struct {
	Symbol        string    `json:"symbol"`
	Name          string    `json:"name"`
	Price         float64   `json:"price"`
	Change        float64   `json:"change"`
	ChangePercent float64   `json:"change_percent"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type AgentActivityResponse struct {
	AgentName string    `json:"agent_name"`
	Message   string    `json:"message"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type AgentStatusResponse struct {
	AgentName string `json:"agent_name"`
	Status    string `json:"status"`
}

type AnalysisResponse struct {
	Ticker          string    `json:"ticker"`
	Recommendation  string    `json:"recommendation"`
	ConfidenceScore int       `json:"confidence_score"`
	RiskLevel       string    `json:"risk_level"`
	CreatedAt       time.Time `json:"created_at"`
}

type OpportunityResponse struct {
	Type        string `json:"type"` // Strong Buy, Watch, High Risk, Emerging Trend
	Ticker      string `json:"ticker"`
	Score       int    `json:"score"`
	Reason      string `json:"reason"`
	SourceAgent string `json:"source_agent"`
}

type CommitteeDecisionResponse struct {
	Ticker            string `json:"ticker"`
	ResearchVote      string `json:"research_vote"`
	TechnicalVote     string `json:"technical_vote"`
	NewsVote          string `json:"news_vote"`
	RiskVote          string `json:"risk_vote"`
	CommitteeDecision string `json:"committee_decision"`
	ConfidenceScore   int    `json:"confidence"`
	Reasoning         string `json:"reasoning,omitempty"`
	CreatedAt         string `json:"created_at"`
}

type SectorExposureItem struct {
	Name  string  `json:"name"`
	Value float64 `json:"value"`
	Color string  `json:"color"`
}

type AssetPerformanceItem struct {
	Ticker        string  `json:"ticker"`
	ChangePercent float64 `json:"change_percent"`
}

type RiskMetricsResponse struct {
	RiskScore             int                    `json:"risk_score"`
	SectorExposure        []SectorExposureItem   `json:"sector_exposure"`
	ConcentrationRisk     float64                `json:"concentration_risk"`
	VolatilityScore       float64                `json:"volatility_score"`
	DiversificationScore  int                    `json:"diversification_score"`
	WorstPerformingAssets []AssetPerformanceItem `json:"worst_performing_assets"`
	BestPerformingAssets  []AssetPerformanceItem `json:"best_performing_assets"`
	RiskCommentary        string                 `json:"risk_commentary"`
}

type CompanyProfileResponse struct {
	Sector      string `json:"sector"`
	Industry    string `json:"industry"`
	MarketCap   string `json:"market_cap"`
	Exchange    string `json:"exchange"`
	Country     string `json:"country"`
	LogoURL     string `json:"logo_url"`
	Description string `json:"description"`
}

type FinancialMetricsResponse struct {
	PERatio       float64 `json:"pe_ratio"`
	EPS           float64 `json:"eps"`
	ROE           float64 `json:"roe"`
	DebtRatio     float64 `json:"debt_ratio"`
	Revenue       int64   `json:"revenue"`
	RevenueGrowth float64 `json:"revenue_growth"`
	ProfitMargin  float64 `json:"profit_margin"`
	CurrentRatio  float64 `json:"current_ratio"`
	CashFlow      int64   `json:"cash_flow"`
}

type CandleResponse struct {
	Time  string  `json:"time"`
	Value float64 `json:"value"`
}

type NewsResponse struct {
	Title   string `json:"title"`
	Source  string `json:"source"`
	Date    string `json:"date"`
	URL     string `json:"url"`
	Summary string `json:"summary"`
}

type AnalystRatingsResponse struct {
	Buy  int `json:"buy"`
	Hold int `json:"hold"`
	Sell int `json:"sell"`
}

type AgentTimelineItem struct {
	AgentName string `json:"agent_name"`
	Status    string `json:"status"`
	Activity  string `json:"activity"`
	Time      string `json:"time"`
}

type QuoteResponse struct {
	CurrentPrice       float64 `json:"current_price"`
	DailyChange        float64 `json:"daily_change"`
	DailyChangePercent float64 `json:"daily_change_percent"`
	HighPrice          float64 `json:"high_price"`
	LowPrice           float64 `json:"low_price"`
	OpenPrice          float64 `json:"open_price"`
	PrevClosePrice     float64 `json:"prev_close_price"`
	Volume             int64   `json:"volume"`
	AvgVolume          int64   `json:"avg_volume"`
}

type ResearchTerminalResponse struct {
	Symbol            string                    `json:"symbol"`
	CompanyName       string                    `json:"company_name"`
	Profile           CompanyProfileResponse    `json:"profile"`
	Metrics           FinancialMetricsResponse  `json:"metrics"`
	Quote             QuoteResponse             `json:"quote"`
	History           []CandleResponse          `json:"history"`
	News              []NewsResponse            `json:"news"`
	AnalystRatings    AnalystRatingsResponse    `json:"analyst_ratings"`
	CommitteeDecision CommitteeDecisionResponse `json:"committee_decision"`
	AgentTimeline     []AgentTimelineItem       `json:"agent_timeline"`
	InvestmentThesis  string                    `json:"investment_thesis"`
	ProfileError      string                    `json:"profile_error,omitempty"`
	MetricsError      string                    `json:"metrics_error,omitempty"`
	HistoryError      string                    `json:"history_error,omitempty"`
	NewsError         string                    `json:"news_error,omitempty"`
}

type TopRecommendationResponse struct {
	Ticker         string `json:"ticker"`
	Recommendation string `json:"recommendation"`
	Confidence     int    `json:"confidence"`
}

type DashboardResponse struct {
	Portfolio          PortfolioResponse           `json:"portfolio"`
	Watchlist          []WatchlistResponse         `json:"watchlist"`
	MarketOverview     []MarketOverviewResponse    `json:"marketOverview"`
	AgentActivity      []AgentActivityResponse     `json:"agentActivity"`
	AgentStatuses      []AgentStatusResponse       `json:"agentStatuses"`
	RecentAnalyses     []AnalysisResponse          `json:"recentAnalyses"`
	Opportunities      []OpportunityResponse       `json:"opportunities"`
	Decisions          []CommitteeDecisionResponse `json:"decisions"`
	TopRecommendations []TopRecommendationResponse `json:"topRecommendations"`
}

type SearchAssetResponse struct {
	Symbol    string `json:"symbol"`
	Company   string `json:"company"`
	Exchange  string `json:"exchange"`
	Country   string `json:"country"`
	AssetType string `json:"assetType"`
	LogoURL   string `json:"logo_url"`
}
