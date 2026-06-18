package broker

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"os"
	"sort"
	"strings"
	"time"

	"stockox-backend/database/models"
	"stockox-backend/database/repositories"
	brokerAdapters "stockox-backend/pkg/broker/adapters"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BrokerService orchestrates all broker connectivity operations.
// Stockox is READ-ONLY: we never place trades.
type BrokerService struct {
	db         *gorm.DB
	brokerRepo repositories.BrokerRepository
	encKey     []byte // 32-byte AES-256 key
}

// NewBrokerService constructs the BrokerService.
func NewBrokerService(db *gorm.DB, brokerRepo repositories.BrokerRepository) *BrokerService {
	keyStr := os.Getenv("BROKER_ENCRYPTION_KEY")
	if len(keyStr) == 0 {
		keyStr = "stockox_broker_enc_key_32bytes__" // dev default – MUST be replaced in prod
	}
	// Ensure key is exactly 32 bytes
	key := []byte(keyStr)
	if len(key) > 32 {
		key = key[:32]
	}
	for len(key) < 32 {
		key = append(key, '0')
	}
	return &BrokerService{db: db, brokerRepo: brokerRepo, encKey: key}
}

// ─── Token Encryption ──────────────────────────────────────────────────────────

func (s *BrokerService) encrypt(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}
	block, err := aes.NewCipher(s.encKey)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func (s *BrokerService) decrypt(ciphertext string) (string, error) {
	if ciphertext == "" {
		return "", nil
	}
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(s.encKey)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}
	plaintext, err := gcm.Open(nil, data[:nonceSize], data[nonceSize:], nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

// ─── Connect ───────────────────────────────────────────────────────────────────

// ConnectBroker authenticates to a broker and stores the account in the database.
func (s *BrokerService) ConnectBroker(userID string, req ConnectBrokerRequest) (*BrokerAccountResponse, error) {
	adapter, err := brokerAdapters.NewBrokerAdapter(req.BrokerSlug)
	if err != nil {
		return nil, fmt.Errorf("unsupported broker: %s", req.BrokerSlug)
	}

	// Authenticate
	authReq := brokerAdapters.AuthRequest{
		APIKey:    req.APIKey,
		APISecret: req.APISecret,
		Token:     req.Token,
		AuthCode:  req.AuthCode,
		ClientID:  req.ClientID,
	}
	authResult, err := adapter.Authenticate(authReq)
	if err != nil {
		return nil, fmt.Errorf("broker authentication failed: %w", err)
	}

	// Encrypt tokens
	encAccess, err := s.encrypt(authResult.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt access token: %w", err)
	}
	encRefresh, err := s.encrypt(authResult.RefreshToken)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt refresh token: %w", err)
	}

	// Fetch profile to get clientID if not set
	clientID := authResult.ClientID
	if clientID == "" {
		profile, profileErr := adapter.FetchProfile(authResult.AccessToken)
		if profileErr == nil && profile != nil {
			clientID = profile.ClientID
		}
	}

	account := &models.BrokerAccount{
		UserID:       userID,
		BrokerSlug:   req.BrokerSlug,
		BrokerName:   adapter.Name(),
		AccountType:  req.AccountType,
		AccountLabel: req.AccountLabel,
		AuthType:     req.AuthType,
		AccessToken:  encAccess,
		RefreshToken: encRefresh,
		TokenExpiry:  authResult.TokenExpiry,
		ClientID:     clientID,
		Status:       "connected",
	}
	if account.AccountType == "" {
		account.AccountType = "personal"
	}

	if err := s.brokerRepo.CreateAccount(account); err != nil {
		return nil, fmt.Errorf("failed to save broker account: %w", err)
	}

	// Store default permissions
	perms := []string{"read:holdings", "read:transactions", "read:profile"}
	for _, perm := range perms {
		now := time.Now()
		_ = s.brokerRepo.UpsertPermission(&models.AccountPermission{
			BrokerAccountID: account.ID,
			Permission:      perm,
			Granted:         true,
			GrantedAt:       &now,
		})
	}

	return s.toAccountResponse(account), nil
}

