package auth

import (
	"log"
	"net/http"
	"time"

	"stockox-backend/database/repositories"
	"stockox-backend/pkg/errors"

	"github.com/gin-gonic/gin"
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
			// Call centralized provisioning helper
			err = ProvisionUser(ctrl.userRepo, ctrl.portfolioRepo, ctrl.watchlistRepo, userID, req.Email, req.Name, req.AvatarURL, req.Role)
			if err != nil {
				log.Printf("[DATABASE] Database error: manual sync failed to provision user %s: %v", userID, err)
				errors.InternalServerError(c, "Failed to provision user profile: "+err.Error())
				return
			}

			c.JSON(http.StatusOK, SyncResponse{
				Success: true,
				Message: "User profile provisioned and default portfolio seeded",
			})
			return
		}

		log.Printf("[DATABASE] Database error: manual sync lookup failed for user %s: %v", userID, err)
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
			log.Printf("[DATABASE] Database error: manual sync update failed for user %s: %v", userID, err)
		} else {
			log.Printf("[DATABASE] User updated: email=%s, user_id=%s", user.Email, userID)
		}
	}

	c.JSON(http.StatusOK, SyncResponse{
		Success: true,
		Message: "User profile synchronized",
	})
}
