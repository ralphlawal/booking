-- Loyalty programs: businesses define how customers earn and spend points.

CREATE TABLE IF NOT EXISTS loyalty_programs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'Loyalty Rewards',
  type            TEXT NOT NULL DEFAULT 'spend',   -- spend | visits | hybrid
  -- earn rules
  points_per_pound NUMERIC(6,2) DEFAULT 1,         -- points earned per £/€1 spent (spend type)
  points_per_visit INTEGER DEFAULT 10,             -- points earned per visit (visits type)
  -- expiry
  points_expiry_days INTEGER DEFAULT 365,          -- 0 = never expire
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Reward catalog: what customers can redeem points for
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  type            TEXT NOT NULL DEFAULT 'discount', -- discount | service | addon | gift
  points_cost     INTEGER NOT NULL,
  discount_value  NUMERIC(8,2),   -- monetary value if type=discount
  service_id      UUID REFERENCES services(id) ON DELETE SET NULL,
  max_redemptions INTEGER,        -- NULL = unlimited
  redeemed_count  INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Customer points ledger: every earn and spend transaction
CREATE TABLE IF NOT EXISTS loyalty_ledger (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  consumer_id     UUID REFERENCES consumer_accounts(id) ON DELETE SET NULL,
  booking_id      UUID REFERENCES bookings(id) ON DELETE SET NULL,
  type            TEXT NOT NULL,   -- earn | redeem | expire | adjust
  points          INTEGER NOT NULL, -- positive = credit, negative = debit
  note            TEXT,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_customer ON loyalty_ledger(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_consumer ON loyalty_ledger(consumer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_business ON loyalty_ledger(business_id, created_at DESC);

-- Reward redemptions
CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reward_id       UUID NOT NULL REFERENCES loyalty_rewards(id) ON DELETE CASCADE,
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  consumer_id     UUID REFERENCES consumer_accounts(id) ON DELETE SET NULL,
  booking_id      UUID REFERENCES bookings(id) ON DELETE SET NULL,
  points_spent    INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | applied | expired
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
