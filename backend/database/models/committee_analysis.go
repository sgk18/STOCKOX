package models

import (
	"time"
)

type CommitteeAnalysis struct {
	ID                uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Ticker            string    `gorm:"type:varchar(10);index;not null" json:"ticker"`
	Recommendation    string    `gorm:"type:varchar(10);not null" json:"recommendation"` // BUY, HOLD, SELL
	ConfidenceScore   int       `gorm:"type:integer;not null;default:0" json:"confidence_score"`
	ResearchVote      string    `gorm:"type:varchar(10)" json:"research_vote"`
	TechnicalVote     string    `gorm:"type:varchar(10)" json:"technical_vote"`
	NewsVote          string    `gorm:"type:varchar(10)" json:"news_vote"`
	RiskVote          string    `gorm:"type:varchar(10)" json:"risk_vote"`
	ValuationVote     string    `gorm:"type:varchar(10)" json:"valuation_vote"`
	ResearchSummary   string    `gorm:"type:text" json:"research_summary"`
	NewsSummary       string    `gorm:"type:text" json:"news_summary"`
	TechnicalSummary  string    `gorm:"type:text" json:"technical_summary"`
	RiskSummary       string    `gorm:"type:text" json:"risk_summary"`
	ValuationSummary  string    `gorm:"type:text" json:"valuation_summary"`
	CreatedAt         time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
}
