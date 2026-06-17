package handler

import (
	"net/http"
	"stockox-backend/config"
	"stockox-backend/database"
	"stockox-backend/database/repositories"
	"stockox-backend/pkg/analysis"
	"stockox-backend/pkg/auth"
	"stockox-backend/pkg/dashboard/controller"
	"stockox-backend/pkg/dashboard/service"
	"stockox-backend/pkg/health"
	"stockox-backend/pkg/cache"
	"stockox-backend/pkg/routes"
	"stockox-backend/pkg/websocket"
	marketController "stockox-backend/pkg/market/controller"
	marketProviders "stockox-backend/pkg/market/providers"
	marketService "stockox-backend/pkg/market/service"

	"stockox-backend/pkg/eventbus"

	"github.com/gin-gonic/gin"
)

var ginEngine *gin.Engine
var initError error

func init() {
	// 1. Load config
	cfg := config.LoadConfig()

	// 2. Init DB connection
	db, err := database.InitializeDatabase(cfg)
	if err != nil {
		initError = err
		return
	}

	// Initialize global EventBus (Redis is disabled in serverless)
	eventbus.GetBus().Init(nil)

	// 3. Init Repositories
	userRepo := repositories.NewUserRepository(db)
	portfolioRepo := repositories.NewPortfolioRepository(db)
	watchlistRepo := repositories.NewWatchlistRepository(db)
	marketRepo := repositories.NewMarketRepository(db)
	agentRepo := repositories.NewAgentRepository(db)
	analysisRepo := repositories.NewAnalysisRepository(db)
	roomRepo := repositories.NewAgentRoomRepository(db)

	// 4. Init Services (MarketService first to allow injection into DashboardService)
	providerFactory := marketProviders.NewProviderFactory(cfg)
	noopCache := cache.NewNoopCache()
	marketSrv := marketService.NewMarketService(providerFactory, noopCache)

	dashboardSrv := service.NewDashboardService(
		db,
		portfolioRepo,
		watchlistRepo,
		marketRepo,
		agentRepo,
		analysisRepo,
		noopCache, // Redis cache is disabled for serverless execution simplicity
		marketSrv,
	)

	// 5. Init Controllers
	dashboardCtrl := controller.NewDashboardController(dashboardSrv)
	healthCtrl := health.NewHealthController(db, nil)
	syncCtrl := auth.NewSyncController(userRepo, portfolioRepo, watchlistRepo)
	profileCtrl := auth.NewProfileController(db, userRepo, portfolioRepo, watchlistRepo)
	webhookCtrl := auth.NewWebhookController(userRepo, portfolioRepo, watchlistRepo, cfg.Clerk.WebhookSecret)

	// 6. Init WebSocket Hub
	wsHub := websocket.NewHub()
	v1Ctrl := analysis.NewV1Controller(db, analysisRepo, watchlistRepo, agentRepo, wsHub)
	commCtrl := analysis.NewCommitteeController(db, roomRepo, wsHub)
	marketCtrl := marketController.NewMarketController(marketSrv)

	// 7. Setup Gin Engine
	gin.SetMode(gin.ReleaseMode)
	ginEngine = gin.New()

	// 8. Register Routes
	routes.SetupRoutes(
		ginEngine,
		dashboardCtrl,
		healthCtrl,
		syncCtrl,
		profileCtrl,
		v1Ctrl,
		commCtrl,
		marketCtrl,
		webhookCtrl,
		userRepo,
		portfolioRepo,
		watchlistRepo,
		wsHub,
		cfg.JWT.Secret,
		100.0, // RPS limit
		200,   // Burst limit
	)
}

// Handler is the Vercel serverless entrypoint function
func Handler(w http.ResponseWriter, r *http.Request) {
	if initError != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error": "Serverless Init Database Error: ` + initError.Error() + `"}`))
		return
	}
	ginEngine.ServeHTTP(w, r)
}
