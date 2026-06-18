package auth

import (
	"bytes"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"stockox-backend/database/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

// Mock repositories implementation
type MockUserRepository struct {
	users map[string]*models.User
	err   error
}

func (m *MockUserRepository) GetByID(id string) (*models.User, error) {
	if m.err != nil {
		return nil, m.err
	}
	u, ok := m.users[id]
	if !ok {
		return nil, gorm.ErrRecordNotFound
	}
	return u, nil
}

func (m *MockUserRepository) GetByClerkID(clerkID string) (*models.User, error) {
	if m.err != nil {
		return nil, m.err
	}
	for _, u := range m.users {
		if u.ClerkID == clerkID {
			return u, nil
		}
	}
	return nil, gorm.ErrRecordNotFound
}

func (m *MockUserRepository) GetByEmail(email string) (*models.User, error) {
	if m.err != nil {
		return nil, m.err
	}
	for _, u := range m.users {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, gorm.ErrRecordNotFound
}

func (m *MockUserRepository) Create(user *models.User) error {
	if m.err != nil {
		return m.err
	}
	m.users[user.ID] = user
	return nil
}

func (m *MockUserRepository) Update(user *models.User) error {
	if m.err != nil {
		return m.err
	}
	m.users[user.ID] = user
	return nil
}

func (m *MockUserRepository) UpdateID(oldID, newID string) error {
	if m.err != nil {
		return m.err
	}
	if u, ok := m.users[oldID]; ok {
		delete(m.users, oldID)
		u.ID = newID
		m.users[newID] = u
	}
	return nil
}

func (m *MockUserRepository) Delete(id string) error {
	if m.err != nil {
		return m.err
	}
	delete(m.users, id)
	return nil
}

func (m *MockUserRepository) Upsert(user *models.User) error {
	if m.err != nil {
		return m.err
	}
	m.users[user.ID] = user
	return nil
}

type MockPortfolioRepository struct {
	portfolios map[string]*models.Portfolio
	holdings   []*models.PortfolioHolding
}

func (m *MockPortfolioRepository) GetByUserID(userID string) (*models.Portfolio, error) {
	p, ok := m.portfolios[userID]
	if !ok {
		return nil, errors.New("record not found")
	}
	return p, nil
}

func (m *MockPortfolioRepository) GetByUserIDAndMode(userID string, mode string) (*models.Portfolio, error) {
	p, ok := m.portfolios[userID]
	if !ok {
		return nil, errors.New("record not found")
	}
	return p, nil
}

func (m *MockPortfolioRepository) GetHoldings(portfolioID uuid.UUID) ([]models.PortfolioHolding, error) {
	var result []models.PortfolioHolding
	for _, h := range m.holdings {
		if h.PortfolioID == portfolioID {
			result = append(result, *h)
		}
	}
	return result, nil
}

func (m *MockPortfolioRepository) Create(portfolio *models.Portfolio) error {
	m.portfolios[portfolio.UserID] = portfolio
	return nil
}

func (m *MockPortfolioRepository) Update(portfolio *models.Portfolio) error {
	m.portfolios[portfolio.UserID] = portfolio
	return nil
}

func (m *MockPortfolioRepository) AddHolding(holding *models.PortfolioHolding) error {
	m.holdings = append(m.holdings, holding)
	return nil
}

func (m *MockPortfolioRepository) UpdateHolding(holding *models.PortfolioHolding) error {
	return nil
}

func (m *MockPortfolioRepository) RemoveHolding(holdingID uuid.UUID) error {
	return nil
}

type MockWatchlistRepository struct {
	items []models.Watchlist
}

func (m *MockWatchlistRepository) GetByUserID(userID string) ([]models.Watchlist, error) {
	var result []models.Watchlist
	for _, w := range m.items {
		if w.UserID == userID {
			result = append(result, w)
		}
	}
	return result, nil
}

func (m *MockWatchlistRepository) GetByUserIDPaginated(userID string, page, limit int) ([]models.Watchlist, int64, error) {
	var result []models.Watchlist
	var count int64
	for _, w := range m.items {
		if w.UserID == userID {
			result = append(result, w)
			count++
		}
	}
	// Basic slicing for pagination
	start := (page - 1) * limit
	if start > len(result) {
		return []models.Watchlist{}, count, nil
	}
	end := start + limit
	if end > len(result) {
		end = len(result)
	}
	return result[start:end], count, nil
}

func (m *MockWatchlistRepository) Add(userID string, ticker string, companyName string) (*models.Watchlist, error) {
	item := models.Watchlist{
		ID:        uuid.New(),
		UserID:    userID,
		Ticker:    ticker,
		CreatedAt: time.Now(),
	}
	m.items = append(m.items, item)
	return &item, nil
}

func (m *MockWatchlistRepository) Remove(userID string, ticker string) error {
	return nil
}

func TestHandleClerkWebhook_UserCreated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	userRepo := &MockUserRepository{users: make(map[string]*models.User)}
	portfolioRepo := &MockPortfolioRepository{portfolios: make(map[string]*models.Portfolio)}
	watchlistRepo := &MockWatchlistRepository{}

	// No webhook secret configured so signature verification is skipped
	ctrl := NewWebhookController(userRepo, portfolioRepo, watchlistRepo, "")

	r := gin.New()
	r.POST("/api/v1/webhooks/clerk", ctrl.HandleClerkWebhook)

	// Sample Clerk user.created event payload
	payload := `{
		"data": {
			"id": "user_2tXyV6z5oW83qT1OFmBnTmaoOtA",
			"first_name": "Test",
			"last_name": "User",
			"image_url": "https://img.clerk.com/test.jpg",
			"primary_email_address_id": "idn_email123",
			"email_addresses": [
				{
					"id": "idn_email123",
					"email_address": "testuser@example.com"
				}
			]
		},
		"type": "user.created"
	}`

	req, _ := http.NewRequest(http.MethodPost, "/api/v1/webhooks/clerk", bytes.NewBufferString(payload))
	req.Header.Set("Content-Type", "application/json")
	// Set mock Svix headers
	req.Header.Set("svix-id", "msg_123")
	req.Header.Set("svix-timestamp", "1624000000")
	req.Header.Set("svix-signature", "v1,abc")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "success")

	// Verify user is provisioned in our repository
	user, err := userRepo.GetByID("user_2tXyV6z5oW83qT1OFmBnTmaoOtA")
	assert.NoError(t, err)
	assert.Equal(t, "testuser@example.com", user.Email)
	assert.Equal(t, "Test User", user.Name)
	assert.Equal(t, "https://img.clerk.com/test.jpg", user.AvatarURL)

	// Wait for background goroutine to finish provisioning portfolio and watchlist
	time.Sleep(100 * time.Millisecond)

	// Verify portfolio is seeded
	portfolio, err := portfolioRepo.GetByUserID("user_2tXyV6z5oW83qT1OFmBnTmaoOtA")
	assert.NoError(t, err)
	assert.Equal(t, 125400.00, portfolio.TotalValue)

	// Verify watchlist items are seeded
	items, err := watchlistRepo.GetByUserID("user_2tXyV6z5oW83qT1OFmBnTmaoOtA")
	assert.NoError(t, err)
	assert.Len(t, items, 3)
}

