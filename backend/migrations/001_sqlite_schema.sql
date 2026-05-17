-- Bookly SQLite Schema
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_verified INTEGER DEFAULT 0,
  reset_token TEXT,
  reset_token_expires TEXT,
  created_at TEXT DEFAULT (NOW()),
  updated_at TEXT DEFAULT (NOW())
);

CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  phone TEXT,
  email TEXT,
  location TEXT,
  category TEXT,
  logo_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  is_active INTEGER DEFAULT 1,
  settings TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (NOW()),
  updated_at TEXT DEFAULT (NOW())
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price REAL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (NOW()),
  updated_at TEXT DEFAULT (NOW())
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  total_bookings INTEGER DEFAULT 0,
  no_shows INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (NOW()),
  updated_at TEXT DEFAULT (NOW())
);

CREATE TABLE IF NOT EXISTS availability_settings (
  id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  working_days TEXT DEFAULT '["monday","tuesday","wednesday","thursday","friday"]',
  opening_time TEXT DEFAULT '09:00',
  closing_time TEXT DEFAULT '17:00',
  slot_interval_minutes INTEGER DEFAULT 30,
  buffer_minutes INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (NOW()),
  updated_at TEXT DEFAULT (NOW())
);

CREATE TABLE IF NOT EXISTS blocked_slots (
  id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  blocked_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  reason TEXT,
  is_full_day INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (NOW())
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
  reference_id TEXT UNIQUE NOT NULL,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL REFERENCES services(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  booking_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed')),
  notes TEXT,
  cancelled_reason TEXT,
  created_at TEXT DEFAULT (NOW()),
  updated_at TEXT DEFAULT (NOW())
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT DEFAULT (NOW())
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
  business_id TEXT REFERENCES businesses(id) ON DELETE SET NULL,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  recipient TEXT,
  subject TEXT,
  status TEXT DEFAULT 'sent',
  created_at TEXT DEFAULT (NOW())
);

CREATE INDEX IF NOT EXISTS idx_bookings_business_id ON bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_services_business_id ON services(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_business_date ON blocked_slots(business_id, blocked_date);
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);
