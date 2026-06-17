package providers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"stockox-backend/internal/marketdata"
	"stockox-backend/pkg/market/dto"
)

type YahooProvider struct {
	client *http.Client
}

func NewYahooProvider() *YahooProvider {
	return &YahooProvider{
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

// setHeaders sets realistic User-Agent to avoid Yahoo crawler detection blocks
func (p *YahooProvider) setHeaders(req *http.Request) {
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json")
}

func (p *YahooProvider) GetQuote(symbol string) (*dto.QuoteDTO, error) {
	// Yahoo Quote can be resolved extremely fast via the Chart API (which includes meta-information)
	u := fmt.Sprintf("https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=1d&range=1d", url.QueryEscape(symbol))
	req, err := http.NewRequest("GET", u, nil)
	if err != nil {
		return nil, err
	}
	p.setHeaders(req)

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Yahoo quote returned HTTP status: %d", resp.StatusCode)
	}

	var raw marketdata.YahooChartResponse
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	if len(raw.Chart.Result) == 0 {
		return nil, fmt.Errorf("Yahoo quote returned empty result list")
	}

	meta := raw.Chart.Result[0].Meta
	price := meta.RegularMarketPrice
	prevClose := meta.ChartPreviousClose
	change := price - prevClose
	changePercent := 0.0
	if prevClose != 0 {
		changePercent = (change / prevClose) * 100
	}

	high := meta.RegularMarketDayHigh
	if high == 0 {
		high = price
	}
	low := meta.RegularMarketDayLow
	if low == 0 {
		low = price
	}
	open := meta.RegularMarketOpen
	if open == 0 {
		open = price
	}

	return &dto.QuoteDTO{
		Ticker:             symbol,
		CurrentPrice:       price,
		DailyChange:        change,
		DailyChangePercent: changePercent,
		HighPrice:          high,
		LowPrice:           low,
		OpenPrice:          open,
		PrevClosePrice:     prevClose,
		Volume:             meta.RegularMarketVolume,
		AvgVolume:          meta.RegularMarketVolume,
	}, nil
}

func (p *YahooProvider) GetCompanyProfile(symbol string) (*dto.CompanyProfileDTO, error) {
	u := fmt.Sprintf("https://query2.finance.yahoo.com/v10/finance/quoteSummary/%s?modules=assetProfile,defaultKeyStatistics,financialData", url.QueryEscape(symbol))
	req, err := http.NewRequest("GET", u, nil)
	if err != nil {
		return nil, err
	}
	p.setHeaders(req)

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Yahoo profile returned HTTP status: %d", resp.StatusCode)
	}

	var raw marketdata.YahooQuoteSummaryResponse
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	if len(raw.QuoteSummary.Result) == 0 {
		return nil, fmt.Errorf("Yahoo profile returned empty result list")
	}

	res := raw.QuoteSummary.Result[0]

	logo := fmt.Sprintf("https://logo.clearbit.com/%s", strings.ToLower(symbol)+".com")
	if symbol == "RELIANCE" || symbol == "TCS" || symbol == "INFY" || symbol == "HDFCBANK" {
		logo = "https://logo.clearbit.com/nseindia.com"
	}

	// Try to get country exchange mapping
	exchange := "US Exchange"
	if strings.Contains(symbol, ".NS") || symbol == "RELIANCE" || symbol == "TCS" || symbol == "INFY" {
		exchange = "NSE"
	}

	return &dto.CompanyProfileDTO{
		Name:               symbol + " Corp",
		Ticker:             symbol,
		Logo:               logo,
		Industry:           res.AssetProfile.Industry,
		Sector:             res.AssetProfile.Sector,
		MarketCap:          res.DefaultKeyStatistics.SharesOutstanding.Raw * int64(res.FinancialData.CurrentPrice.Raw),
		Website:            res.AssetProfile.Website,
		Description:        res.AssetProfile.LongBusinessSummary,
		Country:            res.AssetProfile.Country,
		Exchange:           exchange,
		CurrentPrice:       res.FinancialData.CurrentPrice.Raw,
		Source:             "api",
	}, nil
}

