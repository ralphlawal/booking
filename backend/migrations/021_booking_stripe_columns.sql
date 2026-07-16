-- Missing booking columns: Stripe transfer tracking, currency, and consumer link
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consumer_id UUID REFERENCES consumer_accounts(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'gbp';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_transfer_status TEXT DEFAULT 'pending';
