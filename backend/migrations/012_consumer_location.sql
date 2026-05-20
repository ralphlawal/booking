-- 012_consumer_location.sql
-- Consumer location + onboarding fields
ALTER TABLE consumer_accounts ADD COLUMN IF NOT EXISTS location_text TEXT;
ALTER TABLE consumer_accounts ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE consumer_accounts ADD COLUMN IF NOT EXISTS longitude FLOAT;
ALTER TABLE consumer_accounts ADD COLUMN IF NOT EXISTS service_preferences JSONB DEFAULT '[]';
ALTER TABLE consumer_accounts ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;
