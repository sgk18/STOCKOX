package models

import (
	"time"
)

type CommitteeAnalysis struct {
	ID                uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Symbol            string    `gorm:"type:varchar(10);index;not null" json:"symbol"`
	Recommendation    string    `gorm:"type:varchar(10);not null" json:"recommendation"` // BUY, HOLD, SELL
	ConfidenceScore   int       `gorm:"type:integer;not null;default:0" json:"confidence_score"`
	VotesBuy          int       `gorm:"type:integer;not null;default:0" json:"votes_buy"`
	VotesHold         int       `gorm:"type:integer;not null;default:0" json:"votes_hold"`
	VotesSell         int       `gorm:"type:integer;not null;default:0" json:"votes_sell"`
	ResearchSummary   string    `gorm:"type:text" json:"research_summary"`
	NewsSummary       string    `gorm:"type:text" json:"news_summary"`
	TechnicalSummary  string    `gorm:"type:text" json:"technical_summary"`
	RiskSummary       string    `gorm:"type:text" json:"risk_summary"`
	ValuationSummary  string    `gorm:"type:text" json:"valuation_summary"`
	CreatedAt         time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
}
