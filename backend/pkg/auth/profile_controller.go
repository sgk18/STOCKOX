package auth

import (
	"log"
	"net/http"
	"time"

	"stockox-backend/database/models"
	"stockox-backend/database/repositories"
	"stockox-backend/pkg/errors"
	"stockox-backend/pkg/cache"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProfileController struct {
	db            *gorm.DB
	userRepo      repositories.UserRepository
	portfolioRepo repositories.PortfolioRepository
	watchlistRepo repositories.WatchlistRepository
}

func NewProfileController(
	db *gorm.DB,
	userRepo repositories.UserRepository,
	portfolioRepo repositories.PortfolioRepository,
	watchlistRepo repositories.WatchlistRepository,
) *ProfileController {
	return &ProfileController{
		db:            db,
		userRepo:      userRepo,
		portfolioRepo: portfolioRepo,
		watchlistRepo: watchlistRepo,
	}
}

func (ctrl *ProfileController) getUserID(c *gin.Context) (string, bool) {
	userIDVal, exists := c.Get("UserID")
	if !exists {
		errors.UnauthorizedError(c, "Missing authenticated user context")
		return "", false
	}
	userID, ok := userIDVal.(string)
	if !ok || userID == "" {
		errors.UnauthorizedError(c, "Invalid authenticated user ID context")
		return "", false
	}
	return userID, true
}

// GET /api/profile
func (ctrl *ProfileController) GetProfile(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	user, err := ctrl.userRepo.GetByID(userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "User profile not found"})
			return
		}
		errors.InternalServerError(c, "Failed to retrieve user: "+err.Error())
		return
	}

	response := gin.H{
		"id":               user.ID,
		"clerk_id":         user.ClerkID,
		"email":            user.Email,
		"name":             user.Name,
		"avatar_url":       user.AvatarURL,
		"role":             user.Role,
		"account_mode":     user.AccountMode,
		"experience_level": user.ExperienceLevel,
		"investment_goal":  user.InvestmentGoal,
		"risk_preference":  user.RiskPreference,
		"onboarded":        user.Onboarded,
		"created_at":       user.CreatedAt,
	}

	if c.Query("stats") == "true" {
		// Calculate dynamic usage stats
		var totalAnalyses int64 = 0
		_ = ctrl.db.Table("analysis_sessions").Where("user_id = ?", userID).Count(&totalAnalyses).Error

		var watchlistCount int64 = 0
		_ = ctrl.db.Table("watchlists").Where("user_id = ?", userID).Count(&watchlistCount).Error

		var stocksTracked int64 = 0
		var portfolioValue float64 = 0.0
		port, err := ctrl.portfolioRepo.GetByUserIDAndMode(userID, user.AccountMode)
		if err == nil && port != nil {
			portfolioValue = port.TotalValue
			_ = ctrl.db.Table("portfolio_holdings").Where("portfolio_id = ?", port.ID).Count(&stocksTracked).Error
		}

		var recsCount int64 = 0
		_ = ctrl.db.Table("committee_decisions").Count(&recsCount).Error

		response["stats"] = gin.H{
			"total_analyses":    totalAnalyses,
			"stocks_tracked":    stocksTracked,
			"watchlist_count":   watchlistCount,
			"portfolio_value":   portfolioValue,
			"ai_recs_generated": recsCount,
		}
	}

	c.JSON(http.StatusOK, response)
}

// PUT /api/profile
func (ctrl *ProfileController) UpdateProfile(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	var req struct {
		Name            string `json:"name"`
		AvatarURL       string `json:"avatar_url"`
		ExperienceLevel string `json:"experience_level"`
		InvestmentGoal  string `json:"investment_goal"`
		RiskPreference  string `json:"risk_preference"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.BadRequestError(c, "Invalid request payload: "+err.Error())
		return
	}

	user, err := ctrl.userRepo.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User profile not found"})
		return
	}

	if req.Name != "" {
		user.Name = req.Name
	}
	if req.AvatarURL != "" {
		user.AvatarURL = req.AvatarURL
	}
	if req.ExperienceLevel != "" {
		user.ExperienceLevel = req.ExperienceLevel
	}
	if req.InvestmentGoal != "" {
		user.InvestmentGoal = req.InvestmentGoal
	}
	if req.RiskPreference != "" {
		user.RiskPreference = req.RiskPreference
	}
	user.UpdatedAt = time.Now()

	if err := ctrl.userRepo.Update(user); err != nil {
		errors.InternalServerError(c, "Failed to update profile: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Profile updated successfully",
	})
}

// POST /api/onboarding
func (ctrl *ProfileController) CompleteOnboarding(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	var req struct {
		Mode            string `json:"mode" binding:"required"` // demo or live
		Name            string `json:"name" binding:"required"`
		AvatarURL       string `json:"avatar_url"`
		ExperienceLevel string `json:"experience_level" binding:"required"`
		InvestmentGoal  string `json:"investment_goal" binding:"required"`
		RiskPreference  string `json:"risk_preference" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.BadRequestError(c, "Invalid onboarding request payload: "+err.Error())
		return
	}

	user, err := ctrl.userRepo.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User profile not found"})
		return
	}

	user.Name = req.Name
	if req.AvatarURL != "" {
		user.AvatarURL = req.AvatarURL
	}
	user.ExperienceLevel = req.ExperienceLevel
	user.InvestmentGoal = req.InvestmentGoal
	user.RiskPreference = req.RiskPreference
	user.AccountMode = req.Mode
	user.Onboarded = true
	user.UpdatedAt = time.Now()

	// 1. Save onboarded user info
	if err := ctrl.userRepo.Update(user); err != nil {
		errors.InternalServerError(c, "Failed to save onboarding selections: "+err.Error())
		return
	}

	// 2. Initialize portfolios
	if err := ctrl.initializePortfolioForMode(userID, req.Mode); err != nil {
		log.Printf("[ONBOARDING-WARN] Failed to initialize portfolio for user %s: %v", userID, err)
	}

	// Invalidate cache
	_ = cache.Shared.Delete(c.Request.Context(), cache.KeyPortfolio(userID))
	_ = cache.Shared.Delete(c.Request.Context(), cache.KeyDashboard(userID))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Onboarding completed successfully",
	})
}

