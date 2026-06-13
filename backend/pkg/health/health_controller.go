package health

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type HealthController struct {
	db  *gorm.DB
	rdb *redis.Client
}

func NewHealthController(db *gorm.DB, rdb *redis.Client) *HealthController {
	return &HealthController{
		db:  db,
		rdb: rdb,
	}
}

// Health checks if server is alive
func (ctrl *HealthController) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "healthy",
	})
}

// HealthDB verifies active PostgreSQL database connection Pings
func (ctrl *HealthController) HealthDB(c *gin.Context) {
	sqlDB, err := ctrl.db.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "unhealthy",
			"details": "Failed to get database handle: " + err.Error(),
		})
		return
	}

	err = sqlDB.Ping()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "unhealthy",
			"details": "Database ping failed: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"details": "Database connectivity verified",
	})
}

// HealthRedis verifies active Redis cache Pings
func (ctrl *HealthController) HealthRedis(c *gin.Context) {
	if ctrl.rdb == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":  "degraded",
			"details": "Redis client not initialized (running in DB-direct fallback mode)",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	err := ctrl.rdb.Ping(ctx).Err()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "unhealthy",
			"details": "Redis ping failed: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"details": "Redis connectivity verified",
	})
}
