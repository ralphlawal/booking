-- Service packages: "6 massages for €240". Customers buy upfront, redeem per booking.

CREATE TABLE IF NOT EXISTS service_packages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  session_count   INTEGER NOT NULL DEFAULT 1,    -- total sessions in bundle
  price           NUMERIC(10,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'gbp',
  valid_days      INTEGER DEFAULT 365,           -- how many days from purchase date (0 = never expire)
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Which services can be redeemed with this package (empty = any service)
CREATE TABLE IF NOT EXISTS service_package_services (
  package_id  UUID NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
  service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (package_id, service_id)
);

-- Customer-owned packages (one row per purchase)
CREATE TABLE IF NOT EXISTS customer_packages (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id                UUID NOT NULL REFERENCES service_packages(id),
  business_id               UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id               UUID REFERENCES customers(id) ON DELETE SET NULL,
  consumer_id               UUID REFERENCES consumer_accounts(id) ON DELETE SET NULL,
  sessions_total            INTEGER NOT NULL,
  sessions_used             INTEGER NOT NULL DEFAULT 0,
  sessions_remaining        INTEGER GENERATED ALWAYS AS (sessions_total - sessions_used) STORED,
  price_paid                NUMERIC(10,2) NOT NULL,
  currency                  TEXT NOT NULL DEFAULT 'gbp',
  stripe_payment_intent_id  TEXT,
  payment_status            TEXT NOT NULL DEFAULT 'pending', -- pending | paid | refunded
  status                    TEXT NOT NULL DEFAULT 'active',  -- active | exhausted | expired | cancelled
  purchased_at              TIMESTAMPTZ DEFAULT NOW(),
  expires_at                TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_packages_business ON customer_packages(business_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_packages_customer ON customer_packages(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_packages_consumer ON customer_packages(consumer_id);

-- Each session redeemed from a package
CREATE TABLE IF NOT EXISTS package_redemptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_package_id UUID NOT NULL REFERENCES customer_packages(id) ON DELETE CASCADE,
  booking_id          UUID REFERENCES bookings(id) ON DELETE SET NULL,
  redeemed_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Add package reference to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_package_id UUID REFERENCES customer_packages(id) ON DELETE SET NULL;
