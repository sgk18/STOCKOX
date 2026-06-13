package service

import (
	"fmt"
	"log"
	"time"

	"stockox-backend/pkg/market/cache"
	"stockox-backend/pkg/market/dto"
	"stockox-backend/pkg/market/providers"
)

type MarketService struct {
	factory *providers.ProviderFactory
	cache   *cache.MarketCache
}

func NewMarketService(factory *providers.ProviderFactory, cache *cache.MarketCache) *MarketService {
	return &MarketService{
		factory: factory,
		cache:   cache,
	}
}

// SearchStocks fetches stock suggestions from the provider directly
func (s *MarketService) SearchStocks(query string) ([]dto.SearchStockDTO, error) {
	start := time.Now()
	p, err := s.factory.GetProvider("")
	if err != nil {
		return nil, err
	}

	results, err := p.SearchStocks(query)
	if err != nil {
		log.Printf("[OBSERVABILITY-WARN] SearchStocks failed on default provider: %v. Attempting Alpha Vantage fallback...", err)
		if fallbackProv, errFallback := s.factory.GetProvider("alphavantage"); errFallback == nil && fallbackProv != nil {
			results, err = fallbackProv.SearchStocks(query)
		}
	}

	log.Printf("[OBSERVABILITY] SearchStocks query: '%s' | Results: %d | Latency: %v | Err: %v", query, len(results), time.Since(start), err)
	return results, err
}

// GetQuote fetches latest price with a 60-second Redis cache
func (s *MarketService) GetQuote(ticker string) (*dto.QuoteDTO, error) {
	start := time.Now()
	cacheKey := fmt.Sprintf("quote:%s", ticker)
	var quote dto.QuoteDTO

	// 1. Try Cache
	hit, err := s.cache.Get(cacheKey, &quote)
	if err == nil && hit {
		log.Printf("[OBSERVABILITY-CACHE-HIT] GetQuote ticker: %s | Latency: %v", ticker, time.Since(start))
		return &quote, nil
	}

	// 2. Fetch Provider
	p, err := s.factory.GetProvider("")
	if err != nil {
		return nil, err
	}

	q, err := p.GetQuote(ticker)
	if err != nil {
		log.Printf("[OBSERVABILITY-WARN] GetQuote ticker %s failed on default provider: %v. Attempting Alpha Vantage fallback...", ticker, err)
		if fallbackProv, errFallback := s.factory.GetProvider("alphavantage"); errFallback == nil && fallbackProv != nil {
			q, err = fallbackProv.GetQuote(ticker)
		}
	}

	if err != nil {
		log.Printf("[OBSERVABILITY-ERR] GetQuote ticker: %s | Provider Error: %v", ticker, err)
		return nil, err
	}

	// 3. Write Cache (TTL: 60s)
	_ = s.cache.Set(cacheKey, q, 60*time.Second)

	log.Printf("[OBSERVABILITY-CACHE-MISS] GetQuote ticker: %s | Latency: %v", ticker, time.Since(start))
	return q, nil
}

// GetCompanyProfile fetches metadata with a 1-hour Redis cache
func (s *MarketService) GetCompanyProfile(ticker string) (*dto.CompanyProfileDTO, error) {
	start := time.Now()
	cacheKey := fmt.Sprintf("profile:%s", ticker)
	var profile dto.CompanyProfileDTO

	// 1. Try Cache
	hit, err := s.cache.Get(cacheKey, &profile)
	if err == nil && hit {
		log.Printf("[OBSERVABILITY-CACHE-HIT] GetCompanyProfile ticker: %s | Latency: %v", ticker, time.Since(start))
		return &profile, nil
	}

	// 2. Fetch Provider
	p, err := s.factory.GetProvider("")
	if err != nil {
		return nil, err
	}

	prof, err := p.GetCompanyProfile(ticker)
	if err != nil {
		log.Printf("[OBSERVABILITY-WARN] GetCompanyProfile ticker %s failed on default provider: %v. Attempting Alpha Vantage fallback...", ticker, err)
		if fallbackProv, errFallback := s.factory.GetProvider("alphavantage"); errFallback == nil && fallbackProv != nil {
			prof, err = fallbackProv.GetCompanyProfile(ticker)
		}
	}

	if err != nil {
		log.Printf("[OBSERVABILITY-ERR] GetCompanyProfile ticker: %s | Provider Error: %v", ticker, err)
		return nil, err
	}

	// 3. Write Cache (TTL: 1h)
	_ = s.cache.Set(cacheKey, prof, 1*time.Hour)

	log.Printf("[OBSERVABILITY-CACHE-MISS] GetCompanyProfile ticker: %s | Latency: %v", ticker, time.Since(start))
	return prof, nil
}

