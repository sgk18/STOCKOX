package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        string         `gorm:"type:varchar(255);primaryKey"`
	Email     string         `gorm:"type:varchar(255);uniqueIndex;not null"`
	Name      string         `gorm:"type:varchar(255)"`
	AvatarURL string         `gorm:"type:varchar(255)"`
	Role      string         `gorm:"type:varchar(100)"`
	CreatedAt time.Time      `gorm:"not null"`
	UpdatedAt time.Time      `gorm:"not null"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

