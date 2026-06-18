package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BrokerAccount stores a user's connected brokerage account.
// Stockox only reads data — never places trades.
type BrokerAccount struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID       string         `gorm:"type:varchar(255);index;not null" json:"user_id"`
	User         User           `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
	BrokerSlug   string         `gorm:"type:varchar(50);not null" json:"broker_slug"` // zerodha | groww | angelone | upstox | robinhood | ibkr | fidelity | schwab
	BrokerName   string         `gorm:"type:varchar(100);not null" json:"broker_name"`
	AccountType  string         `gorm:"type:varchar(50);not null;default:'personal'" json:"account_type"` // personal | long_term | trading | retirement | family
	AccountLabel string         `gorm:"type:varchar(100)" json:"account_label"`                            // user-defined label
	AuthType     string         `gorm:"type:varchar(20);not null;default:'api_token'" json:"auth_type"`   // oauth | api_token
	AccessToken  string         `gorm:"type:text" json:"-"`                                                // AES-256 encrypted
	RefreshToken string         `gorm:"type:text" json:"-"`                                                // AES-256 encrypted
	TokenExpiry  *time.Time     `gorm:"index" json:"token_expiry,omitempty"`
	ClientID     string         `gorm:"type:varchar(255)" json:"client_id,omitempty"` // broker user/client id
	Status       string         `gorm:"type:varchar(20);not null;default:'connected'" json:"status"`      // connected | syncing | disconnected | error
	ErrorMessage string         `gorm:"type:text" json:"error_message,omitempty"`
	LastSyncAt   *time.Time     `gorm:"index" json:"last_sync_at,omitempty"`
	CreatedAt    time.Time      `gorm:"not null" json:"created_at"`
	UpdatedAt    time.Time      `gorm:"not null" json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (b *BrokerAccount) BeforeCreate(tx *gorm.DB) (err error) {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return
}

// BrokerSync records a sync run for a connected broker account.
type BrokerSync struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	BrokerAccountID uuid.UUID  `gorm:"type:uuid;index;not null" json:"broker_account_id"`
	BrokerAccount   BrokerAccount `gorm:"foreignKey:BrokerAccountID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
	Status          string     `gorm:"type:varchar(20);not null;default:'pending'" json:"status"` // pending | running | completed | failed
	TriggerType     string     `gorm:"type:varchar(20);not null;default:'manual'" json:"trigger_type"` // manual | auto
	HoldingsFetched int        `gorm:"default:0" json:"holdings_fetched"`
	NewPositions    int        `gorm:"default:0" json:"new_positions"`
	ClosedPositions int        `gorm:"default:0" json:"closed_positions"`
	ChangedQty      int        `gorm:"default:0" json:"changed_qty"`
	ErrorMessage    string     `gorm:"type:text" json:"error_message,omitempty"`
	StartedAt       time.Time  `gorm:"not null" json:"started_at"`
	CompletedAt     *time.Time `json:"completed_at,omitempty"`
}

func (s *BrokerSync) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return
}

// BrokerTransaction stores imported transactions from a broker.
type BrokerTransaction struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	BrokerAccountID uuid.UUID  `gorm:"type:uuid;index;not null" json:"broker_account_id"`
	BrokerAccount   BrokerAccount `gorm:"foreignKey:BrokerAccountID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
	BrokerTxID      string     `gorm:"type:varchar(255);uniqueIndex" json:"broker_tx_id"` // Broker's own transaction ID
	Ticker          string     `gorm:"type:varchar(20);index;not null" json:"ticker"`
	CompanyName     string     `gorm:"type:varchar(255)" json:"company_name"`
	TxType          string     `gorm:"type:varchar(30);not null" json:"tx_type"` // buy | sell | dividend | split | bonus | transfer
	Quantity        float64    `gorm:"type:decimal(18,4);not null;default:0" json:"quantity"`
	Price           float64    `gorm:"type:decimal(18,4);not null;default:0" json:"price"`
	TotalValue      float64    `gorm:"type:decimal(18,4);not null;default:0" json:"total_value"`
	Currency        string     `gorm:"type:varchar(10);default:'INR'" json:"currency"`
	Exchange        string     `gorm:"type:varchar(20)" json:"exchange"`
	TxAt            time.Time  `gorm:"index;not null" json:"tx_at"`
	CreatedAt       time.Time  `gorm:"not null" json:"created_at"`
}

