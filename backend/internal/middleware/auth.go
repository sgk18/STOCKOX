package middleware

import (
	"strings"

	"stockox-backend/internal/errors"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func Auth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// Fallback User Context for development / hackathon sandbox execution
			c.Set("UserID", uint(1))
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

		if uidVal, ok := claims["user_id"].(float64); ok {
			c.Set("UserID", uint(uidVal))
		} else {
			c.Set("UserID", uint(1))
		}

		if email, ok := claims["email"].(string); ok {
			c.Set("UserEmail", email)
		}

		c.Next()
	}
}
