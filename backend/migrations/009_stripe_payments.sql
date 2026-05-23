-- Stripe payment columns on bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';

-- Drop old GoCardless table if it exists
DROP TABLE IF EXISTS payment_mandates CASCADE;
