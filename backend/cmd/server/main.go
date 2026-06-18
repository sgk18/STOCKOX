package main

import (
	"context"
	"log"
	"os"
	"time"

	"stockox-backend/config"
	"stockox-backend/database"
	"stockox-backend/database/models"
	"stockox-backend/database/repositories"
	"stockox-backend/internal/marketdata"
	marketdataProviders "stockox-backend/internal/marketdata/providers"
	"stockox-backend/pkg/cache"
	"stockox-backend/pkg/analysis"
	"stockox-backend/pkg/auth"
	"stockox-backend/pkg/copilot"
	"stockox-backend/pkg/dashboard/controller"
	"stockox-backend/pkg/dashboard/service"
	"stockox-backend/pkg/health"
	"stockox-backend/pkg/routes"
	"stockox-backend/pkg/eventbus"
	"stockox-backend/pkg/websocket"
	"stockox-backend/pkg/workers"
	marketController "stockox-backend/pkg/market/controller"
	marketProviders "stockox-backend/pkg/market/providers"
	marketService "stockox-backend/pkg/market/service"
	portfolioBroker "stockox-backend/pkg/portfolio/broker"
	portfolioController "stockox-backend/pkg/portfolio/controller"
	portfolioService "stockox-backend/pkg/portfolio/service"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

func main() {
	log.Println("[SERVER] Bootstrapping Stockox Service Environment")

	// 1. Load Configurations
	cfg := config.LoadConfig()

	// 2. Initialize Database (Performs SQL migrations, auto-migrations, and mock seeding)
	db, err := database.InitializeDatabase(cfg)
	if err != nil {
		log.Fatalf("[DB-ERR] Database connection/migration failed: %v", err)
	}

	// 3. Initialize Redis/Valkey Cache Layer with Safe Fallback
	var rdb *redis.Client
	var cacheClient cache.Cache
	cacheClient = cache.NewNoopCache()

	if cfg.Redis.Host != "" && cfg.Redis.Port != "" {
		redisAddr := cfg.Redis.Host + ":" + cfg.Redis.Port
		rdb = redis.NewClient(&redis.Options{
			Addr:     redisAddr,
			Password: cfg.Redis.Password,
			DB:       0,
		})

		// Ping Redis with a timeout to verify connectivity
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		if err := rdb.Ping(ctx).Err(); err != nil {
			log.Printf("[REDIS-WARN] Redis is unreachable at %s (%v). Proceeding without cache layer (direct DB reads).", redisAddr, err)
			rdb = nil
		} else {
			log.Printf("[REDIS-INFO] Redis cache connection established at %s", redisAddr)
			cacheClient = cache.NewValkeyCacheWithClient(rdb)
		}
	}

	cache.Shared = cacheClient

	// Preload search index into Valkey cache
	if rdb != nil {
		var list []models.StockMetadata
		if err := db.Find(&list).Error; err == nil {
			if errIndex := cacheClient.SetJSON(context.Background(), "search_index", list, 0); errIndex == nil {
				log.Printf("[VALKEY-INFO] Loaded %d stock metadata entries into Valkey search_index", len(list))
			} else {
				log.Printf("[VALKEY-WARN] Failed to write search_index into Valkey: %v", errIndex)
			}
		} else {
			log.Printf("[VALKEY-WARN] Failed to load stock_metadata from DB for search_index: %v", err)
		}
	}

	// Initialize global EventBus
	eventbus.GetBus().Init(rdb)

	// 4. Initialize Domain Repositories
	userRepo := repositories.NewUserRepository(db)
	_ = userRepo
	portfolioRepo := repositories.NewPortfolioRepository(db)
	watchlistRepo := repositories.NewWatchlistRepository(db)
	marketRepo := repositories.NewMarketRepository(db)
	agentRepo := repositories.NewAgentRepository(db)
	analysisRepo := repositories.NewAnalysisRepository(db)
	recommendationRepo := repositories.NewRecommendationRepository(db)
	_ = recommendationRepo
	roomRepo := repositories.NewAgentRoomRepository(db)

	// 5. Services (MarketService first to allow injection into DashboardService)
	providerFactory := marketProviders.NewProviderFactory(cfg)
	marketSrv := marketService.NewMarketService(providerFactory, cacheClient, db)

	dashboardSrv := service.NewDashboardService(
		db,
		portfolioRepo,
		watchlistRepo,
		marketRepo,
		agentRepo,
		analysisRepo,
		cacheClient,
		marketSrv,
	)

	// Start Background Workers for Market Data & Portfolio Snapshots
	workersCoordinator := workers.NewWorkersCoordinator(db, marketSrv)
	workersCoordinator.Start()

	// 7. Setup WebSockets Hub and Simulator
	wsHub := websocket.NewHub()
	go wsHub.Run()
	wsHub.StartSimulator()
	log.Println("[WS-INFO] WebSocket Hub initialized and Simulator running in background")

	// 6. Initialize Controllers
	dashboardCtrl := controller.NewDashboardController(dashboardSrv)
	healthCtrl := health.NewHealthController(db, rdb)
	syncCtrl := auth.NewSyncController(userRepo, portfolioRepo, watchlistRepo)
	profileCtrl := auth.NewProfileController(db, userRepo, portfolioRepo, watchlistRepo)
	v1Ctrl := analysis.NewV1Controller(db, analysisRepo, watchlistRepo, agentRepo, wsHub)
	commCtrl := analysis.NewCommitteeController(db, roomRepo, wsHub)
	warRoomCtrl := analysis.NewWarRoomController(db)
	webhookCtrl := auth.NewWebhookController(userRepo, portfolioRepo, watchlistRepo, cfg.Clerk.WebhookSecret)
	marketCtrl := marketController.NewMarketController(marketSrv)

	// Phase 4 & Module 7 dependency replication
	finnhubAPIKey := os.Getenv("FINNHUB_API_KEY")
	twelveDataAPIKey := os.Getenv("TWELVEDATA_API_KEY")
	mdCache := marketdata.NewMarketDataCache(cacheClient)
	finnhubWrapper := marketdataProviders.NewFinnhubWrapper(finnhubAPIKey)
	twelveDataProvider := marketdataProviders.NewTwelveDataProvider(twelveDataAPIKey)
	yahooProvider := marketdataProviders.NewYahooProvider()
	aggregator := marketdata.NewMarketDataAggregator(db, mdCache, finnhubWrapper, twelveDataProvider, yahooProvider)
	mdSrv := marketdata.NewMarketDataService(db, aggregator)

	portSrv := portfolioService.NewPortfolioService(db)
	portBroker := portfolioBroker.NewDemoBroker(db, mdSrv)
	portCtrl := portfolioController.NewPortfolioController(db, portfolioRepo, portBroker, portSrv, cacheClient)
	copilotCtrl := copilot.NewCopilotController(db, portfolioRepo, cacheClient)

	// 8. Create Gin Engine (gin.New is used because custom recovery/logger middlewares are registered in SetupRoutes)
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()

	// 9. Register Middlewares & Endpoints
	routes.SetupRoutes(
		r,
		dashboardCtrl,
		healthCtrl,
		syncCtrl,
		profileCtrl,
		v1Ctrl,
		commCtrl,
		warRoomCtrl,
		copilotCtrl,
		marketCtrl,
		webhookCtrl,
		portCtrl,
		userRepo,
		portfolioRepo,
		watchlistRepo,
		wsHub,
		cfg.JWT.Secret,
		10.0, // rate limiter RPS
		20,   // rate limiter burst
	)

	// 10. Start Server
	log.Printf("[SERVER] Stockox service successfully running on port %s", cfg.Server.Port)
	if err := r.Run(":" + cfg.Server.Port); err != nil {
		log.Fatalf("[SERVER-ERR] Server failed to start: %v", err)
	}
}