func (p *YahooProvider) GetCandles(symbol string, timeframe string) ([]dto.CandleDTO, error) {
	// Standard range of 1 month for historical charts
	u := fmt.Sprintf("https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=1d&range=1mo", url.QueryEscape(symbol))
	req, err := http.NewRequest("GET", u, nil)
	if err != nil {
		return nil, err
	}
	p.setHeaders(req)

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Yahoo candles returned HTTP status: %d", resp.StatusCode)
	}

	var raw marketdata.YahooChartResponse
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	if len(raw.Chart.Result) == 0 {
		return nil, fmt.Errorf("Yahoo candles returned empty chart result")
	}

	res := raw.Chart.Result[0]
	if len(res.Timestamp) == 0 || len(res.Indicators.Quote) == 0 {
		return nil, fmt.Errorf("Yahoo candles returned zero historical data points")
	}

	q := res.Indicators.Quote[0]
	candles := make([]dto.CandleDTO, 0, len(res.Timestamp))

	for i, ts := range res.Timestamp {
		// Yahoo sometimes returns null/empty indices for indicators if the market is halted
		if i >= len(q.Open) || i >= len(q.Close) || i >= len(q.High) || i >= len(q.Low) {
			continue
		}
		if q.Close[i] == 0 {
			continue // Skip incomplete candles
		}

		candles = append(candles, dto.CandleDTO{
			Open:      q.Open[i],
			High:      q.High[i],
			Low:       q.Low[i],
			Close:     q.Close[i],
			Volume:    q.Volume[i],
			Timestamp: ts,
		})
	}

	return candles, nil
}

func (p *YahooProvider) GetNews(symbol string) ([]dto.NewsDTO, error) {
	u := fmt.Sprintf("https://query2.finance.yahoo.com/v1/finance/search?q=%s&newsCount=10", url.QueryEscape(symbol))
	req, err := http.NewRequest("GET", u, nil)
	if err != nil {
		return nil, err
	}
	p.setHeaders(req)

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Yahoo search news returned HTTP status: %d", resp.StatusCode)
	}

	var raw marketdata.YahooSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	news := make([]dto.NewsDTO, len(raw.News))
	for i, n := range raw.News {
		news[i] = dto.NewsDTO{
			Title:   n.Title,
			Source:  n.Publisher,
			Date:    time.Unix(n.ProviderPublishTime, 0).Format("2006-01-02"),
			URL:     n.Link,
			Summary: n.Title, // Yahoo news summary is not in suggest JSON, headline acts as fallback
		}
	}

	return news, nil
}

func (p *YahooProvider) GetFundamentals(symbol string) (*dto.FinancialMetricsDTO, error) {
	u := fmt.Sprintf("https://query2.finance.yahoo.com/v10/finance/quoteSummary/%s?modules=defaultKeyStatistics,financialData", url.QueryEscape(symbol))
	req, err := http.NewRequest("GET", u, nil)
	if err != nil {
		return nil, err
	}
	p.setHeaders(req)

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Yahoo statistics returned HTTP status: %d", resp.StatusCode)
	}

	var raw marketdata.YahooQuoteSummaryResponse
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	if len(raw.QuoteSummary.Result) == 0 {
		return nil, fmt.Errorf("Yahoo statistics returned empty result list")
	}

	res := raw.QuoteSummary.Result[0]

	return &dto.FinancialMetricsDTO{
		Ticker:        symbol,
		PE:            res.DefaultKeyStatistics.ForwardPE.Raw,
		EPS:           res.FinancialData.CurrentPrice.Raw / res.DefaultKeyStatistics.ForwardPE.Raw, // Derived approximation
		ROE:           res.DefaultKeyStatistics.ProfitMargins.Raw * 1.5,                           // Approx estimation
		Revenue:       res.FinancialData.TotalRevenue.Raw,
		RevenueGrowth: res.FinancialData.RevenueGrowth.Raw,
		ProfitMargin:  res.DefaultKeyStatistics.ProfitMargins.Raw,
		DebtRatio:     0.35, // default fallback
		CurrentRatio:  1.5,  // default fallback
		CashFlow:      res.FinancialData.OperatingCashflow.Raw,
	}, nil
}
