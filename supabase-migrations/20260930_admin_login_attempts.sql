-- Phase 2: persistent admin login throttling
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Idempotent: safe to run multiple times.
--
-- The login route records failed admin logins here so the 5-attempt /
-- 15-minute lockout survives across Vercel serverless instances.
-- If this table is missing, the app falls back to per-instance in-memory
-- throttling and keeps working (a warning is logged server-side).

create table if not exists admin_login_attempts (
  ip text primary key,
  fail_count integer not null default 0,
  first_attempt timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional hardening: enable Row Level Security. The app only touches this
-- table with the service-role key (which bypasses RLS), so enabling RLS
-- additionally blocks any anon-key access with no behavior change.
-- alter table admin_login_attempts enable row level security;
