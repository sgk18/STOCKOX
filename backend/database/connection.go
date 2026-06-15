package database

import (
	"fmt"
	"log"
	"time"

	"stockox-backend/config"
	"stockox-backend/database/migrations"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// InitDB initializes PostgreSQL connection pool using configuration properties
func InitDB(cfg *config.Config) (*gorm.DB, error) {
	dsn := cfg.GetDSN()
	log.Printf("[DB] Connecting to database host: %s, name: %s", cfg.Database.Host, cfg.Database.Name)

	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true,
	}), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("database connection failed: %w", err)
	}

	sqlDB, err := db.DB()
	if err == nil {
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(100)
		sqlDB.SetConnMaxLifetime(time.Hour)
	}

	// Run Schema Auto-Migrations and Seeding
	if err := migrations.RunMigrations(db, cfg.Database.DropOnStartup); err != nil {
		return nil, fmt.Errorf("database migrations failed: %w", err)
	}

	return db, nil
}
