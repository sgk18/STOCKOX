package main

import (
	"context"
	"log"
	"time"

	"stockox-backend/config"
	"stockox-backend/database"
	"stockox-backend/database/repositories"
	"stockox-backend/internal/auth"
	"stockox-backend/internal/dashboard/controller"
	"stockox-backend/internal/dashboard/service"
	"stockox-backend/internal/health"
	"stockox-backend/internal/routes"
	"stockox-backend/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

func main() {
	log.Println("[SERVER] Bootstrapping Stockox Service Environment")

	// 1. Load Configurations
	cfg := config.LoadConfig()

	// 2. Initialize Database (Performs auto-migrations and mock seeding)
	db := database.InitDB(cfg)

	// 3. Initialize Redis Cache Layer with Safe Fallback
	var rdb *redis.Client
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
		}
	}

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
	healthCtrl := health.NewHealthController(db, rdb)
	syncCtrl := auth.NewSyncController(userRepo, portfolioRepo, watchlistRepo)

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
		healthCtrl,
		syncCtrl,
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
