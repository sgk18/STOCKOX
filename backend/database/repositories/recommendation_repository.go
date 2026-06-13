package repositories

import (
	"stockox-backend/database/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RecommendationRepository interface {
	GetBySessionID(sessionID uuid.UUID) ([]models.Recommendation, error)
	Create(rec *models.Recommendation) error
}

type sqlRecommendationRepository struct {
	db *gorm.DB
}

func NewRecommendationRepository(db *gorm.DB) RecommendationRepository {
	return &sqlRecommendationRepository{db: db}
}

func (r *sqlRecommendationRepository) GetBySessionID(sessionID uuid.UUID) ([]models.Recommendation, error) {
	var recs []models.Recommendation
	err := r.db.Find(&recs, "analysis_session_id = ?", sessionID).Error
	if err != nil {
		return nil, err
	}
	return recs, nil
}

func (r *sqlRecommendationRepository) Create(rec *models.Recommendation) error {
	return r.db.Create(rec).Error
}
