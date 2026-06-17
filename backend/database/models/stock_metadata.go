package models

import "time"

type StockMetadata struct {
	ID          string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Symbol      string    `gorm:"type:varchar(20);uniqueIndex;not null" json:"symbol"`
	CompanyName string    `gorm:"type:varchar(255);not null" json:"company_name"`
	Exchange    string    `gorm:"type:varchar(255)" json:"exchange"`
	Country     string    `gorm:"type:varchar(255)" json:"country"`
	AssetType   string    `gorm:"type:varchar(100)" json:"asset_type"` // equity, etf, crypto, index
	Sector      string    `gorm:"type:varchar(255)" json:"sector"`
	Industry    string    `gorm:"type:varchar(255)" json:"industry"`
	Currency    string    `gorm:"type:varchar(50)" json:"currency"`
	MarketCap   int64     `gorm:"type:bigint" json:"market_cap"`
	LogoURL     string    `gorm:"type:varchar(255)" json:"logo_url"`
	Description    string    `gorm:"type:text" json:"description"`
	IsActive       bool      `gorm:"type:boolean;default:true" json:"is_active"`
	Website        string    `gorm:"type:varchar(255)" json:"website"`
	ProviderSymbol string    `gorm:"type:varchar(50)" json:"provider_symbol"`
	CreatedAt      time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt      time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
}
