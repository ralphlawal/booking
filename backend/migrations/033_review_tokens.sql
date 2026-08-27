-- Token-based review submission: lets customers review without being logged in.
-- A token is generated when the review reminder is sent, linked to the booking.

CREATE TABLE IF NOT EXISTS review_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token       TEXT NOT NULL UNIQUE,
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX IF NOT EXISTS idx_review_tokens_token ON review_tokens(token);
CREATE INDEX IF NOT EXISTS idx_review_tokens_booking ON review_tokens(booking_id);

-- Add reviewer_name to reviews so non-logged-in customers can attach their name
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_name TEXT;
