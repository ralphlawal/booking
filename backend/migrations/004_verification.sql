-- Business verification badge
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='is_verified') THEN
    ALTER TABLE businesses ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;
