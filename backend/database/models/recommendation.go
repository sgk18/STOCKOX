package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Recommendation struct {
	ID                uuid.UUID `gorm:"type:uuid;primaryKey"`
	Ticker            string    `gorm:"type:varchar(10);index;not null"`
	Recommendation    string    `gorm:"type:varchar(10);not null;default:'HOLD'"` // BUY, HOLD, SELL
	ConfidenceScore   int       `gorm:"type:integer;not null;default:0"`
	TargetPrice       float64   `gorm:"type:decimal(18,4);not null;default:0"`
	RiskLevel         string    `gorm:"type:varchar(20);not null;default:'MEDIUM'"` // LOW, MEDIUM, HIGH
	
	// Module 3.5 Extended Scoring Fields
	AgentReasoning    string    `gorm:"type:text"`
	ResearchScore     int       `gorm:"type:integer;not null;default:0"`
	TechnicalScore    int       `gorm:"type:integer;not null;default:0"`
	NewsScore         int       `gorm:"type:integer;not null;default:0"`
	RiskScore         int       `gorm:"type:integer;not null;default:0"`
	CommitteeScore    int       `gorm:"type:integer;not null;default:0"`
	InvestmentHorizon string    `gorm:"type:varchar(100)"`
	
	CreatedAt         time.Time `gorm:"not null"`
}

func (r *Recommendation) BeforeCreate(tx *gorm.DB) (err error) {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return
}
