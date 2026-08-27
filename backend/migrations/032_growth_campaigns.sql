-- Growth & Marketing: campaigns, automations, campaign sends

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',      -- email | sms | push | in_app
  audience TEXT NOT NULL DEFAULT 'all',        -- all | new | returning | vip | inactive_30 | inactive_60 | at_risk
  subject TEXT,                                -- email subject line
  message TEXT NOT NULL,
  offer_type TEXT DEFAULT 'none',              -- none | promo_code | free_service | gift
  offer_value TEXT,                            -- promo code string or description
  booking_link TEXT,
  status TEXT NOT NULL DEFAULT 'draft',        -- draft | sending | sent | failed | scheduled
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  booked_count INTEGER DEFAULT 0,
  revenue_generated NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_business ON campaigns(business_id, created_at DESC);

CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,   -- retention_due | inactive_30 | inactive_60 | post_visit | review_request | birthday | no_show_followup
  channel TEXT NOT NULL DEFAULT 'email',
  subject TEXT,
  message TEXT NOT NULL,
  delay_hours INTEGER DEFAULT 24,              -- hours after trigger to send
  is_active BOOLEAN DEFAULT FALSE,
  sent_count INTEGER DEFAULT 0,
  booked_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_automations_biz_trigger ON automations(business_id, trigger_type);

CREATE TABLE IF NOT EXISTS campaign_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_email TEXT,
  customer_phone TEXT,
  customer_name TEXT,
  consumer_id UUID REFERENCES consumer_accounts(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  status TEXT DEFAULT 'sent',    -- sent | delivered | failed
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign ON campaign_sends(campaign_id);
