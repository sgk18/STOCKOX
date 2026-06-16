package database

import (
	"fmt"
	"log"
	"time"

	"stockox-backend/config"
	"stockox-backend/database/models"

	"github.com/google/uuid"
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

	// Run GORM AutoMigrate for new and upgraded tables
	log.Println("[DB] Running GORM AutoMigrate...")
	if err := db.AutoMigrate(
		&models.StockMetadata{},
		&models.PortfolioSnapshot{},
		&models.CommitteeDecision{},
		&models.Recommendation{},
	); err != nil {
		log.Printf("[DB-WARN] GORM AutoMigrate failed: %v", err)
	} else {
		log.Println("[DB] GORM AutoMigrate completed successfully")
	}

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
		"stock_metadata",
		"portfolio_snapshots",
		"committee_decisions",
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

	// Clean up any incorrectly stored emails (emails that do not contain '@')
	log.Println("[DB] Running cleanup for malformed emails...")
	cleanupSQL := `UPDATE users SET email = id || '@clerk.user' WHERE email NOT LIKE '%@%';`
	if err := db.Exec(cleanupSQL).Error; err != nil {
		log.Printf("[DB-WARN] Failed to execute email cleanup: %v", err)
	} else {
		log.Println("[DB] Malformed emails cleaned up")
	}

	// Seed Demo User, Portfolio, Holdings, and Historical Snapshots
	if err := SeedDemoData(db); err != nil {
		log.Printf("[DB-WARN] Failed to seed demo data: %v", err)
	}

	return db, nil
}

