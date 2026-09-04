-- Consumer email OTP verification arrived after some accounts already
-- existed. Those legacy accounts have neither a pending code nor a link to
-- complete, but were marked unverified by the new column. Verify only that
-- cohort; new registrations always receive an OTP and remain protected.
UPDATE consumer_accounts
SET email_verified = TRUE
WHERE COALESCE(email_verified, FALSE) = FALSE
  AND email_otp IS NULL
  AND email_otp_expires IS NULL
  AND email_verify_token IS NULL;
