package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey"`
	Email     string         `gorm:"type:varchar(255);uniqueIndex;not null"`
	Name      string         `gorm:"type:varchar(255)"`
	AvatarURL string         `gorm:"type:varchar(255)"`
	Role      string         `gorm:"type:varchar(100)"`
	CreatedAt time.Time      `gorm:"not null"`
	UpdatedAt time.Time      `gorm:"not null"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

// BeforeCreate GORM hook to automatically initialize uuid primary keys
func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return
}
