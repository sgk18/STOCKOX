package migrations

import (
	"log"
	"os"
	"strings"
	"time"

	"stockox-backend/database/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RunMigrations performs schema migrations and seeds initial database entries
func RunMigrations(db *gorm.DB, dropTables bool) error {
	if os.Getenv("SKIP_MIGRATIONS") == "true" {
		log.Println("[MIGRATOR] Skipping database migrations in this environment (SKIP_MIGRATIONS=true)")
		return nil
	}

	if dropTables {
		log.Println("[MIGRATOR] Dropping existing tables to apply schema migrations...")
		
		// Drop tables first to ensure VARCHAR types are applied clean
		_ = db.Migrator().DropTable(
			&models.User{},
			&models.Portfolio{},
			&models.PortfolioHolding{},
			&models.Watchlist{},
			&models.AnalysisSession{},
			&models.AgentMessage{},
			&models.Agent{},
			&models.Recommendation{},
			&models.MarketSnapshot{},
		)
	}

	log.Println("[MIGRATOR] Running schema migrations...")
	
	// Perform AutoMigrate
	err := db.AutoMigrate(
		&models.User{},
		&models.Portfolio{},
		&models.PortfolioHolding{},
		&models.Watchlist{},
		&models.AnalysisSession{},
		&models.AgentMessage{},
		&models.Agent{},
		&models.Recommendation{},
		&models.MarketSnapshot{},
	)
	if err != nil {
		log.Printf("[MIGRATOR-WARNING] AutoMigrate encountered an error: %v", err)
		if strings.Contains(err.Error(), "already exists") {
			log.Println("[MIGRATOR] Table already exists. Proceeding to seeding...")
		} else {
			return err
		}
	}

	log.Println("[MIGRATOR] Schema migrations completed. Starting data seeding...")
	SeedData(db)
	return nil
}

func SeedData(db *gorm.DB) {
	var count int64

	// 1. Seed Default User & Portfolio (Use static ID to simplify local testing)
	defaultUserID := "user_000000000000000000000000001"
	db.Model(&models.User{}).Where("id = ?", defaultUserID).Count(&count)
	if count == 0 {
		user := models.User{
			ID:        defaultUserID,
			Email:     "suryachalam.vm@bsccmh.christuniversity.in",
			Name:      "Surya",
			AvatarURL: "https://avatar.vercel.sh/surya",
			Role:      "Lead Investment Advisor",
		}
		if err := db.Create(&user).Error; err == nil {
			portfolio := models.Portfolio{
				ID:                 uuid.New(),
				UserID:             user.ID,
				TotalValue:         125400.00,
				CashBalance:        12000.00,
				DailyChange:        5062.00,
				DailyChangePercent: 4.21,
			}
			db.Create(&portfolio)

			// Seed initial holdings
			holdings := []models.PortfolioHolding{
				{
					ID:           uuid.New(),
					PortfolioID:  portfolio.ID,
					Ticker:       "NVDA",
					CompanyName:  "NVIDIA Corp.",
					Quantity:     50,
					AveragePrice: 150.00,
					CurrentPrice: 187.20,
				},
				{
					ID:           uuid.New(),
					PortfolioID:  portfolio.ID,
					Ticker:       "AAPL",
					CompanyName:  "Apple Inc.",
					Quantity:     40,
					AveragePrice: 170.00,
					CurrentPrice: 178.45,
				},
			}
			db.Create(&holdings)
		}
	}

	// 2. Seed Market Snapshots
	db.Model(&models.MarketSnapshot{}).Count(&count)
	if count == 0 {
		snapshots := []models.MarketSnapshot{
			{ID: uuid.New(), Symbol: "SP500", Price: 5431.60, Change: 45.80, ChangePercent: 0.85, UpdatedAt: time.Now()},
			{ID: uuid.New(), Symbol: "NASDAQ", Price: 16920.45, Change: 236.12, ChangePercent: 1.42, UpdatedAt: time.Now()},
			{ID: uuid.New(), Symbol: "NIFTY50", Price: 23501.10, Change: 128.50, ChangePercent: 0.55, UpdatedAt: time.Now()},
			{ID: uuid.New(), Symbol: "GOLD", Price: 2320.15, Change: -7.45, ChangePercent: -0.32, UpdatedAt: time.Now()},
			{ID: uuid.New(), Symbol: "BTC", Price: 67450.00, Change: 2490.00, ChangePercent: 3.84, UpdatedAt: time.Now()},
		}
		db.Create(&snapshots)
	}

	// 3. Seed Default Agents
	db.Model(&models.Agent{}).Count(&count)
	if count == 0 {
		agents := []models.Agent{
			{ID: uuid.New(), Name: "Research Agent", Status: "researching"},
			{ID: uuid.New(), Name: "News Agent", Status: "analyzing"},
			{ID: uuid.New(), Name: "Fundamental Agent", Status: "idle"},
			{ID: uuid.New(), Name: "Technical Agent", Status: "thinking"},
			{ID: uuid.New(), Name: "Risk Agent", Status: "researching"},
			{ID: uuid.New(), Name: "Committee Agent", Status: "idle"},
		}
		db.Create(&agents)
	}

	log.Println("[MIGRATOR] Database seeding tasks finished")
}
