-- Recurring memberships: "Hair Club" — £49/month includes 2 haircuts + 1 beard trim.

CREATE TABLE IF NOT EXISTS membership_plans (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT,
  price               NUMERIC(10,2) NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'gbp',
  interval            TEXT NOT NULL DEFAULT 'month',   -- month | year | week
  interval_count      INTEGER NOT NULL DEFAULT 1,
  priority_booking    BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_price_id     TEXT,   -- Stripe Price ID (set after creation)
  stripe_product_id   TEXT,   -- Stripe Product ID
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Services included in a membership plan (with usage allowance per period)
CREATE TABLE IF NOT EXISTS membership_plan_services (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id         UUID NOT NULL REFERENCES membership_plans(id) ON DELETE CASCADE,
  service_id      UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  quantity        INTEGER NOT NULL DEFAULT 1,   -- how many per billing period (0 = unlimited)
  UNIQUE(plan_id, service_id)
);

-- Active customer memberships
CREATE TABLE IF NOT EXISTS customer_memberships (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id                     UUID NOT NULL REFERENCES membership_plans(id),
  business_id                 UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id                 UUID REFERENCES customers(id) ON DELETE SET NULL,
  consumer_id                 UUID REFERENCES consumer_accounts(id) ON DELETE SET NULL,
  status                      TEXT NOT NULL DEFAULT 'active', -- active | cancelled | paused | expired | payment_failed
  stripe_subscription_id      TEXT UNIQUE,
  stripe_customer_id          TEXT,
  current_period_start        TIMESTAMPTZ,
  current_period_end          TIMESTAMPTZ,
  cancel_at_period_end        BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at                TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_memberships_business ON customer_memberships(business_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_memberships_customer ON customer_memberships(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_memberships_consumer ON customer_memberships(consumer_id);

-- Tracks how many included services a member has used in the current billing period
CREATE TABLE IF NOT EXISTS membership_usage (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  membership_id     UUID NOT NULL REFERENCES customer_memberships(id) ON DELETE CASCADE,
  plan_service_id   UUID NOT NULL REFERENCES membership_plan_services(id) ON DELETE CASCADE,
  booking_id        UUID REFERENCES bookings(id) ON DELETE SET NULL,
  period_start      TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_usage_membership ON membership_usage(membership_id, period_start);

-- Add membership_id to bookings so we know which memberships covered which bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES customer_memberships(id) ON DELETE SET NULL;
