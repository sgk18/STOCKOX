package marketdata

// TwelveData models
type TwelveDataQuote struct {
	Symbol        string `json:"symbol"`
	Name          string `json:"name"`
	Exchange      string `json:"exchange"`
	Open          string `json:"open"`
	High          string `json:"high"`
	Low           string `json:"low"`
	Close         string `json:"close"`
	Volume        string `json:"volume"`
	PreviousClose string `json:"previous_close"`
	Change        string `json:"change"`
	PercentChange string `json:"percent_change"`
}

type TwelveDataProfile struct {
	Symbol      string `json:"symbol"`
	Name        string `json:"name"`
	Exchange    string `json:"exchange"`
	Sector      string `json:"sector"`
	Industry    string `json:"industry"`
	Country     string `json:"country"`
	Description string `json:"description"`
	Website     string `json:"website"`
}

type TwelveDataTimeSeries struct {
	Values []TwelveDataTimeSeriesValue `json:"values"`
	Status string                      `json:"status"`
}

type TwelveDataTimeSeriesValue struct {
	Datetime string `json:"datetime"`
	Open     string `json:"open"`
	High     string `json:"high"`
	Low      string `json:"low"`
	Close    string `json:"close"`
	Volume   string `json:"volume"`
}

// Yahoo Finance models
type YahooChartResponse struct {
	Chart struct {
		Result []YahooChartResult `json:"result"`
		Error  interface{}        `json:"error"`
	} `json:"chart"`
}

type YahooChartResult struct {
	Meta struct {
		Currency             string  `json:"currency"`
		Symbol               string  `json:"symbol"`
		ExchangeName         string  `json:"exchangeName"`
		RegularMarketPrice   float64 `json:"regularMarketPrice"`
		ChartPreviousClose   float64 `json:"chartPreviousClose"`
		RegularMarketVolume  int64   `json:"regularMarketVolume"`
		RegularMarketDayHigh float64 `json:"regularMarketDayHigh"`
		RegularMarketDayLow  float64 `json:"regularMarketDayLow"`
		RegularMarketOpen    float64 `json:"regularMarketOpen"`
	} `json:"meta"`
	Timestamp []int64 `json:"timestamp"`
	Indicators struct {
		Quote []struct {
			Open   []float64 `json:"open"`
			High   []float64 `json:"high"`
			Low    []float64 `json:"low"`
			Close  []float64 `json:"close"`
			Volume []int64   `json:"volume"`
		} `json:"quote"`
	} `json:"indicators"`
}

type YahooQuoteSummaryResponse struct {
	QuoteSummary struct {
		Result []YahooQuoteSummaryResult `json:"result"`
		Error  interface{}               `json:"error"`
	} `json:"quoteSummary"`
}

type YahooQuoteSummaryResult struct {
	AssetProfile struct {
		Industry            string `json:"industry"`
		Sector              string `json:"sector"`
		LongBusinessSummary string `json:"longBusinessSummary"`
		Website             string `json:"website"`
		Country             string `json:"country"`
	} `json:"assetProfile"`
	DefaultKeyStatistics struct {
		EnterpriseValue struct {
			Raw int64 `json:"raw"`
		} `json:"enterpriseValue"`
		ForwardPE struct {
			Raw float64 `json:"raw"`
		} `json:"forwardPE"`
		ProfitMargins struct {
			Raw float64 `json:"raw"`
		} `json:"profitMargins"`
		SharesOutstanding struct {
			Raw int64 `json:"raw"`
		} `json:"sharesOutstanding"`
	} `json:"defaultKeyStatistics"`
	FinancialData struct {
		CurrentPrice struct {
			Raw float64 `json:"raw"`
		} `json:"currentPrice"`
		TargetMeanPrice struct {
			Raw float64 `json:"raw"`
		} `json:"targetMeanPrice"`
		TotalRevenue struct {
			Raw int64 `json:"raw"`
		} `json:"totalRevenue"`
		RevenueGrowth struct {
			Raw float64 `json:"raw"`
		} `json:"revenueGrowth"`
		OperatingCashflow struct {
			Raw int64 `json:"raw"`
		} `json:"operatingCashflow"`
		Ebitda struct {
			Raw int64 `json:"raw"`
		} `json:"ebitda"`
	} `json:"financialData"`
}

type YahooSearchResponse struct {
	News []YahooNewsItem `json:"news"`
}

type YahooNewsItem struct {
	Uuid                string `json:"uuid"`
	Title               string `json:"title"`
	Publisher           string `json:"publisher"`
	Link                string `json:"link"`
	ProviderPublishTime int64  `json:"providerPublishTime"`
}
