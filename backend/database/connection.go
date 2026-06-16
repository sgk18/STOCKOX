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

	// Run schema migrations for user synchronization
	log.Println("[DB] Running schema updates for Clerk user synchronization...")
	migrationSQLs := []string{
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id VARCHAR(255) UNIQUE;`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
	}
	for _, sql := range migrationSQLs {
		if err := db.Exec(sql).Error; err != nil {
			log.Printf("[DB-WARN] Failed to run migration SQL '%s': %v", sql, err)
		}
	}
	log.Println("[DB] Schema updates executed")

	return db, nil
}

// InitDB initializes PostgreSQL connection pool using configuration properties
// Deprecated: Use InitializeDatabase instead.
func InitDB(cfg *config.Config) (*gorm.DB, error) {
	return InitializeDatabase(cfg)
}
