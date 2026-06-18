package models

import (
	"time"

	"github.com/google/uuid"
)

type CommitteeAnalysis struct {
	ID                uint       `gorm:"primaryKey;autoIncrement" json:"id"`
	SessionID         *uuid.UUID `gorm:"type:uuid;index" json:"session_id,omitempty"`
	Ticker            string     `gorm:"type:varchar(10);index;not null" json:"ticker"`
	Recommendation    string     `gorm:"type:varchar(10);not null" json:"recommendation"` // BUY, HOLD, SELL
	ConfidenceScore   int        `gorm:"type:integer;not null;default:0" json:"confidence_score"`
	ResearchVote      string     `gorm:"type:varchar(10)" json:"research_vote"`
	TechnicalVote     string     `gorm:"type:varchar(10)" json:"technical_vote"`
	NewsVote          string     `gorm:"type:varchar(10)" json:"news_vote"`
	RiskVote          string     `gorm:"type:varchar(10)" json:"risk_vote"`
	ValuationVote     string     `gorm:"type:varchar(10)" json:"valuation_vote"`
	ResearchSummary   string     `gorm:"type:text" json:"research_summary"`
	NewsSummary       string     `gorm:"type:text" json:"news_summary"`
	TechnicalSummary  string     `gorm:"type:text" json:"technical_summary"`
	RiskSummary       string     `gorm:"type:text" json:"risk_summary"`
	ValuationSummary  string     `gorm:"type:text" json:"valuation_summary"`
	RoomID            string     `gorm:"type:varchar(255)" json:"room_id"`
	TargetPrice       float64    `gorm:"type:decimal(18,4);not null;default:0" json:"target_price"`
	ExecutiveSummary  string     `gorm:"type:text" json:"executive_summary"`
	BullCase          string     `gorm:"type:text" json:"bull_case"`
	BearCase          string     `gorm:"type:text" json:"bear_case"`
	InvestmentHorizon string     `gorm:"type:varchar(100)" json:"investment_horizon"`
	CreatedAt         time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
}
