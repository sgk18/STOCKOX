package agents

import (
	"time"
)

type AgentActivity struct {
	ID           uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	AgentName    string    `gorm:"type:varchar(100);not null" json:"agent_name"`
	ActivityType string    `gorm:"type:varchar(100);not null" json:"activity_type"`
	Message      string    `gorm:"type:text;not null" json:"message"`
	Status       string    `gorm:"type:varchar(50);not null" json:"status"`
	CreatedAt    time.Time `json:"created_at"`
}

type AgentStatus struct {
	ID        uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	AgentName string `gorm:"uniqueIndex;type:varchar(100);not null" json:"agent_name"`
	Status    string `gorm:"type:varchar(50);not null" json:"status"` // idle, thinking, researching, analyzing, completed, error
}
