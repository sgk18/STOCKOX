package main

import (
	"log"
	"stockox-backend/config"
	"stockox-backend/database"
	"stockox-backend/database/models"
)

func main() {
	log.Println("[DIAG] Loading config...")
	cfg := config.LoadConfig()

	log.Println("[DIAG] Connecting to database...")
	db, err := database.InitializeDatabase(cfg)
	if err != nil {
		log.Fatalf("[DIAG-ERR] Database connection failed: %v", err)
	}

	log.Println("[DIAG] Checking tables...")

	// 1. Users count
	var userCount int64
	db.Model(&models.User{}).Count(&userCount)
	log.Printf("[DIAG] Users count: %d", userCount)

	var users []models.User
	db.Limit(5).Find(&users)
	for _, u := range users {
		log.Printf("User: ID=%s, ClerkID=%s, Email=%s, Name=%s", u.ID, u.ClerkID, u.Email, u.Name)
	}

	// 2. Portfolios count
	var portfolioCount int64
	db.Model(&models.Portfolio{}).Count(&portfolioCount)
	log.Printf("[DIAG] Portfolios count: %d", portfolioCount)

	var portfolios []models.Portfolio
	db.Limit(5).Find(&portfolios)
	for _, p := range portfolios {
		log.Printf("Portfolio: ID=%s, UserID=%s, TotalValue=%.2f, CashBalance=%.2f", p.ID, p.UserID, p.TotalValue, p.CashBalance)
	}

	// 3. Portfolio holdings count
	var holdingCount int64
	db.Model(&models.PortfolioHolding{}).Count(&holdingCount)
	log.Printf("[DIAG] Portfolio Holdings count: %d", holdingCount)

	var holdings []models.PortfolioHolding
	db.Limit(5).Find(&holdings)
	for _, h := range holdings {
		log.Printf("Holding: PortfolioID=%s, Ticker=%s, CompanyName=%s, Quantity=%.2f, AveragePrice=%.2f", h.PortfolioID, h.Ticker, h.CompanyName, h.Quantity, h.AveragePrice)
	}

	// 4. Watchlists count
	var watchlistCount int64
	db.Model(&models.Watchlist{}).Count(&watchlistCount)
	log.Printf("[DIAG] Watchlist items count: %d", watchlistCount)

	var watchlists []models.Watchlist
	db.Limit(5).Find(&watchlists)
	for _, w := range watchlists {
		log.Printf("Watchlist: UserID=%s, Ticker=%s, CompanyName=%s", w.UserID, w.Ticker, w.CompanyName)
	}

	// 5. Market Snapshots count
	var snapshotCount int64
	db.Model(&models.MarketSnapshot{}).Count(&snapshotCount)
	log.Printf("[DIAG] Market Snapshots count: %d", snapshotCount)

	var snapshots []models.MarketSnapshot
	db.Find(&snapshots)
	for _, s := range snapshots {
		log.Printf("Snapshot: Symbol=%s, Price=%.2f, Change=%.2f, ChangePercent=%.2f", s.Symbol, s.Price, s.Change, s.ChangePercent)
	}

	// 6. Committee Decisions count
	var decisionCount int64
	db.Model(&models.CommitteeDecision{}).Count(&decisionCount)
	log.Printf("[DIAG] Committee Decisions count: %d", decisionCount)

	var decisions []models.CommitteeDecision
	db.Limit(5).Find(&decisions)
	for _, d := range decisions {
		log.Printf("Decision: Ticker=%s, Decision=%s, Confidence=%d", d.Ticker, d.CommitteeDecision, d.ConfidenceScore)
	}
}
