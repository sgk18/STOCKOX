package service

import (
	"context"
	"log"
	"time"

	"stockox-backend/pkg/cache"
	"stockox-backend/pkg/market/dto"
	"stockox-backend/pkg/market/providers"
)

type MarketService struct {
	factory *providers.ProviderFactory
	cache   cache.Cache
}

func NewMarketService(factory *providers.ProviderFactory, cache cache.Cache) *MarketService {
	return &MarketService{
		factory: factory,
		cache:   cache,
	}
}

// SearchStocks fetches stock suggestions from the provider with a 30-minute Valkey cache
func (s *MarketService) SearchStocks(query string) ([]dto.SearchStockDTO, error) {
	start := time.Now()
	cacheKey := cache.KeySearch(query)
	var results []dto.SearchStockDTO

	err := s.cache.GetStaleOrFetch(context.Background(), cacheKey, &results, cache.TTLSearch, 24*time.Hour, func() (interface{}, error) {
		p, err := s.factory.GetProvider("")
		if err != nil {
			return nil, err
		}
		res, err := p.SearchStocks(query)
		if err != nil {
			log.Printf("[OBSERVABILITY-WARN] SearchStocks failed on default provider: %v. Attempting Alpha Vantage fallback...", err)
			if fallbackProv, errFallback := s.factory.GetProvider("alphavantage"); errFallback == nil && fallbackProv != nil {
				res, err = fallbackProv.SearchStocks(query)
			}
		}
		return res, err
	})

	log.Printf("[OBSERVABILITY] SearchStocks query: '%s' | Results: %d | Latency: %v | Err: %v", query, len(results), time.Since(start), err)
	return results, err
}

// GetQuote fetches latest price with a 60-second Valkey cache and stale-while-revalidate
func (s *MarketService) GetQuote(ticker string) (*dto.QuoteDTO, error) {
	start := time.Now()
	cacheKey := cache.KeyQuote(ticker)
	var quote dto.QuoteDTO

	err := s.cache.GetStaleOrFetch(context.Background(), cacheKey, &quote, cache.TTLQuote, 10*time.Minute, func() (interface{}, error) {
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
		return q, err
	})

	if err != nil {
		log.Printf("[OBSERVABILITY-ERR] GetQuote ticker: %s | Error: %v", ticker, err)
		return nil, err
	}

	log.Printf("[OBSERVABILITY-GETQUOTE] Ticker: %s | Latency: %v", ticker, time.Since(start))
	return &quote, nil
}

// GetCompanyProfile fetches metadata with a 24-hour Valkey cache and stale-while-revalidate
func (s *MarketService) GetCompanyProfile(ticker string) (*dto.CompanyProfileDTO, error) {
	start := time.Now()
	cacheKey := cache.KeyProfile(ticker)
	var profile dto.CompanyProfileDTO

	err := s.cache.GetStaleOrFetch(context.Background(), cacheKey, &profile, cache.TTLProfile, 7*24*time.Hour, func() (interface{}, error) {
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
		return prof, err
	})

	if err != nil {
		log.Printf("[OBSERVABILITY-ERR] GetCompanyProfile ticker: %s | Error: %v", ticker, err)
		return nil, err
	}

	log.Printf("[OBSERVABILITY-GETPROFILE] Ticker: %s | Latency: %v", ticker, time.Since(start))
	return &profile, nil
}

// GetFinancialMetrics fetches P/E, EPS ratios with a 6-hour Valkey cache and stale-while-revalidate
func (s *MarketService) GetFinancialMetrics(ticker string) (*dto.FinancialMetricsDTO, error) {
	start := time.Now()
	cacheKey := cache.KeyMetrics(ticker)
	var metrics dto.FinancialMetricsDTO

	err := s.cache.GetStaleOrFetch(context.Background(), cacheKey, &metrics, cache.TTLMetrics, 48*time.Hour, func() (interface{}, error) {
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
		return m, err
	})

	if err != nil {
		log.Printf("[OBSERVABILITY-ERR] GetFinancialMetrics ticker: %s | Error: %v", ticker, err)
		return nil, err
	}

	log.Printf("[OBSERVABILITY-GETMETRICS] Ticker: %s | Latency: %v", ticker, time.Since(start))
	return &metrics, nil
}

// GetHistoricalCandles fetches OHLC lines with a 30-minute Valkey cache and stale-while-revalidate
func (s *MarketService) GetHistoricalCandles(ticker string, resolution string) ([]dto.CandleDTO, error) {
	start := time.Now()
	cacheKey := cache.KeyChart(ticker, resolution)
	var candles []dto.CandleDTO

	err := s.cache.GetStaleOrFetch(context.Background(), cacheKey, &candles, cache.TTLChart, 12*time.Hour, func() (interface{}, error) {
		p, err := s.factory.GetProvider("")
		if err != nil {
			return nil, err
		}
		to := time.Now().Unix()
		from := time.Now().AddDate(-1, 0, 0).Unix()

		c, err := p.GetHistoricalCandles(ticker, resolution, from, to)
		if err != nil {
			log.Printf("[OBSERVABILITY-WARN] GetHistoricalCandles ticker %s failed on default provider: %v. Attempting Alpha Vantage fallback...", ticker, err)
			if fallbackProv, errFallback := s.factory.GetProvider("alphavantage"); errFallback == nil && fallbackProv != nil {
				c, err = fallbackProv.GetHistoricalCandles(ticker, resolution, from, to)
			}
		}
		return c, err
	})

	if err != nil {
		log.Printf("[OBSERVABILITY-ERR] GetHistoricalCandles ticker: %s | Error: %v", ticker, err)
		return nil, err
	}

	log.Printf("[OBSERVABILITY-GETCANDLES] Ticker: %s | Resolution: %s | Latency: %v", ticker, resolution, time.Since(start))
	return candles, nil
}

// GetCompanyNews fetches news streams with a 15-minute Valkey cache and stale-while-revalidate
func (s *MarketService) GetCompanyNews(ticker string) ([]dto.NewsDTO, error) {
	start := time.Now()
	cacheKey := cache.KeyNews(ticker)
	var news []dto.NewsDTO

	err := s.cache.GetStaleOrFetch(context.Background(), cacheKey, &news, cache.TTLNews, 4*time.Hour, func() (interface{}, error) {
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
		return n, err
	})

	if err != nil {
		log.Printf("[OBSERVABILITY-ERR] GetCompanyNews ticker: %s | Error: %v", ticker, err)
		return nil, err
	}

	log.Printf("[OBSERVABILITY-GETNEWS] Ticker: %s | Latency: %v", ticker, time.Since(start))
	return news, nil
}
