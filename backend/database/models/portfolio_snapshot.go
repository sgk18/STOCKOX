package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PortfolioSnapshot struct {
	ID                 uuid.UUID      `gorm:"type:uuid;primaryKey"`
	PortfolioID        uuid.UUID      `gorm:"type:uuid;index;not null"`
	TotalValue         float64        `gorm:"type:decimal(18,2);not null"`
	CashBalance        float64        `gorm:"type:decimal(18,2);not null"`
	DailyChange        float64        `gorm:"type:decimal(18,2);not null"`
	DailyChangePercent float64        `gorm:"type:decimal(8,4);not null"`
	RecordedAt         time.Time      `gorm:"index;not null;default:CURRENT_TIMESTAMP"`
	DeletedAt          gorm.DeletedAt `gorm:"index"`
}

func (ps *PortfolioSnapshot) BeforeCreate(tx *gorm.DB) (err error) {
	if ps.ID == uuid.Nil {
		ps.ID = uuid.New()
	}
	return
}
