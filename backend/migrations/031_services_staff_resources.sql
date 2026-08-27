-- ============================================================
-- Migration 031 — Service enhancements, Staff permissions,
--                 Resources + Service-Resource linking
-- ============================================================

-- ── Services: new operational columns ─────────────────────────────────────
ALTER TABLE services ADD COLUMN IF NOT EXISTS buffer_time            INTEGER          DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS sort_order             INTEGER          DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS online_booking_enabled BOOLEAN          DEFAULT TRUE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS cancellation_policy    TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS location               TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS addons                 TEXT             DEFAULT '[]';

-- ── Staff members: permissions and scheduling ──────────────────────────────
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS permissions TEXT   DEFAULT 'staff';
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS service_ids TEXT   DEFAULT '[]';
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS breaks      TEXT   DEFAULT '[]';
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS time_off    TEXT   DEFAULT '[]';

-- ── Resources ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resources (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID         NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  type        VARCHAR(100) DEFAULT 'room',
  description TEXT,
  quantity    INTEGER      DEFAULT 1,
  is_active   BOOLEAN      DEFAULT TRUE,
  sort_order  INTEGER      DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resources_business ON resources(business_id);

-- ── Service ↔ Resource assignments ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_resources (
  id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id        UUID    NOT NULL REFERENCES services(id)   ON DELETE CASCADE,
  resource_id       UUID    NOT NULL REFERENCES resources(id)  ON DELETE CASCADE,
  quantity_required INTEGER DEFAULT 1,
  UNIQUE(service_id, resource_id)
);
CREATE INDEX IF NOT EXISTS idx_service_resources_service  ON service_resources(service_id);
CREATE INDEX IF NOT EXISTS idx_service_resources_resource ON service_resources(resource_id);
