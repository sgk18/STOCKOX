package watchlist

import (
	"time"

	"gorm.io/gorm"
)

type WatchlistRepository interface {
	GetByUserID(userID uint) ([]Watchlist, error)
	Add(userID uint, ticker, companyName string) (*Watchlist, error)
	Remove(userID uint, ticker string) error
}

type sqlWatchlistRepository struct {
	db *gorm.DB
}

func NewWatchlistRepository(db *gorm.DB) WatchlistRepository {
	return &sqlWatchlistRepository{db: db}
}

func (r *sqlWatchlistRepository) GetByUserID(userID uint) ([]Watchlist, error) {
	var items []Watchlist
	err := r.db.Where("user_id = ?", userID).Find(&items).Error
	if err != nil {
		return nil, err
	}
	return items, nil
}

func (r *sqlWatchlistRepository) Add(userID uint, ticker, companyName string) (*Watchlist, error) {
	item := Watchlist{
		UserID:      userID,
		Ticker:      ticker,
		CompanyName: companyName,
		AddedAt:     time.Now(),
	}
	err := r.db.Create(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *sqlWatchlistRepository) Remove(userID uint, ticker string) error {
	return r.db.Where("user_id = ? AND ticker = ?", userID, ticker).Delete(&Watchlist{}).Error
}
