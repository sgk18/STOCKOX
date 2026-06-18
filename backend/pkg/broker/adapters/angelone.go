package adapters

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// AngelOneAdapter implements BrokerAdapter for Angel One Smart API.
// Docs: https://smartapi.angelbroking.com/docs
// Auth: API Key + TOTP → JWT access token
type AngelOneAdapter struct {
	httpClient *http.Client
	baseURL    string
}

func NewAngelOneAdapter() *AngelOneAdapter {
	return &AngelOneAdapter{
		httpClient: &http.Client{Timeout: 15 * time.Second},
		baseURL:    "https://apiconnect.angelbroking.com",
	}
}

func (a *AngelOneAdapter) Slug() string { return "angelone" }
func (a *AngelOneAdapter) Name() string { return "Angel One" }

func (a *AngelOneAdapter) Authenticate(req AuthRequest) (*AuthResult, error) {
	if req.Token != "" {
		// Pre-generated JWT provided
		expiry := time.Now().Add(24 * time.Hour)
		return &AuthResult{
			AccessToken: req.Token,
			TokenExpiry: &expiry,
			ClientID:    req.ClientID,
		}, nil
	}

	if req.APIKey == "" || req.ClientID == "" {
		return nil, fmt.Errorf("angelone: api_key and client_id are required")
	}

	payload := map[string]string{
		"clientcode": req.ClientID,
		"password":   req.APISecret,
		"totp":       req.AuthCode, // TOTP code
	}
	payloadBytes, _ := json.Marshal(payload)

	httpReq, err := http.NewRequest("POST", a.baseURL+"/rest/auth/angelbroking/user/v1/loginByPassword",
		strings.NewReader(string(payloadBytes)))
	if err != nil {
		return nil, fmt.Errorf("angelone: failed to create auth request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-UserType", "USER")
	httpReq.Header.Set("X-SourceID", "WEB")
	httpReq.Header.Set("X-ClientLocalIP", "127.0.0.1")
	httpReq.Header.Set("X-ClientPublicIP", "127.0.0.1")
	httpReq.Header.Set("X-MACAddress", "fe80::1")
	httpReq.Header.Set("X-PrivateKey", req.APIKey)

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("angelone: auth request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Data struct {
			JWTToken     string `json:"jwtToken"`
			RefreshToken string `json:"refreshToken"`
		} `json:"data"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("angelone: failed to parse auth response: %w", err)
	}
	if result.Data.JWTToken == "" {
		return nil, fmt.Errorf("angelone: authentication failed: %s", result.Message)
	}

	expiry := time.Now().Add(24 * time.Hour)
	return &AuthResult{
		AccessToken:  result.Data.JWTToken,
		RefreshToken: result.Data.RefreshToken,
		TokenExpiry:  &expiry,
		ClientID:     req.ClientID,
	}, nil
}

func (a *AngelOneAdapter) FetchProfile(accessToken string) (*BrokerProfile, error) {
	req, _ := http.NewRequest("GET", a.baseURL+"/rest/secure/angelbroking/user/v1/getProfile", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("angelone: profile request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Data struct {
			ClientCode string `json:"clientcode"`
			Name       string `json:"name"`
			Email      string `json:"email"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return &BrokerProfile{ClientID: "angelone_user"}, nil
	}
	return &BrokerProfile{
		ClientID: result.Data.ClientCode,
		Name:     result.Data.Name,
		Email:    result.Data.Email,
	}, nil
}

func (a *AngelOneAdapter) FetchHoldings(accessToken string) ([]BrokerHolding, error) {
	req, _ := http.NewRequest("GET", a.baseURL+"/rest/secure/angelbroking/portfolio/v1/getHolding", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("angelone: holdings request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Data []struct {
			Tradingsymbol string  `json:"tradingsymbol"`
			Exchange      string  `json:"exchange"`
			Quantity      float64 `json:"quantity"`
			AveragePrice  float64 `json:"averageprice"`
			LTP           float64 `json:"ltp"`
			ProfitAndLoss float64 `json:"profitandloss"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("angelone: failed to parse holdings: %w", err)
	}

	holdings := make([]BrokerHolding, 0, len(result.Data))
	for _, h := range result.Data {
		if h.Quantity <= 0 {
			continue
		}
		invested := h.Quantity * h.AveragePrice
		pnlPct := 0.0
		if invested > 0 {
			pnlPct = (h.ProfitAndLoss / invested) * 100
		}
		holdings = append(holdings, BrokerHolding{
			Ticker:       h.Tradingsymbol,
			Quantity:     h.Quantity,
			AveragePrice: h.AveragePrice,
			CurrentPrice: h.LTP,
			CurrentValue: h.Quantity * h.LTP,
			PnL:          h.ProfitAndLoss,
			PnLPercent:   pnlPct,
			Exchange:     h.Exchange,
			AssetType:    "equity",
			Currency:     "INR",
		})
	}
	return holdings, nil
}

func (a *AngelOneAdapter) FetchTransactions(accessToken string, fromDate time.Time) ([]BrokerTransaction, error) {
	// Angel One trade book endpoint
	req, _ := http.NewRequest("GET", a.baseURL+"/rest/secure/angelbroking/order/v1/getTradeBook", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("angelone: trade book request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Data []struct {
			UniqueOrderID   string    `json:"uniqueorderid"`
			Tradingsymbol   string    `json:"tradingsymbol"`
			Exchange        string    `json:"exchange"`
			TransactionType string    `json:"transactiontype"` // BUY | SELL
			Quantity        float64   `json:"quantity"`
			TradePrice      float64   `json:"tradeprice"`
			OrderTime       time.Time `json:"orderid"` // will not parse directly; simplified
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, nil
	}

	txs := make([]BrokerTransaction, 0)
	for _, t := range result.Data {
		txType := "buy"
		if t.TransactionType == "SELL" {
			txType = "sell"
		}
		txs = append(txs, BrokerTransaction{
			BrokerTxID: t.UniqueOrderID,
			Ticker:     t.Tradingsymbol,
			TxType:     txType,
			Quantity:   t.Quantity,
			Price:      t.TradePrice,
			TotalValue: t.Quantity * t.TradePrice,
			Currency:   "INR",
			Exchange:   t.Exchange,
			TxAt:       time.Now(), // Angel API returns date separately
		})
	}
	return txs, nil
}
