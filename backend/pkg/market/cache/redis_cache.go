package cache

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

type MarketCache struct {
	rdb *redis.Client
	ctx context.Context
}

func NewMarketCache(rdb *redis.Client) *MarketCache {
	return &MarketCache{
		rdb: rdb,
		ctx: context.Background(),
	}
}

// Get queries cache for key and unmarshals it into target
func (c *MarketCache) Get(key string, target interface{}) (bool, error) {
	if c.rdb == nil {
		return false, nil // No Redis client configured -> cache miss
	}

	val, err := c.rdb.Get(c.ctx, key).Result()
	if err == redis.Nil {
		return false, nil // Cache miss
	} else if err != nil {
		return false, err // Redis error
	}

	if err := json.Unmarshal([]byte(val), target); err != nil {
		return false, err // Unmarshal error
	}

	return true, nil // Cache hit
}

// Set writes serializable data to cache with TTL
func (c *MarketCache) Set(key string, value interface{}, ttl time.Duration) error {
	if c.rdb == nil {
		return nil // Redis is disabled -> skip cache write
	}

	bytes, err := json.Marshal(value)
	if err != nil {
		return err
	}

	return c.rdb.Set(c.ctx, key, bytes, ttl).Err()
}
