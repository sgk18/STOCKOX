package middleware

import (
	"strings"

	"stockox-backend/internal/errors"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func Auth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// Fallback User Context for development / hackathon sandbox execution
			defaultUUID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
			c.Set("UserID", defaultUUID)
			c.Set("UserEmail", "suryachalam.vm@bsccmh.christuniversity.in")
			c.Next()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			errors.UnauthorizedError(c, "Authorization header format must be Bearer {token}")
			return
		}

		tokenStr := parts[1]
		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			errors.UnauthorizedError(c, "Invalid or expired authorization token")
			return
		}

		if sub, ok := claims["sub"].(string); ok {
			c.Set("UserSub", sub)
		}

		if uidVal, ok := claims["user_id"].(string); ok {
			if parsed, err := uuid.Parse(uidVal); err == nil {
				c.Set("UserID", parsed)
			} else {
				c.Set("UserID", uuid.MustParse("00000000-0000-0000-0000-000000000001"))
			}
		} else {
			c.Set("UserID", uuid.MustParse("00000000-0000-0000-0000-000000000001"))
		}

		if email, ok := claims["email"].(string); ok {
			c.Set("UserEmail", email)
		}

		c.Next()
	}
}
