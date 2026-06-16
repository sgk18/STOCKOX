package workers

import (
	"log"
	"time"

	"stockox-backend/database/models"
	marketService "stockox-backend/pkg/market/service"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// WorkersCoordinator manages the lifecycle of the background workers
type WorkersCoordinator struct {
	db        *gorm.DB
	marketSrv *marketService.MarketService
	stopChan  chan struct{}
}

func NewWorkersCoordinator(db *gorm.DB, marketSrv *marketService.MarketService) *WorkersCoordinator {
	return &WorkersCoordinator{
		db:        db,
		marketSrv: marketSrv,
		stopChan:  make(chan struct{}),
	}
}

// Start initiates the background tickers
func (wc *WorkersCoordinator) Start() {
	log.Println("[WORKERS] Initializing background workers...")

	// 1. Market Snapshot Worker (60s tick)
	go wc.runMarketSnapshotWorker()

	// 2. Portfolio Snapshot Worker (5m tick)
	go wc.runPortfolioSnapshotWorker()
}

// Stop halts all worker activities
func (wc *WorkersCoordinator) Stop() {
	close(wc.stopChan)
}

func (wc *WorkersCoordinator) runMarketSnapshotWorker() {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	// Run immediately on startup
	wc.collectMarketSnapshots()

	for {
		select {
		case <-wc.stopChan:
			log.Println("[WORKERS] Stopping MarketSnapshotWorker")
			return
		case <-ticker.C:
			wc.collectMarketSnapshots()
		}
	}
}

func (wc *WorkersCoordinator) runPortfolioSnapshotWorker() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	// Run immediately on startup (wait 5s to let market snapshots populate)
	time.Sleep(5 * time.Second)
	wc.collectPortfolioSnapshots()

	for {
		select {
		case <-wc.stopChan:
			log.Println("[WORKERS] Stopping PortfolioSnapshotWorker")
			return
		case <-ticker.C:
			wc.collectPortfolioSnapshots()
		}
	}
}

func (wc *WorkersCoordinator) collectMarketSnapshots() {
	log.Println("[WORKERS] MarketSnapshotWorker: Fetching live quotes...")

	// Tick mappings: db_symbol -> finnhub_ticker
	symbols := map[string]string{
		"NVDA":   "NVDA",
		"AAPL":   "AAPL",
		"MSFT":   "MSFT",
		"TSLA":   "TSLA",
		"AMD":    "AMD",
		"SP500":  "SPY",
		"NASDAQ": "QQQ",
		"GOLD":   "GLD",
		"BTC":    "BINANCE:BTCUSDT",
		"OIL":    "USO",
	}

	for dbSymbol, apiTicker := range symbols {
		quote, err := wc.marketSrv.GetQuote(apiTicker)
		if err != nil {
			log.Printf("[WORKERS-WARN] Failed to get quote for %s (%s): %v", dbSymbol, apiTicker, err)
			continue
		}

		// Save/Upsert in market_snapshots
		err = wc.db.Exec(`
			INSERT INTO market_snapshots (id, symbol, price, change, change_percent, updated_at)
			VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT (symbol) DO UPDATE SET
				price = EXCLUDED.price,
				change = EXCLUDED.change,
				change_percent = EXCLUDED.change_percent,
				updated_at = EXCLUDED.updated_at
		`, uuid.New(), dbSymbol, quote.CurrentPrice, quote.DailyChange, quote.DailyChangePercent, time.Now()).Error

		if err != nil {
			log.Printf("[WORKERS-ERR] Failed to save snapshot for %s: %v", dbSymbol, err)
		}

		// If it's a stock holding symbol, ensure we populate stock_metadata
		if dbSymbol == "NVDA" || dbSymbol == "AAPL" || dbSymbol == "MSFT" || dbSymbol == "TSLA" || dbSymbol == "AMD" {
			var count int64
			wc.db.Model(&models.StockMetadata{}).Where("symbol = ?", dbSymbol).Count(&count)
			if count == 0 {
				log.Printf("[WORKERS] StockMetadata missing for %s. Querying profile info...", dbSymbol)
				profile, err := wc.marketSrv.GetCompanyProfile(dbSymbol)
				if err == nil && profile != nil {
					sector := getSectorByTicker(dbSymbol)
					meta := models.StockMetadata{
						Symbol:      dbSymbol,
						CompanyName: profile.Name,
						Sector:      sector,
						Industry:    profile.Industry,
						MarketCap:   profile.MarketCap,
						Exchange:    profile.Exchange,
						Country:     profile.Country,
						LogoURL:     profile.Logo,
						Description: profile.Description,
						UpdatedAt:   time.Now(),
					}
					if errSave := wc.db.Create(&meta).Error; errSave != nil {
						log.Printf("[WORKERS-ERR] Failed to save metadata for %s: %v", dbSymbol, errSave)
					}
				}
			}
		}
	}
	log.Println("[WORKERS] MarketSnapshotWorker: Completed collection cycle")
}

