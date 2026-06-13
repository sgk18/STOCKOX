package routes

import (
	"stockox-backend/pkg/analysis"
	"stockox-backend/pkg/auth"
	"stockox-backend/pkg/dashboard/controller"
	"stockox-backend/pkg/health"
	"stockox-backend/pkg/middleware"
	"stockox-backend/pkg/websocket"
	marketController "stockox-backend/internal/market/controller"

	"github.com/gin-gonic/gin"
)

// SetupRoutes registers all route handlers with their respective middlewares
func SetupRoutes(
	r *gin.Engine,
	dbCtrl *controller.DashboardController,
	healthCtrl *health.HealthController,
	syncCtrl *auth.SyncController,
	v1Ctrl *analysis.V1Controller,
	marketCtrl *marketController.MarketController,
	wsHub *websocket.Hub,
	jwtSecret string,
	rateLimitRPS float64,
	rateLimitBurst int,
) {
	// Global Middlewares
	r.Use(middleware.RequestID())
	r.Use(middleware.CORS())
	r.Use(middleware.Logger())
	r.Use(middleware.Recovery())
	r.Use(middleware.RateLimiter(rateLimitRPS, rateLimitBurst))

	// Welcome / Root Endpoint
	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"message": "Stockox AI Investment Engine API Service is online",
		})
	})

	// Health Endpoints
	r.GET("/health", healthCtrl.Health)
	r.GET("/health/database", healthCtrl.HealthDB)
	r.GET("/health/redis", healthCtrl.HealthRedis)

	// WebSocket Endpoints (No Auth wrapper required to prevent client-side header upgrade blockages,
	// though they will be subject to global middlewares and local origin checks)
	r.GET("/api/dashboard/ws", func(c *gin.Context) {
		websocket.ServeWS(wsHub, c)
	})
	r.GET("/api/ws", func(c *gin.Context) {
		websocket.ServeWS(wsHub, c)
	})

	// Authenticated API Group
	api := r.Group("/api")
	api.Use(middleware.Auth(jwtSecret))
	{
		// Clerk Sync Callback
		api.POST("/auth/sync", syncCtrl.SyncUser)

		api.GET("/dashboard", dbCtrl.GetDashboard)
		api.GET("/dashboard/portfolio", dbCtrl.GetPortfolioSummary)
		api.GET("/dashboard/watchlist", dbCtrl.GetWatchlist)
		api.GET("/dashboard/agents", dbCtrl.GetAgentStatuses)
		api.GET("/dashboard/activity", dbCtrl.GetAgentActivity)
		api.GET("/dashboard/analyses", dbCtrl.GetRecentAnalyses)
		api.GET("/dashboard/opportunities", dbCtrl.GetOpportunities)

		// V1 Endpoints
		v1 := api.Group("/v1")
		{
			v1.GET("/stocks/search", marketCtrl.SearchStocks)
			v1.GET("/stocks/:ticker", marketCtrl.GetStockDetails)
			v1.GET("/stocks/:ticker/metrics", marketCtrl.GetMetrics)
			v1.GET("/stocks/:ticker/history", marketCtrl.GetHistory)
			v1.GET("/stocks/:ticker/news", marketCtrl.GetNews)

			v1.POST("/analysis/start", v1Ctrl.StartAnalysis)
			v1.GET("/analysis/:id", v1Ctrl.GetAnalysisDetails)
			v1.GET("/analysis/:id/agents", v1Ctrl.GetAgentMessages)
			v1.GET("/analysis/recent", v1Ctrl.GetRecentAnalyses)
			v1.GET("/watchlist", v1Ctrl.GetWatchlist)
			v1.POST("/watchlist", v1Ctrl.AddWatchlist)
			v1.DELETE("/watchlist/:ticker", v1Ctrl.RemoveWatchlist)
		}

		// Compatibility endpoints mapping directly to frontend queries
		api.GET("/watchlist", dbCtrl.GetWatchlist)
		api.GET("/market-overview", dbCtrl.GetMarketOverview)
		api.GET("/agent-feed", dbCtrl.GetAgentActivity)
	}
}
