-- Internal admin notes on orders (visible only in admin panel, never to customers).
-- Run this in Supabase SQL editor. Until then, notes still work via the
-- admin_settings JSON backup merge in lib/store-data.ts (graceful fallback).

alter table marketplace_orders
  add column if not exists admin_note text not null default '';
