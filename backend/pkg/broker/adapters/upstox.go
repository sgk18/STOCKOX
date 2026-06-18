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

// UpstoxAdapter implements BrokerAdapter for Upstox v2 API.
// Docs: https://upstox.com/developer/api-documentation/
// Auth: OAuth2 (Authorization Code Flow)
type UpstoxAdapter struct {
	httpClient *http.Client
	baseURL    string
}

func NewUpstoxAdapter() *UpstoxAdapter {
	return &UpstoxAdapter{
		httpClient: &http.Client{Timeout: 15 * time.Second},
		baseURL:    "https://api.upstox.com/v2",
	}
}

func (u *UpstoxAdapter) Slug() string { return "upstox" }
func (u *UpstoxAdapter) Name() string { return "Upstox" }

func (u *UpstoxAdapter) Authenticate(req AuthRequest) (*AuthResult, error) {
	if req.Token != "" {
		expiry := time.Now().Add(24 * time.Hour)
		return &AuthResult{
			AccessToken: req.Token,
			TokenExpiry: &expiry,
			ClientID:    req.ClientID,
		}, nil
	}

	if req.APIKey == "" || req.APISecret == "" || req.AuthCode == "" {
		return nil, fmt.Errorf("upstox: api_key, api_secret and auth_code are required for OAuth")
	}

	formData := url.Values{
		"code":          {req.AuthCode},
		"client_id":     {req.APIKey},
		"client_secret": {req.APISecret},
		"redirect_uri":  {"https://stockox.in/api/v1/brokers/oauth/callback"},
		"grant_type":    {"authorization_code"},
	}

	httpReq, err := http.NewRequest("POST", u.baseURL+"/login/authorization/token",
		strings.NewReader(formData.Encode()))
	if err != nil {
		return nil, fmt.Errorf("upstox: failed to create auth request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	httpReq.Header.Set("Accept", "application/json")

	resp, err := u.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("upstox: auth request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("upstox: auth failed (status %d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		AccessToken string `json:"access_token"`
		UserID      string `json:"user_id"`
		ExpiresIn   int    `json:"expires_in"` // seconds
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("upstox: failed to parse auth response: %w", err)
	}

	expiry := time.Now().Add(time.Duration(result.ExpiresIn) * time.Second)
	return &AuthResult{
		AccessToken: result.AccessToken,
		TokenExpiry: &expiry,
		ClientID:    result.UserID,
	}, nil
}

func (u *UpstoxAdapter) FetchProfile(accessToken string) (*BrokerProfile, error) {
	req, _ := http.NewRequest("GET", u.baseURL+"/profile", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := u.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("upstox: profile request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Data struct {
			UserID string `json:"user_id"`
			Name   string `json:"user_name"`
			Email  string `json:"email"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return &BrokerProfile{ClientID: "upstox_user"}, nil
	}
	return &BrokerProfile{
		ClientID: result.Data.UserID,
		Name:     result.Data.Name,
		Email:    result.Data.Email,
	}, nil
}

func (u *UpstoxAdapter) FetchHoldings(accessToken string) ([]BrokerHolding, error) {
	req, _ := http.NewRequest("GET", u.baseURL+"/portfolio/long-term-holdings", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := u.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("upstox: holdings request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Data []struct {
			ISIN            string  `json:"isin"`
			Tradingsymbol   string  `json:"trading_symbol"`
			Exchange        string  `json:"exchange"`
			Quantity        float64 `json:"quantity"`
			AveragePrice    float64 `json:"average_price"`
			LastPrice       float64 `json:"last_price"`
			PnL             float64 `json:"pnl"`
			DayChangePct    float64 `json:"day_change_percentage"`
			InstrumentType  string  `json:"instrument_type"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("upstox: failed to parse holdings: %w", err)
	}

	holdings := make([]BrokerHolding, 0, len(result.Data))
	for _, h := range result.Data {
		if h.Quantity <= 0 {
			continue
		}
		invested := h.Quantity * h.AveragePrice
		pnlPct := 0.0
		if invested > 0 {
			pnlPct = (h.PnL / invested) * 100
		}
		assetType := "equity"
		if strings.EqualFold(h.InstrumentType, "MUTUAL_FUND") {
			assetType = "mf"
		} else if strings.Contains(strings.ToUpper(h.InstrumentType), "ETF") {
			assetType = "etf"
		}
		holdings = append(holdings, BrokerHolding{
			Ticker:       h.Tradingsymbol,
			Quantity:     h.Quantity,
			AveragePrice: h.AveragePrice,
			CurrentPrice: h.LastPrice,
			CurrentValue: h.Quantity * h.LastPrice,
			PnL:          h.PnL,
			PnLPercent:   pnlPct,
			Exchange:     h.Exchange,
			AssetType:    assetType,
			Currency:     "INR",
		})
	}
	return holdings, nil
}

func (u *UpstoxAdapter) FetchTransactions(accessToken string, fromDate time.Time) ([]BrokerTransaction, error) {
	req, _ := http.NewRequest("GET", u.baseURL+"/charges/historical-cumulative-charges", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")
	q := req.URL.Query()
	q.Add("from_date", fromDate.Format("2006-01-02"))
	q.Add("to_date", time.Now().Format("2006-01-02"))
	q.Add("segment", "EQ")
	req.URL.RawQuery = q.Encode()

	resp, err := u.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("upstox: transactions request failed: %w", err)
	}
	defer resp.Body.Close()

	// Return empty — Upstox transaction history requires specific date range queries
	_ = resp
	return nil, nil
}
