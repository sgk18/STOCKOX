package auth

import (
	"log"
	"net/http"
	"strings"
	"time"

	"stockox-backend/database/models"
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
				Success:   true,
				Message:   "User profile provisioned",
				Onboarded: false,
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
		Success:   true,
		Message:   "User profile synchronized",
		Onboarded: user.Onboarded,
	})
}

// SyncUserV1 handles POST /api/v1/auth/sync-user.
// It retrieves user details and performs an upsert into the users table.
func (ctrl *SyncController) SyncUserV1(c *gin.Context) {
	// 1. Retrieve authenticated Clerk User ID
	userIDVal, exists := c.Get("UserID")
	if !exists {
		log.Println("[AUTH] Sync failed: error=missing authenticated user ID")
		errors.UnauthorizedError(c, "Missing authenticated user ID")
		return
	}
	userID := userIDVal.(string)

	log.Printf("[AUTH] Clerk user authenticated: user_id=%s", userID)
	log.Printf("[AUTH] Sync started: user_id=%s", userID)

	// 2. Bind optional request body containing name, email, avatar_url
	var req struct {
		Name      string `json:"name"`
		Email     string `json:"email"`
		AvatarURL string `json:"avatar_url"`
	}
	_ = c.ShouldBindJSON(&req)

	// Determine email, fallback to context then generic placeholder
	email := req.Email
	if email == "" {
		email = c.GetString("UserEmail")
	}
	if email == "" {
		email = userID + "@clerk.user"
	}

	name := req.Name
	if name == "" {
		name = "Adviser"
	}

	avatarURL := req.AvatarURL
	if avatarURL == "" {
		avatarURL = "https://avatar.vercel.sh/" + userID
	}

	// Add email validation
	if !strings.Contains(email, "@") {
		log.Printf("[AUTH] Sync failed: email does not contain @: email=%s, user_id=%s", email, userID)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email address"})
		return
	}

	// Add debug logging
	log.Printf("[AUTH] Sync details: Clerk User ID=%s, Primary Email=%s, Name=%s, Avatar URL=%s", userID, email, name, avatarURL)

	// 3. Upsert Logic: Search by clerk_id first
	existingUser, err := ctrl.userRepo.GetByClerkID(userID)
	isNew := false
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// If clerk_id does not exist, search by email to link records
			existingUser, err = ctrl.userRepo.GetByEmail(email)
			if err != nil {
				if err == gorm.ErrRecordNotFound {
					isNew = true
				} else {
					log.Printf("[AUTH] Sync failed: user_id=%s, error=%v", userID, err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Database lookup failed"})
					return
				}
			}
		} else {
			log.Printf("[AUTH] Sync failed: user_id=%s, error=%v", userID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database lookup failed"})
			return
		}
	}

	if isNew {
		// Call centralized provisioning helper (which seeds portfolio/watchlist)
		err = ProvisionUser(ctrl.userRepo, ctrl.portfolioRepo, ctrl.watchlistRepo, userID, email, name, avatarURL, "Lead Investment Advisor")
		if err != nil {
			log.Printf("[AUTH] Sync failed: user_id=%s, error=%v", userID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to provision user profile"})
			return
		}
		log.Printf("[AUTH] User created: email=%s, user_id=%s", email, userID)
	} else {
		// If linked by email, cascade update User ID in tables
		if existingUser.ClerkID == "" {
			log.Printf("[AUTH] Linking existing user record (%s) by email to Clerk ID (%s)", email, userID)
			oldID := existingUser.ID
			if err := ctrl.userRepo.UpdateID(oldID, userID); err != nil {
				log.Printf("[AUTH] Sync failed: user_id=%s, error=%v", userID, err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user ID during link"})
				return
			}
			existingUser.ID = userID
			existingUser.ClerkID = userID
		}

		userToUpsert := models.User{
			ID:        existingUser.ID,
			ClerkID:   userID,
			Email:     email,
			Name:      name,
			AvatarURL: avatarURL,
			Role:      existingUser.Role,
			CreatedAt: existingUser.CreatedAt,
			UpdatedAt: time.Now(),
		}
		if err := ctrl.userRepo.Upsert(&userToUpsert); err != nil {
			log.Printf("[AUTH] Sync failed: user_id=%s, error=%v", userID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user profile"})
			return
		}
		log.Printf("[AUTH] User updated: email=%s, user_id=%s", email, userID)
	}

	// Find user to know their onboarded status
	dbUser, _ := ctrl.userRepo.GetByClerkID(userID)
	onboarded := false
	if dbUser != nil {
		onboarded = dbUser.Onboarded
	}

	log.Printf("[AUTH] Sync completed: user_id=%s, onboarded=%v", userID, onboarded)
	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   "User synchronized successfully",
		"onboarded": onboarded,
	})
}

// DebugCurrentUser handles GET /api/v1/debug/current-user.
// It returns structural details of the currently authenticated Clerk user.
func (ctrl *SyncController) DebugCurrentUser(c *gin.Context) {
	userIDVal, exists := c.Get("UserID")
	if !exists {
		errors.UnauthorizedError(c, "Missing authenticated user ID")
		return
	}
	userID := userIDVal.(string)

	user, err := ctrl.userRepo.GetByClerkID(userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found in database"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"clerk_id":   user.ClerkID,
		"email":      user.Email,
		"name":       user.Name,
		"avatar_url": user.AvatarURL,
	})
}
