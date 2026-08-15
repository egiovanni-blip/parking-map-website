-- Pending admin invites and OTP storage for email-verified password setup
CREATE TABLE IF NOT EXISTS admin_invites (
  email text PRIMARY KEY,
  otp_hash text,
  otp_expires_at timestamptz,
  invited_at timestamptz DEFAULT now(),
  invited_by uuid
);
