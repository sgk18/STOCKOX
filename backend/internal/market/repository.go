package market

import (
	"gorm.io/gorm"
)

type MarketRepository interface {
	GetSnapshots() ([]MarketSnapshot, error)
	GetBySymbol(symbol string) (*MarketSnapshot, error)
}

type sqlMarketRepository struct {
	db *gorm.DB
}

func NewMarketRepository(db *gorm.DB) MarketRepository {
	return &sqlMarketRepository{db: db}
}

func (r *sqlMarketRepository) GetSnapshots() ([]MarketSnapshot, error) {
	var snapshots []MarketSnapshot
	err := r.db.Find(&snapshots).Error
	if err != nil {
		return nil, err
	}
	return snapshots, nil
}

func (r *sqlMarketRepository) GetBySymbol(symbol string) (*MarketSnapshot, error) {
	var snapshot MarketSnapshot
	err := r.db.Where("symbol = ?", symbol).First(&snapshot).Error
	if err != nil {
		return nil, err
	}
	return &snapshot, nil
}
