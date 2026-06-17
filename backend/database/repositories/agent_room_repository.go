package repositories

import (
	"errors"
	"sync"
	"time"

	"stockox-backend/database/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AgentRoomRepository interface {
	CreateRoom(room *models.AgentRoom) error
	GetRoomByID(id uuid.UUID) (*models.AgentRoom, error)
	GetRoomByTicker(ticker string) (*models.AgentRoom, error)
	UpdateRoomStatus(id uuid.UUID, status string) error
	AddConversation(message *models.AgentConversation) error
	GetConversationsByRoomID(roomID uuid.UUID) ([]models.AgentConversation, error)
	GetRecentRooms(limit int) ([]models.AgentRoom, error)
}

type inMemoryAgentRoomRepository struct {
	mu            sync.RWMutex
	rooms         map[uuid.UUID]*models.AgentRoom
	conversations map[uuid.UUID][]models.AgentConversation
}

func NewAgentRoomRepository(db *gorm.DB) AgentRoomRepository {
	return &inMemoryAgentRoomRepository{
		rooms:         make(map[uuid.UUID]*models.AgentRoom),
		conversations: make(map[uuid.UUID][]models.AgentConversation),
	}
}

func (r *inMemoryAgentRoomRepository) CreateRoom(room *models.AgentRoom) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.rooms[room.ID] = room
	return nil
}

func (r *inMemoryAgentRoomRepository) GetRoomByID(id uuid.UUID) (*models.AgentRoom, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	room, exists := r.rooms[id]
	if !exists {
		return nil, errors.New("room not found")
	}
	return room, nil
}

func (r *inMemoryAgentRoomRepository) GetRoomByTicker(ticker string) (*models.AgentRoom, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, room := range r.rooms {
		if room.Ticker == ticker {
			return room, nil
		}
	}
	return nil, errors.New("room not found")
}

func (r *inMemoryAgentRoomRepository) UpdateRoomStatus(id uuid.UUID, status string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	room, exists := r.rooms[id]
	if !exists {
		return errors.New("room not found")
	}
	room.Status = status
	room.UpdatedAt = time.Now()
	return nil
}

func (r *inMemoryAgentRoomRepository) AddConversation(message *models.AgentConversation) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.conversations[message.RoomID] = append(r.conversations[message.RoomID], *message)
	return nil
}

func (r *inMemoryAgentRoomRepository) GetConversationsByRoomID(roomID uuid.UUID) ([]models.AgentConversation, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	convs := r.conversations[roomID]
	return convs, nil
}

func (r *inMemoryAgentRoomRepository) GetRecentRooms(limit int) ([]models.AgentRoom, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	// Convert map to slice
	var allRooms []models.AgentRoom
	for _, room := range r.rooms {
		allRooms = append(allRooms, *room)
	}
	
	// Sort by CreatedAt desc
	for i := 0; i < len(allRooms); i++ {
		for j := i + 1; j < len(allRooms); j++ {
			if allRooms[i].CreatedAt.Before(allRooms[j].CreatedAt) {
				allRooms[i], allRooms[j] = allRooms[j], allRooms[i]
			}
		}
	}
	
	if len(allRooms) > limit {
		return allRooms[:limit], nil
	}
	return allRooms, nil
}
