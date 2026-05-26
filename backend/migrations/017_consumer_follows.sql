CREATE TABLE IF NOT EXISTS consumer_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_id TEXT NOT NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(consumer_id, business_id)
);
CREATE INDEX IF NOT EXISTS idx_consumer_follows_consumer ON consumer_follows(consumer_id);
CREATE INDEX IF NOT EXISTS idx_consumer_follows_business ON consumer_follows(business_id);
