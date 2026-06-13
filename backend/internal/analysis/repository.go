package analysis

import (
	"time"

	"gorm.io/gorm"
)

type AnalysisRepository interface {
	GetRecentSessions(limit int) ([]AnalysisSession, error)
	LogSession(userID uint, ticker, recommendation string, confidenceScore int, riskLevel string) (*AnalysisSession, error)
}

type sqlAnalysisRepository struct {
	db *gorm.DB
}

func NewAnalysisRepository(db *gorm.DB) AnalysisRepository {
	return &sqlAnalysisRepository{db: db}
}

func (r *sqlAnalysisRepository) GetRecentSessions(limit int) ([]AnalysisSession, error) {
	var sessions []AnalysisSession
	err := r.db.Order("created_at desc").Limit(limit).Find(&sessions).Error
	if err != nil {
		return nil, err
	}
	return sessions, nil
}

func (r *sqlAnalysisRepository) LogSession(userID uint, ticker, recommendation string, confidenceScore int, riskLevel string) (*AnalysisSession, error) {
	session := AnalysisSession{
		UserID:          userID,
		Ticker:          ticker,
		Recommendation:  recommendation,
		ConfidenceScore: confidenceScore,
		RiskLevel:       riskLevel,
		CreatedAt:       time.Now(),
	}
	err := r.db.Create(&session).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}
