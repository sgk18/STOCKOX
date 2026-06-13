-- Stockox Raw PostgreSQL Database Schema & Migration Script
-- Enable UUID extensions if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABLES & RELATIONSHIPS
-- ==========================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    avatar_url VARCHAR(255),
    role VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

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

-- Watchlists Table
CREATE TABLE IF NOT EXISTS watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    ticker VARCHAR(10) NOT NULL,
    company_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_watchlist_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_watchlists_user_ticker ON watchlists(user_id, ticker);

-- Analysis Sessions Table
CREATE TABLE IF NOT EXISTS analysis_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    ticker VARCHAR(10) NOT NULL,
    company_name VARCHAR(255),
    recommendation VARCHAR(10) NOT NULL DEFAULT 'HOLD', -- BUY, HOLD, SELL
    confidence_score INTEGER NOT NULL DEFAULT 0,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_ticker ON analysis_sessions(ticker);
CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at ON analysis_sessions(deleted_at);

-- Agent Messages Table
CREATE TABLE IF NOT EXISTS agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_session_id UUID NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'analysis', -- research, analysis, decision, warning, risk
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_message_session FOREIGN KEY (analysis_session_id) REFERENCES analysis_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON agent_messages(analysis_session_id);

-- Agents Table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'idle', -- idle, thinking, researching, analyzing, completed, error
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_agents_deleted_at ON agents(deleted_at);

-- Recommendations Table
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_session_id UUID NOT NULL,
    ticker VARCHAR(10) NOT NULL,
    recommendation VARCHAR(10) NOT NULL DEFAULT 'HOLD',
    confidence_score INTEGER NOT NULL DEFAULT 0,
    target_price DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rec_session FOREIGN KEY (analysis_session_id) REFERENCES analysis_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recs_session_ticker ON recommendations(analysis_session_id, ticker);

-- Market Snapshots Table
CREATE TABLE IF NOT EXISTS market_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL UNIQUE, -- SP500, NASDAQ, NIFTY50, BTC, GOLD
    price DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    change DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    change_percent DECIMAL(8,4) NOT NULL DEFAULT 0.0000,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. SEED INITIAL MOCK DATA
-- ==========================================

-- Insert Default User
INSERT INTO users (id, email, name, avatar_url, role)
VALUES ('user_000000000000000000000000001', 'suryachalam.vm@bsccmh.christuniversity.in', 'Surya', 'https://avatar.vercel.sh/surya', 'Lead Investment Advisor')
ON CONFLICT (email) DO NOTHING;

-- Insert User Portfolio
INSERT INTO portfolios (id, user_id, total_value, cash_balance, daily_change, daily_change_percent)
VALUES ('11111111-1111-1111-1111-111111111111', 'user_000000000000000000000000001', 125400.00, 12000.00, 5062.00, 4.21)
ON CONFLICT (user_id) DO NOTHING;

-- Insert Portfolio Holdings
INSERT INTO portfolio_holdings (portfolio_id, ticker, company_name, quantity, average_price, current_price)
VALUES 
('11111111-1111-1111-1111-111111111111', 'NVDA', 'NVIDIA Corp.', 50.0000, 150.0000, 187.2000),
('11111111-1111-1111-1111-111111111111', 'AAPL', 'Apple Inc.', 40.0000, 170.0000, 178.4500)
ON CONFLICT DO NOTHING;

-- Insert Market Snapshots
INSERT INTO market_snapshots (symbol, price, change, change_percent)
VALUES 
('SP500', 5431.6000, 45.8000, 0.8500),
('NASDAQ', 16920.4500, 236.1200, 1.4200),
('NIFTY50', 23501.1000, 128.5000, 0.5500),
('GOLD', 2320.1500, -7.4500, -0.3200),
('BTC', 67450.0000, 2490.0000, 3.8400)
ON CONFLICT (symbol) DO NOTHING;

-- Insert Default Agents
INSERT INTO agents (name, status)
VALUES
('Research Agent', 'researching'),
('News Agent', 'analyzing'),
('Fundamental Agent', 'idle'),
('Technical Agent', 'thinking'),
('Risk Agent', 'researching'),
('Committee Agent', 'idle')
ON CONFLICT (name) DO NOTHING;
