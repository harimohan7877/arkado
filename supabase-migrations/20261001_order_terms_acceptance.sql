-- Order Terms & Conditions acceptance evidence
-- Run once in the Supabase SQL editor (project: arkado.store).
-- Records the customer's explicit T&C opt-in per order (Razorpay compliance).

ALTER TABLE marketplace_orders
  ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version TEXT;

-- Backfill: orders created before this feature are assumed NOT to have an
-- explicit acceptance record (default FALSE already applied).
