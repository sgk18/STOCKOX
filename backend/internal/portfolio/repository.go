package portfolio

import (
	"gorm.io/gorm"
)

type PortfolioRepository interface {
	GetByUserID(userID uint) (*Portfolio, error)
	GetUserByID(userID uint) (*User, error)
}

type sqlPortfolioRepository struct {
	db *gorm.DB
}

func NewPortfolioRepository(db *gorm.DB) PortfolioRepository {
	return &sqlPortfolioRepository{db: db}
}

func (r *sqlPortfolioRepository) GetByUserID(userID uint) (*Portfolio, error) {
	var portfolio Portfolio
	err := r.db.Where("user_id = ?", userID).First(&portfolio).Error
	if err != nil {
		return nil, err
	}
	return &portfolio, nil
}

func (r *sqlPortfolioRepository) GetUserByID(userID uint) (*User, error) {
	var user User
	err := r.db.First(&user, userID).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}