func (t *BrokerTransaction) BeforeCreate(tx *gorm.DB) (err error) {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return
}

// PortfolioImport stores a holdings snapshot imported from a broker.
type PortfolioImport struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	BrokerAccountID uuid.UUID  `gorm:"type:uuid;index;not null" json:"broker_account_id"`
	BrokerAccount   BrokerAccount `gorm:"foreignKey:BrokerAccountID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
	BrokerSyncID    uuid.UUID  `gorm:"type:uuid;index;not null" json:"broker_sync_id"`
	Ticker          string     `gorm:"type:varchar(20);index;not null" json:"ticker"`
	CompanyName     string     `gorm:"type:varchar(255)" json:"company_name"`
	Quantity        float64    `gorm:"type:decimal(18,4);not null;default:0" json:"quantity"`
	AveragePrice    float64    `gorm:"type:decimal(18,4);not null;default:0" json:"average_price"`
	CurrentPrice    float64    `gorm:"type:decimal(18,4);not null;default:0" json:"current_price"`
	CurrentValue    float64    `gorm:"type:decimal(18,4);not null;default:0" json:"current_value"`
	PnL             float64    `gorm:"type:decimal(18,4);not null;default:0" json:"pnl"`
	PnLPercent      float64    `gorm:"type:decimal(8,4);not null;default:0" json:"pnl_percent"`
	Sector          string     `gorm:"type:varchar(100)" json:"sector"`
	Exchange        string     `gorm:"type:varchar(20)" json:"exchange"`
	AssetType       string     `gorm:"type:varchar(30);default:'equity'" json:"asset_type"` // equity | etf | mf | bond | crypto
	Currency        string     `gorm:"type:varchar(10);default:'INR'" json:"currency"`
	IsActive        bool       `gorm:"default:true" json:"is_active"` // false = position closed
	CreatedAt       time.Time  `gorm:"not null" json:"created_at"`
	UpdatedAt       time.Time  `gorm:"not null" json:"updated_at"`
}

func (p *PortfolioImport) BeforeCreate(tx *gorm.DB) (err error) {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return
}

// SyncLog records granular change events during a broker sync.
type SyncLog struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	BrokerSyncID uuid.UUID `gorm:"type:uuid;index;not null" json:"broker_sync_id"`
	BrokerSync   BrokerSync `gorm:"foreignKey:BrokerSyncID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
	ChangeType   string    `gorm:"type:varchar(30);not null" json:"change_type"` // new_position | closed_position | qty_change | price_change
	Ticker       string    `gorm:"type:varchar(20);index" json:"ticker"`
	OldValue     string    `gorm:"type:text" json:"old_value,omitempty"`
	NewValue     string    `gorm:"type:text" json:"new_value,omitempty"`
	CreatedAt    time.Time `gorm:"not null" json:"created_at"`
}

func (s *SyncLog) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return
}

// AccountPermission stores the API scopes/permissions granted for a broker account.
type AccountPermission struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	BrokerAccountID uuid.UUID `gorm:"type:uuid;index;not null" json:"broker_account_id"`
	BrokerAccount   BrokerAccount `gorm:"foreignKey:BrokerAccountID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
	Permission      string    `gorm:"type:varchar(100);not null" json:"permission"` // e.g. read:holdings, read:transactions
	Granted         bool      `gorm:"default:false" json:"granted"`
	GrantedAt       *time.Time `json:"granted_at,omitempty"`
	CreatedAt       time.Time `gorm:"not null" json:"created_at"`
}

func (a *AccountPermission) BeforeCreate(tx *gorm.DB) (err error) {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return
}
