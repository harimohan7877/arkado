-- Arkado Analytics Phase E: order attribution.
-- Run once in Supabase SQL editor. Idempotent (IF NOT EXISTS).
-- All three columns are ANONYMOUS session keys, NOT PII: visitor_id is a random
-- UUID from the visitor's own browser, session_id is a random session UUID,
-- utm_source is a marketing tag. No name, phone, email, or UTR is stored here.
-- Before this runs, orders are still created (the orders route retries without
-- these columns); only attribution is missing for those orders.
alter table marketplace_orders add column if not exists visitor_id text;
alter table marketplace_orders add column if not exists session_id text;
alter table marketplace_orders add column if not exists utm_source text;
