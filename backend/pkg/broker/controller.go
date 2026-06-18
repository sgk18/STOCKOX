package broker

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	brokerAdapters "stockox-backend/pkg/broker/adapters"
)

// BrokerController handles all /api/v1/brokers/* HTTP endpoints.
// All operations are read-only from the broker's perspective.
type BrokerController struct {
	service *BrokerService
}

// NewBrokerController constructs a BrokerController.
func NewBrokerController(service *BrokerService) *BrokerController {
	return &BrokerController{service: service}
}

// extractUserID reads the user ID from the Gin context (set by auth middleware).
func extractUserID(c *gin.Context) string {
	if uid, ok := c.Get("user_id"); ok {
		return uid.(string)
	}
	return ""
}

func badRequest(c *gin.Context, msg string) {
	c.JSON(http.StatusBadRequest, gin.H{"error": msg})
}

func internalError(c *gin.Context, msg string) {
	c.JSON(http.StatusInternalServerError, gin.H{"error": msg})
}

func notFound(c *gin.Context, msg string) {
	c.JSON(http.StatusNotFound, gin.H{"error": msg})
}

// ─── GET /api/v1/brokers ──────────────────────────────────────────────────────

// ListBrokers returns the catalog of all supported brokers.
func (ctrl *BrokerController) ListBrokers(c *gin.Context) {
	all := ctrl.service.ListBrokers()
	phase1 := []brokerAdapters.BrokerInfo{}
	phase2 := []brokerAdapters.BrokerInfo{}
	for _, b := range all {
		if b.Phase == 1 {
			phase1 = append(phase1, b)
		} else {
			phase2 = append(phase2, b)
		}
	}
	c.JSON(http.StatusOK, BrokersListResponse{Phase1: phase1, Phase2: phase2})
}

// ─── GET /api/v1/brokers/accounts ─────────────────────────────────────────────

// GetAccounts lists all connected broker accounts for the authenticated user.
func (ctrl *BrokerController) GetAccounts(c *gin.Context) {
	userID := extractUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	accounts, err := ctrl.service.ListAccounts(userID)
	if err != nil {
		internalError(c, "Failed to fetch accounts: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{"accounts": accounts, "count": len(accounts)})
}

// ─── POST /api/v1/brokers/connect ─────────────────────────────────────────────

// ConnectBroker authenticates and links a new broker account.
func (ctrl *BrokerController) ConnectBroker(c *gin.Context) {
	userID := extractUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req ConnectBrokerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "Invalid request: "+err.Error())
		return
	}

	account, err := ctrl.service.ConnectBroker(userID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"account": account, "message": "Broker connected successfully"})
}

// ─── POST /api/v1/brokers/accounts/:id/disconnect ─────────────────────────────

// DisconnectBroker removes a connected broker account.
func (ctrl *BrokerController) DisconnectBroker(c *gin.Context) {
	userID := extractUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	accountID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		badRequest(c, "Invalid account ID")
		return
	}

	if err := ctrl.service.DisconnectBroker(userID, accountID); err != nil {
		internalError(c, "Failed to disconnect: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Broker disconnected successfully"})
}

// ─── POST /api/v1/brokers/accounts/:id/sync ───────────────────────────────────

// SyncBroker triggers a manual sync for the given account.
func (ctrl *BrokerController) SyncBroker(c *gin.Context) {
	userID := extractUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	accountID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		badRequest(c, "Invalid account ID")
		return
	}

	result, err := ctrl.service.SyncBroker(userID, accountID, "manual")
	if err != nil {
		internalError(c, "Sync failed: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, result)
}

// ─── GET /api/v1/brokers/accounts/:id/status ──────────────────────────────────

// GetStatus returns the current sync status for an account.
func (ctrl *BrokerController) GetStatus(c *gin.Context) {
	userID := extractUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	accountID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		badRequest(c, "Invalid account ID")
		return
	}

	status, err := ctrl.service.GetAccountStatus(userID, accountID)
	if err != nil {
		notFound(c, "Account not found")
		return
	}
	c.JSON(http.StatusOK, status)
}

// ─── GET /api/v1/brokers/accounts/:id/holdings ────────────────────────────────

// GetHoldings returns the latest holdings for a broker account.
func (ctrl *BrokerController) GetHoldings(c *gin.Context) {
	userID := extractUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	accountID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		badRequest(c, "Invalid account ID")
		return
	}

	holdings, err := ctrl.service.GetHoldings(userID, accountID)
	if err != nil {
		internalError(c, "Failed to fetch holdings: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{"holdings": holdings, "count": len(holdings)})
}

// ─── GET /api/v1/brokers/accounts/:id/transactions ────────────────────────────

// GetTransactions returns paginated transactions for a broker account.
func (ctrl *BrokerController) GetTransactions(c *gin.Context) {
	userID := extractUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	accountID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		badRequest(c, "Invalid account ID")
		return
	}

	limit := 50
	offset := 0
	if l := c.Query("limit"); l != "" {
		if lv, err := strconv.Atoi(l); err == nil && lv > 0 && lv <= 200 {
			limit = lv
		}
	}
	if o := c.Query("offset"); o != "" {
		if ov, err := strconv.Atoi(o); err == nil && ov >= 0 {
			offset = ov
		}
	}

	page, err := ctrl.service.GetTransactions(userID, accountID, limit, offset)
	if err != nil {
		internalError(c, "Failed to fetch transactions: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, page)
}

// ─── GET /api/v1/brokers/accounts/:id/health ──────────────────────────────────

// GetAccountHealth returns portfolio health metrics for an account.
func (ctrl *BrokerController) GetAccountHealth(c *gin.Context) {
	userID := extractUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	accountID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		badRequest(c, "Invalid account ID")
		return
	}

	health, err := ctrl.service.GetAccountHealth(userID, accountID)
	if err != nil {
		internalError(c, "Failed to compute health: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, health)
}

// ─── GET /api/v1/brokers/accounts/:id/insights ────────────────────────────────

// GetBrokerInsights returns AI-generated portfolio insights.
func (ctrl *BrokerController) GetBrokerInsights(c *gin.Context) {
	userID := extractUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	accountID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		badRequest(c, "Invalid account ID")
		return
	}

	insights, err := ctrl.service.GetBrokerInsights(userID, accountID)
	if err != nil {
		internalError(c, "Failed to generate insights: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{"insights": insights, "count": len(insights)})
}

// ─── GET /api/v1/brokers/accounts/:id/security ────────────────────────────────

// GetSecurityInfo returns security and permissions info for a broker account.
func (ctrl *BrokerController) GetSecurityInfo(c *gin.Context) {
	userID := extractUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	accountID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		badRequest(c, "Invalid account ID")
		return
	}

	info, err := ctrl.service.GetSecurityInfo(userID, accountID)
	if err != nil {
		internalError(c, "Failed to fetch security info: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, info)
}

// ─── POST /api/v1/brokers/import ──────────────────────────────────────────────

// ImportPortfolio handles a manual JSON portfolio import.
func (ctrl *BrokerController) ImportPortfolio(c *gin.Context) {
	userID := extractUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req ImportPayloadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "Invalid request: "+err.Error())
		return
	}

	accountID, err := uuid.Parse(req.AccountID)
	if err != nil {
		badRequest(c, "Invalid account ID")
		return
	}

	if err := ctrl.service.ImportPortfolio(userID, accountID, req.Holdings); err != nil {
		internalError(c, "Import failed: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Portfolio imported successfully"})
}
