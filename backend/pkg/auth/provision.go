package auth

import (
	"fmt"
	"log"
	"strings"
	"time"

	"stockox-backend/database/models"
	"stockox-backend/database/repositories"

	"github.com/google/uuid"
)

// ProvisionUser handles local profile creation and seeding for a Clerk authenticated user.
// If a user with the same email already exists in the database, it merges and links the ID.
func ProvisionUser(
	userRepo repositories.UserRepository,
	portfolioRepo repositories.PortfolioRepository,
	watchlistRepo repositories.WatchlistRepository,
	userID string,
	email string,
	name string,
	avatarURL string,
	role string,
) error {
	// Add email validation
	if !strings.Contains(email, "@") {
		log.Printf("[AUTH] Sync failed: email does not contain @: email=%s, user_id=%s", email, userID)
		return fmt.Errorf("email does not contain @: %s", email)
	}

	// Add debug logging
	log.Printf("[AUTH] Sync details: Clerk User ID=%s, Primary Email=%s, Name=%s, Avatar URL=%s", userID, email, name, avatarURL)

	// 1. Check if a user with this email already exists (e.g. mock seeded user)
	existingUser, err := userRepo.GetByEmail(email)
	if err == nil && existingUser != nil {
		log.Printf("[SYNC-PROVISION] Linking existing user record (%s) to Clerk user ID (%s)", email, userID)
		oldID := existingUser.ID

		// Update user ID in the database. PostgreSQL foreign keys with ON UPDATE CASCADE
		// will propagate this change to portfolios, portfolio_holdings, watchlists, etc.
		if err := userRepo.UpdateID(oldID, userID); err != nil {
			log.Printf("[DATABASE] Database error: failed to update user ID from %s to %s: %v", oldID, userID, err)
			return err
		}

		// Update user profile properties
		existingUser.ID = userID
		existingUser.ClerkID = userID
		if name != "" {
			existingUser.Name = name
		}
		if avatarURL != "" {
			existingUser.AvatarURL = avatarURL
		}
		existingUser.UpdatedAt = time.Now()
		
		if err := userRepo.Update(existingUser); err != nil {
			log.Printf("[DATABASE] Database error: failed to update user profile for %s: %v", userID, err)
			return err
		}
		log.Printf("[DATABASE] User updated: email=%s, user_id=%s", email, userID)
		return nil
	}

	// 2. Provision a brand new user
	log.Printf("[SYNC-PROVISION] Creating local database record for Clerk user: %s (%s)", email, userID)
	if role == "" {
		role = "Lead Investment Advisor"
	}
	if avatarURL == "" {
		avatarURL = "https://avatar.vercel.sh/" + userID
	}

	newUser := models.User{
		ID:        userID,
		ClerkID:   userID,
		Email:     email,
		Name:      name,
		AvatarURL: avatarURL,
		Role:      role,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := userRepo.Create(&newUser); err != nil {
		log.Printf("[DATABASE] Database error: failed to insert user %s: %v", userID, err)
		return err
	}
	log.Printf("[DATABASE] User inserted: email=%s, user_id=%s", email, userID)

	// Seed default demo portfolio & watchlist items in a background goroutine
	go func() {
		portfolio := models.Portfolio{
			ID:                 uuid.New(),
			UserID:             userID,
			AccountMode:        "demo",
			TotalValue:         125400.00,
			CashBalance:        12000.00,
			DailyChange:        5062.00,
			DailyChangePercent: 4.21,
			CreatedAt:          time.Now(),
			UpdatedAt:          time.Now(),
		}
		if err := portfolioRepo.Create(&portfolio); err != nil {
			log.Printf("[DATABASE-BG-ERR] Database error: failed to seed default portfolio for user %s: %v", userID, err)
		} else {
			log.Printf("[DATABASE-BG] Successfully seeded default portfolio for user %s", userID)
		}

		// Seed 3 default watchlist items
		watchlists := []struct {
			ticker string
			name   string
		}{
			{"TSLA", "Tesla Inc."},
			{"MSFT", "Microsoft Corp."},
			{"AMD", "Advanced Micro Devices"},
		}
		for _, w := range watchlists {
			_, err = watchlistRepo.Add(userID, w.ticker, w.name)
			if err != nil {
				log.Printf("[DATABASE-BG-ERR] Database error: failed to seed default watchlist item %s for user %s: %v", w.ticker, userID, err)
			}
		}
		log.Printf("[DATABASE-BG] Successfully seeded watchlist items for user %s", userID)
	}()

	return nil
}
