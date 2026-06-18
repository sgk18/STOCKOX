package adapters

import "time"

// BrokerHolding represents a single holding fetched from a broker.
// Stockox ONLY reads this data — no trade execution.
type BrokerHolding struct {
	Ticker       string    `json:"ticker"`
	CompanyName  string    `json:"company_name"`
	Quantity     float64   `json:"quantity"`
	AveragePrice float64   `json:"average_price"`
	CurrentPrice float64   `json:"current_price"`
	CurrentValue float64   `json:"current_value"`
	PnL          float64   `json:"pnl"`
	PnLPercent   float64   `json:"pnl_percent"`
	Sector       string    `json:"sector"`
	Exchange     string    `json:"exchange"`
	AssetType    string    `json:"asset_type"` // equity | etf | mf | bond | crypto
	Currency     string    `json:"currency"`
}

// BrokerTransaction represents an imported transaction from a broker.
type BrokerTransaction struct {
	BrokerTxID  string    `json:"broker_tx_id"`
	Ticker      string    `json:"ticker"`
	CompanyName string    `json:"company_name"`
	TxType      string    `json:"tx_type"` // buy | sell | dividend | split | bonus | transfer
	Quantity    float64   `json:"quantity"`
	Price       float64   `json:"price"`
	TotalValue  float64   `json:"total_value"`
	Currency    string    `json:"currency"`
	Exchange    string    `json:"exchange"`
	TxAt        time.Time `json:"tx_at"`
}

// BrokerProfile contains basic account-level info from the broker.
type BrokerProfile struct {
	ClientID    string  `json:"client_id"`
	Name        string  `json:"name"`
	Email       string  `json:"email"`
	TotalValue  float64 `json:"total_value"`
	CashBalance float64 `json:"cash_balance"`
}

// AuthRequest carries credentials for authenticating to a broker.
type AuthRequest struct {
	APIKey    string `json:"api_key,omitempty"`
	APISecret string `json:"api_secret,omitempty"`
	Token     string `json:"token,omitempty"`       // pre-generated API token
	AuthCode  string `json:"auth_code,omitempty"`   // OAuth authorization code
	ClientID  string `json:"client_id,omitempty"`   // client/user ID from broker
}

// AuthResult contains the tokens obtained after successful authentication.
type AuthResult struct {
	AccessToken  string     `json:"access_token"`
	RefreshToken string     `json:"refresh_token"`
	TokenExpiry  *time.Time `json:"token_expiry,omitempty"`
	ClientID     string     `json:"client_id"`
}

// BrokerAdapter is the interface every broker integration must implement.
// All operations are READ-ONLY. No trade execution is supported.
type BrokerAdapter interface {
	// Slug returns the unique identifier for this broker (e.g. "zerodha").
	Slug() string

	// Name returns the human-readable broker name.
	Name() string

	// Authenticate validates the provided credentials and returns auth tokens.
	Authenticate(req AuthRequest) (*AuthResult, error)

	// FetchProfile returns basic account info for the authenticated user.
	FetchProfile(accessToken string) (*BrokerProfile, error)

	// FetchHoldings retrieves the current holdings/positions.
	FetchHoldings(accessToken string) ([]BrokerHolding, error)

	// FetchTransactions retrieves historical transactions.
	FetchTransactions(accessToken string, fromDate time.Time) ([]BrokerTransaction, error)
}
