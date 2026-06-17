package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AgentRoom struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Ticker    string         `gorm:"type:varchar(10);index;not null" json:"ticker"`
	Status    string         `gorm:"type:varchar(50);not null;default:'created'" json:"status"` // created, active, completed, failed
	CreatedAt time.Time      `gorm:"not null" json:"created_at"`
	UpdatedAt time.Time      `gorm:"not null" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type AgentConversation struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	RoomID      uuid.UUID `gorm:"type:uuid;index;not null" json:"room_id"`
	Room        AgentRoom `gorm:"foreignKey:RoomID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
	AgentName   string    `gorm:"type:varchar(100);not null" json:"agent_name"`
	Message     string    `gorm:"type:text;not null" json:"message"`
	MessageType string    `gorm:"type:varchar(50);not null;default:'analysis'" json:"message_type"` // analysis, question, challenge, agreement, recommendation, warning, decision
	CreatedAt   time.Time `gorm:"not null" json:"created_at"`
}

func (r *AgentRoom) BeforeCreate(tx *gorm.DB) (err error) {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return
}

func (c *AgentConversation) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return
}
