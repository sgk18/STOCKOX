package market

import (
	"time"
)

type MarketSnapshot struct {
	ID            uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Symbol        string    `gorm:"uniqueIndex;not null;type:varchar(50)" json:"symbol"`
	Name          string    `gorm:"type:varchar(100);not null" json:"name"`
	Price         float64   `gorm:"type:decimal(16,2);not null" json:"price"`
	Change        float64   `gorm:"type:decimal(16,2);not null" json:"change"`
	ChangePercent float64   `gorm:"type:decimal(6,3);not null" json:"change_percent"`
	UpdatedAt     time.Time `json:"updated_at"`
}
