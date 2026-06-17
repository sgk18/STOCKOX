package models

import (
	"time"

	"github.com/google/uuid"
)

type AgentRoom struct {
	ID        uuid.UUID `json:"id"`
	Ticker    string    `json:"ticker"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AgentConversation struct {
	ID          uuid.UUID `json:"id"`
	RoomID      uuid.UUID `json:"room_id"`
	AgentName   string    `json:"agent_name"`
	Message     string    `json:"message"`
	MessageType string    `json:"message_type"`
	CreatedAt   time.Time `json:"created_at"`
}
