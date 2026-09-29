-- Business in-app notifications (bookings, messages, platform alerts)
CREATE TABLE IF NOT EXISTS business_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  type        TEXT NOT NULL,        -- 'booking_new' | 'booking_cancelled' | 'message' | 'review' | 'platform'
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biz_notif_business ON business_notifications (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_biz_notif_unread   ON business_notifications (business_id) WHERE is_read = FALSE;
