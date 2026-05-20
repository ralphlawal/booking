-- Payout / bank details for businesses (manual payout until Stripe Connect)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS bank_holder_name TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS bank_sort_code TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS bank_updated_at TIMESTAMPTZ;

-- Verification: collect specific business details before approving
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verification_details JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMPTZ;

-- Stripe Connect (for automated payouts — future)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE;
