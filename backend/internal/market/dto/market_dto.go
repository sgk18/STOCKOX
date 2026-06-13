package dto

type SearchStockDTO struct {
	Ticker    string `json:"ticker"`
	Name      string `json:"name"`
	Exchange  string `json:"exchange"`
	Industry  string `json:"industry"`
	Logo      string `json:"logo,omitempty"`
	Price     float64 `json:"price,omitempty"`
	MarketCap int64  `json:"marketCap"`
}

type QuoteDTO struct {
	Ticker             string  `json:"ticker"`
	CurrentPrice       float64 `json:"currentPrice"`
	DailyChange        float64 `json:"dailyChange"`
	DailyChangePercent float64 `json:"dailyChangePercent"`
	HighPrice          float64 `json:"highPrice"`
	LowPrice           float64 `json:"lowPrice"`
	OpenPrice          float64 `json:"openPrice"`
	PrevClosePrice     float64 `json:"prevClosePrice"`
	Volume             int64   `json:"volume"`
	AvgVolume          int64   `json:"avgVolume"`
}

type CompanyProfileDTO struct {
	Name               string  `json:"name"`
	Ticker             string  `json:"ticker"`
	Logo               string  `json:"logo"`
	Industry           string  `json:"industry"`
	Sector             string  `json:"sector"`
	MarketCap          int64   `json:"marketCap"`
	Website            string  `json:"website"`
	Description        string  `json:"description"`
	CEO                string  `json:"ceo"`
	Employees          int64   `json:"employees"`
	Country            string  `json:"country"`
	Exchange           string  `json:"exchange"`
	CurrentPrice       float64 `json:"currentPrice"`
	DailyChange        float64 `json:"dailyChange"`
	DailyChangePercent float64 `json:"dailyChangePercent"`
	FiftyTwoWHigh      float64 `json:"fiftyTwoWHigh"`
	FiftyTwoWLow       float64 `json:"fiftyTwoWLow"`
	Volume             int64   `json:"volume"`
	AvgVolume          int64   `json:"avgVolume"`
}

type FinancialMetricsDTO struct {
	Ticker        string  `json:"ticker"`
	PE            float64 `json:"pe"`
	EPS           float64 `json:"eps"`
	ROE           float64 `json:"roe"`
	Revenue       int64   `json:"revenue"`
	RevenueGrowth float64 `json:"revenueGrowth"`
	ProfitMargin  float64 `json:"profitMargin"`
	DebtRatio     float64 `json:"debtRatio"`
	CurrentRatio  float64 `json:"currentRatio"`
	CashFlow      int64   `json:"cashFlow"`
}

type CandleDTO struct {
	Open      float64 `json:"open"`
	High      float64 `json:"high"`
	Low       float64 `json:"low"`
	Close     float64 `json:"close"`
	Volume    int64   `json:"volume"`
	Timestamp int64   `json:"timestamp"`
}

type NewsDTO struct {
	Title   string `json:"title"`
	Source  string `json:"source"`
	Date    string `json:"date"`
	URL     string `json:"url"`
	Summary string `json:"summary"`
}

type EarningsDTO struct {
	Period   string  `json:"period"`
	Actual   float64 `json:"actual"`
	Estimate float64 `json:"estimate"`
	Surprise float64 `json:"surprise"`
}
