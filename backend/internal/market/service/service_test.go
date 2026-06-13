package service

import (
	"testing"
	"stockox-backend/config"
	"stockox-backend/internal/market/cache"
	"stockox-backend/internal/market/providers"
)

func TestMarketServiceCreation(t *testing.T) {
	cfg := &config.Config{}
	factory := providers.NewProviderFactory(cfg)
	cacheWrapper := cache.NewMarketCache(nil)

	srv := NewMarketService(factory, cacheWrapper)
	if srv == nil {
		t.Fatal("Expected non-nil service instance")
	}
}
