-- Agent Messages Table
CREATE TABLE IF NOT EXISTS agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_session_id UUID NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'analysis',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_message_session FOREIGN KEY (analysis_session_id) REFERENCES analysis_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON agent_messages(analysis_session_id);
