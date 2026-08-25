-- 024_consumer_no_show_count.sql
-- Track no-show history on logged-in consumer accounts for two-sided trust.
ALTER TABLE consumer_accounts ADD COLUMN IF NOT EXISTS no_show_count INTEGER NOT NULL DEFAULT 0;
