package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Agent struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey"`
	Name      string         `gorm:"type:varchar(100);uniqueIndex;not null"` // Research Agent, News Agent, etc.
	Status    string         `gorm:"type:varchar(50);not null;default:'idle'"` // idle, thinking, researching, analyzing, completed, error
	CreatedAt time.Time      `gorm:"not null"`
	UpdatedAt time.Time      `gorm:"not null"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

func (a *Agent) BeforeCreate(tx *gorm.DB) (err error) {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return
}
