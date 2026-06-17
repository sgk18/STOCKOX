package service

import (
	"testing"
	"stockox-backend/config"
	"stockox-backend/pkg/cache"
	"stockox-backend/pkg/market/providers"
)

func TestMarketServiceCreation(t *testing.T) {
	cfg := &config.Config{}
	factory := providers.NewProviderFactory(cfg)
	noopCache := cache.NewNoopCache()

	srv := NewMarketService(factory, noopCache, nil)
	if srv == nil {
		t.Fatal("Expected non-nil service instance")
	}
}
