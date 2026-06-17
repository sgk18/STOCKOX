package repositories

import (
	"stockox-backend/database/models"

	"gorm.io/gorm"
)

type AnalysisRepository interface {
	GetRecentAgentMessages(limit int) ([]models.AnalysisLog, error)
}

type sqlAnalysisRepository struct {
	db *gorm.DB
}

func NewAnalysisRepository(db *gorm.DB) AnalysisRepository {
	return &sqlAnalysisRepository{db: db}
}

func (r *sqlAnalysisRepository) GetRecentAgentMessages(limit int) ([]models.AnalysisLog, error) {
	var messages []models.AnalysisLog
	err := r.db.Order("created_at desc").Limit(limit).Find(&messages).Error
	if err != nil {
		return nil, err
	}
	return messages, nil
}
