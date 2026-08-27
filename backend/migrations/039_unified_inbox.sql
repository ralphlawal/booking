-- Unified business inbox. Provider IDs are metadata only; no message-provider
-- credentials or sensitive payment data are stored here.
CREATE TABLE IF NOT EXISTS inbox_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, customer_id)
);
CREATE INDEX IF NOT EXISTS idx_inbox_conversations_business ON inbox_conversations(business_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS inbox_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES inbox_conversations(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound','system')),
  channel TEXT NOT NULL CHECK (channel IN ('in_app','email','sms','whatsapp')),
  type TEXT NOT NULL DEFAULT 'message',
  content TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','failed')),
  provider TEXT,
  provider_reference TEXT,
  sender_staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_conversation ON inbox_messages(conversation_id, created_at);
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS inbox_permissions TEXT DEFAULT '[]';