func (wc *WorkersCoordinator) collectPortfolioSnapshots() {
	log.Println("[WORKERS] PortfolioSnapshotWorker: Calculating values and compiling snapshots...")

	var portfolios []models.Portfolio
	if err := wc.db.Find(&portfolios).Error; err != nil {
		log.Printf("[WORKERS-ERR] Failed to query portfolios: %v", err)
		return
	}

	for _, p := range portfolios {
		var holdings []models.PortfolioHolding
		if err := wc.db.Find(&holdings, "portfolio_id = ?", p.ID).Error; err != nil {
			log.Printf("[WORKERS-ERR] Failed to load holdings for portfolio %s: %v", p.ID, err)
			continue
		}

		totalValue := p.CashBalance
		dailyChangeAmount := 0.0

		for _, h := range holdings {
			var snap models.MarketSnapshot
			err := wc.db.First(&snap, "symbol = ?", h.Ticker).Error
			price := h.AveragePrice
			dailyChange := 0.0
			if err == nil {
				price = snap.Price
				dailyChange = snap.Change
			} else {
				// Fallback to provider quote
				quote, errQuote := wc.marketSrv.GetQuote(h.Ticker)
				if errQuote == nil && quote != nil {
					price = quote.CurrentPrice
					dailyChange = quote.DailyChange
				}
			}

			// Update the holding current price cache
			wc.db.Model(&h).Update("current_price", price)

			totalValue += h.Quantity * price
			dailyChangeAmount += h.Quantity * dailyChange
		}

		dailyChangePercent := 0.0
		if totalValue > 0 {
			dailyChangePercent = (dailyChangeAmount / totalValue) * 100
		}

		// Update portfolio aggregate totals
		wc.db.Model(&p).Updates(map[string]interface{}{
			"total_value":          totalValue,
			"daily_change":         dailyChangeAmount,
			"daily_change_percent": dailyChangePercent,
			"updated_at":           time.Now(),
		})

		// Log new PortfolioSnapshot record
		snapshot := models.PortfolioSnapshot{
			ID:                 uuid.New(),
			PortfolioID:        p.ID,
			TotalValue:         totalValue,
			CashBalance:        p.CashBalance,
			DailyChange:        dailyChangeAmount,
			DailyChangePercent: dailyChangePercent,
			RecordedAt:         time.Now(),
		}
		if err := wc.db.Create(&snapshot).Error; err != nil {
			log.Printf("[WORKERS-ERR] Failed to save portfolio snapshot: %v", err)
		}
	}
	log.Println("[WORKERS] PortfolioSnapshotWorker: Completed calculation cycle")
}

func getSectorByTicker(ticker string) string {
	switch ticker {
	case "NVDA":
		return "Tech / AI Infrastructure"
	case "MSFT":
		return "Tech / AI Infrastructure"
	case "AAPL":
		return "Consumer Electronics"
	case "TSLA":
		return "Automotive / EV"
	case "AMD":
		return "Semiconductors"
	default:
		return "Technology"
	}
}
