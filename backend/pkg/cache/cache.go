package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
)

var (
	ErrCacheMiss = fmt.Errorf("cache miss")
	Shared       Cache = &noopCache{}
)

type Stats struct {
	Hits               int64    `json:"hits"`
	Misses             int64    `json:"misses"`
	HitRate            string   `json:"hitRate"`
	Keys               int64    `json:"keys"`
	SavedCalls         int64    `json:"savedCalls"`
	AverageAPITimeMs   float64  `json:"averageAPITimeMs"`
	AverageCacheTimeMs float64  `json:"averageCacheTimeMs"`
	TopRequestedStocks []string `json:"topRequestedStocks"`
}

type Cache interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error
	Delete(ctx context.Context, key string) error
	Exists(ctx context.Context, key string) (bool, error)
	SetJSON(ctx context.Context, key string, value interface{}, expiration time.Duration) error
	GetJSON(ctx context.Context, key string, dest interface{}) error
	DeletePattern(ctx context.Context, pattern string) error

	// Stale-While-Revalidate
	GetStaleOrFetch(ctx context.Context, key string, dest interface{}, softTTL time.Duration, hardTTL time.Duration, fetchFunc func() (interface{}, error)) error

	// Observability
	GetStats(ctx context.Context) Stats
	IncrementHits()
	IncrementMisses()
	IncrementSavedCall()
	RecordAPILatency(duration time.Duration)
	RecordCacheLatency(duration time.Duration)
	RecordStockRequest(ticker string)
}

// noopCache is a placeholder cache that always returns a cache miss
type noopCache struct{}

func NewNoopCache() Cache {
	return &noopCache{}
}

func (n *noopCache) Get(ctx context.Context, key string) (string, error) {
	return "", ErrCacheMiss
}

func (n *noopCache) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	return nil
}

func (n *noopCache) Delete(ctx context.Context, key string) error {
	return nil
}

func (n *noopCache) Exists(ctx context.Context, key string) (bool, error) {
	return false, nil
}

func (n *noopCache) SetJSON(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	return nil
}

func (n *noopCache) GetJSON(ctx context.Context, key string, dest interface{}) error {
	return ErrCacheMiss
}

func (n *noopCache) DeletePattern(ctx context.Context, pattern string) error {
	return nil
}

func (n *noopCache) GetStaleOrFetch(ctx context.Context, key string, dest interface{}, softTTL time.Duration, hardTTL time.Duration, fetchFunc func() (interface{}, error)) error {
	val, err := fetchFunc()
	if err != nil {
		return err
	}
	bytes, err := json.Marshal(val)
	if err != nil {
		return err
	}
	return json.Unmarshal(bytes, dest)
}

func (n *noopCache) GetStats(ctx context.Context) Stats {
	return Stats{Hits: 0, Misses: 0, HitRate: "0%", Keys: 0, SavedCalls: 0, AverageAPITimeMs: 0, AverageCacheTimeMs: 0, TopRequestedStocks: []string{}}
}

func (n *noopCache) IncrementHits()       {}
func (n *noopCache) IncrementMisses()     {}
func (n *noopCache) IncrementSavedCall() {}
func (n *noopCache) RecordAPILatency(duration time.Duration) {}
func (n *noopCache) RecordCacheLatency(duration time.Duration) {}
func (n *noopCache) RecordStockRequest(ticker string) {}
