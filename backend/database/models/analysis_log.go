package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AnalysisLog struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	SessionID       *uuid.UUID `gorm:"type:uuid;index" json:"session_id,omitempty"` // Links to AnalysisSession
	Ticker          string     `gorm:"type:varchar(10);index;not null" json:"ticker"`
	AgentName       string     `gorm:"type:varchar(100);not null" json:"agent_name"`
	Message         string     `gorm:"type:text;not null" json:"message"`
	MessageType     string     `gorm:"type:varchar(50);not null;default:'analysis'" json:"message_type"`
	ConfidenceScore int        `gorm:"type:integer;default:0" json:"confidence_score"`
	Round           int        `gorm:"type:integer;not null;default:1" json:"round"`
	Signal          string     `gorm:"type:varchar(10)" json:"signal"`
	Evidence        string     `gorm:"type:text" json:"evidence"`
	WeightedScore   float64    `gorm:"type:decimal(18,4);not null;default:0" json:"weighted_score"`
	CreatedAt       time.Time  `gorm:"not null" json:"created_at"`
}

func (al *AnalysisLog) BeforeCreate(tx *gorm.DB) (err error) {
	if al.ID == uuid.Nil {
		al.ID = uuid.New()
	}
	if al.CreatedAt.IsZero() {
		al.CreatedAt = time.Now()
	}
	return
}
