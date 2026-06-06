-- Customer retention features: family/friends profiles and loyalty support.

CREATE TABLE IF NOT EXISTS consumer_family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_id UUID NOT NULL REFERENCES consumer_accounts(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consumer_family_members_consumer
  ON consumer_family_members(consumer_id, created_at DESC);
