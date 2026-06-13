package middleware

import (
	"sync"
	"time"

	"stockox-backend/internal/errors"

	"github.com/gin-gonic/gin"
)

type clientLimiter struct {
	tokens    float64
	lastCheck time.Time
}

func RateLimiter(rps float64, burst int) gin.HandlerFunc {
	var mu sync.Mutex
	clients := make(map[string]*clientLimiter)

	return func(c *gin.Context) {
		ip := c.ClientIP()

		mu.Lock()
		lim, exists := clients[ip]
		now := time.Now()

		if !exists {
			lim = &clientLimiter{
				tokens:    float64(burst),
				lastCheck: now,
			}
			clients[ip] = lim
		}

		// Add new tokens based on time elapsed
		elapsed := now.Sub(lim.lastCheck).Seconds()
		lim.tokens += elapsed * rps
		if lim.tokens > float64(burst) {
			lim.tokens = float64(burst)
		}
		lim.lastCheck = now

		if lim.tokens >= 1.0 {
			lim.tokens -= 1.0
			mu.Unlock()
			c.Next()
		} else {
			mu.Unlock()
			errors.JSONError(c, 429, "Rate limit exceeded. Too many requests to the Terminal.")
		}
	}
}
