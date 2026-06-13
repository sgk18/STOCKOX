package repositories

import (
	"time"

	"stockox-backend/database/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WatchlistRepository interface {
	GetByUserID(userID string) ([]models.Watchlist, error)
	Add(userID string, ticker string, companyName string) (*models.Watchlist, error)
	Remove(userID string, ticker string) error
}

type sqlWatchlistRepository struct {
	db *gorm.DB
}

func NewWatchlistRepository(db *gorm.DB) WatchlistRepository {
	return &sqlWatchlistRepository{db: db}
}

func (r *sqlWatchlistRepository) GetByUserID(userID string) ([]models.Watchlist, error) {
	var items []models.Watchlist
	err := r.db.Find(&items, "user_id = ?", userID).Error
	if err != nil {
		return nil, err
	}
	return items, nil
}

func (r *sqlWatchlistRepository) Add(userID string, ticker string, companyName string) (*models.Watchlist, error) {
	item := models.Watchlist{
		ID:          uuid.New(),
		UserID:      userID,
		Ticker:      ticker,
		CompanyName: companyName,
		CreatedAt:   time.Now(),
	}
	err := r.db.Create(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *sqlWatchlistRepository) Remove(userID string, ticker string) error {
	return r.db.Delete(&models.Watchlist{}, "user_id = ? AND ticker = ?", userID, ticker).Error
}
