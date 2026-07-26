-- Business can have multiple service locations (studio, home, mobile radius, etc.)
CREATE TABLE IF NOT EXISTS business_addresses (
  id               SERIAL PRIMARY KEY,
  business_id      INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  nickname         VARCHAR(120) NOT NULL DEFAULT 'Main location',
  address_line     TEXT NOT NULL,
  city             VARCHAR(100),
  postcode         VARCHAR(20),
  country          VARCHAR(80) DEFAULT 'GB',
  latitude         DECIMAL(9,6),
  longitude        DECIMAL(9,6),
  travel_radius_km INTEGER DEFAULT NULL,
  travel_charge    DECIMAL(10,2) DEFAULT NULL,
  is_primary       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_addresses_business_id ON business_addresses(business_id);

-- Ensure only one primary address per business
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_addresses_primary
  ON business_addresses(business_id)
  WHERE is_primary = TRUE;
