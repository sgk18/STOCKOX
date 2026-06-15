-- Portfolios Table
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL UNIQUE,
    total_value DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    cash_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    daily_change DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    daily_change_percent DECIMAL(8,4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_portfolio_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portfolios_deleted_at ON portfolios(deleted_at);
