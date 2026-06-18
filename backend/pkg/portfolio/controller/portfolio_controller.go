package controller

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"stockox-backend/database/models"
	"stockox-backend/database/repositories"
	"stockox-backend/pkg/cache"
	pkgErrors "stockox-backend/pkg/errors"
	"stockox-backend/pkg/portfolio/broker"
	"stockox-backend/pkg/portfolio/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PortfolioController struct {
	db           *gorm.DB
	portRepo     repositories.PortfolioRepository
	broker       broker.Broker
	portSrv      *service.PortfolioService
	cacheClient  cache.Cache
}

func NewPortfolioController(
	db *gorm.DB,
	portRepo repositories.PortfolioRepository,
	broker broker.Broker,
	portSrv *service.PortfolioService,
	cacheClient cache.Cache,
) *PortfolioController {
	return &PortfolioController{
		db:          db,
		portRepo:    portRepo,
		broker:      broker,
		portSrv:     portSrv,
		cacheClient: cacheClient,
	}
}

func (ctrl *PortfolioController) GetPortfolioOverview(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	// Fetch portfolio
	port, err := ctrl.getOrCreatePortfolio(userID)
	if err != nil {
		pkgErrors.InternalServerError(c, "Failed to get portfolio: "+err.Error())
		return
	}

	holdings, err := ctrl.portRepo.GetHoldings(port.ID)
	if err != nil {
		pkgErrors.InternalServerError(c, "Failed to get holdings: "+err.Error())
		return
	}

	// Calculate performance metrics
	perf, _, err := ctrl.portSrv.CalculatePerformance(port.ID, port.TotalValue, port.CashBalance)
	if err != nil {
		pkgErrors.InternalServerError(c, "Performance engine calculations failed: "+err.Error())
		return
	}

	// AI Auditor
	audit := ctrl.portSrv.AuditPortfolio(port.ID, port.TotalValue, holdings)

	// Invested capital calculation
	investedCapital := 0.0
	for _, h := range holdings {
		investedCapital += h.Quantity * h.AveragePrice
	}

	profitLoss := port.TotalValue - 100000.0 // net gains from starting virtual $100k
	returnPercent := 0.0
	if investedCapital > 0 {
		profitLoss = 0.0
		for _, h := range holdings {
			profitLoss += (h.CurrentPrice - h.AveragePrice) * h.Quantity
		}
		returnPercent = (profitLoss / investedCapital) * 100
	} else if port.TotalValue > 100000.0 {
		returnPercent = ((port.TotalValue - 100000.0) / 100000.0) * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"portfolio_id":     port.ID.String(),
		"total_value":      port.TotalValue,
		"invested_capital": investedCapital,
		"profit_loss":      profitLoss,
		"return_percent":   returnPercent,
		"cash_balance":     port.CashBalance,
		"holdings_count":   len(holdings),
		"metrics":          perf,
		"audit":            audit,
	})
}

func (ctrl *PortfolioController) GetHoldings(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	port, err := ctrl.getOrCreatePortfolio(userID)
	if err != nil {
		pkgErrors.InternalServerError(c, "Failed to load portfolio: "+err.Error())
		return
	}

	holdings, err := ctrl.portRepo.GetHoldings(port.ID)
	if err != nil {
		pkgErrors.InternalServerError(c, "Failed to retrieve holdings: "+err.Error())
		return
	}

	// Enrich holdings metadata (Company names, allocations, unrealized PL)
	enrichedHoldings := make([]gin.H, 0, len(holdings))
	for _, h := range holdings {
		val := h.Quantity * h.CurrentPrice
		alloc := 0.0
		if port.TotalValue > 0 {
			alloc = (val / port.TotalValue) * 100
		}

		unrealizedPL := (h.CurrentPrice - h.AveragePrice) * h.Quantity
		returnPct := 0.0
		if h.AveragePrice > 0 {
			returnPct = ((h.CurrentPrice - h.AveragePrice) / h.AveragePrice) * 100
		}

		companyName := h.Ticker
		var meta models.StockMetadata
		if ctrl.db.Select("company_name").First(&meta, "symbol = ?", h.Ticker).Error == nil {
			companyName = meta.CompanyName
		}

		sector := service.TickerSectorMap[h.Ticker]
		if sector == "" {
			sector = "Other"
		}

		enrichedHoldings = append(enrichedHoldings, gin.H{
			"ticker":            h.Ticker,
			"company_name":      companyName,
			"quantity":          h.Quantity,
			"average_price":     h.AveragePrice,
			"current_price":     h.CurrentPrice,
			"market_value":      val,
			"unrealized_pl":     unrealizedPL,
			"return_percent":    returnPct,
			"allocation_percent": alloc,
			"sector":            sector,
		})
	}

	c.JSON(http.StatusOK, enrichedHoldings)
}

func (ctrl *PortfolioController) GetHistory(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	port, err := ctrl.getOrCreatePortfolio(userID)
	if err != nil {
		pkgErrors.InternalServerError(c, "Failed to resolve portfolio: "+err.Error())
		return
	}

	// Pagination, filters, search
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	ticker := strings.ToUpper(strings.TrimSpace(c.Query("ticker")))
	tradeType := strings.ToUpper(strings.TrimSpace(c.Query("type")))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}

	offset := (page - 1) * limit

	var txns []models.Transaction
	var total int64

	query := ctrl.db.Model(&models.Transaction{}).Where("portfolio_id = ?", port.ID)
	if ticker != "" {
		query = query.Where("ticker = ?", ticker)
	}
	if tradeType == "BUY" || tradeType == "SELL" {
		query = query.Where("type = ?", tradeType)
	}

	query.Count(&total)
	query.Order("created_at desc").Offset(offset).Limit(limit).Find(&txns)

	c.JSON(http.StatusOK, gin.H{
		"transactions": txns,
		"total":        total,
		"page":         page,
		"limit":        limit,
	})
}

