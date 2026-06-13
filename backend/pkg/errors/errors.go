package errors

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type ErrorResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func JSONError(c *gin.Context, statusCode int, message string) {
	c.AbortWithStatusJSON(statusCode, ErrorResponse{
		Success: false,
		Message: message,
	})
}

func InternalServerError(c *gin.Context, message string) {
	JSONError(c, http.StatusInternalServerError, message)
}

func BadRequestError(c *gin.Context, message string) {
	JSONError(c, http.StatusBadRequest, message)
}

func UnauthorizedError(c *gin.Context, message string) {
	JSONError(c, http.StatusUnauthorized, message)
}
