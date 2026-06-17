package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Portfolio struct {
	ID                 uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID             string         `gorm:"type:varchar(255);uniqueIndex:idx_user_mode;not null" json:"user_id"`
	AccountMode        string         `gorm:"type:varchar(50);uniqueIndex:idx_user_mode;not null;default:'live'" json:"account_mode"`
	User               User           `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
	TotalValue         float64        `gorm:"type:decimal(18,2);not null;default:0" json:"total_value"`
	CashBalance        float64        `gorm:"type:decimal(18,2);not null;default:0" json:"cash_balance"`
	DailyChange        float64        `gorm:"type:decimal(18,2);not null;default:0" json:"daily_change"`
	DailyChangePercent float64        `gorm:"type:decimal(8,4);not null;default:0" json:"daily_change_percent"`
	CreatedAt          time.Time      `gorm:"not null" json:"created_at"`
	UpdatedAt          time.Time      `gorm:"not null" json:"updated_at"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`
}

type PortfolioHolding struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey"`
	PortfolioID  uuid.UUID      `gorm:"type:uuid;index;not null"`
	Portfolio    Portfolio      `gorm:"foreignKey:PortfolioID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	Ticker       string         `gorm:"type:varchar(10);index;not null"`
	Quantity     float64        `gorm:"type:decimal(18,4);not null;default:0"`
	AveragePrice float64        `gorm:"type:decimal(18,4);not null;default:0"`
	CurrentPrice float64        `gorm:"type:decimal(18,4);not null;default:0"`
	CreatedAt    time.Time      `gorm:"not null"`
	UpdatedAt    time.Time      `gorm:"not null"`
	DeletedAt    gorm.DeletedAt `gorm:"index"`
}

func (p *Portfolio) BeforeCreate(tx *gorm.DB) (err error) {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return
}

func (h *PortfolioHolding) BeforeCreate(tx *gorm.DB) (err error) {
	if h.ID == uuid.Nil {
		h.ID = uuid.New()
	}
	return
}
