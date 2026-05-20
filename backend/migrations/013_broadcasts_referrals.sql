-- Admin broadcast notifications (shown as banners/popups to all users)
CREATE TABLE IF NOT EXISTS broadcast_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Referral codes on consumer accounts
ALTER TABLE consumer_accounts ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) UNIQUE;
ALTER TABLE consumer_accounts ADD COLUMN IF NOT EXISTS referred_by VARCHAR(12);
ALTER TABLE consumer_accounts ADD COLUMN IF NOT EXISTS referral_credits INTEGER DEFAULT 0;

-- Referral tracking events
CREATE TABLE IF NOT EXISTS referral_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES consumer_accounts(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES consumer_accounts(id) ON DELETE SET NULL,
  referral_code VARCHAR(12) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_events_referrer ON referral_events(referrer_id);
CREATE INDEX IF NOT EXISTS idx_consumer_referral_code ON consumer_accounts(referral_code);
