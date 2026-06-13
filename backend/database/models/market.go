package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MarketSnapshot struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey"`
	Symbol        string    `gorm:"type:varchar(20);uniqueIndex;not null"` // SP500, NASDAQ, NIFTY50, BTC, GOLD
	Price         float64   `gorm:"type:decimal(18,4);not null;default:0"`
	Change        float64   `gorm:"type:decimal(18,4);not null;default:0"`
	ChangePercent float64   `gorm:"type:decimal(8,4);not null;default:0"`
	UpdatedAt     time.Time `gorm:"not null"`
}

func (m *MarketSnapshot) BeforeCreate(tx *gorm.DB) (err error) {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return
}
