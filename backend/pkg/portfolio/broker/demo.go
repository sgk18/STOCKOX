package broker

import (
	"errors"
	"fmt"
	"time"

	"stockox-backend/database/models"
	"stockox-backend/pkg/marketdata"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DemoBroker struct {
	db        *gorm.DB
	marketSrv *marketdata.MarketDataService
}

func NewDemoBroker(db *gorm.DB, marketSrv *marketdata.MarketDataService) Broker {
	return &DemoBroker{db: db, marketSrv: marketSrv}
}

func (b *DemoBroker) ExecuteTrade(portfolioID uuid.UUID, order TradeOrder) (*models.Transaction, error) {
	if order.Quantity <= 0 {
		return nil, errors.New("quantity must be greater than zero")
	}

	// 1. Resolve transaction price (fetch current market price if not supplied)
	price := order.Price
	if price <= 0 {
		var snap models.MarketSnapshot
		err := b.db.First(&snap, "symbol = ?", order.Ticker).Error
		if err == nil {
			price = snap.Price
		} else if b.marketSrv != nil {
			quote, errQuote := b.marketSrv.GetQuote(order.Ticker)
			if errQuote == nil && quote != nil {
				price = quote.CurrentPrice
			}
		}
	}

	if price <= 0 {
		price = 150.0 // ultimate fallback price
	}

	txErr := b.db.Transaction(func(tx *gorm.DB) error {
		// A. Fetch Portfolio with lock
		var port models.Portfolio
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&port, "id = ?", portfolioID).Error; err != nil {
			return fmt.Errorf("failed to fetch portfolio: %w", err)
		}

		tradeAmount := order.Quantity * price

		if order.Type == "BUY" {
			// B. Validate cash balance
			if port.CashBalance < tradeAmount {
				return fmt.Errorf("insufficient cash: need %.2f, available %.2f", tradeAmount, port.CashBalance)
			}

			// C. Load or Create Holding
			var holding models.PortfolioHolding
			err := tx.First(&holding, "portfolio_id = ? AND ticker = ?", portfolioID, order.Ticker).Error
			if err == nil {
				// Update existing holding
				newQty := holding.Quantity + order.Quantity
				newAvg := (holding.AveragePrice*holding.Quantity + price*order.Quantity) / newQty
				holding.Quantity = newQty
				holding.AveragePrice = newAvg
				holding.CurrentPrice = price
				holding.UpdatedAt = time.Now()
				if err := tx.Save(&holding).Error; err != nil {
					return fmt.Errorf("failed to update holding: %w", err)
				}
			} else if errors.Is(err, gorm.ErrRecordNotFound) {
				// Create new holding
				holding = models.PortfolioHolding{
					ID:           uuid.New(),
					PortfolioID:  portfolioID,
					Ticker:       order.Ticker,
					Quantity:     order.Quantity,
					AveragePrice: price,
					CurrentPrice: price,
					CreatedAt:    time.Now(),
					UpdatedAt:    time.Now(),
				}
				if err := tx.Create(&holding).Error; err != nil {
					return fmt.Errorf("failed to create holding: %w", err)
				}
			} else {
				return err
			}

			// D. Deduct cash
			port.CashBalance -= tradeAmount
		} else if order.Type == "SELL" {
			// B. Load Holding
			var holding models.PortfolioHolding
			if err := tx.First(&holding, "portfolio_id = ? AND ticker = ?", portfolioID, order.Ticker).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return fmt.Errorf("you do not own ticker %s", order.Ticker)
				}
				return err
			}

			// C. Validate sell quantity
			if holding.Quantity < order.Quantity {
				return fmt.Errorf("insufficient shares to sell: owning %.2f, attempting to sell %.2f", holding.Quantity, order.Quantity)
			}

			// D. Update or Delete Holding
			holding.Quantity -= order.Quantity
			holding.CurrentPrice = price
			holding.UpdatedAt = time.Now()

			if holding.Quantity == 0 {
				if err := tx.Delete(&holding).Error; err != nil {
					return fmt.Errorf("failed to remove holding: %w", err)
				}
			} else {
				if err := tx.Save(&holding).Error; err != nil {
					return fmt.Errorf("failed to update holding: %w", err)
				}
			}

			// E. Add cash
			port.CashBalance += tradeAmount
		} else {
			return fmt.Errorf("invalid trade type: %s", order.Type)
		}

		// Update Portfolio Total Value (cash + value of all holdings)
		var holdings []models.PortfolioHolding
		if err := tx.Find(&holdings, "portfolio_id = ?", portfolioID).Error; err == nil {
			holdingsVal := 0.0
			for _, h := range holdings {
				currentHoldingPrice := h.CurrentPrice
				if h.Ticker == order.Ticker {
					currentHoldingPrice = price
				}
				holdingsVal += h.Quantity * currentHoldingPrice
			}
			port.TotalValue = port.CashBalance + holdingsVal
		}

		port.UpdatedAt = time.Now()
		if err := tx.Save(&port).Error; err != nil {
			return fmt.Errorf("failed to save portfolio stats: %w", err)
		}

		// F. Log Transaction
		txn := models.Transaction{
			ID:          uuid.New(),
			PortfolioID: portfolioID,
			Ticker:      order.Ticker,
			Quantity:    order.Quantity,
			Price:       price,
			Type:        order.Type,
			CreatedAt:   time.Now(),
		}
		if err := tx.Create(&txn).Error; err != nil {
			return fmt.Errorf("failed to create transaction log: %w", err)
		}

		return nil
	})

	if txErr != nil {
		return nil, txErr
	}

	// Retrieve the created transaction
	var finalTx models.Transaction
	b.db.Order("created_at desc").First(&finalTx, "portfolio_id = ? AND ticker = ?", portfolioID, order.Ticker)
	return &finalTx, nil
}
