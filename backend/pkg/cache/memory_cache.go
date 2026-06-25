package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"golang.org/x/sync/singleflight"
)

type memoryEntry struct {
	value     []byte
	expiredAt time.Time
}

type MemoryCache struct {
	mu           sync.RWMutex
	store        map[string]memoryEntry
	hits         int64
	misses       int64
	savedCalls   int64
	apiTimeSum   int64
	apiTimeCount int64
	cacheTimeSum   int64
	cacheTimeCount int64
	sfGroup      singleflight.Group
	topRequests  map[string]int64
	topReqMu     sync.Mutex
}

func NewMemoryCache() Cache {
	return &MemoryCache{
		store:       make(map[string]memoryEntry),
		topRequests: make(map[string]int64),
	}
}

func (m *MemoryCache) Get(ctx context.Context, key string) (string, error) {
	start := time.Now()
	defer func() { m.RecordCacheLatency(time.Since(start)) }()

	m.mu.RLock()
	entry, found := m.store[key]
	m.mu.RUnlock()

	if !found || time.Now().After(entry.expiredAt) {
		m.IncrementMisses()
		if found {
			// clean up lazily
			m.mu.Lock()
			delete(m.store, key)
			m.mu.Unlock()
		}
		return "", ErrCacheMiss
	}

	m.IncrementHits()
	return string(entry.value), nil
}

func (m *MemoryCache) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	start := time.Now()
	defer func() { m.RecordCacheLatency(time.Since(start)) }()

	var valBytes []byte
	switch v := value.(type) {
	case string:
		valBytes = []byte(v)
	case []byte:
		valBytes = v
	default:
		var err error
		valBytes, err = json.Marshal(value)
		if err != nil {
			return err
		}
	}

	m.mu.Lock()
	m.store[key] = memoryEntry{
		value:     valBytes,
		expiredAt: time.Now().Add(expiration),
	}
	m.mu.Unlock()
	return nil
}

func (m *MemoryCache) Delete(ctx context.Context, key string) error {
	start := time.Now()
	defer func() { m.RecordCacheLatency(time.Since(start)) }()

	m.mu.Lock()
	delete(m.store, key)
	m.mu.Unlock()
	return nil
}

func (m *MemoryCache) Exists(ctx context.Context, key string) (bool, error) {
	start := time.Now()
	defer func() { m.RecordCacheLatency(time.Since(start)) }()

	m.mu.RLock()
	entry, found := m.store[key]
	m.mu.RUnlock()

	if !found || time.Now().After(entry.expiredAt) {
		return false, nil
	}
	return true, nil
}

func (m *MemoryCache) SetJSON(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	return m.Set(ctx, key, value, expiration)
}

func (m *MemoryCache) GetJSON(ctx context.Context, key string, dest interface{}) error {
	start := time.Now()
	defer func() { m.RecordCacheLatency(time.Since(start)) }()

	m.mu.RLock()
	entry, found := m.store[key]
	m.mu.RUnlock()

	if !found || time.Now().After(entry.expiredAt) {
		m.IncrementMisses()
		return ErrCacheMiss
	}

	m.IncrementHits()
	return json.Unmarshal(entry.value, dest)
}

func (m *MemoryCache) DeletePattern(ctx context.Context, pattern string) error {
	start := time.Now()
	defer func() { m.RecordCacheLatency(time.Since(start)) }()

	// Convert redis pattern to go prefix check (e.g. "chart:*" to prefix "chart:")
	prefix := strings.TrimSuffix(pattern, "*")

	m.mu.Lock()
	defer m.mu.Unlock()
	for k := range m.store {
		if strings.HasPrefix(k, prefix) {
			delete(m.store, k)
		}
	}
	return nil
}

func (m *MemoryCache) GetStaleOrFetch(ctx context.Context, key string, dest interface{}, softTTL time.Duration, hardTTL time.Duration, fetchFunc func() (interface{}, error)) error {
	// 1. Try cache lookup
	start := time.Now()
	m.mu.RLock()
	entry, found := m.store[key]
	m.mu.RUnlock()
	m.RecordCacheLatency(time.Since(start))

	if !found || time.Now().After(entry.expiredAt) {
		m.IncrementMisses()

		// Single flight fetch to avoid dogpiling
		resVal, errSf, _ := m.sfGroup.Do(key, func() (interface{}, error) {
			apiStart := time.Now()
			fresh, errFetch := fetchFunc()
			if errFetch != nil {
				return nil, errFetch
			}
			m.RecordAPILatency(time.Since(apiStart))
			_ = m.SetJSONWithStale(ctx, key, fresh, softTTL, hardTTL)
			return fresh, nil
		})

		if errSf != nil {
			return errSf
		}
		return m.copyVal(resVal, dest)
	}

	// 2. Cache hit — Unmarshal wrapper
	var wrapper StaleWrapper
	if err := json.Unmarshal(entry.value, &wrapper); err != nil {
		m.IncrementMisses()
		resVal, errSf, _ := m.sfGroup.Do(key, func() (interface{}, error) {
			apiStart := time.Now()
			fresh, errFetch := fetchFunc()
			if errFetch != nil {
				return nil, errFetch
			}
			m.RecordAPILatency(time.Since(apiStart))
			_ = m.SetJSONWithStale(ctx, key, fresh, softTTL, hardTTL)
			return fresh, nil
		})
		if errSf != nil {
			return errSf
		}
		return m.copyVal(resVal, dest)
	}

	// 3. Unmarshal wrapper.Data into dest
	if err := json.Unmarshal([]byte(wrapper.Data), dest); err != nil {
		m.IncrementMisses()
		resVal, errSf, _ := m.sfGroup.Do(key, func() (interface{}, error) {
			apiStart := time.Now()
			fresh, errFetch := fetchFunc()
			if errFetch != nil {
				return nil, errFetch
			}
			m.RecordAPILatency(time.Since(apiStart))
			_ = m.SetJSONWithStale(ctx, key, fresh, softTTL, hardTTL)
			return fresh, nil
		})
		if errSf != nil {
			return errSf
		}
		return m.copyVal(resVal, dest)
	}

	m.IncrementHits()

	// 4. Background refresh if soft-stale
	if time.Now().Unix() > wrapper.StaleAt {
		log.Printf("[MEMORY-CACHE] Key %s is stale. Refreshing in background...", key)
		go func() {
			_, _, _ = m.sfGroup.Do("bg_refresh:"+key, func() (interface{}, error) {
				m.IncrementSavedCall()
				apiStart := time.Now()
				fresh, err := fetchFunc()
				if err == nil {
					m.RecordAPILatency(time.Since(apiStart))
					_ = m.SetJSONWithStale(context.Background(), key, fresh, softTTL, hardTTL)
					log.Printf("[MEMORY-CACHE-INFO] Background refresh completed: key=%s", key)
				} else {
					log.Printf("[MEMORY-CACHE-WARN] Background refresh failed for key=%s: %v", key, err)
				}
				return fresh, err
			})
		}()
	}

	return nil
}

