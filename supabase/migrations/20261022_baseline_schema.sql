-- Baseline schema for a fresh Supabase project.
-- Reconstructed from how the app queries the database (src/app, src/lib, src/components).
-- Run once in the Supabase SQL Editor of a new project. Safe to re-run.
-- Already includes 20260716_add_tenant_contact_full_name.sql, so that file can be skipped.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Admins: one row per Supabase Auth user who may use /admin.
create table if not exists public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists admin_users_email_idx on public.admin_users (lower(email));

-- Pending admin invites and OTP storage for email-verified password setup.
create table if not exists public.admin_invites (
  email text primary key,
  otp_hash text,
  otp_expires_at timestamptz,
  invited_at timestamptz default now(),
  invited_by uuid
);

-- Tenant portal contacts (custom auth: bcrypt password_hash + OTP, not Supabase Auth).
create table if not exists public.tenant_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  company_name text not null,
  password_hash text,
  otp_hash text,
  otp_expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- One row per parking space detected on a floor's SVG overlay.
create table if not exists public.parking_spots (
  id uuid primary key default gen_random_uuid(),
  floor_id text not null,
  spot_identifier text,
  display_label text,          -- company the space is assigned to ('Unassigned' by default)
  custom_label text,           -- parker name
  original_label text,         -- space number
  color text,
  spot_type text not null default 'regular',
  svg_x double precision,
  svg_y double precision,
  svg_width double precision,
  svg_height double precision,
  is_custom_labeled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists parking_spots_floor_id_idx on public.parking_spots (floor_id);

-- Space requests submitted from the public floor pages.
create table if not exists public.spot_requests (
  id uuid primary key default gen_random_uuid(),
  floor_id text,
  floor_label text,
  spot_identifier text,        -- parking_spots.id of the requested space
  spot_number text,
  spot_type text,
  requester_name text,
  requester_role text,
  requester_phone text,
  requester_email text,
  requester_company text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists spot_requests_submitted_at_idx on public.spot_requests (submitted_at desc);
create index if not exists spot_requests_email_idx on public.spot_requests (requester_email, submitted_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- API routes use the service role key and bypass RLS. These policies cover the
-- browser client (anon key + admin's Supabase session).
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where id = auth.uid() and is_active
  );
$$;

alter table public.admin_users     enable row level security;
alter table public.admin_invites   enable row level security;
alter table public.tenant_contacts enable row level security;
alter table public.parking_spots   enable row level security;
alter table public.spot_requests   enable row level security;

-- admin_users / admin_invites: server-only (service role). No policies = no browser access.

-- tenant_contacts: admins manage contacts from /admin/tenants.
drop policy if exists "admins manage tenant contacts" on public.tenant_contacts;
create policy "admins manage tenant contacts" on public.tenant_contacts
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- parking_spots: anyone can view the map; admins edit it.
drop policy if exists "public read parking spots" on public.parking_spots;
create policy "public read parking spots" on public.parking_spots
  for select to anon, authenticated
  using (true);

drop policy if exists "admins insert parking spots" on public.parking_spots;
create policy "admins insert parking spots" on public.parking_spots
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "admins update parking spots" on public.parking_spots;
create policy "admins update parking spots" on public.parking_spots
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- spot_requests: inserted via API (service role); admins read them in the browser.
drop policy if exists "admins read spot requests" on public.spot_requests;
create policy "admins read spot requests" on public.spot_requests
  for select to authenticated
  using (public.is_admin());
