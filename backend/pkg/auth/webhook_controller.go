package auth

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"stockox-backend/database/repositories"

	"github.com/gin-gonic/gin"
	svix "github.com/svix/svix-webhooks/go"
	"gorm.io/gorm"
)

type WebhookController struct {
	userRepo      repositories.UserRepository
	portfolioRepo repositories.PortfolioRepository
	watchlistRepo repositories.WatchlistRepository
	webhookSecret string
}

func NewWebhookController(
	userRepo repositories.UserRepository,
	portfolioRepo repositories.PortfolioRepository,
	watchlistRepo repositories.WatchlistRepository,
	webhookSecret string,
) *WebhookController {
	return &WebhookController{
		userRepo:      userRepo,
		portfolioRepo: portfolioRepo,
		watchlistRepo: watchlistRepo,
		webhookSecret: webhookSecret,
	}
}

type ClerkWebhookPayload struct {
	Data struct {
		ID                    string `json:"id"`
		FirstName             string `json:"first_name"`
		LastName              string `json:"last_name"`
		ImageURL              string `json:"image_url"`
		PrimaryEmailAddressID string `json:"primary_email_address_id"`
		EmailAddresses        []struct {
			ID           string `json:"id"`
			EmailAddress string `json:"email_address"`
		} `json:"email_addresses"`
	} `json:"data"`
	Type string `json:"type"`
}

func (p *ClerkWebhookPayload) GetPrimaryEmail() string {
	for _, email := range p.Data.EmailAddresses {
		if email.ID == p.Data.PrimaryEmailAddressID {
			return email.EmailAddress
		}
	}
	if len(p.Data.EmailAddresses) > 0 {
		return p.Data.EmailAddresses[0].EmailAddress
	}
	return ""
}

func (p *ClerkWebhookPayload) GetFullName() string {
	fullName := strings.TrimSpace(p.Data.FirstName + " " + p.Data.LastName)
	if fullName == "" {
		return "Adviser"
	}
	return fullName
}

func (ctrl *WebhookController) HandleClerkWebhook(c *gin.Context) {
	log.Println("[WEBHOOK] Webhook received")

	// 1. Read Raw Request Body
	payloadBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		log.Printf("[DATABASE] Database error: failed to read request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}
	// Restore request body for GIN's binding helper (though we parse payload manually here)
	c.Request.Body = io.NopCloser(bytes.NewBuffer(payloadBytes))

	// 2. Extract Svix Headers for Signature Verification
	svixID := c.GetHeader("svix-id")
	svixTimestamp := c.GetHeader("svix-timestamp")
	svixSignature := c.GetHeader("svix-signature")

	if svixID == "" || svixTimestamp == "" || svixSignature == "" {
		log.Println("[WEBHOOK-ERR] Missing required Svix headers")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required Svix headers"})
		return
	}

	// 3. Verify Signature if Secret is Set
	if ctrl.webhookSecret != "" {
		wh, err := svix.NewWebhook(ctrl.webhookSecret)
		if err != nil {
			log.Printf("[DATABASE] Database error: failed to initialize Svix Webhook: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server configuration error"})
			return
		}

		header := http.Header{}
		header.Set("svix-id", svixID)
		header.Set("svix-timestamp", svixTimestamp)
		header.Set("svix-signature", svixSignature)

		if err := wh.Verify(payloadBytes, header); err != nil {
			log.Printf("[WEBHOOK-ERR] Signature verification failed: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Signature verification failed"})
			return
		}
		log.Println("[WEBHOOK] Webhook Signature verified successfully")
	} else {
		log.Println("[WEBHOOK-WARN] CLERK_WEBHOOK_SECRET is not configured. Skipping signature verification in development.")
	}

	// 4. Bind Payload JSON
	var payload ClerkWebhookPayload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		log.Printf("[DATABASE] Database error: failed to parse webhook JSON payload: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON format"})
		return
	}

	log.Printf("[WEBHOOK] Processing event type: %s for user ID: %s", payload.Type, payload.Data.ID)

	// 5. Execute Action depending on event type
	switch payload.Type {
	case "user.created", "user.updated":
		userID := payload.Data.ID
		email := payload.GetPrimaryEmail()
		name := payload.GetFullName()
		avatarURL := payload.Data.ImageURL

		if email == "" {
			log.Printf("[WEBHOOK-ERR] Rejecting user payload: Missing email address for user ID %s", userID)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing email address in Clerk payload"})
			return
		}

		user, err := ctrl.userRepo.GetByID(userID)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				// JIT Provision User
				err = ProvisionUser(ctrl.userRepo, ctrl.portfolioRepo, ctrl.watchlistRepo, userID, email, name, avatarURL, "Lead Investment Advisor")
				if err != nil {
					log.Printf("[DATABASE] Database error: failed to JIT provision user %s: %v", userID, err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to provision user profile"})
					return
				}
			} else {
				log.Printf("[DATABASE] Database error: user lookup failed for ID %s: %v", userID, err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Database lookup failed"})
				return
			}
		} else {
			// Update User details
			user.Email = email
			user.Name = name
			user.AvatarURL = avatarURL
			user.UpdatedAt = time.Now()
			
			if err := ctrl.userRepo.Update(user); err != nil {
				log.Printf("[DATABASE] Database error: failed to update user %s: %v", userID, err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user record"})
				return
			}
			log.Printf("[DATABASE] User updated: email=%s, user_id=%s", email, userID)
		}

	case "user.deleted":
		userID := payload.Data.ID
		if err := ctrl.userRepo.Delete(userID); err != nil {
			log.Printf("[DATABASE] Database error: failed to delete user %s: %v", userID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
			return
		}
		log.Printf("[DATABASE] User deleted: user_id=%s", userID)

	default:
		log.Printf("[WEBHOOK-WARN] Unhandled Clerk webhook event type: %s", payload.Type)
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Clerk webhook processed successfully"})
}
