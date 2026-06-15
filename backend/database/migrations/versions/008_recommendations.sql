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
