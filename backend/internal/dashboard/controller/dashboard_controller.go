package controller

import (
	"net/http"
	"stockox-backend/internal/dashboard/service"
	"stockox-backend/internal/errors"

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

// Helper to extract userID from Gin Context
func (ctrl *DashboardController) getUserID(c *gin.Context) (uint, bool) {
	val, exists := c.Get("UserID")
	if !exists {
		errors.UnauthorizedError(c, "User session not found")
		return 0, false
	}
	userID, ok := val.(uint)
	if !ok {
		errors.UnauthorizedError(c, "Invalid user session context type")
		return 0, false
	}
	return userID, true
}
