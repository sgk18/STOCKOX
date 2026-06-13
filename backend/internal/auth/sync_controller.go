package auth

import (
	"log"
	"net/http"
	"time"

	"stockox-backend/database/models"
	"stockox-backend/database/repositories"
	"stockox-backend/internal/errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SyncController struct {
	userRepo      repositories.UserRepository
	portfolioRepo repositories.PortfolioRepository
	watchlistRepo repositories.WatchlistRepository
}

func NewSyncController(
	userRepo repositories.UserRepository,
	portfolioRepo repositories.PortfolioRepository,
	watchlistRepo repositories.WatchlistRepository,
) *SyncController {
	return &SyncController{
		userRepo:      userRepo,
		portfolioRepo: portfolioRepo,
		watchlistRepo: watchlistRepo,
	}
}

func (ctrl *SyncController) SyncUser(c *gin.Context) {
	// 1. Get UserID string from Gin Context (injected by Auth middleware)
	userIDVal, exists := c.Get("UserID")
	if !exists {
		errors.UnauthorizedError(c, "Missing authenticated user context")
		return
	}
	userID, ok := userIDVal.(string)
	if !ok || userID == "" {
		errors.UnauthorizedError(c, "Invalid authenticated user ID context")
		return
	}

	// 2. Bind JSON Request Body
	var req UserSyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.BadRequestError(c, "Invalid request payload: "+err.Error())
		return
	}

	// 3. Query User in Database
	user, err := ctrl.userRepo.GetByID(userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// ===================================================
			// JIT Provisioning for Brand New Clerk User
			// ===================================================
			log.Printf("[SYNC] Creating local database record for Clerk user: %s (%s)", req.Email, userID)
			
			role := req.Role
			if role == "" {
				role = "Lead Investment Advisor"
			}
			avatar := req.AvatarURL
			if avatar == "" {
				avatar = "https://avatar.vercel.sh/" + userID
			}

			newUser := models.User{
				ID:        userID,
				Email:     req.Email,
				Name:      req.Name,
				AvatarURL: avatar,
				Role:      role,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}

			if err := ctrl.userRepo.Create(&newUser); err != nil {
				errors.InternalServerError(c, "Failed to create user record: "+err.Error())
				return
			}

			// Seed Portfolio Summary
			portfolio := models.Portfolio{
				ID:                 uuid.New(),
				UserID:             userID,
				TotalValue:         125400.00,
				CashBalance:        12000.00,
				DailyChange:        5062.00,
				DailyChangePercent: 4.21,
				CreatedAt:          time.Now(),
				UpdatedAt:          time.Now(),
			}
			if err := ctrl.portfolioRepo.Create(&portfolio); err != nil {
				log.Printf("[SYNC-ERR] Failed to seed portfolio for user %s: %v", userID, err)
			} else {
				// Seed Portfolio Holdings
				holdings := []models.PortfolioHolding{
					{
						ID:           uuid.New(),
						PortfolioID:  portfolio.ID,
						Ticker:       "NVDA",
						CompanyName:  "NVIDIA Corp.",
						Quantity:     50,
						AveragePrice: 150.00,
						CurrentPrice: 187.20,
						CreatedAt:    time.Now(),
						UpdatedAt:    time.Now(),
					},
					{
						ID:           uuid.New(),
						PortfolioID:  portfolio.ID,
						Ticker:       "AAPL",
						CompanyName:  "Apple Inc.",
						Quantity:     40,
						AveragePrice: 170.00,
						CurrentPrice: 178.45,
						CreatedAt:    time.Now(),
						UpdatedAt:    time.Now(),
					},
				}
				for _, h := range holdings {
					if err := ctrl.portfolioRepo.AddHolding(&h); err != nil {
						log.Printf("[SYNC-ERR] Failed to seed holding %s: %v", h.Ticker, err)
					}
				}
			}

			// Seed Watchlist Items
			watchlists := []struct {
				ticker string
				name   string
			}{
				{"TSLA", "Tesla Inc."},
				{"MSFT", "Microsoft Corp."},
				{"AMD", "Advanced Micro Devices"},
			}
			for _, w := range watchlists {
				if _, err := ctrl.watchlistRepo.Add(userID, w.ticker, w.name); err != nil {
					log.Printf("[SYNC-ERR] Failed to seed watchlist item %s: %v", w.ticker, err)
				}
			}

			c.JSON(http.StatusOK, SyncResponse{
				Success: true,
				Message: "User profile provisioned and default portfolio seeded",
			})
			return
		}

		errors.InternalServerError(c, "Database lookup failed: "+err.Error())
		return
	}

	// 4. Update Profile Info if Changed
	hasChanged := false
	if user.Name != req.Name && req.Name != "" {
		user.Name = req.Name
		hasChanged = true
	}
	if user.AvatarURL != req.AvatarURL && req.AvatarURL != "" {
		user.AvatarURL = req.AvatarURL
		hasChanged = true
	}
	if user.Role != req.Role && req.Role != "" {
		user.Role = req.Role
		hasChanged = true
	}

	if hasChanged {
		user.UpdatedAt = time.Now()
		if err := ctrl.userRepo.Update(user); err != nil {
			log.Printf("[SYNC-WARN] Failed to update user profile details for user %s: %v", userID, err)
		}
	}

	c.JSON(http.StatusOK, SyncResponse{
		Success: true,
		Message: "User profile synchronized",
	})
}
