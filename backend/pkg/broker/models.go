package broker

import (
	"time"

	"github.com/google/uuid"
	brokerAdapters "stockox-backend/pkg/broker/adapters"
)

// ─── Request DTOs ─────────────────────────────────────────────────────────────

// ConnectBrokerRequest is the payload for POST /api/v1/brokers/connect
type ConnectBrokerRequest struct {
	BrokerSlug   string `json:"broker_slug" binding:"required"`
	AccountType  string `json:"account_type"`  // personal | long_term | trading | retirement | family
	AccountLabel string `json:"account_label"` // user-defined label
	AuthType     string `json:"auth_type"`     // oauth | api_token

	// OAuth fields
	AuthCode  string `json:"auth_code"`  // OAuth authorization code (from redirect)
	APIKey    string `json:"api_key"`    // OAuth: app API key
	APISecret string `json:"api_secret"` // OAuth: app secret / checksum
	ClientID  string `json:"client_id"`  // OAuth: client/user ID

	// API Token fields
	Token string `json:"token"` // Pre-generated access token
}

// ImportPayloadRequest is the payload for POST /api/v1/brokers/import
type ImportPayloadRequest struct {
	AccountID string `json:"account_id" binding:"required"`
	Holdings  string `json:"holdings"` // JSON array of BrokerHolding
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

// BrokerAccountResponse is the API response for a connected broker account.
type BrokerAccountResponse struct {
	ID           uuid.UUID `json:"id"`
	BrokerSlug   string    `json:"broker_slug"`
	BrokerName   string    `json:"broker_name"`
	AccountType  string    `json:"account_type"`
	AccountLabel string    `json:"account_label,omitempty"`
	AuthType     string    `json:"auth_type"`
	ClientID     string    `json:"client_id,omitempty"`
	Status       string    `json:"status"`
	TokenExpiry  string    `json:"token_expiry,omitempty"`
	LastSyncAt   string    `json:"last_sync_at,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// HoldingResponse represents a single holding in the API response.
type HoldingResponse struct {
	Ticker       string  `json:"ticker"`
	CompanyName  string  `json:"company_name"`
	Quantity     float64 `json:"quantity"`
	AveragePrice float64 `json:"average_price"`
	CurrentPrice float64 `json:"current_price"`
	CurrentValue float64 `json:"current_value"`
	PnL          float64 `json:"pnl"`
	PnLPercent   float64 `json:"pnl_percent"`
	Sector       string  `json:"sector"`
	Exchange     string  `json:"exchange"`
	AssetType    string  `json:"asset_type"`
	Currency     string  `json:"currency"`
}

// TransactionResponse is a single transaction in the API response.
type TransactionResponse struct {
	ID          uuid.UUID `json:"id"`
	BrokerTxID  string    `json:"broker_tx_id,omitempty"`
	Ticker      string    `json:"ticker"`
	CompanyName string    `json:"company_name"`
	TxType      string    `json:"tx_type"`
	Quantity    float64   `json:"quantity"`
	Price       float64   `json:"price"`
	TotalValue  float64   `json:"total_value"`
	Currency    string    `json:"currency"`
	Exchange    string    `json:"exchange"`
	TxAt        time.Time `json:"tx_at"`
}

// TransactionPage wraps paginated transaction results.
type TransactionPage struct {
	Total int64                 `json:"total"`
	Items []TransactionResponse `json:"items"`
}

// SyncStatusResponse is the status of a sync operation.
type SyncStatusResponse struct {
	AccountID       uuid.UUID  `json:"account_id"`
	SyncID          uuid.UUID  `json:"sync_id,omitempty"`
	Status          string     `json:"status"`
	SyncStatus      string     `json:"sync_status,omitempty"`
	HoldingsFetched int        `json:"holdings_fetched"`
	NewPositions    int        `json:"new_positions"`
	ClosedPositions int        `json:"closed_positions,omitempty"`
	LastSyncAt      *time.Time `json:"last_sync_at,omitempty"`
}

// AccountHealthResponse contains computed portfolio health metrics.
type AccountHealthResponse struct {
	AccountID     uuid.UUID  `json:"account_id"`
	BrokerName    string     `json:"broker_name"`
	TotalValue    float64    `json:"total_value"`
	TotalPnL      float64    `json:"total_pnl"`
	TotalPnLPct   float64    `json:"total_pnl_pct"`
	DailyPnL      float64    `json:"daily_pnl"`
	DailyPnLPct   float64    `json:"daily_pnl_pct"`
	MonthlyPnL    float64    `json:"monthly_pnl"`
	AnnualPnL     float64    `json:"annual_pnl"`
	OpenPositions int        `json:"open_positions"`
	LastSyncAt    *time.Time `json:"last_sync_at,omitempty"`
}

// BrokerInsightResponse is a single AI-style insight about the portfolio.
type BrokerInsightResponse struct {
	Type     string `json:"type"`
	Severity string `json:"severity"` // info | warning | critical
	Title    string `json:"title"`
	Message  string `json:"message"`
}

// SecurityInfoResponse contains security and permissions info for an account.
type SecurityInfoResponse struct {
	AccountID   uuid.UUID           `json:"account_id"`
	BrokerName  string              `json:"broker_name"`
	AuthType    string              `json:"auth_type"`
	TokenExpiry *time.Time          `json:"token_expiry,omitempty"`
	LastSyncAt  *time.Time          `json:"last_sync_at,omitempty"`
	Permissions []PermissionResponse `json:"permissions"`
	SyncHistory []SyncHistoryItem   `json:"sync_history"`
}

// PermissionResponse represents a single API permission for a broker account.
type PermissionResponse struct {
	Permission string     `json:"permission"`
	Granted    bool       `json:"granted"`
	GrantedAt  *time.Time `json:"granted_at,omitempty"`
}

// SyncHistoryItem is a summary of one sync run.
type SyncHistoryItem struct {
	ID          uuid.UUID  `json:"id"`
	Status      string     `json:"status"`
	TriggerType string     `json:"trigger_type"`
	StartedAt   time.Time  `json:"started_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

// BrokersListResponse wraps the catalog response.
type BrokersListResponse struct {
	Phase1 []brokerAdapters.BrokerInfo `json:"phase1"`
	Phase2 []brokerAdapters.BrokerInfo `json:"phase2"`
}
