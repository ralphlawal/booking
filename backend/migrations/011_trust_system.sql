-- 011_trust_system.sql
-- Service confirmations: customer confirms service was rendered
CREATE TABLE IF NOT EXISTS service_confirmations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  consumer_id UUID REFERENCES consumer_accounts(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id)
);

-- Disputes: customer raises a dispute for unrendered / bad service
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  consumer_id UUID REFERENCES consumer_accounts(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  stripe_refund_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE(booking_id)
);
