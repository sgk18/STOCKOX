package providers

import "stockox-backend/pkg/market/dto"

type MarketProvider interface {
	SearchStocks(query string) ([]dto.SearchStockDTO, error)
	GetQuote(ticker string) (*dto.QuoteDTO, error)
	GetCompanyProfile(ticker string) (*dto.CompanyProfileDTO, error)
	GetFinancialMetrics(ticker string) (*dto.FinancialMetricsDTO, error)
	GetHistoricalCandles(ticker string, resolution string, from, to int64) ([]dto.CandleDTO, error)
	GetCompanyNews(ticker string) ([]dto.NewsDTO, error)
	GetEarnings(ticker string) ([]dto.EarningsDTO, error)
}