// DisconnectBroker revokes and removes a broker account.
func (s *BrokerService) DisconnectBroker(userID string, accountID uuid.UUID) error {
	account, err := s.brokerRepo.GetAccountByID(accountID)
	if err != nil {
		return fmt.Errorf("account not found: %w", err)
	}
	if account.UserID != userID {
		return fmt.Errorf("unauthorized")
	}
	return s.brokerRepo.SoftDeleteAccount(accountID)
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

func (s *BrokerService) ListAccounts(userID string) ([]BrokerAccountResponse, error) {
	accounts, err := s.brokerRepo.ListAccountsByUser(userID)
	if err != nil {
		return nil, err
	}
	resp := make([]BrokerAccountResponse, 0, len(accounts))
	for _, a := range accounts {
		acc := a
		resp = append(resp, *s.toAccountResponse(&acc))
	}
	return resp, nil
}

func (s *BrokerService) GetAccountStatus(userID string, accountID uuid.UUID) (*SyncStatusResponse, error) {
	account, err := s.brokerRepo.GetAccountByID(accountID)
	if err != nil {
		return nil, err
	}
	if account.UserID != userID {
		return nil, fmt.Errorf("unauthorized")
	}
	latestSync, _ := s.brokerRepo.GetLatestSync(accountID)
	resp := &SyncStatusResponse{
		AccountID: accountID,
		Status:    account.Status,
		LastSyncAt: account.LastSyncAt,
	}
	if latestSync != nil {
		resp.SyncID = latestSync.ID
		resp.SyncStatus = latestSync.Status
		resp.HoldingsFetched = latestSync.HoldingsFetched
		resp.NewPositions = latestSync.NewPositions
	}
	return resp, nil
}

// ─── Sync ──────────────────────────────────────────────────────────────────────

// SyncBroker fetches latest holdings and transactions from the broker.
func (s *BrokerService) SyncBroker(userID string, accountID uuid.UUID, triggerType string) (*SyncStatusResponse, error) {
	account, err := s.brokerRepo.GetAccountByID(accountID)
	if err != nil {
		return nil, fmt.Errorf("account not found: %w", err)
	}
	if account.UserID != userID {
		return nil, fmt.Errorf("unauthorized")
	}

	// Mark account as syncing
	_ = s.brokerRepo.UpdateAccountStatus(accountID, "syncing", "")

	// Create sync record
	now := time.Now()
	syncRecord := &models.BrokerSync{
		BrokerAccountID: accountID,
		Status:          "running",
		TriggerType:     triggerType,
		StartedAt:       now,
	}
	if err := s.brokerRepo.CreateSync(syncRecord); err != nil {
		return nil, fmt.Errorf("failed to create sync record: %w", err)
	}

	// Get adapter
	adapter, err := brokerAdapters.NewBrokerAdapter(account.BrokerSlug)
	if err != nil {
		s.failSync(syncRecord, accountID, "adapter error: "+err.Error())
		return nil, err
	}

	// Decrypt token
	accessToken, err := s.decrypt(account.AccessToken)
	if err != nil || accessToken == "" {
		s.failSync(syncRecord, accountID, "token decryption failed")
		return nil, fmt.Errorf("failed to decrypt access token")
	}

	// Fetch holdings
	holdings, err := adapter.FetchHoldings(accessToken)
	if err != nil {
		s.failSync(syncRecord, accountID, "holdings fetch failed: "+err.Error())
		return nil, fmt.Errorf("failed to fetch holdings: %w", err)
	}

	// Get existing active holdings for diff
	existing, _ := s.brokerRepo.GetActiveHoldings(accountID)
	existingMap := make(map[string]*models.PortfolioImport)
	for i := range existing {
		existingMap[existing[i].Ticker] = &existing[i]
	}

	newPositions := 0
	changedQty := 0

	for _, h := range holdings {
		isNew := false
		if old, found := existingMap[h.Ticker]; !found {
			isNew = true
			newPositions++
			_ = s.brokerRepo.CreateSyncLog(&models.SyncLog{
				BrokerSyncID: syncRecord.ID,
				ChangeType:   "new_position",
				Ticker:       h.Ticker,
				NewValue:     fmt.Sprintf("qty=%.4f avg=%.4f", h.Quantity, h.AveragePrice),
			})
		} else if math.Abs(old.Quantity-h.Quantity) > 0.0001 {
			changedQty++
			_ = s.brokerRepo.CreateSyncLog(&models.SyncLog{
				BrokerSyncID: syncRecord.ID,
				ChangeType:   "qty_change",
				Ticker:       h.Ticker,
				OldValue:     fmt.Sprintf("%.4f", old.Quantity),
				NewValue:     fmt.Sprintf("%.4f", h.Quantity),
			})
		}
		_ = isNew

		_ = s.brokerRepo.UpsertHolding(&models.PortfolioImport{
			BrokerAccountID: accountID,
			BrokerSyncID:    syncRecord.ID,
			Ticker:          h.Ticker,
			CompanyName:     h.CompanyName,
			Quantity:        h.Quantity,
			AveragePrice:    h.AveragePrice,
			CurrentPrice:    h.CurrentPrice,
			CurrentValue:    h.CurrentValue,
			PnL:             h.PnL,
			PnLPercent:      h.PnLPercent,
			Sector:          h.Sector,
			Exchange:        h.Exchange,
			AssetType:       h.AssetType,
			Currency:        h.Currency,
			IsActive:        true,
		})
		delete(existingMap, h.Ticker)
	}

	// Remaining in existingMap = closed positions
	closedPositions := 0
	for ticker := range existingMap {
		closedPositions++
		_ = s.brokerRepo.CreateSyncLog(&models.SyncLog{
			BrokerSyncID: syncRecord.ID,
			ChangeType:   "closed_position",
			Ticker:       ticker,
		})
	}

	// Fetch transactions (last 90 days)
	fromDate := time.Now().AddDate(0, -3, 0)
	txs, _ := adapter.FetchTransactions(accessToken, fromDate)
	for _, tx := range txs {
		_ = s.brokerRepo.UpsertTransaction(&models.BrokerTransaction{
			BrokerAccountID: accountID,
			BrokerTxID:      tx.BrokerTxID,
			Ticker:          tx.Ticker,
			CompanyName:     tx.CompanyName,
			TxType:          tx.TxType,
			Quantity:        tx.Quantity,
			Price:           tx.Price,
			TotalValue:      tx.TotalValue,
			Currency:        tx.Currency,
			Exchange:        tx.Exchange,
			TxAt:            tx.TxAt,
		})
	}

	// Complete sync
	completed := time.Now()
	syncRecord.Status = "completed"
	syncRecord.HoldingsFetched = len(holdings)
	syncRecord.NewPositions = newPositions
	syncRecord.ClosedPositions = closedPositions
	syncRecord.ChangedQty = changedQty
	syncRecord.CompletedAt = &completed
	_ = s.brokerRepo.UpdateSync(syncRecord)
	_ = s.brokerRepo.UpdateLastSync(accountID, completed)

	return &SyncStatusResponse{
		AccountID:       accountID,
		SyncID:          syncRecord.ID,
		Status:          "connected",
		SyncStatus:      "completed",
		HoldingsFetched: len(holdings),
		NewPositions:    newPositions,
		ClosedPositions: closedPositions,
		LastSyncAt:      &completed,
	}, nil
}

func (s *BrokerService) failSync(syncRecord *models.BrokerSync, accountID uuid.UUID, msg string) {
	syncRecord.Status = "failed"
	syncRecord.ErrorMessage = msg
	_ = s.brokerRepo.UpdateSync(syncRecord)
	_ = s.brokerRepo.UpdateAccountStatus(accountID, "error", msg)
}

// ─── Holdings ─────────────────────────────────────────────────────────────────

func (s *BrokerService) GetHoldings(userID string, accountID uuid.UUID) ([]HoldingResponse, error) {
	account, err := s.brokerRepo.GetAccountByID(accountID)
	if err != nil || account.UserID != userID {
		return nil, fmt.Errorf("account not found or unauthorized")
	}
	holdings, err := s.brokerRepo.GetActiveHoldings(accountID)
	if err != nil {
		return nil, err
	}
	resp := make([]HoldingResponse, 0, len(holdings))
	for _, h := range holdings {
		resp = append(resp, HoldingResponse{
			Ticker:       h.Ticker,
			CompanyName:  h.CompanyName,
			Quantity:     h.Quantity,
			AveragePrice: h.AveragePrice,
			CurrentPrice: h.CurrentPrice,
			CurrentValue: h.CurrentValue,
			PnL:          h.PnL,
			PnLPercent:   h.PnLPercent,
			Sector:       h.Sector,
			Exchange:     h.Exchange,
			AssetType:    h.AssetType,
			Currency:     h.Currency,
		})
	}
	return resp, nil
}

// ─── Transactions ─────────────────────────────────────────────────────────────

func (s *BrokerService) GetTransactions(userID string, accountID uuid.UUID, limit, offset int) (*TransactionPage, error) {
	account, err := s.brokerRepo.GetAccountByID(accountID)
	if err != nil || account.UserID != userID {
		return nil, fmt.Errorf("account not found or unauthorized")
	}
	total, _ := s.brokerRepo.CountTransactions(accountID)
	txs, err := s.brokerRepo.ListTransactions(accountID, limit, offset)
	if err != nil {
		return nil, err
	}
	items := make([]TransactionResponse, 0, len(txs))
	for _, t := range txs {
		items = append(items, TransactionResponse{
			ID:          t.ID,
			BrokerTxID:  t.BrokerTxID,
			Ticker:      t.Ticker,
			CompanyName: t.CompanyName,
			TxType:      t.TxType,
			Quantity:    t.Quantity,
			Price:       t.Price,
			TotalValue:  t.TotalValue,
			Currency:    t.Currency,
			Exchange:    t.Exchange,
			TxAt:        t.TxAt,
		})
	}
	return &TransactionPage{Total: total, Items: items}, nil
}

// ─── Account Health ────────────────────────────────────────────────────────────

func (s *BrokerService) GetAccountHealth(userID string, accountID uuid.UUID) (*AccountHealthResponse, error) {
	account, err := s.brokerRepo.GetAccountByID(accountID)
	if err != nil || account.UserID != userID {
		return nil, fmt.Errorf("account not found or unauthorized")
	}
	holdings, err := s.brokerRepo.GetActiveHoldings(accountID)
	if err != nil {
		return nil, err
	}

	var totalValue, totalPnL, totalInvested float64
	openPositions := 0
	for _, h := range holdings {
		totalValue += h.CurrentValue
		totalPnL += h.PnL
		totalInvested += h.Quantity * h.AveragePrice
		openPositions++
	}

	pnlPct := 0.0
	if totalInvested > 0 {
		pnlPct = (totalPnL / totalInvested) * 100
	}

	return &AccountHealthResponse{
		AccountID:      accountID,
		BrokerName:     account.BrokerName,
		TotalValue:     totalValue,
		TotalPnL:       totalPnL,
		TotalPnLPct:    pnlPct,
		DailyPnL:       0, // Would require real-time price delta
		DailyPnLPct:    0,
		MonthlyPnL:     0, // Requires historical snapshot comparison
		AnnualPnL:      0,
		OpenPositions:  openPositions,
		LastSyncAt:     account.LastSyncAt,
	}, nil
}

// ─── Broker Insights ──────────────────────────────────────────────────────────

func (s *BrokerService) GetBrokerInsights(userID string, accountID uuid.UUID) ([]BrokerInsightResponse, error) {
	account, err := s.brokerRepo.GetAccountByID(accountID)
	if err != nil || account.UserID != userID {
		return nil, fmt.Errorf("account not found or unauthorized")
	}
	holdings, err := s.brokerRepo.GetActiveHoldings(accountID)
	if err != nil || len(holdings) == 0 {
		return []BrokerInsightResponse{}, nil
	}

	// Compute total portfolio value
	totalValue := 0.0
	for _, h := range holdings {
		totalValue += h.CurrentValue
	}

	insights := []BrokerInsightResponse{}

	// Sector concentration
	sectorMap := map[string]float64{}
	for _, h := range holdings {
		sec := h.Sector
		if sec == "" {
			sec = "Unknown"
		}
		sectorMap[sec] += h.CurrentValue
	}
	type sectorEntry struct {
		name  string
		value float64
	}
	var sectors []sectorEntry
	for name, val := range sectorMap {
		sectors = append(sectors, sectorEntry{name, val})
	}
	sort.Slice(sectors, func(i, j int) bool { return sectors[i].value > sectors[j].value })

	for _, sec := range sectors {
		pct := (sec.value / totalValue) * 100
		if pct > 30 {
			insights = append(insights, BrokerInsightResponse{
				Type:     "overexposed_sector",
				Severity: "warning",
				Title:    fmt.Sprintf("High Concentration in %s", sec.name),
				Message:  fmt.Sprintf("%.0f%% of your portfolio is in %s. Consider diversifying.", pct, sec.name),
			})
		} else if pct < 5 && sec.name != "Unknown" {
			insights = append(insights, BrokerInsightResponse{
				Type:     "underexposed_sector",
				Severity: "info",
				Title:    fmt.Sprintf("Low Exposure to %s", sec.name),
				Message:  fmt.Sprintf("Only %.1f%% in %s. This sector may offer growth potential.", pct, sec.name),
			})
		}
	}

	// Single stock overexposure
	for _, h := range holdings {
		pct := (h.CurrentValue / totalValue) * 100
		if pct > 25 {
			insights = append(insights, BrokerInsightResponse{
				Type:     "overexposed_stock",
				Severity: "warning",
				Title:    fmt.Sprintf("Overexposed to %s", h.Ticker),
				Message:  fmt.Sprintf("%s represents %.0f%% of your portfolio. High single-stock risk.", h.Ticker, pct),
			})
		}
	}

	// Missing diversified sectors
	healthcareMissing := true
	for _, sec := range sectors {
		if strings.Contains(strings.ToLower(sec.name), "health") {
			healthcareMissing = false
		}
	}
	if healthcareMissing {
		insights = append(insights, BrokerInsightResponse{
			Type:     "missing_sector",
			Severity: "info",
			Title:    "No Healthcare Exposure",
			Message:  "Your portfolio has no healthcare holdings. Consider adding defensive sector exposure.",
		})
	}

	return insights, nil
}

// ─── Security ─────────────────────────────────────────────────────────────────

func (s *BrokerService) GetSecurityInfo(userID string, accountID uuid.UUID) (*SecurityInfoResponse, error) {
	account, err := s.brokerRepo.GetAccountByID(accountID)
	if err != nil || account.UserID != userID {
		return nil, fmt.Errorf("account not found or unauthorized")
	}
	perms, _ := s.brokerRepo.ListPermissions(accountID)
	syncs, _ := s.brokerRepo.ListSyncs(accountID, 10)

	permResp := make([]PermissionResponse, 0, len(perms))
	for _, p := range perms {
		permResp = append(permResp, PermissionResponse{
			Permission: p.Permission,
			Granted:    p.Granted,
			GrantedAt:  p.GrantedAt,
		})
	}

	syncResp := make([]SyncHistoryItem, 0, len(syncs))
	for _, sy := range syncs {
		syncResp = append(syncResp, SyncHistoryItem{
			ID:          sy.ID,
			Status:      sy.Status,
			TriggerType: sy.TriggerType,
			StartedAt:   sy.StartedAt,
			CompletedAt: sy.CompletedAt,
		})
	}

	return &SecurityInfoResponse{
		AccountID:   accountID,
		BrokerName:  account.BrokerName,
		AuthType:    account.AuthType,
		TokenExpiry: account.TokenExpiry,
		LastSyncAt:  account.LastSyncAt,
		Permissions: permResp,
		SyncHistory: syncResp,
	}, nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func (s *BrokerService) toAccountResponse(a *models.BrokerAccount) *BrokerAccountResponse {
	// Redact tokens
	tokenExpiry := ""
	if a.TokenExpiry != nil {
		tokenExpiry = a.TokenExpiry.Format(time.RFC3339)
	}
	lastSync := ""
	if a.LastSyncAt != nil {
		lastSync = a.LastSyncAt.Format(time.RFC3339)
	}
	return &BrokerAccountResponse{
		ID:           a.ID,
		BrokerSlug:   a.BrokerSlug,
		BrokerName:   a.BrokerName,
		AccountType:  a.AccountType,
		AccountLabel: a.AccountLabel,
		AuthType:     a.AuthType,
		ClientID:     a.ClientID,
		Status:       a.Status,
		TokenExpiry:  tokenExpiry,
		LastSyncAt:   lastSync,
		CreatedAt:    a.CreatedAt,
	}
}

// ImportPortfolio manually imports a JSON portfolio payload.
func (s *BrokerService) ImportPortfolio(userID string, accountID uuid.UUID, payload string) error {
	account, err := s.brokerRepo.GetAccountByID(accountID)
	if err != nil || account.UserID != userID {
		return fmt.Errorf("account not found or unauthorized")
	}

	var holdings []brokerAdapters.BrokerHolding
	if err := json.Unmarshal([]byte(payload), &holdings); err != nil {
		return fmt.Errorf("invalid holdings payload: %w", err)
	}

	now := time.Now()
	sync := &models.BrokerSync{
		BrokerAccountID: accountID,
		Status:          "running",
		TriggerType:     "import",
		StartedAt:       now,
	}
	_ = s.brokerRepo.CreateSync(sync)

	for _, h := range holdings {
		_ = s.brokerRepo.UpsertHolding(&models.PortfolioImport{
			BrokerAccountID: accountID,
			BrokerSyncID:    sync.ID,
			Ticker:          h.Ticker,
			CompanyName:     h.CompanyName,
			Quantity:        h.Quantity,
			AveragePrice:    h.AveragePrice,
			CurrentPrice:    h.CurrentPrice,
			CurrentValue:    h.CurrentValue,
			PnL:             h.PnL,
			PnLPercent:      h.PnLPercent,
			Sector:          h.Sector,
			Exchange:        h.Exchange,
			AssetType:       h.AssetType,
			Currency:        h.Currency,
			IsActive:        true,
		})
	}

	completed := time.Now()
	sync.Status = "completed"
	sync.HoldingsFetched = len(holdings)
	sync.CompletedAt = &completed
	_ = s.brokerRepo.UpdateSync(sync)
	_ = s.brokerRepo.UpdateLastSync(accountID, completed)
	return nil
}

// ListBrokers returns the catalog of all supported brokers.
func (s *BrokerService) ListBrokers() []brokerAdapters.BrokerInfo {
	return brokerAdapters.SupportedBrokers()
}
