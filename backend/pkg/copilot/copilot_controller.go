package copilot

import (
	"fmt"
	"net/http"
	"time"

	"stockox-backend/database/models"
	"stockox-backend/database/repositories"
	"stockox-backend/pkg/cache"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CopilotController handles all /api/v1/copilot/* endpoints.
type CopilotController struct {
	db       *gorm.DB
	portRepo repositories.PortfolioRepository
	cache    cache.Cache
}

func NewCopilotController(db *gorm.DB, portRepo repositories.PortfolioRepository, cacheClient cache.Cache) *CopilotController {
	return &CopilotController{db: db, portRepo: portRepo, cache: cacheClient}
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/v1/copilot/health
// ──────────────────────────────────────────────────────────────────────────────
func (ctrl *CopilotController) GetHealth(c *gin.Context) {
	userID := ctrl.getUserID(c)
	goal := c.DefaultQuery("goal", "balanced")
	cacheKey := fmt.Sprintf("copilot:health:%s:%s", userID, goal)

	var cached HealthScore
	if ctrl.cache != nil {
		if err := ctrl.cache.GetJSON(c.Request.Context(), cacheKey, &cached); err == nil {
			c.JSON(http.StatusOK, cached)
			return
		}
	}

	portfolio, holdings, _ := ctrl.loadPortfolioData(userID)
	result := ComputeHealthScore(portfolio, holdings)

	if ctrl.cache != nil {
		_ = ctrl.cache.SetJSON(c.Request.Context(), cacheKey, result, 5*time.Minute)
	}

	c.JSON(http.StatusOK, result)
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/v1/copilot/audit
// ──────────────────────────────────────────────────────────────────────────────
func (ctrl *CopilotController) GetAudit(c *gin.Context) {
	userID := ctrl.getUserID(c)
	goal := c.DefaultQuery("goal", "balanced")
	cacheKey := fmt.Sprintf("copilot:audit:%s:%s", userID, goal)

	var cached CopilotAudit
	if ctrl.cache != nil {
		if err := ctrl.cache.GetJSON(c.Request.Context(), cacheKey, &cached); err == nil {
			c.JSON(http.StatusOK, cached)
			return
		}
	}

	portfolio, holdings, _ := ctrl.loadPortfolioData(userID)
	health := ComputeHealthScore(portfolio, holdings)
	sectors := ComputeSectorExposures(portfolio, holdings, goal)
	metaMap := ctrl.loadMetaMap(holdings)
	positions := ComputePositionRisks(portfolio, holdings, metaMap)
	result := ComputeAudit(health, sectors, positions, portfolio)

	if ctrl.cache != nil {
		_ = ctrl.cache.SetJSON(c.Request.Context(), cacheKey, result, 15*time.Minute)
	}

	c.JSON(http.StatusOK, result)
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/v1/copilot/sectors
// ──────────────────────────────────────────────────────────────────────────────
func (ctrl *CopilotController) GetSectors(c *gin.Context) {
	userID := ctrl.getUserID(c)
	goal := c.DefaultQuery("goal", "balanced")
	cacheKey := fmt.Sprintf("copilot:sectors:%s:%s", userID, goal)

	var cached []SectorExposure
	if ctrl.cache != nil {
		if err := ctrl.cache.GetJSON(c.Request.Context(), cacheKey, &cached); err == nil {
			c.JSON(http.StatusOK, cached)
			return
		}
	}

	portfolio, holdings, _ := ctrl.loadPortfolioData(userID)
	result := ComputeSectorExposures(portfolio, holdings, goal)

	if ctrl.cache != nil {
		_ = ctrl.cache.SetJSON(c.Request.Context(), cacheKey, result, 5*time.Minute)
	}

	c.JSON(http.StatusOK, result)
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/v1/copilot/positions
// ──────────────────────────────────────────────────────────────────────────────
func (ctrl *CopilotController) GetPositions(c *gin.Context) {
	userID := ctrl.getUserID(c)
	cacheKey := fmt.Sprintf("copilot:positions:%s", userID)

	var cached []PositionRisk
	if ctrl.cache != nil {
		if err := ctrl.cache.GetJSON(c.Request.Context(), cacheKey, &cached); err == nil {
			c.JSON(http.StatusOK, cached)
			return
		}
	}

	portfolio, holdings, _ := ctrl.loadPortfolioData(userID)
	metaMap := ctrl.loadMetaMap(holdings)
	result := ComputePositionRisks(portfolio, holdings, metaMap)

	if ctrl.cache != nil {
		_ = ctrl.cache.SetJSON(c.Request.Context(), cacheKey, result, 5*time.Minute)
	}

	c.JSON(http.StatusOK, result)
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/v1/copilot/alerts
// ──────────────────────────────────────────────────────────────────────────────
func (ctrl *CopilotController) GetAlerts(c *gin.Context) {
	userID := ctrl.getUserID(c)
	goal := c.DefaultQuery("goal", "balanced")

	portfolio, holdings, _ := ctrl.loadPortfolioData(userID)
	health := ComputeHealthScore(portfolio, holdings)
	sectors := ComputeSectorExposures(portfolio, holdings, goal)
	result := GenerateAlerts(portfolio, holdings, health, sectors)

	c.JSON(http.StatusOK, result)
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/v1/copilot/brief
// ──────────────────────────────────────────────────────────────────────────────
func (ctrl *CopilotController) GetBrief(c *gin.Context) {
	userID := ctrl.getUserID(c)
	cacheKey := fmt.Sprintf("copilot:brief:%s", userID)

	var cached DailyBrief
	if ctrl.cache != nil {
		if err := ctrl.cache.GetJSON(c.Request.Context(), cacheKey, &cached); err == nil {
			c.JSON(http.StatusOK, cached)
			return
		}
	}

	portfolio, holdings, _ := ctrl.loadPortfolioData(userID)

	// Fetch user name
	userName := "Investor"
	var user models.User
	if ctrl.db.First(&user, "id = ?", userID).Error == nil && user.Name != "" {
		userName = user.Name
	}

	// Fetch recent committee recommendations
	var recs []models.Recommendation
	ctrl.db.Order("created_at desc").Limit(3).Find(&recs)
	highlights := make([]string, 0, len(recs))
	for _, r := range recs {
		highlights = append(highlights, fmt.Sprintf("%s — %s (%.0f%% confidence)", r.Ticker, r.Recommendation, float64(r.ConfidenceScore)))
	}

	health := ComputeHealthScore(portfolio, holdings)
	sectors := ComputeSectorExposures(portfolio, holdings, "balanced")
	result := GenerateDailyBrief(userName, portfolio, holdings, health, sectors, highlights)

	if ctrl.cache != nil {
		_ = ctrl.cache.SetJSON(c.Request.Context(), cacheKey, result, 60*time.Minute)
	}

	c.JSON(http.StatusOK, result)
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/v1/copilot/rebalance
// ──────────────────────────────────────────────────────────────────────────────
func (ctrl *CopilotController) PostRebalance(c *gin.Context) {
	userID := ctrl.getUserID(c)

	var req struct {
		Goal string `json:"goal"`
	}
	_ = c.ShouldBindJSON(&req)
	if req.Goal == "" {
		req.Goal = "balanced"
	}

	portfolio, holdings, _ := ctrl.loadPortfolioData(userID)
	result := GenerateRebalancePlan(portfolio, holdings, req.Goal)
	c.JSON(http.StatusOK, result)
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/v1/copilot/simulate
// ──────────────────────────────────────────────────────────────────────────────
func (ctrl *CopilotController) PostSimulate(c *gin.Context) {
	userID := ctrl.getUserID(c)

	var req SimulateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	goal := c.DefaultQuery("goal", "balanced")
	portfolio, holdings, _ := ctrl.loadPortfolioData(userID)
	result := SimulateChange(portfolio, holdings, req, goal)
	c.JSON(http.StatusOK, result)
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

func (ctrl *CopilotController) loadPortfolioData(userID string) (*models.Portfolio, []models.PortfolioHolding, error) {
	portfolio, err := ctrl.portRepo.GetByUserID(userID)
	if err != nil {
		portfolio = &models.Portfolio{
			ID:          uuid.New(),
			UserID:      userID,
			AccountMode: "demo",
			TotalValue:  100000.0,
			CashBalance: 100000.0,
		}
	}

	holdings, err := ctrl.portRepo.GetHoldings(portfolio.ID)
	if err != nil {
		holdings = []models.PortfolioHolding{}
	}

	return portfolio, holdings, nil
}

func (ctrl *CopilotController) loadMetaMap(holdings []models.PortfolioHolding) map[string]models.StockMetadata {
	metaMap := make(map[string]models.StockMetadata)
	if ctrl.db == nil || len(holdings) == 0 {
		return metaMap
	}
	tickers := make([]string, 0, len(holdings))
	for _, h := range holdings {
		tickers = append(tickers, h.Ticker)
	}
	var metas []models.StockMetadata
	ctrl.db.Where("symbol IN ?", tickers).Find(&metas)
	for _, m := range metas {
		metaMap[m.Symbol] = m
	}
	return metaMap
}

func (ctrl *CopilotController) getUserID(c *gin.Context) string {
	if c.Query("demo") == "true" {
		return "demo_user_id_0000000000000000001"
	}
	val, exists := c.Get("UserID")
	if !exists {
		return "user_000000000000000000000000001"
	}
	if str, ok := val.(string); ok {
		return str
	}
	return "user_000000000000000000000000001"
}
