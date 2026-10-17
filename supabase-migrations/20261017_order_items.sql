-- Order line items for delivery (per-kit Drive links)
-- Run once in the Supabase SQL editor (project: arkado.store).
-- Stores the validated line items (bundle constituents with their Drive URLs)
-- so the approval email, WhatsApp message and admin panel can deliver every
-- kit even when the order is read straight from marketplace_orders.

ALTER TABLE marketplace_orders
  ADD COLUMN IF NOT EXISTS items JSONB;
