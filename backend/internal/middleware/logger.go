package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		statusCode := c.Writer.Status()
		
		var userIDStr string
		if uVal, exists := c.Get("UserID"); exists {
			userIDStr = fmt.Sprintf("%v", uVal)
		} else {
			userIDStr = "anonymous"
		}

		reqID, _ := c.Get("RequestID")

		if raw != "" {
			path = path + "?" + raw
		}

		errStr := ""
		if len(c.Errors) > 0 {
			errStr = c.Errors.String()
		}

		log.Printf("[API-LOG] RequestID: %v | UserID: %s | Method: %s | Path: %s | Status: %d | Latency: %s | Errors: %s",
			reqID, userIDStr, c.Request.Method, path, statusCode, latency, errStr)
	}
}

// Import helper
import "fmt"