func TestHandleClerkWebhook_UserUpdated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	userRepo := &MockUserRepository{
		users: map[string]*models.User{
			"user_123": {
				ID:        "user_123",
				ClerkID:   "user_123",
				Email:     "old@example.com",
				Name:      "Old Name",
				AvatarURL: "old.jpg",
			},
		},
	}
	portfolioRepo := &MockPortfolioRepository{portfolios: make(map[string]*models.Portfolio)}
	watchlistRepo := &MockWatchlistRepository{}

	ctrl := NewWebhookController(userRepo, portfolioRepo, watchlistRepo, "")

	r := gin.New()
	r.POST("/api/v1/webhooks/clerk", ctrl.HandleClerkWebhook)

	payload := `{
		"data": {
			"id": "user_123",
			"first_name": "New",
			"last_name": "Name",
			"image_url": "new.jpg",
			"primary_email_address_id": "idn_email123",
			"email_addresses": [
				{
					"id": "idn_email123",
					"email_address": "new@example.com"
				}
			]
		},
		"type": "user.updated"
	}`

	req, _ := http.NewRequest(http.MethodPost, "/api/v1/webhooks/clerk", bytes.NewBufferString(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("svix-id", "msg_123")
	req.Header.Set("svix-timestamp", "1624000000")
	req.Header.Set("svix-signature", "v1,abc")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	user, err := userRepo.GetByID("user_123")
	assert.NoError(t, err)
	assert.Equal(t, "new@example.com", user.Email)
	assert.Equal(t, "New Name", user.Name)
	assert.Equal(t, "new.jpg", user.AvatarURL)
}

func TestHandleClerkWebhook_UserDeleted(t *testing.T) {
	gin.SetMode(gin.TestMode)

	userRepo := &MockUserRepository{
		users: map[string]*models.User{
			"user_123": {
				ID:        "user_123",
				ClerkID:   "user_123",
				Email:     "user@example.com",
				Name:      "User",
				AvatarURL: "user.jpg",
			},
		},
	}
	portfolioRepo := &MockPortfolioRepository{portfolios: make(map[string]*models.Portfolio)}
	watchlistRepo := &MockWatchlistRepository{}

	ctrl := NewWebhookController(userRepo, portfolioRepo, watchlistRepo, "")

	r := gin.New()
	r.POST("/api/v1/webhooks/clerk", ctrl.HandleClerkWebhook)

	payload := `{
		"data": {
			"id": "user_123"
		},
		"type": "user.deleted"
	}`

	req, _ := http.NewRequest(http.MethodPost, "/api/v1/webhooks/clerk", bytes.NewBufferString(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("svix-id", "msg_123")
	req.Header.Set("svix-timestamp", "1624000000")
	req.Header.Set("svix-signature", "v1,abc")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	_, err := userRepo.GetByID("user_123")
	assert.Error(t, err)
}

func TestSyncUserV1_Created(t *testing.T) {
	gin.SetMode(gin.TestMode)

	userRepo := &MockUserRepository{users: make(map[string]*models.User)}
	portfolioRepo := &MockPortfolioRepository{portfolios: make(map[string]*models.Portfolio)}
	watchlistRepo := &MockWatchlistRepository{}

	syncCtrl := NewSyncController(userRepo, portfolioRepo, watchlistRepo)

	r := gin.New()
	r.POST("/api/v1/auth/sync-user", func(c *gin.Context) {
		c.Set("UserID", "user_123")
		c.Set("UserEmail", "new@example.com")
		c.Next()
	}, syncCtrl.SyncUserV1)

	payload := `{
		"name": "New Name",
		"email": "new@example.com",
		"avatar_url": "new.jpg"
	}`

	req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/sync-user", bytes.NewBufferString(payload))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "success")

	// Verify user is provisioned
	user, err := userRepo.GetByID("user_123")
	assert.NoError(t, err)
	assert.Equal(t, "new@example.com", user.Email)
	assert.Equal(t, "New Name", user.Name)
	assert.Equal(t, "new.jpg", user.AvatarURL)
}

func TestSyncUserV1_Updated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	userRepo := &MockUserRepository{
		users: map[string]*models.User{
			"user_123": {
				ID:        "user_123",
				ClerkID:   "user_123",
				Email:     "old@example.com",
				Name:      "Old Name",
				AvatarURL: "old.jpg",
			},
		},
	}
	portfolioRepo := &MockPortfolioRepository{portfolios: make(map[string]*models.Portfolio)}
	watchlistRepo := &MockWatchlistRepository{}

	syncCtrl := NewSyncController(userRepo, portfolioRepo, watchlistRepo)

	r := gin.New()
	r.POST("/api/v1/auth/sync-user", func(c *gin.Context) {
		c.Set("UserID", "user_123")
		c.Set("UserEmail", "new@example.com")
		c.Next()
	}, syncCtrl.SyncUserV1)

	payload := `{
		"name": "Updated Name",
		"email": "new@example.com",
		"avatar_url": "new.jpg"
	}`

	req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/sync-user", bytes.NewBufferString(payload))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Verify user is updated
	user, err := userRepo.GetByID("user_123")
	assert.NoError(t, err)
	assert.Equal(t, "new@example.com", user.Email)
	assert.Equal(t, "Updated Name", user.Name)
}

func TestDebugCurrentUser(t *testing.T) {
	gin.SetMode(gin.TestMode)

	userRepo := &MockUserRepository{
		users: map[string]*models.User{
			"user_123": {
				ID:        "user_123",
				ClerkID:   "user_123",
				Email:     "user@example.com",
				Name:      "User One",
				AvatarURL: "avatar.jpg",
			},
		},
	}
	portfolioRepo := &MockPortfolioRepository{portfolios: make(map[string]*models.Portfolio)}
	watchlistRepo := &MockWatchlistRepository{}

	syncCtrl := NewSyncController(userRepo, portfolioRepo, watchlistRepo)

	r := gin.New()
	r.GET("/api/v1/debug/current-user", func(c *gin.Context) {
		c.Set("UserID", "user_123")
		c.Next()
	}, syncCtrl.DebugCurrentUser)

	req, _ := http.NewRequest(http.MethodGet, "/api/v1/debug/current-user", nil)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"clerk_id":"user_123"`)
	assert.Contains(t, w.Body.String(), `"email":"user@example.com"`)
	assert.Contains(t, w.Body.String(), `"name":"User One"`)
	assert.Contains(t, w.Body.String(), `"avatar_url":"avatar.jpg"`)
}
