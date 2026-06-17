package marketdata

import (
	"testing"

	"stockox-backend/pkg/cache"
	"stockox-backend/pkg/market/dto"
)

type mockProvider struct{}

func (m *mockProvider) GetQuote(symbol string) (*dto.QuoteDTO, error) {
	return &dto.QuoteDTO{Ticker: symbol, CurrentPrice: 100.0}, nil
}
func (m *mockProvider) GetCompanyProfile(symbol string) (*dto.CompanyProfileDTO, error) {
	return &dto.CompanyProfileDTO{Ticker: symbol, Name: symbol + " Corp"}, nil
}
func (m *mockProvider) GetCandles(symbol string, timeframe string) ([]dto.CandleDTO, error) {
	return []dto.CandleDTO{}, nil
}
func (m *mockProvider) GetNews(symbol string) ([]dto.NewsDTO, error) {
	return []dto.NewsDTO{}, nil
}
func (m *mockProvider) GetFundamentals(symbol string) (*dto.FinancialMetricsDTO, error) {
	return &dto.FinancialMetricsDTO{Ticker: symbol}, nil
}

func TestMarketDataService(t *testing.T) {
	noopCache := cache.NewNoopCache()
	mdCache := NewMarketDataCache(noopCache)

	mockProv := &mockProvider{}
	aggregator := NewMarketDataAggregator(nil, mdCache, mockProv, mockProv, mockProv)
	srv := NewMarketDataService(nil, aggregator)

	if srv == nil {
		t.Fatal("expected non-nil service")
	}

	data, err := srv.GetResearchTerminalData("AAPL")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if data.Symbol != "AAPL" {
		t.Errorf("expected AAPL, got %s", data.Symbol)
	}
	if data.Quote.CurrentPrice != 100.0 {
		t.Errorf("expected 100.0, got %f", data.Quote.CurrentPrice)
	}

	searchRes, err := srv.SearchAssets("AAPL")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(searchRes) != 0 {
		t.Errorf("expected empty search results, got %d", len(searchRes))
	}
}
