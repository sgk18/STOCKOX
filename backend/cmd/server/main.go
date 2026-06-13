package main

import (
	"context"
	"log"
	"time"

	"stockox-backend/internal/agents"
	"stockox-backend/internal/analysis"
	"stockox-backend/internal/config"
	"stockox-backend/internal/dashboard/controller"
	"stockox-backend/internal/dashboard/service"
	"stockox-backend/internal/database"
	"stockox-backend/internal/market"
	"stockox-backend/internal/portfolio"
	"stockox-backend/internal/routes"
	"stockox-backend/internal/watchlist"
	"stockox-backend/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

func main() {
	log.Println("[SERVER] Bootstrapping Stockox Dashboard Backend Service")

	// 1. Load Configurations
	cfg := config.LoadConfig()

	// 2. Initialize Database
	db := database.InitDB(cfg)

	// 3. Initialize Redis Cache Layer with Safe Fallback
	var rdb *redis.Client
	if cfg.RedisAddr != "" {
		rdb = redis.NewClient(&redis.Options{
			Addr:     cfg.RedisAddr,
			Password: cfg.RedisPass,
			DB:       cfg.RedisDB,
		})

		// Ping Redis with a timeout to verify connectivity
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		if err := rdb.Ping(ctx).Err(); err != nil {
			log.Printf("[REDIS-WARN] Redis is unreachable at %s (%v). Proceeding without cache layer (direct DB reads).", cfg.RedisAddr, err)
			rdb = nil
		} else {
			log.Printf("[REDIS-INFO] Redis cache connection established at %s", cfg.RedisAddr)
		}
	}

	// 4. Initialize Domain Repositories
	portfolioRepo := portfolio.NewPortfolioRepository(db)
	watchlistRepo := watchlist.NewWatchlistRepository(db)
	marketRepo := market.NewMarketRepository(db)
	agentRepo := agents.NewAgentRepository(db)
	analysisRepo := analysis.NewAnalysisRepository(db)

	// 5. Initialize Services
	dashboardSrv := service.NewDashboardService(
		portfolioRepo,
		watchlistRepo,
		marketRepo,
		agentRepo,
		analysisRepo,
		rdb,
	)

	// 6. Initialize Controllers
	dashboardCtrl := controller.NewDashboardController(dashboardSrv)

	// 7. Setup WebSockets Hub and Simulator
	wsHub := websocket.NewHub()
	go wsHub.Run()
	wsHub.StartSimulator()
	log.Println("[WS-INFO] WebSocket Hub initialized and Simulator running in background")

	// 8. Create Gin Engine (gin.New is used because custom recovery/logger middlewares are registered in SetupRoutes)
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()

	// 9. Register Middlewares & Endpoints
	routes.SetupRoutes(
		r,
		dashboardCtrl,
		wsHub,
		cfg.JWTSecret,
		cfg.RateLimitRPS,
		cfg.RateBurst,
	)

	// 10. Start Server
	log.Printf("[SERVER] Stockox service successfully running on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("[SERVER-ERR] Server failed to start: %v", err)
	}
}
