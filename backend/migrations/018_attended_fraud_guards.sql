-- 018_attended_fraud_guards.sql
-- Track when the "Were you attended to?" email was sent per booking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attended_email_sent_at TIMESTAMPTZ;

-- Fraud tracking on consumer accounts
ALTER TABLE consumer_accounts ADD COLUMN IF NOT EXISTS fraud_dispute_count INTEGER DEFAULT 0;
ALTER TABLE consumer_accounts ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE consumer_accounts ADD COLUMN IF NOT EXISTS flagged_reason TEXT;
