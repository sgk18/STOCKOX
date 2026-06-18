package routes

import (
	"stockox-backend/database/repositories"
	"stockox-backend/pkg/analysis"
	"stockox-backend/pkg/auth"
	"stockox-backend/pkg/cache"
	"stockox-backend/pkg/copilot"
	"stockox-backend/pkg/dashboard/controller"
	"stockox-backend/pkg/health"
	"stockox-backend/pkg/middleware"
	"stockox-backend/pkg/websocket"
	marketController "stockox-backend/pkg/market/controller"
	portfolioController "stockox-backend/pkg/portfolio/controller"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// SetupRoutes registers all route handlers with their respective middlewares
func SetupRoutes(
	r *gin.Engine,
	dbCtrl *controller.DashboardController,
	healthCtrl *health.HealthController,
	syncCtrl *auth.SyncController,
	profileCtrl *auth.ProfileController,
	v1Ctrl *analysis.V1Controller,
	commCtrl *analysis.CommitteeController,
	warRoomCtrl *analysis.WarRoomController,
	copilotCtrl *copilot.CopilotController,
	marketCtrl *marketController.MarketController,
	webhookCtrl *auth.WebhookController,
	portCtrl *portfolioController.PortfolioController,
	userRepo repositories.UserRepository,
	portfolioRepo repositories.PortfolioRepository,
	watchlistRepo repositories.WatchlistRepository,
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

	// Clerk Webhooks (Public route subject to Svix signature verification)
	r.POST("/api/v1/webhooks/clerk", webhookCtrl.HandleClerkWebhook)

	// Health Endpoints
	r.GET("/health", healthCtrl.Health)
	r.GET("/health/database", healthCtrl.HealthDB)
	r.GET("/health/redis", healthCtrl.HealthRedis)
	r.GET("/api/debug/dashboard", dbCtrl.GetDebugDashboard)

	// WebSocket Endpoints
	r.GET("/api/dashboard/ws", func(c *gin.Context) { websocket.ServeWS(wsHub, c) })
	r.GET("/api/ws", func(c *gin.Context) { websocket.ServeWS(wsHub, c) })
	r.GET("/ws", func(c *gin.Context) { websocket.ServeWS(wsHub, c) })

	// Authenticated API Group
	api := r.Group("/api")
	api.Use(middleware.Auth(jwtSecret, userRepo, portfolioRepo, watchlistRepo))
	api.Use(middleware.EnsureUserSynced(userRepo, portfolioRepo, watchlistRepo))
	{
		// Auth
		api.POST("/auth/sync", syncCtrl.SyncUser)

		// Profile & Onboarding routes
		api.GET("/profile", profileCtrl.GetProfile)
		api.PUT("/profile", profileCtrl.UpdateProfile)
		api.POST("/onboarding", profileCtrl.CompleteOnboarding)
		api.POST("/profile/switch-mode", profileCtrl.SwitchMode)

		// Dashboard
		api.GET("/dashboard", dbCtrl.GetDashboard)
		api.GET("/dashboard/portfolio", dbCtrl.GetPortfolioSummary)
		api.GET("/dashboard/watchlist", dbCtrl.GetWatchlist)
		api.GET("/dashboard/agents", dbCtrl.GetAgentStatuses)
		api.GET("/dashboard/activity", dbCtrl.GetAgentActivity)
		api.GET("/dashboard/analyses", dbCtrl.GetRecentAnalyses)
		api.GET("/dashboard/opportunities", dbCtrl.GetOpportunities)

		// Portfolio Management & Simulated Trading (Module 7)
		api.GET("/portfolio", portCtrl.GetPortfolioOverview)
		api.GET("/portfolio/holdings", portCtrl.GetHoldings)
		api.GET("/portfolio/history", portCtrl.GetHistory)
		api.GET("/portfolio/performance", portCtrl.GetPerformance)
		api.POST("/portfolio/buy", portCtrl.BuyStock)
		api.POST("/portfolio/sell", portCtrl.SellStock)
		api.POST("/portfolio/rebalance", portCtrl.Rebalance)

		// Custom advanced endpoints
		api.GET("/dashboard/committee", dbCtrl.GetCommitteeDecisions)
		api.GET("/dashboard/recommendations", dbCtrl.GetRecommendations)
		api.GET("/dashboard/risk", dbCtrl.GetRiskMetrics)
		api.GET("/research/:ticker", dbCtrl.GetResearchTerminal)
		api.GET("/resolve/:symbol", dbCtrl.ResolveAsset)
		api.GET("/admin/cache/stats", func(c *gin.Context) {
			c.JSON(200, cache.Shared.GetStats(c.Request.Context()))
		})

		// Search and Curated Asset Universe (Module 3.8)
		api.GET("/search", dbCtrl.SearchAssets)
		api.GET("/assets/popular", dbCtrl.GetPopularAssets)
		api.GET("/assets/india", dbCtrl.GetIndianAssets)
		api.GET("/assets/us", dbCtrl.GetUSAssets)
		api.GET("/assets/crypto", dbCtrl.GetCryptoAssets)
		api.GET("/assets/indices", dbCtrl.GetIndicesAssets)

		// V1 Endpoints
		v1 := api.Group("/v1")
		{
			v1.POST("/auth/sync-user", syncCtrl.SyncUserV1)
			v1.GET("/debug/current-user", syncCtrl.DebugCurrentUser)
			v1.GET("/research/:symbol", dbCtrl.GetResearchTerminalV1)
			v1.GET("/search", dbCtrl.SearchAssetsV1)

			v1.GET("/stocks/search", marketCtrl.SearchStocks)
			v1.GET("/stocks/:ticker", marketCtrl.GetStockDetails)
			v1.GET("/stocks/:ticker/metrics", marketCtrl.GetMetrics)
			v1.GET("/stocks/:ticker/history", marketCtrl.GetHistory)
			v1.GET("/stocks/:ticker/news", marketCtrl.GetNews)

			v1.POST("/analysis/start", v1Ctrl.StartAnalysis)
			v1.GET("/analysis/:id", v1Ctrl.GetAnalysisDetails)
			v1.GET("/analysis/:id/logs", v1Ctrl.GetAnalysisLogs)
			v1.GET("/analysis/:id/agents", v1Ctrl.GetAgentMessages)
			v1.GET("/analysis/:id/events", v1Ctrl.GetAnalysisEvents)
			v1.GET("/analysis/:id/status", v1Ctrl.GetAnalysisStatus)
			v1.GET("/analysis/:id/timeline", v1Ctrl.GetAnalysisTimeline)
			v1.GET("/analysis/recent", v1Ctrl.GetRecentAnalyses)
			v1.GET("/watchlist", v1Ctrl.GetWatchlist)
			v1.POST("/watchlist", v1Ctrl.AddWatchlist)
			v1.DELETE("/watchlist/:ticker", v1Ctrl.RemoveWatchlist)

			// Committee Room Endpoints
			v1.POST("/committee/start", commCtrl.StartRoom)
			v1.GET("/committee/recent", commCtrl.GetRecentRooms)
			v1.GET("/committee/:id", func(c *gin.Context) {
				param := c.Param("id")
				if _, err := uuid.Parse(param); err == nil {
					commCtrl.GetRoom(c)
				} else {
					c.Params = gin.Params{gin.Param{Key: "symbol", Value: param}}
					dbCtrl.GetCommitteeAnalysis(c)
				}
			})
			v1.GET("/committee/:id/messages", commCtrl.GetMessages)
			v1.POST("/committee/:id/message", commCtrl.PostMessage)
			v1.GET("/committee/:id/decision", commCtrl.GetDecision)

			// War Room Endpoints (Module 8)
			v1.GET("/war-room/session/:id", warRoomCtrl.GetWarRoomSession)
			v1.GET("/war-room/history", warRoomCtrl.GetWarRoomHistory)

			// AI Copilot Endpoints (Module 9)
			v1.GET("/copilot/health", copilotCtrl.GetHealth)
			v1.GET("/copilot/audit", copilotCtrl.GetAudit)
			v1.GET("/copilot/sectors", copilotCtrl.GetSectors)
			v1.GET("/copilot/positions", copilotCtrl.GetPositions)
			v1.GET("/copilot/alerts", copilotCtrl.GetAlerts)
			v1.GET("/copilot/brief", copilotCtrl.GetBrief)
			v1.POST("/copilot/rebalance", copilotCtrl.PostRebalance)
			v1.POST("/copilot/simulate", copilotCtrl.PostSimulate)
		}

		// Compatibility endpoints mapping directly to frontend queries
		api.GET("/watchlist", dbCtrl.GetWatchlist)
		api.GET("/market-overview", dbCtrl.GetMarketOverview)
		api.GET("/agent-feed", dbCtrl.GetAgentActivity)
	}
}
