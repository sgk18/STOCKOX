package main

import (
	"log"
	"stockox-backend/config"
	"stockox-backend/database"
)

func main() {
	log.Println("[FIX] Starting standalone email cleanup migration...")

	// 1. Load config
	cfg := config.LoadConfig()

	// 2. Connect to database
	db, err := database.InitializeDatabase(cfg)
	if err != nil {
		log.Fatalf("[FIX-ERR] Database connection failed: %v", err)
	}

	// 3. Execute cleanup query
	sql := `UPDATE users SET email = id || '@clerk.user' WHERE email NOT LIKE '%@%';`
	result := db.Exec(sql)
	if result.Error != nil {
		log.Fatalf("[FIX-ERR] Failed to execute cleanup SQL: %v", result.Error)
	}

	log.Printf("[FIX-SUCCESS] Completed email cleanup migration. Rows affected: %d", result.RowsAffected)
}
