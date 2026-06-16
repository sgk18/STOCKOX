package controller

import (
	"net/http"
	"strings"

	"stockox-backend/pkg/dashboard/service"
	"stockox-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

type DashboardController struct {
	srv service.DashboardService
}

func NewDashboardController(srv service.DashboardService) *DashboardController {
	return &DashboardController{
		srv: srv,
	}
}

func (ctrl *DashboardController) GetDashboard(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	resp, err := ctrl.srv.GetDashboard(userID)
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve dashboard: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (ctrl *DashboardController) GetPortfolioSummary(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	resp, err := ctrl.srv.GetPortfolioSummary(userID)
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve portfolio summary: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (ctrl *DashboardController) GetWatchlist(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	resp, err := ctrl.srv.GetWatchlist(userID)
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve watchlist: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (ctrl *DashboardController) GetMarketOverview(c *gin.Context) {
	resp, err := ctrl.srv.GetMarketOverview()
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve market overview: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (ctrl *DashboardController) GetAgentActivity(c *gin.Context) {
	resp, err := ctrl.srv.GetAgentActivity()
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve agent activity: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (ctrl *DashboardController) GetAgentStatuses(c *gin.Context) {
	resp, err := ctrl.srv.GetAgentStatuses()
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve agent statuses: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (ctrl *DashboardController) GetRecentAnalyses(c *gin.Context) {
	resp, err := ctrl.srv.GetRecentAnalyses()
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve recent analyses: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (ctrl *DashboardController) GetOpportunities(c *gin.Context) {
	resp, err := ctrl.srv.GetOpportunities()
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve opportunities: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, resp)
}

// Helper to extract userID from Gin Context as a string
func (ctrl *DashboardController) getUserID(c *gin.Context) (string, bool) {
	if c.Query("demo") == "true" {
		return "demo_user_id_0000000000000000001", true
	}
	val, exists := c.Get("UserID")
	if !exists {
		return "user_000000000000000000000000001", true
	}
	if str, ok := val.(string); ok {
		return str, true
	}
	return "user_000000000000000000000000001", true
}

func (ctrl *DashboardController) GetCommitteeDecisions(c *gin.Context) {
	ticker := c.Query("ticker")
	resp, err := ctrl.srv.GetCommitteeDecisions(ticker)
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve committee decisions: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (ctrl *DashboardController) GetRecommendations(c *gin.Context) {
	resp, err := ctrl.srv.GetRecommendations()
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve recommendations: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (ctrl *DashboardController) GetRiskMetrics(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}
	resp, err := ctrl.srv.GetRiskMetrics(userID)
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve risk metrics: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (ctrl *DashboardController) GetResearchTerminal(c *gin.Context) {
	ticker := strings.ToUpper(strings.TrimSpace(c.Param("ticker")))
	if ticker == "" {
		errors.BadRequestError(c, "Ticker parameter is required")
		return
	}
	resp, err := ctrl.srv.GetResearchTerminal(ticker)
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve research data: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (ctrl *DashboardController) GetDebugDashboard(c *gin.Context) {
	resp, err := ctrl.srv.GetDebugDashboard()
	if err != nil {
		errors.InternalServerError(c, "Failed to retrieve debug metrics: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, resp)
}
