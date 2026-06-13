package database

import (
	"log"
	"time"

	"stockox-backend/config"
	"stockox-backend/database/migrations"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// InitDB initializes PostgreSQL connection pool using configuration properties
func InitDB(cfg *config.Config) *gorm.DB {
	dsn := cfg.GetDSN()
	log.Printf("[DB] Connecting to database host: %s, name: %s", cfg.Database.Host, cfg.Database.Name)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("[DB-ERR] Database connection failed: %v", err)
	}

	sqlDB, err := db.DB()
	if err == nil {
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(100)
		sqlDB.SetConnMaxLifetime(time.Hour)
	}

	// Run Schema Auto-Migrations and Seeding
	if err := migrations.RunMigrations(db); err != nil {
		log.Fatalf("[DB-ERR] Database migrations failed: %v", err)
	}

	return db
}
