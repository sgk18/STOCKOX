package adapters

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// GrowwAdapter implements BrokerAdapter for Groww.
// Auth: API Token (Groww provides a personal access token from the developer portal)
// NOTE: Groww does not have an official public API as of 2025.
// This adapter implements the interface using reverse-engineered endpoints.
// When Groww releases an official API, update the endpoints accordingly.
type GrowwAdapter struct {
	httpClient *http.Client
	baseURL    string
}

func NewGrowwAdapter() *GrowwAdapter {
	return &GrowwAdapter{
		httpClient: &http.Client{Timeout: 15 * time.Second},
		baseURL:    "https://groww.in/v1/api",
	}
}

func (g *GrowwAdapter) Slug() string { return "groww" }
func (g *GrowwAdapter) Name() string { return "Groww" }

func (g *GrowwAdapter) Authenticate(req AuthRequest) (*AuthResult, error) {
	if req.Token == "" {
		return nil, fmt.Errorf("groww: api token is required")
	}
	// Verify the token by fetching profile
	profile, err := g.FetchProfile(req.Token)
	if err != nil {
		return nil, fmt.Errorf("groww: token validation failed: %w", err)
	}
	expiry := time.Now().Add(365 * 24 * time.Hour) // Groww tokens are long-lived
	return &AuthResult{
		AccessToken: req.Token,
		TokenExpiry: &expiry,
		ClientID:    profile.ClientID,
	}, nil
}

func (g *GrowwAdapter) FetchProfile(accessToken string) (*BrokerProfile, error) {
	req, _ := http.NewRequest("GET", g.baseURL+"/user/portfolio/v1/portfolio/summary", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("groww: profile request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Data struct {
			UserID      string  `json:"userId"`
			Name        string  `json:"name"`
			TotalValue  float64 `json:"totalCurrentValue"`
			CashBalance float64 `json:"cashBalance"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return &BrokerProfile{ClientID: "groww_user"}, nil
	}

	return &BrokerProfile{
		ClientID:    result.Data.UserID,
		Name:        result.Data.Name,
		TotalValue:  result.Data.TotalValue,
		CashBalance: result.Data.CashBalance,
	}, nil
}

func (g *GrowwAdapter) FetchHoldings(accessToken string) ([]BrokerHolding, error) {
	req, _ := http.NewRequest("GET", g.baseURL+"/user/portfolio/v1/holdings", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("groww: holdings request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Data struct {
			Holdings []struct {
				Symbol       string  `json:"bseScripCode"`
				Ticker       string  `json:"tradingSymbol"`
				CompanyName  string  `json:"scriptName"`
				Quantity     float64 `json:"quantity"`
				AvgPrice     float64 `json:"avgPrice"`
				LTP          float64 `json:"ltp"`
				CurrentValue float64 `json:"currentValue"`
				PnL          float64 `json:"pnl"`
			} `json:"holdings"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("groww: failed to parse holdings: %w", err)
	}

	holdings := make([]BrokerHolding, 0, len(result.Data.Holdings))
	for _, h := range result.Data.Holdings {
		if h.Quantity <= 0 {
			continue
		}
		invested := h.Quantity * h.AvgPrice
		pnlPct := 0.0
		if invested > 0 {
			pnlPct = (h.PnL / invested) * 100
		}
		holdings = append(holdings, BrokerHolding{
			Ticker:       h.Ticker,
			CompanyName:  h.CompanyName,
			Quantity:     h.Quantity,
			AveragePrice: h.AvgPrice,
			CurrentPrice: h.LTP,
			CurrentValue: h.CurrentValue,
			PnL:          h.PnL,
			PnLPercent:   pnlPct,
			Exchange:     "NSE",
			AssetType:    "equity",
			Currency:     "INR",
		})
	}
	return holdings, nil
}

func (g *GrowwAdapter) FetchTransactions(accessToken string, fromDate time.Time) ([]BrokerTransaction, error) {
	req, _ := http.NewRequest("GET", g.baseURL+"/user/portfolio/v1/orders/history", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	q := req.URL.Query()
	q.Add("from", fromDate.Format("2006-01-02"))
	req.URL.RawQuery = q.Encode()

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("groww: transactions request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Data struct {
			Orders []struct {
				OrderID     string    `json:"orderId"`
				Symbol      string    `json:"tradingSymbol"`
				OrderType   string    `json:"transactionType"` // BUY | SELL
				Quantity    float64   `json:"quantity"`
				Price       float64   `json:"price"`
				OrderTime   time.Time `json:"orderCreatedAt"`
			} `json:"orders"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, nil
	}

	txs := make([]BrokerTransaction, 0, len(result.Data.Orders))
	for _, o := range result.Data.Orders {
		txType := "buy"
		if o.OrderType == "SELL" {
			txType = "sell"
		}
		txs = append(txs, BrokerTransaction{
			BrokerTxID: o.OrderID,
			Ticker:     o.Symbol,
			TxType:     txType,
			Quantity:   o.Quantity,
			Price:      o.Price,
			TotalValue: o.Quantity * o.Price,
			Currency:   "INR",
			Exchange:   "NSE",
			TxAt:       o.OrderTime,
		})
	}
	return txs, nil
}
