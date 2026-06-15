package migrations

import (
	"embed"
	"fmt"
	"log"
	"sort"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"
)

// Global state tracking migration status
var (
	migrationsCompleted bool
	migMu                sync.RWMutex
)

// SetMigrationsCompleted sets the completed status of migrations
func SetMigrationsCompleted(val bool) {
	migMu.Lock()
	defer migMu.Unlock()
	migrationsCompleted = val
}

// AreMigrationsCompleted returns whether migrations have completed successfully
func AreMigrationsCompleted() bool {
	migMu.RLock()
	defer migMu.RUnlock()
	return migrationsCompleted
}

//go:embed versions/*.sql
var migrationFS embed.FS

// RunSQLMigrations runs all SQL-based migrations in versions/ directory
func RunSQLMigrations(db *gorm.DB) error {
	log.Println("[Migration] Starting database migration process...")

	// 1. Create schema_migrations table if not exists
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS schema_migrations (
		id SERIAL PRIMARY KEY,
		migration_name VARCHAR(255) UNIQUE NOT NULL,
		executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);`
	if err := db.Exec(createTableSQL).Error; err != nil {
		log.Printf("[Migration] Failed to ensure schema_migrations table: %v", err)
		return fmt.Errorf("failed to create schema_migrations table: %w", err)
	}

	// 2. Read embedded migrations files
	entries, err := migrationFS.ReadDir("versions")
	if err != nil {
		log.Printf("[Migration] Failed to read embedded migrations: %v", err)
		return fmt.Errorf("failed to read embedded migrations: %w", err)
	}

	var files []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			files = append(files, entry.Name())
		}
	}

	// 3. Sort migrations by name (001, 002, etc.)
	sort.Strings(files)

	// 4. Run migrations in sequence
	for _, file := range files {
		var count int64
		checkSQL := `SELECT COUNT(1) FROM schema_migrations WHERE migration_name = ?`
		if err := db.Raw(checkSQL, file).Scan(&count).Error; err != nil {
			log.Printf("[Migration] Failed to check migration status for %s: %v", file, err)
			return fmt.Errorf("failed to check migration status for %s: %w", file, err)
		}

		if count > 0 {
			log.Printf("[Migration] %s already exists, skipping", file)
			continue
		}

		log.Printf("[Migration] Running migration: %s", file)
		content, err := migrationFS.ReadFile("versions/" + file)
		if err != nil {
			log.Printf("[Migration] Failed to read migration content of %s: %v", file, err)
			return fmt.Errorf("failed to read migration content of %s: %w", file, err)
		}

		sqlQuery := string(content)

		// Execute migration in a transaction
		err = db.Transaction(func(tx *gorm.DB) error {
			// Run raw SQL migration content
			if err := tx.Exec(sqlQuery).Error; err != nil {
				return fmt.Errorf("execution failed: %w", err)
			}

			// Record migration in schema_migrations
			recordSQL := `INSERT INTO schema_migrations (migration_name, executed_at) VALUES (?, ?)`
			if err := tx.Exec(recordSQL, file, time.Now()).Error; err != nil {
				return fmt.Errorf("recording migration failed: %w", err)
			}

			return nil
		})

		if err != nil {
			log.Printf("[Migration] Failed execution of %s: %v", file, err)
			return fmt.Errorf("migration %s failed: %w", file, err)
		}

		log.Printf("[Migration] Completed: %s", file)
	}

	log.Println("[Migration] All SQL database migrations run successfully")
	return nil
}
