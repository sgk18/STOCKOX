package providers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"stockox-backend/pkg/market/dto"
)

type AlphaVantageProvider struct {
	apiKey  string
	baseURL string
	client  *http.Client
}

func NewAlphaVantageProvider(apiKey string) *AlphaVantageProvider {
	return &AlphaVantageProvider{
		apiKey:  apiKey,
		baseURL: "https://www.alphavantage.co/query",
		client: &http.Client{
			Timeout: 12 * time.Second,
		},
	}
}

// SearchStocks queries symbol match
func (p *AlphaVantageProvider) SearchStocks(query string) ([]dto.SearchStockDTO, error) {
	u := fmt.Sprintf("%s?function=SYMBOL_SEARCH&keywords=%s&apikey=%s", p.baseURL, url.QueryEscape(query), p.apiKey)
	resp, err := p.client.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var raw struct {
		BestMatches []struct {
			Symbol string `json:"1. symbol"`
			Name   string `json:"2. name"`
			Type   string `json:"3. type"`
			Exch   string `json:"4. region"`
		} `json:"bestMatches"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	results := make([]dto.SearchStockDTO, len(raw.BestMatches))
	for i, m := range raw.BestMatches {
		results[i] = dto.SearchStockDTO{
			Ticker:   m.Symbol,
			Name:     m.Name,
			Exchange: m.Exch,
			Industry: "Equities",
		}
	}

	return results, nil
}

// GetQuote queries current price
func (p *AlphaVantageProvider) GetQuote(ticker string) (*dto.QuoteDTO, error) {
	u := fmt.Sprintf("%s?function=GLOBAL_QUOTE&symbol=%s&apikey=%s", p.baseURL, url.QueryEscape(ticker), p.apiKey)
	resp, err := p.client.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var raw struct {
		GlobalQuote struct {
			Symbol        string `json:"01. symbol"`
			Open          string `json:"02. open"`
			High          string `json:"03. high"`
			Low           string `json:"04. low"`
			Price         string `json:"05. price"`
			Volume        string `json:"06. volume"`
			PrevClose     string `json:"08. previous close"`
			Change        string `json:"09. change"`
			ChangePercent string `json:"10. change percent"`
		} `json:"Global Quote"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	cPrice, _ := strconv.ParseFloat(raw.GlobalQuote.Price, 64)
	high, _ := strconv.ParseFloat(raw.GlobalQuote.High, 64)
	low, _ := strconv.ParseFloat(raw.GlobalQuote.Low, 64)
	open, _ := strconv.ParseFloat(raw.GlobalQuote.Open, 64)
	prev, _ := strconv.ParseFloat(raw.GlobalQuote.PrevClose, 64)
	vol, _ := strconv.ParseInt(raw.GlobalQuote.Volume, 10, 64)

	// Strip percentage sign if present in change percent (e.g. "1.52%" -> "1.52")
	chgPctStr := raw.GlobalQuote.ChangePercent
	if len(chgPctStr) > 0 && chgPctStr[len(chgPctStr)-1] == '%' {
		chgPctStr = chgPctStr[:len(chgPctStr)-1]
	}
	pct, _ := strconv.ParseFloat(chgPctStr, 64)
	change, _ := strconv.ParseFloat(raw.GlobalQuote.Change, 64)

	return &dto.QuoteDTO{
		Ticker:             ticker,
		CurrentPrice:       cPrice,
		DailyChange:        change,
		DailyChangePercent: pct,
		HighPrice:          high,
		LowPrice:           low,
		OpenPrice:          open,
		PrevClosePrice:     prev,
		Volume:             vol,
		AvgVolume:          vol,
	}, nil
}

// GetCompanyProfile queries overview metadata
func (p *AlphaVantageProvider) GetCompanyProfile(ticker string) (*dto.CompanyProfileDTO, error) {
	u := fmt.Sprintf("%s?function=OVERVIEW&symbol=%s&apikey=%s", p.baseURL, url.QueryEscape(ticker), p.apiKey)
	resp, err := p.client.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var raw struct {
		Name          string `json:"Name"`
		Description   string `json:"Description"`
		Exchange      string `json:"Exchange"`
		Sector        string `json:"Sector"`
		Industry      string `json:"Industry"`
		Country       string `json:"Country"`
		MarketCap     string `json:"MarketCapitalization"`
		CEO           string `json:"OfficialExecutiveOfficer"`
		Employees     string `json:"FullTimeEmployees"`
		FiftyTwoWHigh string `json:"52WeekHigh"`
		FiftyTwoWLow  string `json:"52WeekLow"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	// Pull quote for latest pricing data
	quote, _ := p.GetQuote(ticker)
	var currentPrice, dailyChange, dailyChangePct float64
	var volume int64
	if quote != nil {
		currentPrice = quote.CurrentPrice
		dailyChange = quote.DailyChange
		dailyChangePct = quote.DailyChangePercent
		volume = quote.Volume
	}

	mc, _ := strconv.ParseInt(raw.MarketCap, 10, 64)
	emp, _ := strconv.ParseInt(raw.Employees, 10, 64)
	high, _ := strconv.ParseFloat(raw.FiftyTwoWHigh, 64)
	low, _ := strconv.ParseFloat(raw.FiftyTwoWLow, 64)

	return &dto.CompanyProfileDTO{
		Name:               raw.Name,
		Ticker:             ticker,
		Logo:               "", // Alpha Vantage doesn't serve logos; fallback to frontend SVG
		Industry:           raw.Industry,
		Sector:             raw.Sector,
		MarketCap:          mc,
		Website:            "",
		Description:        raw.Description,
		CEO:                raw.CEO,
		Employees:          emp,
		Country:            raw.Country,
		Exchange:           raw.Exchange,
		CurrentPrice:       currentPrice,
		DailyChange:        dailyChange,
		DailyChangePercent: dailyChangePct,
		FiftyTwoWHigh:      high,
		FiftyTwoWLow:       low,
		Volume:             volume,
		AvgVolume:          volume,
	}, nil
}

// GetFinancialMetrics parses financials from overview
func (p *AlphaVantageProvider) GetFinancialMetrics(ticker string) (*dto.FinancialMetricsDTO, error) {
	u := fmt.Sprintf("%s?function=OVERVIEW&symbol=%s&apikey=%s", p.baseURL, url.QueryEscape(ticker), p.apiKey)
	resp, err := p.client.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var raw struct {
		PE            string `json:"PERatio"`
		EPS           string `json:"EPS"`
		ROE           string `json:"ReturnOnEquityTTM"`
		Revenue       string `json:"RevenueTTM"`
		RevenueGrowth string `json:"QuarterlyRevenueGrowthYOY"`
		ProfitMargin  string `json:"ProfitMargin"`
		DebtEquity    string `json:"DebtToEquityRatio"`
		CurrentRatio  string `json:"CurrentRatio"`
		OperatingCash string `json:"OperatingCashFlow"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	pe, _ := strconv.ParseFloat(raw.PE, 64)
	eps, _ := strconv.ParseFloat(raw.EPS, 64)
	roe, _ := strconv.ParseFloat(raw.ROE, 64)
	rev, _ := strconv.ParseInt(raw.Revenue, 10, 64)
	growth, _ := strconv.ParseFloat(raw.RevenueGrowth, 64)
	margin, _ := strconv.ParseFloat(raw.ProfitMargin, 64)
	debt, _ := strconv.ParseFloat(raw.DebtEquity, 64)
	current, _ := strconv.ParseFloat(raw.CurrentRatio, 64)
	cash, _ := strconv.ParseInt(raw.OperatingCash, 10, 64)

	return &dto.FinancialMetricsDTO{
		Ticker:        ticker,
		PE:            pe,
		EPS:           eps,
		ROE:           roe,
		Revenue:       rev,
		RevenueGrowth: growth,
		ProfitMargin:  margin,
		DebtRatio:     debt,
		CurrentRatio:  current,
		CashFlow:      cash,
	}, nil
}

// GetHistoricalCandles returns candles
func (p *AlphaVantageProvider) GetHistoricalCandles(ticker string, resolution string, from, to int64) ([]dto.CandleDTO, error) {
	u := fmt.Sprintf("%s?function=TIME_SERIES_DAILY&symbol=%s&apikey=%s", p.baseURL, url.QueryEscape(ticker), p.apiKey)
	resp, err := p.client.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var raw struct {
		TimeSeries map[string]struct {
			Open   string `json:"1. open"`
			High   string `json:"2. high"`
			Low    string `json:"3. low"`
			Close  string `json:"4. close"`
			Volume string `json:"5. volume"`
		} `json:"Time Series (Daily)"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	var candles []dto.CandleDTO
	for dtStr, vals := range raw.TimeSeries {
		t, err := time.Parse("2006-01-02", dtStr)
		if err != nil {
			continue
		}
		unixTime := t.Unix()
		if unixTime < from || unixTime > to {
			continue
		}

		o, _ := strconv.ParseFloat(vals.Open, 64)
		h, _ := strconv.ParseFloat(vals.High, 64)
		l, _ := strconv.ParseFloat(vals.Low, 64)
		c, _ := strconv.ParseFloat(vals.Close, 64)
		v, _ := strconv.ParseInt(vals.Volume, 10, 64)

		candles = append(candles, dto.CandleDTO{
			Open:      o,
			High:      h,
			Low:       l,
			Close:     c,
			Volume:    v,
			Timestamp: unixTime,
		})
	}

	return candles, nil
}

// GetCompanyNews pulls news
func (p *AlphaVantageProvider) GetCompanyNews(ticker string) ([]dto.NewsDTO, error) {
	u := fmt.Sprintf("%s?function=NEWS_SENTIMENT&tickers=%s&apikey=%s", p.baseURL, url.QueryEscape(ticker), p.apiKey)
	resp, err := p.client.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var raw struct {
		Feed []struct {
			Title       string `json:"title"`
			Source      string `json:"source"`
			TimePub     string `json:"time_published"`
			Url         string `json:"url"`
			Summary     string `json:"summary"`
		} `json:"feed"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	news := make([]dto.NewsDTO, len(raw.Feed))
	for i, f := range raw.Feed {
		// Format TimePub: e.g. "20210630T154500" -> "2021-06-30 15:45"
		dtStr := f.TimePub
		if len(dtStr) >= 15 {
			dtStr = fmt.Sprintf("%s-%s-%s %s:%s", dtStr[0:4], dtStr[4:6], dtStr[6:8], dtStr[9:11], dtStr[11:13])
		}

		news[i] = dto.NewsDTO{
			Title:   f.Title,
			Source:  f.Source,
			Date:    dtStr,
			URL:     f.Url,
			Summary: f.Summary,
		}
	}

	return news, nil
}

// GetEarnings queries EPS surprises
func (p *AlphaVantageProvider) GetEarnings(ticker string) ([]dto.EarningsDTO, error) {
	u := fmt.Sprintf("%s?function=EARNINGS&symbol=%s&apikey=%s", p.baseURL, url.QueryEscape(ticker), p.apiKey)
	resp, err := p.client.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var raw struct {
		QuarterlyEarnings []struct {
			Period   string `json:"fiscalDateEnding"`
			Actual   string `json:"actualEarnings"`
			Estimate string `json:"estimatedEarnings"`
			Surprise string `json:"surprise"`
		} `json:"quarterlyEarnings"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	earnings := make([]dto.EarningsDTO, len(raw.QuarterlyEarnings))
	for i, q := range raw.QuarterlyEarnings {
		act, _ := strconv.ParseFloat(q.Actual, 64)
		est, _ := strconv.ParseFloat(q.Estimate, 64)
		sur, _ := strconv.ParseFloat(q.Surprise, 64)

		earnings[i] = dto.EarningsDTO{
			Period:   q.Period,
			Actual:   act,
			Estimate: est,
			Surprise: sur,
		}
	}

	return earnings, nil
}
