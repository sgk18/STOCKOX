package handler

import (
	"net/http"
	"stockox-backend/config"
	"stockox-backend/database"
	"stockox-backend/database/repositories"
	"stockox-backend/pkg/auth"
	"stockox-backend/pkg/dashboard/controller"
	"stockox-backend/pkg/dashboard/service"
	"stockox-backend/pkg/health"
	"stockox-backend/pkg/routes"
	"stockox-backend/pkg/websocket"

	"github.com/gin-gonic/gin"
)

var ginEngine *gin.Engine

func init() {
	// 1. Load config
	cfg := config.LoadConfig()

	// 2. Init DB connection
	db := database.InitDB(cfg)

	// 3. Init Repositories
	userRepo := repositories.NewUserRepository(db)
	portfolioRepo := repositories.NewPortfolioRepository(db)
	watchlistRepo := repositories.NewWatchlistRepository(db)
	marketRepo := repositories.NewMarketRepository(db)
	agentRepo := repositories.NewAgentRepository(db)
	analysisRepo := repositories.NewAnalysisRepository(db)

	// 4. Init Services
	dashboardSrv := service.NewDashboardService(
		portfolioRepo,
		watchlistRepo,
		marketRepo,
		agentRepo,
		analysisRepo,
		nil, // Redis cache is disabled for serverless execution simplicity
	)

	// 5. Init Controllers
	dashboardCtrl := controller.NewDashboardController(dashboardSrv)
	healthCtrl := health.NewHealthController(db, nil)
	syncCtrl := auth.NewSyncController(userRepo, portfolioRepo, watchlistRepo)

	// 6. Init WebSocket Hub
	wsHub := websocket.NewHub()

	// 7. Setup Gin Engine
	gin.SetMode(gin.ReleaseMode)
	ginEngine = gin.New()

	// 8. Register Routes
	routes.SetupRoutes(
		ginEngine,
		dashboardCtrl,
		healthCtrl,
		syncCtrl,
		wsHub,
		cfg.JWT.Secret,
		100.0, // RPS limit
		200,   // Burst limit
	)
}

// Handler is the Vercel serverless entrypoint function
func Handler(w http.ResponseWriter, r *http.Request) {
	ginEngine.ServeHTTP(w, r)
}
