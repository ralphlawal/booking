-- Email verification codes for consumer accounts (mirrors users.email_otp from 029).
ALTER TABLE consumer_accounts ADD COLUMN IF NOT EXISTS email_otp VARCHAR(6);
ALTER TABLE consumer_accounts ADD COLUMN IF NOT EXISTS email_otp_expires TIMESTAMPTZ;
