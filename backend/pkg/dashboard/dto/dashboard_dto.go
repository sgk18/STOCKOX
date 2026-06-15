package dto

import "time"

type UserResponse struct {
	Name   string `json:"name"`
	Email  string `json:"email"`
	Avatar string `json:"avatar"`
	Role   string `json:"role"`
}

type PortfolioResponse struct {
	Value              float64 `json:"value"`
	ChangePercent      float64 `json:"change_percent"`
	ChangeAmount       float64 `json:"change_amount"`
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

type DashboardResponse struct {
	Portfolio      PortfolioResponse        `json:"portfolio"`
	Watchlist      []WatchlistResponse      `json:"watchlist"`
	MarketOverview []MarketOverviewResponse `json:"marketOverview"`
	AgentActivity  []AgentActivityResponse  `json:"agentActivity"`
	AgentStatuses  []AgentStatusResponse    `json:"agentStatuses"`
	RecentAnalyses []AnalysisResponse       `json:"recentAnalyses"`
	Opportunities  []OpportunityResponse    `json:"opportunities"`
}
