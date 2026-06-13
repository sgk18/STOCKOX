package routes

import (
	"stockox-backend/internal/dashboard/controller"
	"stockox-backend/internal/middleware"
	"stockox-backend/internal/websocket"

	"github.com/gin-gonic/gin"
)

// SetupRoutes registers all route handlers with their respective middlewares
func SetupRoutes(
	r *gin.Engine,
	dbCtrl *controller.DashboardController,
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
		api.GET("/dashboard", dbCtrl.GetDashboard)
		api.GET("/dashboard/portfolio", dbCtrl.GetPortfolioSummary)
		api.GET("/dashboard/watchlist", dbCtrl.GetWatchlist)
		api.GET("/dashboard/agents", dbCtrl.GetAgentStatuses)
		api.GET("/dashboard/activity", dbCtrl.GetAgentActivity)
		api.GET("/dashboard/analyses", dbCtrl.GetRecentAnalyses)
		api.GET("/dashboard/opportunities", dbCtrl.GetOpportunities)
	}
}
