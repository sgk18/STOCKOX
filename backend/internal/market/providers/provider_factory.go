package providers

import (
	"fmt"
	"stockox-backend/config"
)

type ProviderFactory struct {
	providers map[string]MarketProvider
	defaultPr string
}

func NewProviderFactory(cfg *config.Config) *ProviderFactory {
	providersMap := make(map[string]MarketProvider)

	if cfg.Market.FinnhubAPIKey != "" {
		providersMap["finnhub"] = NewFinnhubProvider(cfg.Market.FinnhubAPIKey)
	}
	if cfg.Market.AlphaVantageAPIKey != "" {
		providersMap["alphavantage"] = NewAlphaVantageProvider(cfg.Market.AlphaVantageAPIKey)
	}

	// Determine default provider
	defaultProvider := "finnhub"
	if _, ok := providersMap["finnhub"]; !ok {
		if _, okVal := providersMap["alphavantage"]; okVal {
			defaultProvider = "alphavantage"
		}
	}

	return &ProviderFactory{
		providers: providersMap,
		defaultPr: defaultProvider,
	}
}

// GetProvider retrieves the chosen provider by identifier
func (f *ProviderFactory) GetProvider(name string) (MarketProvider, error) {
	if name == "" {
		name = f.defaultPr
	}
	p, exists := f.providers[name]
	if !exists {
		// Fallback to whatever is active
		for _, prov := range f.providers {
			return prov, nil
		}
		return nil, fmt.Errorf("no market data providers configured in workspace environment variables")
	}
	return p, nil
}
