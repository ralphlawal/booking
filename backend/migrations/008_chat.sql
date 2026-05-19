CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('business_customer', 'admin_business', 'admin_consumer')),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  consumer_id UUID REFERENCES consumer_accounts(id) ON DELETE CASCADE,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'business', 'consumer')),
  sender_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_business  ON chat_rooms(business_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_consumer  ON chat_rooms(consumer_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room   ON chat_messages(room_id, created_at);
