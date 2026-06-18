-- Migration to support Multi-Agent Debate Engine V2 (Module 11)

-- 1. Extend analysis_sessions
ALTER TABLE analysis_sessions ADD COLUMN IF NOT EXISTS room_id VARCHAR(255);
ALTER TABLE analysis_sessions ADD COLUMN IF NOT EXISTS debate_round INTEGER NOT NULL DEFAULT 0;
ALTER TABLE analysis_sessions ADD COLUMN IF NOT EXISTS target_price DECIMAL(18,4) NOT NULL DEFAULT 0;
ALTER TABLE analysis_sessions ADD COLUMN IF NOT EXISTS bull_case TEXT;
ALTER TABLE analysis_sessions ADD COLUMN IF NOT EXISTS bear_case TEXT;
ALTER TABLE analysis_sessions ADD COLUMN IF NOT EXISTS executive_summary TEXT;

-- 2. Extend analysis_logs
ALTER TABLE analysis_logs ADD COLUMN IF NOT EXISTS round INTEGER NOT NULL DEFAULT 1;
ALTER TABLE analysis_logs ADD COLUMN IF NOT EXISTS signal VARCHAR(10);
ALTER TABLE analysis_logs ADD COLUMN IF NOT EXISTS evidence TEXT;
ALTER TABLE analysis_logs ADD COLUMN IF NOT EXISTS weighted_score DECIMAL(18,4) NOT NULL DEFAULT 0;

-- 3. Extend committee_analyses
ALTER TABLE committee_analyses ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE committee_analyses ADD COLUMN IF NOT EXISTS room_id VARCHAR(255);
ALTER TABLE committee_analyses ADD COLUMN IF NOT EXISTS target_price DECIMAL(18,4) NOT NULL DEFAULT 0;
ALTER TABLE committee_analyses ADD COLUMN IF NOT EXISTS executive_summary TEXT;
ALTER TABLE committee_analyses ADD COLUMN IF NOT EXISTS bull_case TEXT;
ALTER TABLE committee_analyses ADD COLUMN IF NOT EXISTS bear_case TEXT;
ALTER TABLE committee_analyses ADD COLUMN IF NOT EXISTS investment_horizon VARCHAR(100);

-- Create index on session_id for performance
CREATE INDEX IF NOT EXISTS idx_committee_analyses_session_id ON committee_analyses(session_id);
