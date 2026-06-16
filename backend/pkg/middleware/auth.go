package middleware

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"stockox-backend/database/repositories"
	"stockox-backend/pkg/auth"
	"stockox-backend/pkg/errors"

	"github.com/clerk/clerk-sdk-go/v2"
	clerkjwt "github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

type ClerkCustomClaims struct {
	Email  string   `json:"email"`
	Emails []string `json:"emails"`
}

func Auth(
	jwtSecret string,
	userRepo repositories.UserRepository,
	portfolioRepo repositories.PortfolioRepository,
	watchlistRepo repositories.WatchlistRepository,
) gin.HandlerFunc {
	appEnv := os.Getenv("APP_ENV")
	if appEnv == "" {
		appEnv = "development"
	}

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			if appEnv == "development" {
				// Fallback User Context for development / hackathon sandbox execution
				defaultID := "user_000000000000000000000000001"
				c.Set("UserID", defaultID)
				c.Set("UserEmail", "suryachalam.vm@bsccmh.christuniversity.in")

				// Check if fallback user exists in PostgreSQL, if not, JIT provision
				_, err := userRepo.GetByID(defaultID)
				if err != nil && err == gorm.ErrRecordNotFound {
					log.Printf("[CLERK-AUTH-DEV-JIT] Fallback user %s not found in local database. Provisioning...", defaultID)
					_ = auth.ProvisionUser(userRepo, portfolioRepo, watchlistRepo, defaultID, "suryachalam.vm@bsccmh.christuniversity.in", "Surya", "", "Lead Investment Advisor")
				}

				log.Printf("[AUTH] Clerk user detected: user_id=%s", defaultID)
				c.Next()
				return
			}
			errors.UnauthorizedError(c, "Authorization header is required")
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			errors.UnauthorizedError(c, "Authorization header format must be Bearer {token}")
			return
		}

		tokenStr := parts[1]
		var tokenValid bool
		var parseErr error
		var userID string
		var email string

		secretKey := os.Getenv("CLERK_SECRET_KEY")

		if secretKey != "" {
			clerk.SetKey(secretKey)
			claims, err := clerkjwt.Verify(c.Request.Context(), &clerkjwt.VerifyParams{
				Token: tokenStr,
				CustomClaimsConstructor: func(ctx context.Context) any {
					return &ClerkCustomClaims{}
				},
			})
			if err == nil && claims != nil {
				tokenValid = true
				userID = claims.Subject
				if customClaims, ok := claims.Custom.(*ClerkCustomClaims); ok && customClaims != nil {
					if customClaims.Email != "" {
						email = customClaims.Email
					} else if len(customClaims.Emails) > 0 {
						email = customClaims.Emails[0]
					}
				}
			} else {
				parseErr = err
			}
		} else if appEnv == "development" {
			// Dev fallback: parse token claims without checking the signature to simplify local setup
			claims := jwt.MapClaims{}
			parser := jwt.Parser{}
			_, _, err := parser.ParseUnverified(tokenStr, claims)
			parseErr = err
			tokenValid = err == nil
			if err == nil {
				log.Println("[CLERK-AUTH-DEV-WARN] Parsed token claims WITHOUT signature verification")
				if sub, ok := claims["sub"].(string); ok {
					userID = sub
				}
				if emailVal, ok := claims["email"].(string); ok {
					email = emailVal
				} else if emailsList, ok := claims["emails"].([]interface{}); ok && len(emailsList) > 0 {
					if emailStr, ok := emailsList[0].(string); ok {
						email = emailStr
					}
				}
			}
		} else {
			// Production mode but no secret key configured -> fail secure
			log.Println("[CLERK-AUTH-ERR] Production environment detected but CLERK_SECRET_KEY is not configured")
			errors.UnauthorizedError(c, "Security verification keys are missing on the server")
			return
		}

		if !tokenValid {
			errors.UnauthorizedError(c, fmt.Sprintf("Invalid or expired authorization token: %v", parseErr))
			return
		}

		// Inject User Context
		c.Set("UserID", userID)
		if email != "" {
			c.Set("UserEmail", email)
		}

		log.Printf("[AUTH] Clerk user detected: user_id=%s", userID)

		c.Next()
	}
}

