package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AgentExecution struct {
	ID                uuid.UUID       `gorm:"type:uuid;primaryKey" json:"id"`
	AnalysisSessionID uuid.UUID       `gorm:"type:uuid;index;not null" json:"analysis_session_id"`
	AnalysisSession   AnalysisSession `gorm:"foreignKey:AnalysisSessionID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
	AgentName         string          `gorm:"type:varchar(100);not null" json:"agent_name"`
	Status            string          `gorm:"type:varchar(50);not null;default:'idle'" json:"status"` // idle, thinking, analyzing, completed, error
	StartedAt         time.Time       `gorm:"not null;default:CURRENT_TIMESTAMP" json:"started_at"`
	CompletedAt       *time.Time      `json:"completed_at,omitempty"`
	Error             string          `gorm:"type:text" json:"error,omitempty"`
	CreatedAt         time.Time       `gorm:"not null" json:"created_at"`
	UpdatedAt         time.Time       `gorm:"not null" json:"updated_at"`
}

type AgentEvent struct {
	ID                uuid.UUID       `gorm:"type:uuid;primaryKey" json:"id"`
	AnalysisSessionID uuid.UUID       `gorm:"type:uuid;index;not null" json:"analysis_session_id"`
	AnalysisSession   AnalysisSession `gorm:"foreignKey:AnalysisSessionID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
	EventType         string          `gorm:"type:varchar(100);not null" json:"event_type"`
	AgentName         string          `gorm:"type:varchar(100)" json:"agent_name,omitempty"`
	Payload           string          `gorm:"type:text;not null" json:"payload"` // JSON serialized payload
	CreatedAt         time.Time       `gorm:"not null" json:"created_at"`
}

func (ae *AgentExecution) BeforeCreate(tx *gorm.DB) (err error) {
	if ae.ID == uuid.Nil {
		ae.ID = uuid.New()
	}
	ae.StartedAt = time.Now()
	return
}

func (ae *AgentEvent) BeforeCreate(tx *gorm.DB) (err error) {
	if ae.ID == uuid.Nil {
		ae.ID = uuid.New()
	}
	ae.CreatedAt = time.Now()
	return
}
