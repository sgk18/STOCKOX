package database

import (
	"fmt"
	"log"
	"time"

	"stockox-backend/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// InitializeDatabase connects to the database, configures the connection pool, and verifies connectivity and table presence.
func InitializeDatabase(cfg *config.Config) (*gorm.DB, error) {
	dsn := cfg.GetDSN()
	log.Printf("[DB] Connecting to database host: %s, name: %s", cfg.Database.Host, cfg.Database.Name)

	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true,
	}), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("database connection failed: %w", err)
	}

	log.Println("[DB] Connected successfully")

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql db: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// Ping the database
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("[DB] Ping failed: %w", err)
	}
	log.Println("[DB] Ping successful")

	// Verify required tables exist without attempting creation
	requiredTables := []string{
		"users",
		"portfolios",
		"portfolio_holdings",
		"watchlists",
		"analysis_sessions",
		"agents",
		"agent_messages",
		"recommendations",
		"market_snapshots",
	}

	missingTables := false
	migrator := db.Migrator()
	for _, table := range requiredTables {
		if !migrator.HasTable(table) {
			log.Printf("[WARN] Missing table: %s", table)
			missingTables = true
		}
	}

	if missingTables {
		log.Println("[WARN] Missing tables detected")
	} else {
		log.Println("[DB] All required tables found")
	}

	return db, nil
}

// InitDB initializes PostgreSQL connection pool using configuration properties
// Deprecated: Use InitializeDatabase instead.
func InitDB(cfg *config.Config) (*gorm.DB, error) {
	return InitializeDatabase(cfg)
}