// EnsureUserSynced checks if the authenticated user exists in the local database.
// If missing, it JIT provisions their profile, default portfolio, and watchlists.
func EnsureUserSynced(
	userRepo repositories.UserRepository,
	portfolioRepo repositories.PortfolioRepository,
	watchlistRepo repositories.WatchlistRepository,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("UserID")
		if userID == "" {
			c.Next()
			return
		}

		email := c.GetString("UserEmail")
		if email == "" {
			email = userID + "@clerk.user"
		}

		// Add email validation
		if !strings.Contains(email, "@") {
			log.Printf("[AUTH] Sync failed in middleware: email does not contain @: email=%s, user_id=%s", email, userID)
			c.Next()
			return
		}

		existingUser, err := userRepo.GetByClerkID(userID)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				// If Clerk ID doesn't match, attempt to search by email to gracefully link
				// pre-existing records (e.g., from manual db inserts) to the new SSO identity.
				existingUser, err = userRepo.GetByEmail(email)
				if err == nil && existingUser != nil {
					log.Printf("[AUTH] Linking existing user record (%s) by email to Clerk ID (%s) via middleware", email, userID)
					oldID := existingUser.ID
					if err := userRepo.UpdateID(oldID, userID); err != nil {
						log.Printf("[AUTH] Sync failed: user_id=%s, error=%v", userID, err)
					} else {
						existingUser.ID = userID
						existingUser.ClerkID = userID
						existingUser.UpdatedAt = time.Now()
						if err := userRepo.Update(existingUser); err != nil {
							log.Printf("[AUTH] Sync failed: user_id=%s, error=%v", userID, err)
						} else {
							log.Printf("[AUTH] User updated: email=%s, user_id=%s", email, userID)
						}
					}
				} else {
					log.Printf("[AUTH] Sync started: user_id=%s", userID)
					err = auth.ProvisionUser(userRepo, portfolioRepo, watchlistRepo, userID, email, "Adviser", "", "Lead Investment Advisor")
					if err != nil {
						log.Printf("[AUTH] Sync failed: user_id=%s, error=%v", userID, err)
					} else {
						log.Printf("[AUTH] User created: email=%s, user_id=%s", email, userID)
					}
				}
			} else {
				log.Printf("[AUTH] Sync failed: user_id=%s, error=%v", userID, err)
			}
		} else {
			// User exists, update if context email changed and not empty
			if email != "" && existingUser.Email != email {
				existingUser.Email = email
				existingUser.UpdatedAt = time.Now()
				if err := userRepo.Update(existingUser); err != nil {
					log.Printf("[AUTH] Sync failed: user_id=%s, error=%v", userID, err)
				} else {
					log.Printf("[AUTH] User updated: email=%s, user_id=%s", email, userID)
				}
			}
		}

		c.Next()
	}
}

// VerifyJWTToken parses and validates a JWT token using Clerk's public key or dev fallback
func VerifyJWTToken(tokenStr string) (string, string, error) {
	appEnv := os.Getenv("APP_ENV")
	if appEnv == "" {
		appEnv = "development"
	}

	secretKey := os.Getenv("CLERK_SECRET_KEY")

	if secretKey != "" {
		clerk.SetKey(secretKey)
		claims, err := clerkjwt.Verify(context.Background(), &clerkjwt.VerifyParams{
			Token: tokenStr,
			CustomClaimsConstructor: func(ctx context.Context) any {
				return &ClerkCustomClaims{}
			},
		})
		if err != nil {
			return "", "", fmt.Errorf("invalid token: %w", err)
		}
		
		var email string
		if customClaims, ok := claims.Custom.(*ClerkCustomClaims); ok && customClaims != nil {
			if customClaims.Email != "" {
				email = customClaims.Email
			} else if len(customClaims.Emails) > 0 {
				email = customClaims.Emails[0]
			}
		}
		return claims.Subject, email, nil
	} else if appEnv == "development" {
		// Dev fallback
		claims := jwt.MapClaims{}
		parser := jwt.Parser{}
		_, _, err := parser.ParseUnverified(tokenStr, claims)
		if err != nil {
			return "", "", fmt.Errorf("invalid token: %w", err)
		}

		userID, _ := claims["sub"].(string)
		var email string
		if emailVal, ok := claims["email"].(string); ok {
			email = emailVal
		} else if emailsList, ok := claims["emails"].([]interface{}); ok && len(emailsList) > 0 {
			if emailStr, ok := emailsList[0].(string); ok {
				email = emailStr
			}
		}
		return userID, email, nil
	} else {
		return "", "", fmt.Errorf("security verification keys are missing on the server")
	}
}
