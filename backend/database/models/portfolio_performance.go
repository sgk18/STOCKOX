package models

import (
	"time"

	"github.com/google/uuid"
)

type PortfolioPerformance struct {
	PortfolioID   uuid.UUID `gorm:"type:uuid;primaryKey" json:"portfolio_id"`
	Portfolio     Portfolio `gorm:"foreignKey:PortfolioID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
	DailyReturn   float64   `gorm:"type:decimal(18,4);not null;default:0" json:"daily_return"`
	WeeklyReturn  float64   `gorm:"type:decimal(18,4);not null;default:0" json:"weekly_return"`
	MonthlyReturn float64   `gorm:"type:decimal(18,4);not null;default:0" json:"monthly_return"`
	AnnualReturn  float64   `gorm:"type:decimal(18,4);not null;default:0" json:"annual_return"`
	UpdatedAt     time.Time `json:"updated_at"`
}
