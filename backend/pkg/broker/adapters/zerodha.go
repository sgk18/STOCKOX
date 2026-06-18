package adapters

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// ZerodhaAdapter implements BrokerAdapter for Zerodha Kite Connect.
// Docs: https://kite.trade/docs/connect/v3/
// Auth: OAuth (API Key + Request Token → Access Token)
type ZerodhaAdapter struct {
	httpClient *http.Client
	baseURL    string
}

func NewZerodhaAdapter() *ZerodhaAdapter {
	return &ZerodhaAdapter{
		httpClient: &http.Client{Timeout: 15 * time.Second},
		baseURL:    "https://api.kite.trade",
	}
}

func (z *ZerodhaAdapter) Slug() string { return "zerodha" }
func (z *ZerodhaAdapter) Name() string { return "Zerodha" }

func (z *ZerodhaAdapter) Authenticate(req AuthRequest) (*AuthResult, error) {
	if req.Token != "" {
		// Direct access token provided (e.g. from user's Kite session)
		expiry := time.Now().Add(24 * time.Hour)
		return &AuthResult{
			AccessToken:  req.Token,
			RefreshToken: "",
			TokenExpiry:  &expiry,
			ClientID:     req.ClientID,
		}, nil
	}

	if req.APIKey == "" || req.AuthCode == "" {
		return nil, fmt.Errorf("zerodha: api_key and auth_code are required for OAuth")
	}

	// POST /session/token to exchange request token for access token
	formData := url.Values{
		"api_key":      {req.APIKey},
		"request_token": {req.AuthCode},
		"checksum":     {""}, // SHA256(api_key + request_token + api_secret) — computed by caller
	}
	if req.APISecret != "" {
		formData.Set("checksum", req.APISecret) // caller should pre-compute checksum
	}

	httpReq, err := http.NewRequest("POST", z.baseURL+"/session/token",
		strings.NewReader(formData.Encode()))
	if err != nil {
		return nil, fmt.Errorf("zerodha: failed to create auth request: %w", err)
	}
	httpReq.Header.Set("X-Kite-Version", "3")
	httpReq.Header.Set("Authorization", "token "+req.APIKey+":")
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := z.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("zerodha: auth request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("zerodha: auth failed (status %d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		Data struct {
			AccessToken string    `json:"access_token"`
			UserID      string    `json:"user_id"`
			LoginTime   time.Time `json:"login_time"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("zerodha: failed to parse auth response: %w", err)
	}

	expiry := result.Data.LoginTime.Add(24 * time.Hour)
	return &AuthResult{
		AccessToken: result.Data.AccessToken,
		TokenExpiry: &expiry,
		ClientID:    result.Data.UserID,
	}, nil
}

func (z *ZerodhaAdapter) FetchProfile(accessToken string) (*BrokerProfile, error) {
	// GET /user/profile
	req, _ := http.NewRequest("GET", z.baseURL+"/user/profile", nil)
	req.Header.Set("X-Kite-Version", "3")
	req.Header.Set("Authorization", "token :"+accessToken)

	resp, err := z.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("zerodha: profile request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Data struct {
			UserID    string `json:"user_id"`
			UserName  string `json:"user_name"`
			Email     string `json:"email"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("zerodha: failed to parse profile: %w", err)
	}

	return &BrokerProfile{
		ClientID: result.Data.UserID,
		Name:     result.Data.UserName,
		Email:    result.Data.Email,
	}, nil
}

func (z *ZerodhaAdapter) FetchHoldings(accessToken string) ([]BrokerHolding, error) {
	// GET /portfolio/holdings
	req, _ := http.NewRequest("GET", z.baseURL+"/portfolio/holdings", nil)
	req.Header.Set("X-Kite-Version", "3")
	req.Header.Set("Authorization", "token :"+accessToken)

	resp, err := z.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("zerodha: holdings request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("zerodha: holdings failed (status %d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		Data []struct {
			Tradingsymbol       string  `json:"tradingsymbol"`
			Exchange            string  `json:"exchange"`
			Quantity            float64 `json:"quantity"`
			AveragePrice        float64 `json:"average_price"`
			LastPrice           float64 `json:"last_price"`
			PnL                 float64 `json:"pnl"`
			DayChangePct        float64 `json:"day_change_percentage"`
			InstrumentType      string  `json:"instrument_type"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("zerodha: failed to parse holdings: %w", err)
	}

	holdings := make([]BrokerHolding, 0, len(result.Data))
	for _, h := range result.Data {
		if h.Quantity <= 0 {
			continue
		}
		currentValue := h.Quantity * h.LastPrice
		investedValue := h.Quantity * h.AveragePrice
		pnlPct := 0.0
		if investedValue > 0 {
			pnlPct = (h.PnL / investedValue) * 100
		}
		assetType := "equity"
		if strings.Contains(h.InstrumentType, "ETF") {
			assetType = "etf"
		}
		holdings = append(holdings, BrokerHolding{
			Ticker:       h.Tradingsymbol,
			Quantity:     h.Quantity,
			AveragePrice: h.AveragePrice,
			CurrentPrice: h.LastPrice,
			CurrentValue: currentValue,
			PnL:          h.PnL,
			PnLPercent:   pnlPct,
			Exchange:     h.Exchange,
			AssetType:    assetType,
			Currency:     "INR",
		})
	}
	return holdings, nil
}

func (z *ZerodhaAdapter) FetchTransactions(accessToken string, fromDate time.Time) ([]BrokerTransaction, error) {
	// GET /trades (recent trades — note: full history requires Kite data API)
	req, _ := http.NewRequest("GET", z.baseURL+"/trades", nil)
	req.Header.Set("X-Kite-Version", "3")
	req.Header.Set("Authorization", "token :"+accessToken)

	resp, err := z.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("zerodha: trades request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Data []struct {
			OrderID         string    `json:"order_id"`
			Tradingsymbol   string    `json:"tradingsymbol"`
			Exchange        string    `json:"exchange"`
			TransactionType string    `json:"transaction_type"` // BUY | SELL
			Quantity        float64   `json:"quantity"`
			AveragePrice    float64   `json:"average_price"`
			FillTimestamp   time.Time `json:"fill_timestamp"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, nil // return empty rather than failing
	}

	txs := make([]BrokerTransaction, 0, len(result.Data))
	for _, t := range result.Data {
		if t.FillTimestamp.Before(fromDate) {
			continue
		}
		txType := strings.ToLower(t.TransactionType)
		txs = append(txs, BrokerTransaction{
			BrokerTxID: t.OrderID,
			Ticker:     t.Tradingsymbol,
			TxType:     txType,
			Quantity:   t.Quantity,
			Price:      t.AveragePrice,
			TotalValue: t.Quantity * t.AveragePrice,
			Currency:   "INR",
			Exchange:   t.Exchange,
			TxAt:       t.FillTimestamp,
		})
	}
	return txs, nil
}
