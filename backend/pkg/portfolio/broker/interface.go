package broker

import (
	"stockox-backend/database/models"

	"github.com/google/uuid"
)

type TradeOrder struct {
	Ticker    string  `json:"ticker"`
	Quantity  float64 `json:"quantity"`
	Price     float64 `json:"price"`
	Type      string  `json:"type"`       // BUY, SELL
	OrderType string  `json:"order_type"` // MARKET, LIMIT
}

type Broker interface {
	ExecuteTrade(portfolioID uuid.UUID, order TradeOrder) (*models.Transaction, error)
}
