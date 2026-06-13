package cache

import (
	"testing"
	"time"
)

func TestCacheFallback(t *testing.T) {
	c := NewMarketCache(nil)
	var quote struct{ Price float64 }

	hit, err := c.Get("test_key", &quote)
	if err != nil {
		t.Fatalf("Expected no error on nil Redis Get, got %v", err)
	}
	if hit {
		t.Fatal("Expected cache miss on nil Redis Get")
	}

	err = c.Set("test_key", quote, 10*time.Second)
	if err != nil {
		t.Fatalf("Expected no error on nil Redis Set, got %v", err)
	}
}