// POST /api/profile/switch-mode
func (ctrl *ProfileController) SwitchMode(c *gin.Context) {
	userID, ok := ctrl.getUserID(c)
	if !ok {
		return
	}

	var req struct {
		Mode string `json:"mode" binding:"required"` // demo or live
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.BadRequestError(c, "Invalid switch-mode payload: "+err.Error())
		return
	}

	if req.Mode != "demo" && req.Mode != "live" {
		errors.BadRequestError(c, "Invalid mode selected. Must be 'demo' or 'live'.")
		return
	}

	user, err := ctrl.userRepo.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User profile not found"})
		return
	}

	user.AccountMode = req.Mode
	user.UpdatedAt = time.Now()

	if err := ctrl.userRepo.Update(user); err != nil {
		errors.InternalServerError(c, "Failed to switch mode: "+err.Error())
		return
	}

	// Ensure target portfolio exists
	if err := ctrl.initializePortfolioForMode(userID, req.Mode); err != nil {
		log.Printf("[MODE-SWITCH-WARN] Failed to initialize portfolio during switch for user %s: %v", userID, err)
	}

	// Invalidate cache
	_ = cache.Shared.Delete(c.Request.Context(), cache.KeyPortfolio(userID))
	_ = cache.Shared.Delete(c.Request.Context(), cache.KeyDashboard(userID))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Account mode switched to " + req.Mode,
		"mode":    req.Mode,
	})
}

// Internal Helper to provision portfolio based on mode
func (ctrl *ProfileController) initializePortfolioForMode(userID string, mode string) error {
	// Check if portfolio for this mode already exists
	existing, err := ctrl.portfolioRepo.GetByUserIDAndMode(userID, mode)
	if err == nil && existing != nil {
		return nil // already exists
	}

	if mode == "demo" {
		log.Printf("[PORTFOLIO] Initializing Virtual Demo Portfolio for user %s", userID)
		portfolio := models.Portfolio{
			ID:                 uuid.New(),
			UserID:             userID,
			AccountMode:        "demo",
			CashBalance:        100000.00,
			TotalValue:         151068.50, // Cash Balance + Seeded Holdings
			DailyChange:        1450.00,
			DailyChangePercent: 0.967,
			CreatedAt:          time.Now(),
			UpdatedAt:          time.Now(),
		}

		if err := ctrl.portfolioRepo.Create(&portfolio); err != nil {
			return err
		}

		// Seed Virtual Holdings
		holdings := []models.PortfolioHolding{
			{ID: uuid.New(), PortfolioID: portfolio.ID, Ticker: "NVDA", CompanyName: "NVIDIA Corp.", Quantity: 80, AveragePrice: 125.00, CurrentPrice: 127.20, CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{ID: uuid.New(), PortfolioID: portfolio.ID, Ticker: "AAPL", CompanyName: "Apple Inc.", Quantity: 60, AveragePrice: 175.00, CurrentPrice: 178.45, CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{ID: uuid.New(), PortfolioID: portfolio.ID, Ticker: "MSFT", CompanyName: "Microsoft Corp.", Quantity: 30, AveragePrice: 410.00, CurrentPrice: 415.50, CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{ID: uuid.New(), PortfolioID: portfolio.ID, Ticker: "RELIANCE", CompanyName: "Reliance Industries Ltd.", Quantity: 15, AveragePrice: 2400.00, CurrentPrice: 2450.00, CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{ID: uuid.New(), PortfolioID: portfolio.ID, Ticker: "TCS", CompanyName: "Tata Consultancy Services Ltd.", Quantity: 10, AveragePrice: 3400.00, CurrentPrice: 3480.00, CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{ID: uuid.New(), PortfolioID: portfolio.ID, Ticker: "BTC", CompanyName: "Bitcoin Token", Quantity: 0.25, AveragePrice: 65000.00, CurrentPrice: 67450.00, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		}

		for _, h := range holdings {
			if err := ctrl.portfolioRepo.AddHolding(&h); err != nil {
				log.Printf("[PORTFOLIO-SEED-WARN] Failed to seed demo holding %s: %v", h.Ticker, err)
			}
		}

		// Seed some default watchlists for Demo
		watchlists := []struct {
			ticker string
			name   string
		}{
			{"TSLA", "Tesla Inc."},
			{"MSFT", "Microsoft Corp."},
			{"AMD", "Advanced Micro Devices"},
		}
		for _, w := range watchlists {
			_, _ = ctrl.watchlistRepo.Add(userID, w.ticker, w.name)
		}

	} else {
		log.Printf("[PORTFOLIO] Initializing Empty Live Portfolio for user %s", userID)
		portfolio := models.Portfolio{
			ID:                 uuid.New(),
			UserID:             userID,
			AccountMode:        "live",
			CashBalance:        0.00,
			TotalValue:         0.00,
			DailyChange:        0.00,
			DailyChangePercent: 0.00,
			CreatedAt:          time.Now(),
			UpdatedAt:          time.Now(),
		}

		if err := ctrl.portfolioRepo.Create(&portfolio); err != nil {
			return err
		}
	}

	return nil
}