// GetFinancialMetrics fetches P/E, EPS ratios with a 1-hour Redis cache
func (s *MarketService) GetFinancialMetrics(ticker string) (*dto.FinancialMetricsDTO, error) {
	start := time.Now()
	cacheKey := fmt.Sprintf("metrics:%s", ticker)
	var metrics dto.FinancialMetricsDTO

	// 1. Try Cache
	hit, err := s.cache.Get(cacheKey, &metrics)
	if err == nil && hit {
		log.Printf("[OBSERVABILITY-CACHE-HIT] GetFinancialMetrics ticker: %s | Latency: %v", ticker, time.Since(start))
		return &metrics, nil
	}

	// 2. Fetch Provider
	p, err := s.factory.GetProvider("")
	if err != nil {
		return nil, err
	}

	m, err := p.GetFinancialMetrics(ticker)
	if err != nil {
		log.Printf("[OBSERVABILITY-WARN] GetFinancialMetrics ticker %s failed on default provider: %v. Attempting Alpha Vantage fallback...", ticker, err)
		if fallbackProv, errFallback := s.factory.GetProvider("alphavantage"); errFallback == nil && fallbackProv != nil {
			m, err = fallbackProv.GetFinancialMetrics(ticker)
		}
	}

	if err != nil {
		log.Printf("[OBSERVABILITY-ERR] GetFinancialMetrics ticker: %s | Provider Error: %v", ticker, err)
		return nil, err
	}

	// 3. Write Cache (TTL: 1h)
	_ = s.cache.Set(cacheKey, m, 1*time.Hour)

	log.Printf("[OBSERVABILITY-CACHE-MISS] GetFinancialMetrics ticker: %s | Latency: %v", ticker, time.Since(start))
	return m, nil
}

// GetHistoricalCandles fetches OHLC lines with a 1-day Redis cache
func (s *MarketService) GetHistoricalCandles(ticker string, resolution string) ([]dto.CandleDTO, error) {
	start := time.Now()
	cacheKey := fmt.Sprintf("candles:%s:%s", ticker, resolution)
	var candles []dto.CandleDTO

	// 1. Try Cache
	hit, err := s.cache.Get(cacheKey, &candles)
	if err == nil && hit {
		log.Printf("[OBSERVABILITY-CACHE-HIT] GetHistoricalCandles ticker: %s | Resolution: %s | Latency: %v", ticker, resolution, time.Since(start))
		return candles, nil
	}

	// 2. Fetch Provider
	p, err := s.factory.GetProvider("")
	if err != nil {
		return nil, err
	}

	// Define standard UNIX bounds (last 1 year of candles)
	to := time.Now().Unix()
	from := time.Now().AddDate(-1, 0, 0).Unix()

	c, err := p.GetHistoricalCandles(ticker, resolution, from, to)
	if err != nil {
		log.Printf("[OBSERVABILITY-WARN] GetHistoricalCandles ticker %s failed on default provider: %v. Attempting Alpha Vantage fallback...", ticker, err)
		if fallbackProv, errFallback := s.factory.GetProvider("alphavantage"); errFallback == nil && fallbackProv != nil {
			c, err = fallbackProv.GetHistoricalCandles(ticker, resolution, from, to)
		}
	}

	if err != nil {
		log.Printf("[OBSERVABILITY-ERR] GetHistoricalCandles ticker: %s | Provider Error: %v", ticker, err)
		return nil, err
	}

	// 3. Write Cache (TTL: 24h)
	_ = s.cache.Set(cacheKey, c, 24*time.Hour)

	log.Printf("[OBSERVABILITY-CACHE-MISS] GetHistoricalCandles ticker: %s | Latency: %v", ticker, time.Since(start))
	return c, nil
}

// GetCompanyNews fetches news streams with a 15-minute Redis cache
func (s *MarketService) GetCompanyNews(ticker string) ([]dto.NewsDTO, error) {
	start := time.Now()
	cacheKey := fmt.Sprintf("news:%s", ticker)
	var news []dto.NewsDTO

	// 1. Try Cache
	hit, err := s.cache.Get(cacheKey, &news)
	if err == nil && hit {
		log.Printf("[OBSERVABILITY-CACHE-HIT] GetCompanyNews ticker: %s | Latency: %v", ticker, time.Since(start))
		return news, nil
	}

	// 2. Fetch Provider
	p, err := s.factory.GetProvider("")
	if err != nil {
		return nil, err
	}

	n, err := p.GetCompanyNews(ticker)
	if err != nil {
		log.Printf("[OBSERVABILITY-WARN] GetCompanyNews ticker %s failed on default provider: %v. Attempting Alpha Vantage fallback...", ticker, err)
		if fallbackProv, errFallback := s.factory.GetProvider("alphavantage"); errFallback == nil && fallbackProv != nil {
			n, err = fallbackProv.GetCompanyNews(ticker)
		}
	}

	if err != nil {
		log.Printf("[OBSERVABILITY-ERR] GetCompanyNews ticker: %s | Provider Error: %v", ticker, err)
		return nil, err
	}

	// 3. Write Cache (TTL: 15m)
	_ = s.cache.Set(cacheKey, n, 15*time.Minute)

	log.Printf("[OBSERVABILITY-CACHE-MISS] GetCompanyNews ticker: %s | Latency: %v", ticker, time.Since(start))
	return n, nil
}
