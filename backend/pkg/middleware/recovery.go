package middleware

import (
	"log"
	"net/http"
	"runtime/debug"

	"stockox-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("[PANIC-RECOVER] Caught panic error: %v\nStack Trace:\n%s", err, debug.Stack())
				errors.JSONError(c, http.StatusInternalServerError, "An unexpected system recovery event occurred")
			}
		}()
		c.Next()
	}
}
