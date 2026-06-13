package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AnalysisSession struct {
	ID              uuid.UUID      `gorm:"type:uuid;primaryKey"`
	UserID          string         `gorm:"type:varchar(255);index;not null"`
	User            User           `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	Ticker          string         `gorm:"type:varchar(10);index;not null"`
	CompanyName     string         `gorm:"type:varchar(255)"`
	Recommendation  string         `gorm:"type:varchar(10);not null;default:'HOLD'"` // BUY, HOLD, SELL
	ConfidenceScore int            `gorm:"type:integer;not null;default:0"`
	RiskLevel       string         `gorm:"type:varchar(20);not null;default:'MEDIUM'"` // LOW, MEDIUM, HIGH
	Summary         string         `gorm:"type:text"`
	CreatedAt       time.Time      `gorm:"not null"`
	UpdatedAt       time.Time      `gorm:"not null"`
	DeletedAt       gorm.DeletedAt `gorm:"index"`
}

type AgentMessage struct {
	ID                uuid.UUID `gorm:"type:uuid;primaryKey"`
	AnalysisSessionID uuid.UUID `gorm:"type:uuid;index;not null"`
	AnalysisSession   AnalysisSession `gorm:"foreignKey:AnalysisSessionID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	AgentName         string    `gorm:"type:varchar(100);not null"`
	Message           string    `gorm:"type:text;not null"`
	MessageType       string    `gorm:"type:varchar(50);not null;default:'analysis'"` // research, analysis, decision, warning, risk
	CreatedAt         time.Time `gorm:"not null"`
}

func (a *AnalysisSession) BeforeCreate(tx *gorm.DB) (err error) {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return
}

func (m *AgentMessage) BeforeCreate(tx *gorm.DB) (err error) {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return
}
