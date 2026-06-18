package providers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"stockox-backend/pkg/marketdata"
	"stockox-backend/pkg/market/dto"
)

type TwelveDataProvider struct {
	apiKey string
	client *http.Client
}

func NewTwelveDataProvider(apiKey string) *TwelveDataProvider {
	return &TwelveDataProvider{
		apiKey: apiKey,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (p *TwelveDataProvider) GetQuote(symbol string) (*dto.QuoteDTO, error) {
	if p.apiKey == "" {
		return nil, fmt.Errorf("TwelveData API key not set")
	}

	u := fmt.Sprintf("https://api.twelvedata.com/quote?symbol=%s&apikey=%s", url.QueryEscape(symbol), p.apiKey)
	resp, err := p.client.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TwelveData quote returned HTTP status: %d", resp.StatusCode)
	}

	var raw marketdata.TwelveDataQuote
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	if raw.Symbol == "" {
		return nil, fmt.Errorf("TwelveData quote returned empty symbol, check symbol spelling or limits")
	}

	price, _ := strconv.ParseFloat(raw.Close, 64)
	change, _ := strconv.ParseFloat(raw.Change, 64)
	percentChange, _ := strconv.ParseFloat(raw.PercentChange, 64)
	high, _ := strconv.ParseFloat(raw.High, 64)
	low, _ := strconv.ParseFloat(raw.Low, 64)
	open, _ := strconv.ParseFloat(raw.Open, 64)
	prevClose, _ := strconv.ParseFloat(raw.PreviousClose, 64)
	volume, _ := strconv.ParseInt(raw.Volume, 10, 64)

	return &dto.QuoteDTO{
		Ticker:             symbol,
		CurrentPrice:       price,
		DailyChange:        change,
		DailyChangePercent: percentChange,
		HighPrice:          high,
		LowPrice:           low,
		OpenPrice:          open,
		PrevClosePrice:     prevClose,
		Volume:             volume,
		AvgVolume:          volume,
	}, nil
}

func (p *TwelveDataProvider) GetCompanyProfile(symbol string) (*dto.CompanyProfileDTO, error) {
	if p.apiKey == "" {
		return nil, fmt.Errorf("TwelveData API key not set")
	}

	u := fmt.Sprintf("https://api.twelvedata.com/profile?symbol=%s&apikey=%s", url.QueryEscape(symbol), p.apiKey)
	resp, err := p.client.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TwelveData profile returned HTTP status: %d", resp.StatusCode)
	}

	var raw marketdata.TwelveDataProfile
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	if raw.Name == "" {
		return nil, fmt.Errorf("TwelveData profile returned empty results")
	}

	domain := strings.ToLower(symbol) + ".com"
	logo := fmt.Sprintf("https://logo.clearbit.com/%s", domain)
	if symbol == "RELIANCE" || symbol == "TCS" || symbol == "INFY" || symbol == "HDFCBANK" {
		logo = "https://logo.clearbit.com/nseindia.com"
	}

	return &dto.CompanyProfileDTO{
		Name:        raw.Name,
		Ticker:      symbol,
		Logo:        logo,
		Industry:    raw.Industry,
		Sector:      raw.Sector,
		Website:     raw.Website,
		Description: raw.Description,
		Country:     raw.Country,
		Exchange:    raw.Exchange,
		Source:      "api",
	}, nil
}

func (p *TwelveDataProvider) GetCandles(symbol string, timeframe string) ([]dto.CandleDTO, error) {
	if p.apiKey == "" {
		return nil, fmt.Errorf("TwelveData API key not set")
	}

	interval := "1day"
	if timeframe == "1" || timeframe == "5" || timeframe == "15" {
		interval = timeframe + "min"
	} else if timeframe == "60" || timeframe == "1H" {
		interval = "1h"
	}

	u := fmt.Sprintf("https://api.twelvedata.com/time_series?symbol=%s&interval=%s&outputsize=100&apikey=%s",
		url.QueryEscape(symbol), interval, p.apiKey)
	resp, err := p.client.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TwelveData candles returned HTTP status: %d", resp.StatusCode)
	}

	var raw marketdata.TwelveDataTimeSeries
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	if len(raw.Values) == 0 {
		return nil, fmt.Errorf("TwelveData time series returned empty values")
	}

	candles := make([]dto.CandleDTO, 0, len(raw.Values))
	// Parse values backwards so they are in chronological order
	for i := len(raw.Values) - 1; i >= 0; i-- {
		v := raw.Values[i]
		open, _ := strconv.ParseFloat(v.Open, 64)
		high, _ := strconv.ParseFloat(v.High, 64)
		low, _ := strconv.ParseFloat(v.Low, 64)
		closePrice, _ := strconv.ParseFloat(v.Close, 64)
		vol, _ := strconv.ParseInt(v.Volume, 10, 64)

		var timestamp int64
		t, err := time.Parse("2006-01-02", v.Datetime)
		if err == nil {
			timestamp = t.Unix()
		} else {
			t, err = time.Parse("2006-01-02 15:04:00", v.Datetime)
			if err == nil {
				timestamp = t.Unix()
			} else {
				timestamp = time.Now().Unix()
			}
		}

		candles = append(candles, dto.CandleDTO{
			Open:      open,
			High:      high,
			Low:       low,
			Close:     closePrice,
			Volume:    vol,
			Timestamp: timestamp,
		})
	}

	return candles, nil
}

func (p *TwelveDataProvider) GetNews(symbol string) ([]dto.NewsDTO, error) {
	// TwelveData does not provide news on the basic tier, trigger aggregator priority fallback
	return nil, fmt.Errorf("TwelveData does not support news query")
}

func (p *TwelveDataProvider) GetFundamentals(symbol string) (*dto.FinancialMetricsDTO, error) {
	// TwelveData statistics/metrics are paid, trigger aggregator priority fallback
	return nil, fmt.Errorf("TwelveData does not support metrics query")
}
