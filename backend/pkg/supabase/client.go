package supabase

import (
	"fmt"
	"net/http"
	"os"
	"time"
)

// Client represents a lightweight helper to interact with Supabase APIs.
type Client struct {
	URL            string
	AnonKey        string
	ServiceRoleKey string
	HTTPClient     *http.Client
}

// NewClient creates a new Client instance reading from environment variables.
func NewClient() (*Client, error) {
	url := os.Getenv("SUPABASE_URL")
	anonKey := os.Getenv("SUPABASE_ANON_KEY")
	serviceRoleKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	if url == "" {
		return nil, fmt.Errorf("SUPABASE_URL is not configured in environment")
	}

	return &Client{
		URL:            url,
		AnonKey:        anonKey,
		ServiceRoleKey: serviceRoleKey,
		HTTPClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}, nil
}

// GetHeaders constructs HTTP headers using either Anon or Service Role keys.
func (c *Client) GetHeaders(useServiceRole bool) http.Header {
	headers := make(http.Header)
	headers.Set("apikey", c.AnonKey)
	if useServiceRole && c.ServiceRoleKey != "" {
		headers.Set("Authorization", "Bearer "+c.ServiceRoleKey)
	} else {
		headers.Set("Authorization", "Bearer "+c.AnonKey)
	}
	headers.Set("Content-Type", "application/json")
	return headers
}
