package cache

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"strings"
	"sync/atomic"
	"time"

	"github.com/redis/go-redis/v9"
)

type ValkeyCache struct {
	rdb        *redis.Client
	hits       int64
	misses     int64
	savedCalls int64
}

type StaleWrapper struct {
	Data    string `json:"data"`
	StaleAt int64  `json:"stale_at"`
}

func NewValkeyCache(host, port, password string) Cache {
	rdb := redis.NewClient(&redis.Options{
		Addr:     host + ":" + port,
		Password: password,
		DB:       0,
	})
	return &ValkeyCache{
		rdb: rdb,
	}
}

func NewValkeyCacheWithClient(rdb *redis.Client) Cache {
	return &ValkeyCache{
		rdb: rdb,
	}
}

func (v *ValkeyCache) Get(ctx context.Context, key string) (string, error) {
	if v.rdb == nil {
		return "", ErrCacheMiss
	}
	val, err := v.rdb.Get(ctx, key).Result()
	if err == redis.Nil {
		v.IncrementMisses()
		return "", ErrCacheMiss
	} else if err != nil {
		v.IncrementMisses()
		return "", err
	}
	v.IncrementHits()
	return val, nil
}

func (v *ValkeyCache) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	if v.rdb == nil {
		return nil
	}
	return v.rdb.Set(ctx, key, value, expiration).Err()
}

func (v *ValkeyCache) Delete(ctx context.Context, key string) error {
	if v.rdb == nil {
		return nil
	}
	return v.rdb.Del(ctx, key).Err()
}

func (v *ValkeyCache) Exists(ctx context.Context, key string) (bool, error) {
	if v.rdb == nil {
		return false, nil
	}
	count, err := v.rdb.Exists(ctx, key).Result()
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (v *ValkeyCache) SetJSON(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	if v.rdb == nil {
		return nil
	}

	bytes, err := json.Marshal(value)
	if err != nil {
		return err
	}

	// Compress large/specific payloads
	shouldCompress := strings.HasPrefix(key, "chart:") || strings.HasPrefix(key, "news:") || strings.HasPrefix(key, "analysis:") || len(bytes) > 1024
	if shouldCompress {
		compressed, err := compress(bytes)
		if err == nil {
			bytes = compressed
		}
	}

	return v.rdb.Set(ctx, key, bytes, expiration).Err()
}

func (v *ValkeyCache) GetJSON(ctx context.Context, key string, dest interface{}) error {
	if v.rdb == nil {
		return ErrCacheMiss
	}

	val, err := v.rdb.Get(ctx, key).Bytes()
	if err == redis.Nil {
		v.IncrementMisses()
		return ErrCacheMiss
	} else if err != nil {
		v.IncrementMisses()
		return err
	}

	if isGzipped(val) {
		decompressed, err := decompress(val)
		if err != nil {
			return err
		}
		val = decompressed
	}

	v.IncrementHits()
	return json.Unmarshal(val, dest)
}

func (v *ValkeyCache) DeletePattern(ctx context.Context, pattern string) error {
	if v.rdb == nil {
		return nil
	}
	iter := v.rdb.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		if err := v.rdb.Del(ctx, iter.Val()).Err(); err != nil {
			return err
		}
	}
	return iter.Err()
}

