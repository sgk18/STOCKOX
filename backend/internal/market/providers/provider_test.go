package providers

import (
	"testing"
	"stockox-backend/config"
)

func TestProviderFactory(t *testing.T) {
	cfg := &config.Config{}
	cfg.Market.FinnhubAPIKey = "test_finnhub"
	cfg.Market.AlphaVantageAPIKey = "test_alpha"

	factory := NewProviderFactory(cfg)
	p, err := factory.GetProvider("finnhub")
	if err != nil {
		t.Fatalf("Expected finnhub provider, got error: %v", err)
	}
	if p == nil {
		t.Fatal("Expected non-nil provider")
	}

	p2, err := factory.GetProvider("alphavantage")
	if err != nil {
		t.Fatalf("Expected alpha vantage provider, got error: %v", err)
	}
	if p2 == nil {
		t.Fatal("Expected non-nil provider")
	}
}
