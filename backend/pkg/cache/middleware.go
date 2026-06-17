package cache

import (
	"bytes"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type responseBodyWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w responseBodyWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func CacheMiddleware(cache Cache, duration time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method != http.MethodGet {
			c.Next()
			return
		}

		key := "route:" + c.Request.URL.RequestURI()
		var cachedBody []byte
		err := cache.GetJSON(c, key, &cachedBody)
		if err == nil {
			c.Data(http.StatusOK, "application/json; charset=utf-8", cachedBody)
			c.Abort()
			return
		}

		w := &responseBodyWriter{body: &bytes.Buffer{}, ResponseWriter: c.Writer}
		c.Writer = w
		c.Next()

		if c.Writer.Status() == http.StatusOK {
			_ = cache.SetJSON(c, key, w.body.Bytes(), duration)
		}
	}
}