func (v *ValkeyCache) GetStaleOrFetch(ctx context.Context, key string, dest interface{}, softTTL time.Duration, hardTTL time.Duration, fetchFunc func() (interface{}, error)) error {
	if v.rdb == nil {
		val, err := fetchFunc()
		if err != nil {
			return err
		}
		return v.copyVal(val, dest)
	}

	// 1. Try Cache
	val, err := v.rdb.Get(ctx, key).Bytes()
	if err == redis.Nil {
		v.IncrementMisses()
		fresh, err := fetchFunc()
		if err != nil {
			return err
		}
		_ = v.SetJSONWithStale(ctx, key, fresh, softTTL, hardTTL)
		return v.copyVal(fresh, dest)
	} else if err != nil {
		// Graceful Fallback / Failover
		log.Printf("[VALKEY-WARN] Connection failure during GetStaleOrFetch key=%s: %v. Direct DB fallback.", key, err)
		v.IncrementMisses()
		fresh, err := fetchFunc()
		if err != nil {
			return err
		}
		return v.copyVal(fresh, dest)
	}

	// Decompress if needed
	if isGzipped(val) {
		decompressed, err := decompress(val)
		if err == nil {
			val = decompressed
		}
	}

	// Unmarshal StaleWrapper
	var wrapper StaleWrapper
	if err := json.Unmarshal(val, &wrapper); err != nil {
		v.IncrementMisses()
		fresh, err := fetchFunc()
		if err != nil {
			return err
		}
		_ = v.SetJSONWithStale(ctx, key, fresh, softTTL, hardTTL)
		return v.copyVal(fresh, dest)
	}

	// Unmarshal actual data
	if err := json.Unmarshal([]byte(wrapper.Data), dest); err != nil {
		v.IncrementMisses()
		fresh, err := fetchFunc()
		if err != nil {
			return err
		}
		_ = v.SetJSONWithStale(ctx, key, fresh, softTTL, hardTTL)
		return v.copyVal(fresh, dest)
	}

	v.IncrementHits()

	// 2. Check if soft stale
	if time.Now().Unix() > wrapper.StaleAt {
		log.Printf("[VALKEY] Key %s is stale. Refreshing in background...", key)
		go func() {
			v.IncrementSavedCall()
			fresh, err := fetchFunc()
			if err == nil {
				_ = v.SetJSONWithStale(context.Background(), key, fresh, softTTL, hardTTL)
				log.Printf("[VALKEY-INFO] Background refresh completed: key=%s", key)
			} else {
				log.Printf("[VALKEY-WARN] Background refresh failed for key=%s: %v", key, err)
			}
		}()
	}

	return nil
}

func (v *ValkeyCache) SetJSONWithStale(ctx context.Context, key string, value interface{}, softTTL time.Duration, hardTTL time.Duration) error {
	bytes, err := json.Marshal(value)
	if err != nil {
		return err
	}

	wrapper := StaleWrapper{
		Data:    string(bytes),
		StaleAt: time.Now().Add(softTTL).Unix(),
	}

	wrapperBytes, err := json.Marshal(wrapper)
	if err != nil {
		return err
	}

	// Compress
	shouldCompress := strings.HasPrefix(key, "chart:") || strings.HasPrefix(key, "news:") || strings.HasPrefix(key, "analysis:") || len(wrapperBytes) > 1024
	if shouldCompress {
		compressed, err := compress(wrapperBytes)
		if err == nil {
			wrapperBytes = compressed
		}
	}

	return v.rdb.Set(ctx, key, wrapperBytes, hardTTL).Err()
}

func (v *ValkeyCache) GetStats(ctx context.Context) Stats {
	hits := atomic.LoadInt64(&v.hits)
	misses := atomic.LoadInt64(&v.misses)
	savedCalls := atomic.LoadInt64(&v.savedCalls)

	var hitRate string
	total := hits + misses
	if total > 0 {
		hitRate = fmt.Sprintf("%d%%", (hits*100)/total)
	} else {
		hitRate = "0%"
	}

	var keys int64 = 0
	if v.rdb != nil {
		keys, _ = v.rdb.DBSize(ctx).Result()
	}

	return Stats{
		Hits:       hits,
		Misses:     misses,
		HitRate:    hitRate,
		Keys:       keys,
		SavedCalls: savedCalls,
	}
}

func (v *ValkeyCache) IncrementHits() {
	atomic.AddInt64(&v.hits, 1)
}

func (v *ValkeyCache) IncrementMisses() {
	atomic.AddInt64(&v.misses, 1)
}

func (v *ValkeyCache) IncrementSavedCall() {
	atomic.AddInt64(&v.savedCalls, 1)
}

func (v *ValkeyCache) copyVal(src interface{}, dest interface{}) error {
	bytes, err := json.Marshal(src)
	if err != nil {
		return err
	}
	return json.Unmarshal(bytes, dest)
}

// Gzip Compress/Decompress Helpers
func compress(data []byte) ([]byte, error) {
	var buf bytes.Buffer
	w := gzip.NewWriter(&buf)
	if _, err := w.Write(data); err != nil {
		return nil, err
	}
	if err := w.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func decompress(data []byte) ([]byte, error) {
	r, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	defer r.Close()
	return io.ReadAll(r)
}

func isGzipped(data []byte) bool {
	return len(data) >= 2 && data[0] == 0x1f && data[1] == 0x8b
}
