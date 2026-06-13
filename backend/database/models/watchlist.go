package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Watchlist struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID      uuid.UUID `gorm:"type:uuid;index;not null"`
	User        User      `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	Ticker      string    `gorm:"type:varchar(10);index;not null"`
	CompanyName string    `gorm:"type:varchar(255)"`
	CreatedAt   time.Time `gorm:"not null"`
}

func (w *Watchlist) BeforeCreate(tx *gorm.DB) (err error) {
	if w.ID == uuid.Nil {
		w.ID = uuid.New()
	}
	return
}
