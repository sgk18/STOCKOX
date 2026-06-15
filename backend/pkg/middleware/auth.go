package middleware

import (
	"crypto/rsa"
	"fmt"
	"log"
	"os"
	"strings"

	"stockox-backend/database/repositories"
	"stockox-backend/pkg/auth"
	"stockox-backend/pkg/errors"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

var clerkRSAPublicKey *rsa.PublicKey

func init() {
	pemKey := os.Getenv("CLERK_PEM_PUBLIC_KEY")
	if pemKey != "" {
		// Replace escaped newlines if passed in inline format
		pemKey = strings.ReplaceAll(pemKey, "\\n", "\n")
		pubKey, err := jwt.ParseRSAPublicKeyFromPEM([]byte(pemKey))
		if err == nil {
			clerkRSAPublicKey = pubKey
			log.Println("[CLERK-AUTH] Successfully parsed RSA public key from CLERK_PEM_PUBLIC_KEY environment variable")
		} else {
			log.Printf("[CLERK-AUTH-WARN] Failed to parse CLERK_PEM_PUBLIC_KEY from environment: %v. RS256 signature verification will fail.", err)
		}
	} else {
		log.Println("[CLERK-AUTH-INFO] CLERK_PEM_PUBLIC_KEY environment variable not set. Signature verification will be skipped in development mode.")
	}
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
		claims := jwt.MapClaims{}

		var tokenValid bool
		var parseErr error

		if clerkRSAPublicKey != nil {
			// Strict RS256 validation using parsed Clerk PEM key
			token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return clerkRSAPublicKey, nil
			})
			parseErr = err
			tokenValid = err == nil && token.Valid
		} else if appEnv == "development" {
			// Dev fallback: parse token claims without checking the signature to simplify local setup
			parser := jwt.Parser{}
			_, _, err := parser.ParseUnverified(tokenStr, claims)
			parseErr = err
			tokenValid = err == nil
			if err == nil {
				log.Println("[CLERK-AUTH-DEV-WARN] Parsed token claims WITHOUT signature verification")
			}
		} else {
			// Production mode but no PEM key configured -> fail secure
			log.Println("[CLERK-AUTH-ERR] Production environment detected but CLERK_PEM_PUBLIC_KEY is not configured")
			errors.UnauthorizedError(c, "Security verification keys are missing on the server")
			return
		}

		if !tokenValid {
			errors.UnauthorizedError(c, fmt.Sprintf("Invalid or expired authorization token: %v", parseErr))
			return
		}

		// Extract Clerk User ID
		if sub, ok := claims["sub"].(string); ok {
			c.Set("UserID", sub)
		} else {
			errors.UnauthorizedError(c, "Invalid token claims: missing sub (user ID)")
			return
		}

		// Extract email if present
		if email, ok := claims["email"].(string); ok {
			c.Set("UserEmail", email)
		} else if emailsList, ok := claims["emails"].([]interface{}); ok && len(emailsList) > 0 {
			if emailStr, ok := emailsList[0].(string); ok {
				c.Set("UserEmail", emailStr)
			}
		}

		userID := c.GetString("UserID")
		log.Printf("[AUTH] Clerk user detected: user_id=%s", userID)

		c.Next()
	}
}

// EnsureUserExists checks if the authenticated user exists in the local database.
// If missing, it JIT provisions their profile, default portfolio, and watchlists.
func EnsureUserExists(
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

		_, err := userRepo.GetByID(userID)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				email := c.GetString("UserEmail")
				if email == "" {
					email = userID + "@clerk.user"
				}
				log.Printf("[AUTH] Sync started: user_id=%s", userID)
				err = auth.ProvisionUser(userRepo, portfolioRepo, watchlistRepo, userID, email, "Adviser", "", "Lead Investment Advisor")
				if err != nil {
					log.Printf("[AUTH] Sync failed: user_id=%s, error=%v", userID, err)
				} else {
					log.Printf("[AUTH] User inserted: email=%s, user_id=%s", email, userID)
				}
			} else {
				log.Printf("[AUTH] Sync failed: user_id=%s, error=%v", userID, err)
			}
		}

		c.Next()
	}
}

// VerifyJWTToken parses and validates a JWT token using Clerk's public key or dev fallback
func VerifyJWTToken(tokenStr string) (string, string, error) {
	claims := jwt.MapClaims{}
	var tokenValid bool
	var parseErr error

	if clerkRSAPublicKey != nil {
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return clerkRSAPublicKey, nil
		})
		parseErr = err
		tokenValid = err == nil && token.Valid
	} else {
		// Dev fallback
		parser := jwt.Parser{}
		_, _, err := parser.ParseUnverified(tokenStr, claims)
		parseErr = err
		tokenValid = err == nil
	}

	if !tokenValid {
		return "", "", fmt.Errorf("invalid token: %w", parseErr)
	}

	userID, _ := claims["sub"].(string)
	email, _ := claims["email"].(string)
	if email == "" {
		if emailsList, ok := claims["emails"].([]interface{}); ok && len(emailsList) > 0 {
			if emailStr, ok := emailsList[0].(string); ok {
				email = emailStr
			}
		}
	}
	return userID, email, nil
}
