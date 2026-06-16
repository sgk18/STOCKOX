package models

import "time"

type StockMetadata struct {
	Symbol      string    `gorm:"type:varchar(10);primaryKey"`
	CompanyName string    `gorm:"type:varchar(255);not null"`
	Sector      string    `gorm:"type:varchar(255)"`
	Industry    string    `gorm:"type:varchar(255)"`
	MarketCap   int64     `gorm:"type:bigint"`
	Exchange    string    `gorm:"type:varchar(255)"`
	Country     string    `gorm:"type:varchar(255)"`
	LogoURL     string    `gorm:"type:varchar(255)"`
	Description string    `gorm:"type:text"`
	UpdatedAt   time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
}
