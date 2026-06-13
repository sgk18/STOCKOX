package repositories

import (
	"time"

	"stockox-backend/database/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AnalysisRepository interface {
	GetRecentSessions(limit int) ([]models.AnalysisSession, error)
	GetSessionByID(id uuid.UUID) (*models.AnalysisSession, error)
	CreateSession(session *models.AnalysisSession) error
	LogAgentMessage(sessionID uuid.UUID, agentName string, message string, messageType string) (*models.AgentMessage, error)
	GetAgentMessages(sessionID uuid.UUID) ([]models.AgentMessage, error)
	GetRecentAgentMessages(limit int) ([]models.AgentMessage, error)
}

type sqlAnalysisRepository struct {
	db *gorm.DB
}

func NewAnalysisRepository(db *gorm.DB) AnalysisRepository {
	return &sqlAnalysisRepository{db: db}
}

func (r *sqlAnalysisRepository) GetRecentSessions(limit int) ([]models.AnalysisSession, error) {
	var sessions []models.AnalysisSession
	err := r.db.Order("created_at desc").Limit(limit).Find(&sessions).Error
	if err != nil {
		return nil, err
	}
	return sessions, nil
}

func (r *sqlAnalysisRepository) GetSessionByID(id uuid.UUID) (*models.AnalysisSession, error) {
	var session models.AnalysisSession
	err := r.db.First(&session, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *sqlAnalysisRepository) CreateSession(session *models.AnalysisSession) error {
	return r.db.Create(session).Error
}

func (r *sqlAnalysisRepository) LogAgentMessage(sessionID uuid.UUID, agentName string, message string, messageType string) (*models.AgentMessage, error) {
	msg := models.AgentMessage{
		ID:                uuid.New(),
		AnalysisSessionID: sessionID,
		AgentName:         agentName,
		Message:           message,
		MessageType:       messageType,
		CreatedAt:         time.Now(),
	}
	err := r.db.Create(&msg).Error
	if err != nil {
		return nil, err
	}
	return &msg, nil
}

func (r *sqlAnalysisRepository) GetAgentMessages(sessionID uuid.UUID) ([]models.AgentMessage, error) {
	var messages []models.AgentMessage
	err := r.db.Order("created_at asc").Find(&messages, "analysis_session_id = ?", sessionID).Error
	if err != nil {
		return nil, err
	}
	return messages, nil
}

func (r *sqlAnalysisRepository) GetRecentAgentMessages(limit int) ([]models.AgentMessage, error) {
	var messages []models.AgentMessage
	err := r.db.Order("created_at desc").Limit(limit).Find(&messages).Error
	if err != nil {
		return nil, err
	}
	return messages, nil
}
