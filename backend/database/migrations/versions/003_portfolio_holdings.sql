-- Portfolio Holdings Table
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL,
    ticker VARCHAR(10) NOT NULL,
    company_name VARCHAR(255),
    quantity DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    average_price DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    current_price DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_holding_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_holdings_ticker ON portfolio_holdings(ticker);
CREATE INDEX IF NOT EXISTS idx_holdings_deleted_at ON portfolio_holdings(deleted_at);
