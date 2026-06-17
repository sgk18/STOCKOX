package repositories

import (
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

type sqlAgentRoomRepository struct {
	db *gorm.DB
}

func NewAgentRoomRepository(db *gorm.DB) AgentRoomRepository {
	return &sqlAgentRoomRepository{db: db}
}

func (r *sqlAgentRoomRepository) CreateRoom(room *models.AgentRoom) error {
	return r.db.Create(room).Error
}

func (r *sqlAgentRoomRepository) GetRoomByID(id uuid.UUID) (*models.AgentRoom, error) {
	var room models.AgentRoom
	err := r.db.First(&room, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &room, nil
}

func (r *sqlAgentRoomRepository) GetRoomByTicker(ticker string) (*models.AgentRoom, error) {
	var room models.AgentRoom
	err := r.db.Order("created_at desc").First(&room, "ticker = ?", ticker).Error
	if err != nil {
		return nil, err
	}
	return &room, nil
}

func (r *sqlAgentRoomRepository) UpdateRoomStatus(id uuid.UUID, status string) error {
	return r.db.Model(&models.AgentRoom{}).Where("id = ?", id).Update("status", status).Error
}

func (r *sqlAgentRoomRepository) AddConversation(message *models.AgentConversation) error {
	return r.db.Create(message).Error
}

func (r *sqlAgentRoomRepository) GetConversationsByRoomID(roomID uuid.UUID) ([]models.AgentConversation, error) {
	var conversations []models.AgentConversation
	err := r.db.Where("room_id = ?", roomID).Order("created_at asc").Find(&conversations).Error
	if err != nil {
		return nil, err
	}
	return conversations, nil
}

func (r *sqlAgentRoomRepository) GetRecentRooms(limit int) ([]models.AgentRoom, error) {
	var rooms []models.AgentRoom
	err := r.db.Order("created_at desc").Limit(limit).Find(&rooms).Error
	if err != nil {
		return nil, err
	}
	return rooms, nil
}