func (ctrl *PortfolioController) GetPerformance(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	port, err := ctrl.getOrCreatePortfolio(userID)
	if err != nil {
		pkgErrors.InternalServerError(c, "Failed to resolve portfolio: "+err.Error())
		return
	}

	perf, snapshots, err := ctrl.portSrv.CalculatePerformance(port.ID, port.TotalValue, port.CashBalance)
	if err != nil {
		pkgErrors.InternalServerError(c, "Performance calculations failed: "+err.Error())
		return
	}

	historyPoints := make([]gin.H, 0, len(snapshots))
	for _, snap := range snapshots {
		historyPoints = append(historyPoints, gin.H{
			"date":  snap.RecordedAt.Format("2006-01-02"),
			"value": snap.TotalValue,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"performance": perf,
		"history":     historyPoints,
	})
}

func (ctrl *PortfolioController) BuyStock(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	var req struct {
		Ticker   string  `json:"ticker" binding:"required"`
		Quantity float64 `json:"quantity" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		pkgErrors.BadRequestError(c, "Ticker and Quantity are required")
		return
	}

	port, err := ctrl.getOrCreatePortfolio(userID)
	if err != nil {
		pkgErrors.InternalServerError(c, "Failed to get portfolio: "+err.Error())
		return
	}

	// Validate ticker against catalog
	ticker := strings.ToUpper(strings.TrimSpace(req.Ticker))

	order := broker.TradeOrder{
		Ticker:    ticker,
		Quantity:  req.Quantity,
		Type:      "BUY",
		OrderType: "MARKET",
	}

	txn, err := ctrl.broker.ExecuteTrade(port.ID, order)
	if err != nil {
		pkgErrors.BadRequestError(c, err.Error())
		return
	}

	// Invalidate Caches
	ctrl.invalidatePortfolioCache(c.Request.Context(), userID)

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"transaction": txn,
	})
}

func (ctrl *PortfolioController) SellStock(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	var req struct {
		Ticker   string  `json:"ticker" binding:"required"`
		Quantity float64 `json:"quantity" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		pkgErrors.BadRequestError(c, "Ticker and Quantity are required")
		return
	}

	port, err := ctrl.getOrCreatePortfolio(userID)
	if err != nil {
		pkgErrors.InternalServerError(c, "Failed to get portfolio: "+err.Error())
		return
	}

	ticker := strings.ToUpper(strings.TrimSpace(req.Ticker))

	order := broker.TradeOrder{
		Ticker:    ticker,
		Quantity:  req.Quantity,
		Type:      "SELL",
		OrderType: "MARKET",
	}

	txn, err := ctrl.broker.ExecuteTrade(port.ID, order)
	if err != nil {
		pkgErrors.BadRequestError(c, err.Error())
		return
	}

	// Invalidate Caches
	ctrl.invalidatePortfolioCache(c.Request.Context(), userID)

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"transaction": txn,
	})
}

func (ctrl *PortfolioController) Rebalance(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	port, err := ctrl.getOrCreatePortfolio(userID)
	if err != nil {
		pkgErrors.InternalServerError(c, "Failed to get portfolio: "+err.Error())
		return
	}

	holdings, err := ctrl.portRepo.GetHoldings(port.ID)
	if err != nil {
		pkgErrors.InternalServerError(c, "Failed to load holdings: "+err.Error())
		return
	}

	result := ctrl.portSrv.GenerateRebalance(port.ID, port.TotalValue, holdings)
	c.JSON(http.StatusOK, result)
}

func (ctrl *PortfolioController) getOrCreatePortfolio(userID string) (*models.Portfolio, error) {
	port, err := ctrl.portRepo.GetByUserID(userID)
	if err != nil {
		// Provision a default demo portfolio
		port = &models.Portfolio{
			ID:                 uuid.New(),
			UserID:             userID,
			AccountMode:        "demo", // Default simulated account mode
			TotalValue:         100000.0,
			CashBalance:        100000.0,
			DailyChange:        0.0,
			DailyChangePercent: 0.0,
			CreatedAt:          time.Now(),
			UpdatedAt:          time.Now(),
		}
		if err := ctrl.portRepo.Create(port); err != nil {
			return nil, err
		}

		// Create default snapshot
		snap := models.PortfolioSnapshot{
			ID:                 uuid.New(),
			PortfolioID:        port.ID,
			TotalValue:         100000.0,
			CashBalance:        100000.0,
			DailyChange:        0.0,
			DailyChangePercent: 0.0,
			RecordedAt:         time.Now().Add(-24 * time.Hour),
		}
		ctrl.db.Create(&snap)
	}
	return port, nil
}

func (ctrl *PortfolioController) invalidatePortfolioCache(ctx context.Context, userID string) {
	_ = ctrl.cacheClient.Delete(ctx, cache.KeyPortfolio(userID))
	_ = ctrl.cacheClient.Delete(ctx, cache.KeyDashboard(userID))
	_ = ctrl.cacheClient.Delete(ctx, "portfolio:summary:"+userID)
	_ = ctrl.cacheClient.Delete(ctx, "portfolio:performance:"+userID)
	_ = ctrl.cacheClient.Delete(ctx, "portfolio:holdings:"+userID)
}

func (ctrl *PortfolioController) getUserID(c *gin.Context) (string, bool) {
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
