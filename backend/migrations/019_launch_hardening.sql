-- Launch hardening: booking idempotency, slot protection, and admin audit logs.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_idempotency_key
  ON bookings(idempotency_key)
  WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bookings_active_slot'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM bookings
      WHERE status <> 'cancelled'
      GROUP BY business_id, booking_date, start_time
      HAVING COUNT(*) > 1
      LIMIT 1
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX idx_bookings_active_slot ON bookings(business_id, booking_date, start_time) WHERE status <> ''cancelled''';
    ELSE
      RAISE NOTICE 'Skipped idx_bookings_active_slot because duplicate active bookings exist. Resolve duplicates before launch.';
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
