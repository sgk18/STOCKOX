package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Portfolio struct {
	ID                 uuid.UUID      `gorm:"type:uuid;primaryKey"`
	UserID             string         `gorm:"type:varchar(255);uniqueIndex;not null"`
	User               User           `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	TotalValue         float64        `gorm:"type:decimal(18,2);not null;default:0"`
	CashBalance        float64        `gorm:"type:decimal(18,2);not null;default:0"`
	DailyChange        float64        `gorm:"type:decimal(18,2);not null;default:0"`
	DailyChangePercent float64        `gorm:"type:decimal(8,4);not null;default:0"`
	CreatedAt          time.Time      `gorm:"not null"`
	UpdatedAt          time.Time      `gorm:"not null"`
	DeletedAt          gorm.DeletedAt `gorm:"index"`
}

type PortfolioHolding struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey"`
	PortfolioID  uuid.UUID      `gorm:"type:uuid;index;not null"`
	Portfolio    Portfolio      `gorm:"foreignKey:PortfolioID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	Ticker       string         `gorm:"type:varchar(10);index;not null"`
	CompanyName  string         `gorm:"type:varchar(255)"`
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
