-- 011_trust_system.sql
-- Service confirmations: customer confirms service was rendered
CREATE TABLE IF NOT EXISTS service_confirmations (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  consumer_id TEXT,
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id)
);

-- Disputes: customer raises a dispute for unrendered / bad service
CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  consumer_id TEXT,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  stripe_refund_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE(booking_id)
);