func (m *MemoryCache) SetJSONWithStale(ctx context.Context, key string, value interface{}, softTTL time.Duration, hardTTL time.Duration) error {
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

	m.mu.Lock()
	m.store[key] = memoryEntry{
		value:     wrapperBytes,
		expiredAt: time.Now().Add(hardTTL),
	}
	m.mu.Unlock()
	return nil
}

func (m *MemoryCache) GetStats(ctx context.Context) Stats {
	hits := atomic.LoadInt64(&m.hits)
	misses := atomic.LoadInt64(&m.misses)
	savedCalls := atomic.LoadInt64(&m.savedCalls)

	var hitRate string
	total := hits + misses
	if total > 0 {
		hitRate = fmt.Sprintf("%d%%", (hits*100)/total)
	} else {
		hitRate = "0%"
	}

	m.mu.RLock()
	keys := int64(len(m.store))
	m.mu.RUnlock()

	// Average Cache Time
	var avgCache float64 = 0
	cSum := atomic.LoadInt64(&m.cacheTimeSum)
	cCount := atomic.LoadInt64(&m.cacheTimeCount)
	if cCount > 0 {
		avgCache = float64(cSum) / float64(cCount) / float64(time.Millisecond)
	}

	// Average API Time
	var avgAPI float64 = 0
	aSum := atomic.LoadInt64(&m.apiTimeSum)
	aCount := atomic.LoadInt64(&m.apiTimeCount)
	if aCount > 0 {
		avgAPI = float64(aSum) / float64(aCount) / float64(time.Millisecond)
	}

	// Top Requested Stocks
	m.topReqMu.Lock()
	topStocks := []string{}
	// extract top 5 requested stocks
	type stockScore struct {
		symbol string
		score  int64
	}
	var scores []stockScore
	for k, v := range m.topRequests {
		scores = append(scores, stockScore{k, v})
	}
	m.topReqMu.Unlock()

	sort.Slice(scores, func(i, j int) bool {
		return scores[i].score > scores[j].score
	})

	for i := 0; i < len(scores) && i < 5; i++ {
		topStocks = append(topStocks, fmt.Sprintf("%s (%d)", scores[i].symbol, scores[i].score))
	}

	return Stats{
		Hits:               hits,
		Misses:             misses,
		HitRate:            hitRate,
		Keys:               keys,
		SavedCalls:         savedCalls,
		AverageAPITimeMs:   avgAPI,
		AverageCacheTimeMs: avgCache,
		TopRequestedStocks: topStocks,
	}
}

func (m *MemoryCache) IncrementHits() {
	atomic.AddInt64(&m.hits, 1)
}

func (m *MemoryCache) IncrementMisses() {
	atomic.AddInt64(&m.misses, 1)
}

func (m *MemoryCache) IncrementSavedCall() {
	atomic.AddInt64(&m.savedCalls, 1)
}

func (m *MemoryCache) RecordAPILatency(duration time.Duration) {
	atomic.AddInt64(&m.apiTimeSum, int64(duration))
	atomic.AddInt64(&m.apiTimeCount, 1)
}

func (m *MemoryCache) RecordCacheLatency(duration time.Duration) {
	atomic.AddInt64(&m.cacheTimeSum, int64(duration))
	atomic.AddInt64(&m.cacheTimeCount, 1)
}

func (m *MemoryCache) RecordStockRequest(ticker string) {
	m.topReqMu.Lock()
	m.topRequests[strings.ToUpper(ticker)]++
	m.topReqMu.Unlock()
}

func (m *MemoryCache) copyVal(src interface{}, dest interface{}) error {
	bytes, err := json.Marshal(src)
	if err != nil {
		return err
	}
	return json.Unmarshal(bytes, dest)
}
