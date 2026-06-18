package marketdata

import (
	"stockox-backend/pkg/market/dto"
)

type MarketDataProvider interface {
	GetQuote(symbol string) (*dto.QuoteDTO, error)
	GetCompanyProfile(symbol string) (*dto.CompanyProfileDTO, error)
	GetCandles(symbol string, timeframe string) ([]dto.CandleDTO, error)
	GetNews(symbol string) ([]dto.NewsDTO, error)
	GetFundamentals(symbol string) (*dto.FinancialMetricsDTO, error)
}
