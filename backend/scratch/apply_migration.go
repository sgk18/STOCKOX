package scratch

import (
	"log"
	"stockox-backend/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func RunMigration() {
	log.Println("[MIGRATION] Loading environment config...")
	cfg := config.LoadConfig()
	dsn := cfg.GetDSN()

	log.Println("[MIGRATION] Connecting to PostgreSQL database...")
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("[MIGRATION-ERR] Failed to connect to database: %v", err)
	}

	log.Println("[MIGRATION] Running database consolidation and optimization queries...")

	queries := []string{
		// 1. Create backup tables to prevent any data loss
		`CREATE TABLE IF NOT EXISTS backup_analysis_sessions AS SELECT * FROM analysis_sessions;`,
		`CREATE TABLE IF NOT EXISTS backup_committee_decisions AS SELECT * FROM committee_decisions;`,
		`CREATE TABLE IF NOT EXISTS backup_agent_messages AS SELECT * FROM agent_messages;`,
		`CREATE TABLE IF NOT EXISTS backup_agent_conversations AS SELECT * FROM agent_conversations;`,

		// 2. Drop the existing committee_analyses if it was created in previous phase to rebuild with the target schema
		`DROP TABLE IF EXISTS committee_analyses CASCADE;`,

		// 3. Create the new optimized tables
		`CREATE TABLE IF NOT EXISTS committee_analyses (
			id SERIAL PRIMARY KEY,
			ticker VARCHAR(10) NOT NULL,
			recommendation VARCHAR(10) NOT NULL,
			confidence_score INTEGER NOT NULL DEFAULT 0,
			research_vote VARCHAR(10),
			technical_vote VARCHAR(10),
			news_vote VARCHAR(10),
			risk_vote VARCHAR(10),
			valuation_vote VARCHAR(10),
			research_summary TEXT,
			technical_summary TEXT,
			news_summary TEXT,
			risk_summary TEXT,
			valuation_summary TEXT,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,

		`CREATE TABLE IF NOT EXISTS analysis_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			ticker VARCHAR(10) NOT NULL,
			agent_name VARCHAR(100) NOT NULL,
			message TEXT NOT NULL,
			message_type VARCHAR(50) NOT NULL,
			confidence_score INTEGER DEFAULT 0,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,

		// 4. Populate new tables from old data
		`INSERT INTO committee_analyses (
			ticker, recommendation, confidence_score,
			research_vote, technical_vote, news_vote, risk_vote, valuation_vote,
			research_summary, technical_summary, news_summary, risk_summary, valuation_summary,
			created_at
		)
		SELECT 
			d.ticker, d.committee_decision, d.confidence_score,
			d.research_vote, d.technical_vote, d.news_vote, d.risk_vote, 'HOLD',
			COALESCE(s.summary, ''), d.reasoning, '', '', '',
			d.created_at
		FROM backup_committee_decisions d
		LEFT JOIN backup_analysis_sessions s ON d.ticker = s.ticker;`,

		`INSERT INTO analysis_logs (id, ticker, agent_name, message, message_type, confidence_score, created_at)
		SELECT 
			m.id, s.ticker, m.agent_name, m.message, m.message_type, 0, m.created_at
		FROM backup_agent_messages m
		JOIN backup_analysis_sessions s ON m.analysis_session_id = s.id;`,

		// Optional fallback if agent_conversations exists
		`DO $$
		BEGIN
			IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'backup_agent_conversations') THEN
				INSERT INTO analysis_logs (id, ticker, agent_name, message, message_type, confidence_score, created_at)
				SELECT 
					c.id, r.ticker, c.agent_name, c.message, c.message_type, 0, c.created_at
				FROM backup_agent_conversations c
				JOIN agent_rooms r ON c.room_id = r.id;
			END IF;
		END $$;`,

		// 5. Rebuild recommendations table with new fields
		`ALTER TABLE recommendations DROP CONSTRAINT IF EXISTS fk_rec_session;`,
		`ALTER TABLE recommendations DROP COLUMN IF EXISTS analysis_session_id;`,
		`ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS agent_reasoning TEXT;`,
		`ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS research_score INTEGER DEFAULT 0;`,
		`ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS technical_score INTEGER DEFAULT 0;`,
		`ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS news_score INTEGER DEFAULT 0;`,
		`ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;`,
		`ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS committee_score INTEGER DEFAULT 0;`,
		`ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS investment_horizon VARCHAR(100);`,

		// 6. Normalize holdings and watchlists: Drop duplicate company_name column
		`ALTER TABLE portfolio_holdings DROP COLUMN IF EXISTS company_name;`,
		`ALTER TABLE watchlists DROP COLUMN IF EXISTS company_name;`,

		// 7. Drop obsolete tables
		`DROP TABLE IF EXISTS agent_messages CASCADE;`,
		`DROP TABLE IF EXISTS agent_conversations CASCADE;`,
		`DROP TABLE IF EXISTS agent_rooms CASCADE;`,
		`DROP TABLE IF EXISTS agents CASCADE;`,
		`DROP TABLE IF EXISTS analysis_sessions CASCADE;`,
		`DROP TABLE IF EXISTS committee_decisions CASCADE;`,
		`DROP TABLE IF EXISTS agent_executions CASCADE;`,
		`DROP TABLE IF EXISTS agent_events CASCADE;`,

		// 8. Add target optimized indexes
		`CREATE INDEX IF NOT EXISTS idx_stock_metadata_symbol ON stock_metadata(symbol);`,
		`CREATE INDEX IF NOT EXISTS idx_recommendations_ticker ON recommendations(ticker);`,
		`CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at);`,
		`CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id);`,
		`CREATE INDEX IF NOT EXISTS idx_watchlists_ticker ON watchlists(ticker);`,
		`CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_portfolio_id ON portfolio_holdings(portfolio_id);`,
		`CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_ticker ON portfolio_holdings(ticker);`,
		`CREATE INDEX IF NOT EXISTS idx_committee_analyses_ticker ON committee_analyses(ticker);`,
		`CREATE INDEX IF NOT EXISTS idx_analysis_logs_ticker ON analysis_logs(ticker);`,
		`CREATE INDEX IF NOT EXISTS idx_analysis_logs_created_at ON analysis_logs(created_at);`,
	}

	for i, q := range queries {
		log.Printf("[MIGRATION] Executing query %d/%d...", i+1, len(queries))
		if err := db.Exec(q).Error; err != nil {
			log.Printf("[MIGRATION-WARN] Query failed: %s, Error: %v", q, err)
		}
	}

	log.Println("[MIGRATION] Migration and optimization script executed successfully.")
}
