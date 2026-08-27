-- Digital gift cards: preset or custom values, balance tracking, real Stripe payment.

CREATE TABLE IF NOT EXISTS gift_cards (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id               UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  code                      TEXT NOT NULL,             -- e.g. "GIFT-A3B2-XY91"
  initial_value             NUMERIC(10,2) NOT NULL,
  remaining_balance         NUMERIC(10,2) NOT NULL,
  currency                  TEXT NOT NULL DEFAULT 'gbp',
  recipient_name            TEXT,
  recipient_email           TEXT,
  sender_name               TEXT,
  message                   TEXT,
  stripe_payment_intent_id  TEXT,
  payment_status            TEXT NOT NULL DEFAULT 'pending',  -- pending | paid | refunded
  status                    TEXT NOT NULL DEFAULT 'active',   -- active | redeemed | expired | cancelled
  expires_at                TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, code)
);

CREATE INDEX IF NOT EXISTS idx_gift_cards_business ON gift_cards(business_id, status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(code);

-- Every balance change (redemption, top-up, refund)
CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gift_card_id    UUID NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  booking_id      UUID REFERENCES bookings(id) ON DELETE SET NULL,
  type            TEXT NOT NULL,   -- purchase | redemption | top_up | refund | expire
  amount          NUMERIC(10,2) NOT NULL,   -- positive = credit, negative = debit
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_card_tx_card ON gift_card_transactions(gift_card_id, created_at DESC);

-- Reference on bookings: which gift card (if any) was applied
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gift_card_id UUID REFERENCES gift_cards(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gift_card_amount NUMERIC(10,2);
