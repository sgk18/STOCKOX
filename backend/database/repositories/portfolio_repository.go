package repositories

import (
	"stockox-backend/database/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PortfolioRepository interface {
	GetByUserID(userID string) (*models.Portfolio, error)
	GetHoldings(portfolioID uuid.UUID) ([]models.PortfolioHolding, error)
	Create(portfolio *models.Portfolio) error
	Update(portfolio *models.Portfolio) error
	AddHolding(holding *models.PortfolioHolding) error
	UpdateHolding(holding *models.PortfolioHolding) error
	RemoveHolding(holdingID uuid.UUID) error
}

type sqlPortfolioRepository struct {
	db *gorm.DB
}

func NewPortfolioRepository(db *gorm.DB) PortfolioRepository {
	return &sqlPortfolioRepository{db: db}
}

func (r *sqlPortfolioRepository) GetByUserID(userID string) (*models.Portfolio, error) {
	var portfolio models.Portfolio
	err := r.db.First(&portfolio, "user_id = ?", userID).Error
	if err != nil {
		return nil, err
	}
	return &portfolio, nil
}

func (r *sqlPortfolioRepository) GetHoldings(portfolioID uuid.UUID) ([]models.PortfolioHolding, error) {
	var holdings []models.PortfolioHolding
	err := r.db.Find(&holdings, "portfolio_id = ?", portfolioID).Error
	if err != nil {
		return nil, err
	}
	return holdings, nil
}

func (r *sqlPortfolioRepository) Create(portfolio *models.Portfolio) error {
	return r.db.Create(portfolio).Error
}

func (r *sqlPortfolioRepository) Update(portfolio *models.Portfolio) error {
	return r.db.Save(portfolio).Error
}

func (r *sqlPortfolioRepository) AddHolding(holding *models.PortfolioHolding) error {
	return r.db.Create(holding).Error
}

func (r *sqlPortfolioRepository) UpdateHolding(holding *models.PortfolioHolding) error {
	return r.db.Save(holding).Error
}

func (r *sqlPortfolioRepository) RemoveHolding(holdingID uuid.UUID) error {
	return r.db.Delete(&models.PortfolioHolding{}, "id = ?", holdingID).Error
}
