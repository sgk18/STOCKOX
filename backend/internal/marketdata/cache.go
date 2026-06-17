package marketdata

import (
	"context"
	"fmt"
	"time"

	"stockox-backend/pkg/cache"
)

type MarketDataCache struct {
	inner cache.Cache
}

func NewMarketDataCache(inner cache.Cache) *MarketDataCache {
	return &MarketDataCache{inner: inner}
}

// TTL definitions as per Phase 3 specifications
const (
	TTLQuote        = 30 * time.Second
	TTLProfile      = 24 * time.Hour
	TTLFundamentals = 6 * time.Hour
	TTLNews         = 10 * time.Minute
	TTLCandles      = 1 * time.Hour
	TTLAnalysis     = 15 * time.Minute
)

func KeyQuote(symbol string) string {
	return fmt.Sprintf("quote:%s", symbol)
}

func KeyProfile(symbol string) string {
	return fmt.Sprintf("profile:%s", symbol)
}

func KeyFundamentals(symbol string) string {
	return fmt.Sprintf("fundamentals:%s", symbol)
}

func KeyNews(symbol string) string {
	return fmt.Sprintf("news:%s", symbol)
}

func KeyCandles(symbol, timeframe string) string {
	return fmt.Sprintf("candles:%s:%s", symbol, timeframe)
}

func KeyAnalysis(symbol string) string {
	return fmt.Sprintf("analysis:%s", symbol)
}

func (c *MarketDataCache) GetJSON(ctx context.Context, key string, dest interface{}) error {
	return c.inner.GetJSON(ctx, key, dest)
}

func (c *MarketDataCache) SetJSON(ctx context.Context, key string, val interface{}, ttl time.Duration) error {
	return c.inner.SetJSON(ctx, key, val, ttl)
}

func (c *MarketDataCache) Exists(ctx context.Context, key string) (bool, error) {
	return c.inner.Exists(ctx, key)
}

func (c *MarketDataCache) Delete(ctx context.Context, key string) error {
	return c.inner.Delete(ctx, key)
}
