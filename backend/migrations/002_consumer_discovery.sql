-- Consumer-facing discovery layer: accounts, preferences, mandates

-- Consumer accounts (people who discover and book services)
CREATE TABLE IF NOT EXISTS consumer_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consumer saved preferences (memory feature — favourite barber, service, notes)
CREATE TABLE IF NOT EXISTS consumer_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_id UUID NOT NULL REFERENCES consumer_accounts(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  notes TEXT,
  last_booked_at TIMESTAMPTZ,
  total_bookings INTEGER DEFAULT 0,
  UNIQUE(consumer_id, business_id)
);

-- GoCardless payment mandates (no-show protection)
CREATE TABLE IF NOT EXISTS payment_mandates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  consumer_id UUID REFERENCES consumer_accounts(id) ON DELETE SET NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  gc_mandate_id VARCHAR(255),
  gc_billing_request_id VARCHAR(255),
  gc_payment_id VARCHAR(255),
  amount_pence INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending_mandate',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns to existing tables (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='consumer_id') THEN
    ALTER TABLE bookings ADD COLUMN consumer_id UUID REFERENCES consumer_accounts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='mandate_id') THEN
    ALTER TABLE bookings ADD COLUMN mandate_id UUID REFERENCES payment_mandates(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='latitude') THEN
    ALTER TABLE businesses ADD COLUMN latitude FLOAT;
    ALTER TABLE businesses ADD COLUMN longitude FLOAT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='deposit_required') THEN
    ALTER TABLE services ADD COLUMN deposit_required BOOLEAN DEFAULT FALSE;
    ALTER TABLE services ADD COLUMN deposit_amount DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_consumer_prefs_consumer ON consumer_preferences(consumer_id);
CREATE INDEX IF NOT EXISTS idx_payment_mandates_booking ON payment_mandates(booking_id);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_coords ON businesses(latitude, longitude) WHERE latitude IS NOT NULL;
