package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Transaction struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	PortfolioID uuid.UUID      `gorm:"type:uuid;index;not null" json:"portfolio_id"`
	Portfolio   Portfolio      `gorm:"foreignKey:PortfolioID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
	Ticker      string         `gorm:"type:varchar(10);index;not null" json:"ticker"`
	Quantity    float64        `gorm:"type:decimal(18,4);not null;default:0" json:"quantity"`
	Price       float64        `gorm:"type:decimal(18,4);not null;default:0" json:"price"`
	Type        string         `gorm:"type:varchar(10);not null" json:"type"` // BUY, SELL
	CreatedAt   time.Time      `gorm:"index;not null" json:"created_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (t *Transaction) BeforeCreate(tx *gorm.DB) (err error) {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	if t.CreatedAt.IsZero() {
		t.CreatedAt = time.Now()
	}
	return
}
