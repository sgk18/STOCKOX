package watchlist

import (
	"time"
)

type Watchlist struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID      uint      `gorm:"not null" json:"user_id"`
	Ticker      string    `gorm:"type:varchar(50);not null" json:"ticker"`
	CompanyName string    `gorm:"type:varchar(100);not null" json:"company_name"`
	AddedAt     time.Time `json:"added_at"`
}
