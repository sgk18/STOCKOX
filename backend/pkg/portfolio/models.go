package portfolio

import (
	"time"
)

type User struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Email     string    `gorm:"uniqueIndex;not null;type:varchar(100)" json:"email"`
	Name      string    `gorm:"type:varchar(100)" json:"name"`
	Avatar    string    `gorm:"type:varchar(50)" json:"avatar"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Portfolio struct {
	ID                 uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID             uint      `gorm:"not null" json:"user_id"`
	User               User      `gorm:"foreignKey:UserID" json:"-"`
	TotalValue         float64   `gorm:"type:decimal(16,2);not null" json:"total_value"`
	DailyChange        float64   `gorm:"type:decimal(16,2);not null" json:"daily_change"`
	DailyChangePercent float64   `gorm:"type:decimal(6,3);not null" json:"daily_change_percent"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}
