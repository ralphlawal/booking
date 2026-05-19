-- Email verification tokens for business owners (password auth only; Firebase users skip this)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verified') THEN
    ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT TRUE; -- TRUE for existing users so they aren't locked out
    ALTER TABLE users ADD COLUMN email_verify_token VARCHAR(255);
  END IF;
END $$;

-- Email verification tokens for consumer accounts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consumer_accounts' AND column_name='email_verified') THEN
    ALTER TABLE consumer_accounts ADD COLUMN email_verified BOOLEAN DEFAULT TRUE;
    ALTER TABLE consumer_accounts ADD COLUMN email_verify_token VARCHAR(255);
  END IF;
END $$;
