-- Analysis Sessions Table
CREATE TABLE IF NOT EXISTS analysis_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    ticker VARCHAR(10) NOT NULL,
    company_name VARCHAR(255),
    recommendation VARCHAR(10) NOT NULL DEFAULT 'HOLD',
    confidence_score INTEGER NOT NULL DEFAULT 0,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_ticker ON analysis_sessions(ticker);
CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at ON analysis_sessions(deleted_at);
