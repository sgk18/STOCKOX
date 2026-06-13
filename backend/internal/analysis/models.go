package analysis

import (
	"time"
)

type AnalysisSession struct {
	ID              uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID          uint      `gorm:"not null" json:"user_id"`
	Ticker          string    `gorm:"type:varchar(50);not null" json:"ticker"`
	Recommendation  string    `gorm:"type:varchar(50);not null" json:"recommendation"` // BUY, SELL, HOLD
	ConfidenceScore int       `gorm:"type:integer;not null" json:"confidence_score"`
	RiskLevel       string    `gorm:"type:varchar(50);not null" json:"risk_level"`
	CreatedAt       time.Time `json:"created_at"`
}
