-- OTP storage for tenant password setup / reset
ALTER TABLE tenant_contacts
  ADD COLUMN IF NOT EXISTS otp_hash text,
  ADD COLUMN IF NOT EXISTS otp_expires_at timestamptz;
