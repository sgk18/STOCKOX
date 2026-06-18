package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AnalysisSession struct {
	ID              uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID          string         `gorm:"type:varchar(255);not null;index" json:"user_id"`
	Ticker          string         `gorm:"type:varchar(10);not null;index" json:"ticker"`
	CompanyName     string         `gorm:"type:varchar(255)" json:"company_name"`
	Recommendation  string         `gorm:"type:varchar(10);not null;default:'HOLD'" json:"recommendation"` // BUY, HOLD, SELL
	ConfidenceScore int            `gorm:"type:integer;not null;default:0" json:"confidence_score"`
	RiskLevel       string         `gorm:"type:varchar(20);not null;default:'MEDIUM'" json:"risk_level"`
	Status          string         `gorm:"type:varchar(50);not null;default:'pending'" json:"status"` // pending, running, completed, failed
	ProgressPercent int            `gorm:"type:integer;not null;default:0" json:"progress_percent"`
	CurrentAgent    string         `gorm:"type:varchar(100);not null;default:'Research Agent'" json:"current_agent"`
	AgentStatus     string         `gorm:"type:varchar(50);not null;default:'waiting'" json:"agent_status"`
	Summary         string         `gorm:"type:text" json:"summary"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

func (as *AnalysisSession) BeforeCreate(tx *gorm.DB) (err error) {
	if as.ID == uuid.Nil {
		as.ID = uuid.New()
	}
	if as.CreatedAt.IsZero() {
		as.CreatedAt = time.Now()
	}
	if as.UpdatedAt.IsZero() {
		as.UpdatedAt = time.Now()
	}
	return
}

func (as *AnalysisSession) BeforeUpdate(tx *gorm.DB) (err error) {
	as.UpdatedAt = time.Now()
	return
}
