CREATE TABLE IF NOT EXISTS business_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'photo',
  caption TEXT,
  image_url TEXT,
  cta_label TEXT,
  cta_service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
  offer_text TEXT,
  offer_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  views INTEGER NOT NULL DEFAULT 0,
  booking_clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_posts_business_id ON business_posts(business_id);
CREATE INDEX IF NOT EXISTS idx_business_posts_feed ON business_posts(is_active, created_at DESC);
