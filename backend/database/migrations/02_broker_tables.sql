-- Module 10: Broker Connect & Real Portfolio Sync
-- Migration: Add broker tables
-- All broker access is READ-ONLY. Stockox never places trades.

-- ==========================================
-- broker_accounts
-- ==========================================
CREATE TABLE IF NOT EXISTS broker_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    broker_slug VARCHAR(50) NOT NULL,
    broker_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) NOT NULL DEFAULT 'personal',
    account_label VARCHAR(100),
    auth_type VARCHAR(20) NOT NULL DEFAULT 'api_token',
    access_token TEXT,
    refresh_token TEXT,
    token_expiry TIMESTAMP WITH TIME ZONE,
    client_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'connected',
    error_message TEXT,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_broker_account_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_broker_accounts_user_id ON broker_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_accounts_status ON broker_accounts(status);
CREATE INDEX IF NOT EXISTS idx_broker_accounts_deleted_at ON broker_accounts(deleted_at);

-- ==========================================
-- broker_syncs
-- ==========================================
CREATE TABLE IF NOT EXISTS broker_syncs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_account_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    trigger_type VARCHAR(20) NOT NULL DEFAULT 'manual',
    holdings_fetched INTEGER DEFAULT 0,
    new_positions INTEGER DEFAULT 0,
    closed_positions INTEGER DEFAULT 0,
    changed_qty INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_broker_sync_account FOREIGN KEY (broker_account_id) REFERENCES broker_accounts(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_broker_syncs_account_id ON broker_syncs(broker_account_id);
CREATE INDEX IF NOT EXISTS idx_broker_syncs_status ON broker_syncs(status);
CREATE INDEX IF NOT EXISTS idx_broker_syncs_started_at ON broker_syncs(started_at);

-- ==========================================
-- broker_transactions
-- ==========================================
CREATE TABLE IF NOT EXISTS broker_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_account_id UUID NOT NULL,
    broker_tx_id VARCHAR(255) UNIQUE,
    ticker VARCHAR(20) NOT NULL,
    company_name VARCHAR(255),
    tx_type VARCHAR(30) NOT NULL,
    quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
    price DECIMAL(18,4) NOT NULL DEFAULT 0,
    total_value DECIMAL(18,4) NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'INR',
    exchange VARCHAR(20),
    tx_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_broker_tx_account FOREIGN KEY (broker_account_id) REFERENCES broker_accounts(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_broker_txs_account_id ON broker_transactions(broker_account_id);
CREATE INDEX IF NOT EXISTS idx_broker_txs_ticker ON broker_transactions(ticker);
CREATE INDEX IF NOT EXISTS idx_broker_txs_tx_at ON broker_transactions(tx_at);

-- ==========================================
-- portfolio_imports
-- ==========================================
CREATE TABLE IF NOT EXISTS portfolio_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_account_id UUID NOT NULL,
    broker_sync_id UUID NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    company_name VARCHAR(255),
    quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
    average_price DECIMAL(18,4) NOT NULL DEFAULT 0,
    current_price DECIMAL(18,4) NOT NULL DEFAULT 0,
    current_value DECIMAL(18,4) NOT NULL DEFAULT 0,
    pnl DECIMAL(18,4) NOT NULL DEFAULT 0,
    pnl_percent DECIMAL(8,4) NOT NULL DEFAULT 0,
    sector VARCHAR(100),
    exchange VARCHAR(20),
    asset_type VARCHAR(30) DEFAULT 'equity',
    currency VARCHAR(10) DEFAULT 'INR',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_portfolio_import_account FOREIGN KEY (broker_account_id) REFERENCES broker_accounts(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_portfolio_import_sync FOREIGN KEY (broker_sync_id) REFERENCES broker_syncs(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portfolio_imports_account_id ON portfolio_imports(broker_account_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_imports_ticker ON portfolio_imports(ticker);
CREATE INDEX IF NOT EXISTS idx_portfolio_imports_is_active ON portfolio_imports(is_active);

-- ==========================================
-- sync_logs
-- ==========================================
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_sync_id UUID NOT NULL,
    change_type VARCHAR(30) NOT NULL,
    ticker VARCHAR(20),
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sync_log_sync FOREIGN KEY (broker_sync_id) REFERENCES broker_syncs(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_id ON sync_logs(broker_sync_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_ticker ON sync_logs(ticker);

-- ==========================================
-- account_permissions
-- ==========================================
CREATE TABLE IF NOT EXISTS account_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_account_id UUID NOT NULL,
    permission VARCHAR(100) NOT NULL,
    granted BOOLEAN DEFAULT FALSE,
    granted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_account_perm_account FOREIGN KEY (broker_account_id) REFERENCES broker_accounts(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT uq_account_permission UNIQUE (broker_account_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_account_perms_account_id ON account_permissions(broker_account_id);
