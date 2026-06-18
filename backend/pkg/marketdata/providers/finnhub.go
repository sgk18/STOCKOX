package providers

import (
	"time"

	"stockox-backend/pkg/market/dto"
	legacy "stockox-backend/pkg/market/providers"
)

type FinnhubWrapper struct {
	inner *legacy.FinnhubProvider
}

func NewFinnhubWrapper(apiKey string) *FinnhubWrapper {
	return &FinnhubWrapper{
		inner: legacy.NewFinnhubProvider(apiKey),
	}
}

func (w *FinnhubWrapper) GetQuote(symbol string) (*dto.QuoteDTO, error) {
	return w.inner.GetQuote(symbol)
}

func (w *FinnhubWrapper) GetCompanyProfile(symbol string) (*dto.CompanyProfileDTO, error) {
	return w.inner.GetCompanyProfile(symbol)
}

func (w *FinnhubWrapper) GetCandles(symbol string, timeframe string) ([]dto.CandleDTO, error) {
	to := time.Now().Unix()
	from := time.Now().AddDate(-1, 0, 0).Unix() // 1 year default
	return w.inner.GetHistoricalCandles(symbol, timeframe, from, to)
}

func (w *FinnhubWrapper) GetNews(symbol string) ([]dto.NewsDTO, error) {
	return w.inner.GetCompanyNews(symbol)
}

func (w *FinnhubWrapper) GetFundamentals(symbol string) (*dto.FinancialMetricsDTO, error) {
	return w.inner.GetFinancialMetrics(symbol)
}
