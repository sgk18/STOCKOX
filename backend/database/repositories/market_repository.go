package repositories

import (
	"stockox-backend/database/models"

	"gorm.io/gorm"
)

type MarketRepository interface {
	GetSnapshots() ([]models.MarketSnapshot, error)
	GetBySymbol(symbol string) (*models.MarketSnapshot, error)
	Update(snapshot *models.MarketSnapshot) error
}

type sqlMarketRepository struct {
	db *gorm.DB
}

func NewMarketRepository(db *gorm.DB) MarketRepository {
	return &sqlMarketRepository{db: db}
}

func (r *sqlMarketRepository) GetSnapshots() ([]models.MarketSnapshot, error) {
	var snapshots []models.MarketSnapshot
	err := r.db.Find(&snapshots).Error
	if err != nil {
		return nil, err
	}
	return snapshots, nil
}

func (r *sqlMarketRepository) GetBySymbol(symbol string) (*models.MarketSnapshot, error) {
	var snapshot models.MarketSnapshot
	err := r.db.First(&snapshot, "symbol = ?", symbol).Error
	if err != nil {
		return nil, err
	}
	return &snapshot, nil
}

func (r *sqlMarketRepository) Update(snapshot *models.MarketSnapshot) error {
	return r.db.Save(snapshot).Error
}