func SeedDemoData(db *gorm.DB) error {
	log.Println("[DB-SEED] Verifying demo user and portfolio data...")

	// 1. Seed Demo User
	demoUser := models.User{
		ID:        "demo_user_id_0000000000000000001",
		ClerkID:   "demo_user_id_0000000000000000001",
		Email:     "demo@stockox.ai",
		Name:      "Demo Advisor Profile",
		AvatarURL: "https://avatar.vercel.sh/demo",
		Role:      "Lead Investment Advisor",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := db.FirstOrCreate(&demoUser, "email = ?", "demo@stockox.ai").Error; err != nil {
		return err
	}

	// 2. Seed Demo Portfolio
	portfolioID := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	demoPortfolio := models.Portfolio{
		ID:                 portfolioID,
		UserID:             demoUser.ID,
		TotalValue:         125400.00,
		CashBalance:        12000.00,
		DailyChange:        5062.00,
		DailyChangePercent: 4.21,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}
	if err := db.FirstOrCreate(&demoPortfolio, "id = ?", portfolioID).Error; err != nil {
		return err
	}

	// 3. Seed Demo Portfolio Holdings
	demoHoldings := []models.PortfolioHolding{
		{
			ID:           uuid.New(),
			PortfolioID:  portfolioID,
			Ticker:       "NVDA",
			CompanyName:  "NVIDIA Corp.",
			Quantity:     120,
			AveragePrice: 150.00,
			CurrentPrice: 187.20,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ID:           uuid.New(),
			PortfolioID:  portfolioID,
			Ticker:       "AAPL",
			CompanyName:  "Apple Inc.",
			Quantity:     150,
			AveragePrice: 170.00,
			CurrentPrice: 178.45,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ID:           uuid.New(),
			PortfolioID:  portfolioID,
			Ticker:       "MSFT",
			CompanyName:  "Microsoft Corp.",
			Quantity:     80,
			AveragePrice: 400.00,
			CurrentPrice: 415.50,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ID:           uuid.New(),
			PortfolioID:  portfolioID,
			Ticker:       "TSLA",
			CompanyName:  "Tesla Inc.",
			Quantity:     70,
			AveragePrice: 220.00,
			CurrentPrice: 210.80,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ID:           uuid.New(),
			PortfolioID:  portfolioID,
			Ticker:       "AMD",
			CompanyName:  "Advanced Micro Devices",
			Quantity:     60,
			AveragePrice: 160.00,
			CurrentPrice: 162.30,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
	}

	for _, h := range demoHoldings {
		var count int64
		db.Model(&models.PortfolioHolding{}).Where("portfolio_id = ? AND ticker = ?", portfolioID, h.Ticker).Count(&count)
		if count == 0 {
			if err := db.Create(&h).Error; err != nil {
				log.Printf("[DB-SEED-ERR] Failed to seed demo holding %s: %v", h.Ticker, err)
			}
		}
	}

	// 4. Seed Demo Portfolio Snapshots for 30 days history to draw charts
	var snapshotCount int64
	db.Model(&models.PortfolioSnapshot{}).Where("portfolio_id = ?", portfolioID).Count(&snapshotCount)
	if snapshotCount == 0 {
		log.Println("[DB-SEED] Seeding historical portfolio snapshots for Demo mode...")
		baseTime := time.Now().AddDate(0, 0, -30)
		for i := 0; i < 30; i++ {
			offsetVal := float64(i) * 520.0
			simTotalValue := 110000.0 + offsetVal
			snap := models.PortfolioSnapshot{
				ID:                 uuid.New(),
				PortfolioID:        portfolioID,
				TotalValue:         simTotalValue,
				CashBalance:        12000.00,
				DailyChange:        520.0,
				DailyChangePercent: 0.45,
				RecordedAt:         baseTime.AddDate(0, 0, i),
			}
			db.Create(&snap)
		}
	}

	// 5. Seed Committee Decisions
	demoDecisions := []models.CommitteeDecision{
		{
			ID:                uuid.New(),
			Ticker:            "NVDA",
			ResearchVote:      "BUY",
			TechnicalVote:     "BUY",
			NewsVote:          "HOLD",
			RiskVote:          "BUY",
			CommitteeDecision: "BUY",
			ConfidenceScore:   87,
			Reasoning:         "NVIDIA shows robust data center growth and strong pricing power in the graphics card space. Despite elevated PEG ratios, GPU training allocation demand warrants a strong buy rating.",
			CreatedAt:         time.Now(),
		},
		{
			ID:                uuid.New(),
			Ticker:            "AAPL",
			ResearchVote:      "BUY",
			TechnicalVote:     "HOLD",
			NewsVote:          "HOLD",
			RiskVote:          "HOLD",
			CommitteeDecision: "BUY",
			ConfidenceScore:   82,
			Reasoning:         "Apple maintains massive consumer services sticky revenue and robust margins. However, relative stagnation in hardware upgrades suggests keeping exposure moderate.",
			CreatedAt:         time.Now(),
		},
		{
			ID:                uuid.New(),
			Ticker:            "MSFT",
			ResearchVote:      "BUY",
			TechnicalVote:     "BUY",
			NewsVote:          "BUY",
			RiskVote:          "HOLD",
			CommitteeDecision: "BUY",
			ConfidenceScore:   88,
			Reasoning:         "Microsoft's Azure cloud integration with OpenAI solutions provides high software license scalability margins. Free cash flow ratios remain stable.",
			CreatedAt:         time.Now(),
		},
		{
			ID:                uuid.New(),
			Ticker:            "TSLA",
			ResearchVote:      "HOLD",
			TechnicalVote:     "HOLD",
			NewsVote:          "SELL",
			RiskVote:          "SELL",
			CommitteeDecision: "HOLD",
			ConfidenceScore:   64,
			Reasoning:         "Tesla is facing short-term delivery demand resistance and compression on EV gross margin levels. Autonomous driving progress holds target potential, but high beta poses volatility risk.",
			CreatedAt:         time.Now(),
		},
		{
			ID:                uuid.New(),
			Ticker:            "AMD",
			ResearchVote:      "HOLD",
			TechnicalVote:     "BUY",
			NewsVote:          "HOLD",
			RiskVote:          "HOLD",
			CommitteeDecision: "HOLD",
			ConfidenceScore:   71,
			Reasoning:         "AMD is positioned to capture AI compute market share with their MI300 chips. High valuation PE ratio remains a watch bound constraint.",
			CreatedAt:         time.Now(),
		},
	}

	for _, d := range demoDecisions {
		var count int64
		db.Model(&models.CommitteeDecision{}).Where("ticker = ?", d.Ticker).Count(&count)
		if count == 0 {
			db.Create(&d)
		}
	}

	return nil
}

// InitDB initializes PostgreSQL connection pool using configuration properties
// Deprecated: Use InitializeDatabase instead.
func InitDB(cfg *config.Config) (*gorm.DB, error) {
	return InitializeDatabase(cfg)
}
