package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CommitteeDecision struct {
	ID                uuid.UUID      `gorm:"type:uuid;primaryKey"`
	Ticker            string         `gorm:"type:varchar(10);index;not null"`
	ResearchVote      string         `gorm:"type:varchar(10);not null"` // BUY, HOLD, SELL
	TechnicalVote     string         `gorm:"type:varchar(10);not null"`
	NewsVote          string         `gorm:"type:varchar(10);not null"`
	RiskVote          string         `gorm:"type:varchar(10);not null"`
	CommitteeDecision string         `gorm:"type:varchar(10);not null"` // BUY, HOLD, SELL
	ConfidenceScore   int            `gorm:"type:integer;not null;default:0"`
	Reasoning         string         `gorm:"type:text"`
	CreatedAt         time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP"`
	DeletedAt         gorm.DeletedAt `gorm:"index"`
}

func (cd *CommitteeDecision) BeforeCreate(tx *gorm.DB) (err error) {
	if cd.ID == uuid.Nil {
		cd.ID = uuid.New()
	}
	return
}
