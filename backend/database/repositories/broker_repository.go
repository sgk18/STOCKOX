package repositories

import (
	"fmt"
	"stockox-backend/database/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BrokerRepository defines all data access operations for broker entities.
type BrokerRepository interface {
	// BrokerAccount
	CreateAccount(account *models.BrokerAccount) error
	GetAccountByID(id uuid.UUID) (*models.BrokerAccount, error)
	ListAccountsByUser(userID string) ([]models.BrokerAccount, error)
	UpdateAccount(account *models.BrokerAccount) error
	SoftDeleteAccount(id uuid.UUID) error
	UpdateAccountStatus(id uuid.UUID, status string, errMsg string) error
	UpdateLastSync(id uuid.UUID, syncAt time.Time) error

	// BrokerSync
	CreateSync(sync *models.BrokerSync) error
	UpdateSync(sync *models.BrokerSync) error
	GetLatestSync(accountID uuid.UUID) (*models.BrokerSync, error)
	ListSyncs(accountID uuid.UUID, limit int) ([]models.BrokerSync, error)

	// BrokerTransaction
	UpsertTransaction(tx *models.BrokerTransaction) error
	ListTransactions(accountID uuid.UUID, limit int, offset int) ([]models.BrokerTransaction, error)
	CountTransactions(accountID uuid.UUID) (int64, error)

	// PortfolioImport
	UpsertHolding(holding *models.PortfolioImport) error
	GetActiveHoldings(accountID uuid.UUID) ([]models.PortfolioImport, error)
	DeactivateHoldings(accountID uuid.UUID, tickers []string) error
	GetAllUserHoldings(userID string) ([]models.PortfolioImport, error)

	// SyncLog
	CreateSyncLog(log *models.SyncLog) error
	ListSyncLogs(syncID uuid.UUID) ([]models.SyncLog, error)

	// AccountPermission
	UpsertPermission(perm *models.AccountPermission) error
	ListPermissions(accountID uuid.UUID) ([]models.AccountPermission, error)
}

type brokerRepository struct {
	db *gorm.DB
}

// NewBrokerRepository constructs a new BrokerRepository backed by GORM.
func NewBrokerRepository(db *gorm.DB) BrokerRepository {
	// Auto-migrate broker tables on startup
	db.AutoMigrate(
		&models.BrokerAccount{},
		&models.BrokerSync{},
		&models.BrokerTransaction{},
		&models.PortfolioImport{},
		&models.SyncLog{},
		&models.AccountPermission{},
	)
	return &brokerRepository{db: db}
}

// ─── BrokerAccount ─────────────────────────────────────────────────────────────

func (r *brokerRepository) CreateAccount(account *models.BrokerAccount) error {
	return r.db.Create(account).Error
}

func (r *brokerRepository) GetAccountByID(id uuid.UUID) (*models.BrokerAccount, error) {
	var account models.BrokerAccount
	err := r.db.Where("id = ? AND deleted_at IS NULL", id).First(&account).Error
	if err != nil {
		return nil, err
	}
	return &account, nil
}

func (r *brokerRepository) ListAccountsByUser(userID string) ([]models.BrokerAccount, error) {
	var accounts []models.BrokerAccount
	err := r.db.Where("user_id = ? AND deleted_at IS NULL", userID).
		Order("created_at ASC").
		Find(&accounts).Error
	return accounts, err
}

func (r *brokerRepository) UpdateAccount(account *models.BrokerAccount) error {
	return r.db.Save(account).Error
}

func (r *brokerRepository) SoftDeleteAccount(id uuid.UUID) error {
	return r.db.Where("id = ?", id).Delete(&models.BrokerAccount{}).Error
}

func (r *brokerRepository) UpdateAccountStatus(id uuid.UUID, status string, errMsg string) error {
	updates := map[string]interface{}{
		"status":        status,
		"error_message": errMsg,
		"updated_at":    time.Now(),
	}
	return r.db.Model(&models.BrokerAccount{}).Where("id = ?", id).Updates(updates).Error
}

func (r *brokerRepository) UpdateLastSync(id uuid.UUID, syncAt time.Time) error {
	return r.db.Model(&models.BrokerAccount{}).Where("id = ?", id).Updates(map[string]interface{}{
		"last_sync_at": syncAt,
		"status":       "connected",
		"updated_at":   time.Now(),
	}).Error
}

// ─── BrokerSync ────────────────────────────────────────────────────────────────

func (r *brokerRepository) CreateSync(sync *models.BrokerSync) error {
	return r.db.Create(sync).Error
}

func (r *brokerRepository) UpdateSync(sync *models.BrokerSync) error {
	return r.db.Save(sync).Error
}

func (r *brokerRepository) GetLatestSync(accountID uuid.UUID) (*models.BrokerSync, error) {
	var sync models.BrokerSync
	err := r.db.Where("broker_account_id = ?", accountID).
		Order("started_at DESC").
		First(&sync).Error
	if err != nil {
		return nil, err
	}
	return &sync, nil
}

func (r *brokerRepository) ListSyncs(accountID uuid.UUID, limit int) ([]models.BrokerSync, error) {
	var syncs []models.BrokerSync
	err := r.db.Where("broker_account_id = ?", accountID).
		Order("started_at DESC").
		Limit(limit).
		Find(&syncs).Error
	return syncs, err
}

// ─── BrokerTransaction ─────────────────────────────────────────────────────────

func (r *brokerRepository) UpsertTransaction(tx *models.BrokerTransaction) error {
	if tx.BrokerTxID == "" {
		// No external ID: just create
		return r.db.Create(tx).Error
	}
	return r.db.Where(models.BrokerTransaction{BrokerTxID: tx.BrokerTxID}).
		Assign(tx).
		FirstOrCreate(tx).Error
}

func (r *brokerRepository) ListTransactions(accountID uuid.UUID, limit int, offset int) ([]models.BrokerTransaction, error) {
	var txs []models.BrokerTransaction
	err := r.db.Where("broker_account_id = ?", accountID).
		Order("tx_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&txs).Error
	return txs, err
}

func (r *brokerRepository) CountTransactions(accountID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.Model(&models.BrokerTransaction{}).
		Where("broker_account_id = ?", accountID).
		Count(&count).Error
	return count, err
}

// ─── PortfolioImport ───────────────────────────────────────────────────────────

func (r *brokerRepository) UpsertHolding(holding *models.PortfolioImport) error {
	// Deactivate previous record for same account+ticker, then create new
	r.db.Model(&models.PortfolioImport{}).
		Where("broker_account_id = ? AND ticker = ? AND is_active = true", holding.BrokerAccountID, holding.Ticker).
		Update("is_active", false)
	return r.db.Create(holding).Error
}

func (r *brokerRepository) GetActiveHoldings(accountID uuid.UUID) ([]models.PortfolioImport, error) {
	var holdings []models.PortfolioImport
	err := r.db.Where("broker_account_id = ? AND is_active = true", accountID).
		Order("current_value DESC").
		Find(&holdings).Error
	return holdings, err
}

func (r *brokerRepository) DeactivateHoldings(accountID uuid.UUID, tickers []string) error {
	if len(tickers) == 0 {
		return nil
	}
	return r.db.Model(&models.PortfolioImport{}).
		Where("broker_account_id = ? AND ticker IN ? AND is_active = true", accountID, tickers).
		Update("is_active", false).Error
}

func (r *brokerRepository) GetAllUserHoldings(userID string) ([]models.PortfolioImport, error) {
	var holdings []models.PortfolioImport
	err := r.db.
		Joins("JOIN broker_accounts ON broker_accounts.id = portfolio_imports.broker_account_id").
		Where("broker_accounts.user_id = ? AND broker_accounts.deleted_at IS NULL AND portfolio_imports.is_active = true", userID).
		Order("portfolio_imports.current_value DESC").
		Find(&holdings).Error
	return holdings, err
}

// ─── SyncLog ───────────────────────────────────────────────────────────────────

func (r *brokerRepository) CreateSyncLog(log *models.SyncLog) error {
	return r.db.Create(log).Error
}

func (r *brokerRepository) ListSyncLogs(syncID uuid.UUID) ([]models.SyncLog, error) {
	var logs []models.SyncLog
	err := r.db.Where("broker_sync_id = ?", syncID).
		Order("created_at DESC").
		Find(&logs).Error
	return logs, err
}

// ─── AccountPermission ─────────────────────────────────────────────────────────

func (r *brokerRepository) UpsertPermission(perm *models.AccountPermission) error {
	existing := &models.AccountPermission{}
	err := r.db.Where("broker_account_id = ? AND permission = ?", perm.BrokerAccountID, perm.Permission).First(existing).Error
	if err != nil {
		// Create
		return r.db.Create(perm).Error
	}
	// Update
	existing.Granted = perm.Granted
	existing.GrantedAt = perm.GrantedAt
	return r.db.Save(existing).Error
}

func (r *brokerRepository) ListPermissions(accountID uuid.UUID) ([]models.AccountPermission, error) {
	var perms []models.AccountPermission
	err := r.db.Where("broker_account_id = ?", accountID).Find(&perms).Error
	return perms, err
}

// brokerRepository must satisfy BrokerRepository at compile time
var _ BrokerRepository = (*brokerRepository)(nil)

// Unused import guard
var _ = fmt.Sprintf
