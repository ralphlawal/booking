-- Consumer auth extras: password reset tokens + created_at index

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consumer_accounts' AND column_name='reset_token') THEN
    ALTER TABLE consumer_accounts ADD COLUMN reset_token VARCHAR(255);
    ALTER TABLE consumer_accounts ADD COLUMN reset_token_expires TIMESTAMPTZ;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_consumer_accounts_email ON consumer_accounts(email);
CREATE INDEX IF NOT EXISTS idx_consumer_accounts_reset_token ON consumer_accounts(reset_token) WHERE reset_token IS NOT NULL;
