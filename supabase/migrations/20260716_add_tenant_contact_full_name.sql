-- Add full_name to tenant contacts (run in Supabase SQL Editor if not applied yet)
ALTER TABLE tenant_contacts
  ADD COLUMN IF NOT EXISTS full_name text;
