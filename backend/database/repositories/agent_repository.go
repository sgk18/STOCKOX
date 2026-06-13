package repositories

import (
	"stockox-backend/database/models"

	"gorm.io/gorm"
)

type AgentRepository interface {
	GetByName(name string) (*models.Agent, error)
	GetList() ([]models.Agent, error)
	UpdateStatus(name string, status string) error
	Create(agent *models.Agent) error
}

type sqlAgentRepository struct {
	db *gorm.DB
}

func NewAgentRepository(db *gorm.DB) AgentRepository {
	return &sqlAgentRepository{db: db}
}

func (r *sqlAgentRepository) GetByName(name string) (*models.Agent, error) {
	var agent models.Agent
	err := r.db.First(&agent, "name = ?", name).Error
	if err != nil {
		return nil, err
	}
	return &agent, nil
}

func (r *sqlAgentRepository) GetList() ([]models.Agent, error) {
	var list []models.Agent
	err := r.db.Find(&list).Error
	if err != nil {
		return nil, err
	}
	return list, nil
}

func (r *sqlAgentRepository) UpdateStatus(name string, status string) error {
	return r.db.Model(&models.Agent{}).Where("name = ?", name).Update("status", status).Error
}

func (r *sqlAgentRepository) Create(agent *models.Agent) error {
	return r.db.Create(agent).Error
}
