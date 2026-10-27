-- Arkado Analytics: anonymous event tracking for the admin Analytics tab.
-- Privacy rules (hard):
--   * NO personal data: no name, phone, email, UTR, order ID, or IP address stored.
--   * visitor_id is a random UUID kept in the visitor's own localStorage.
--   * referrer stores ONLY the origin (scheme + host), never full URLs with query strings.
-- Run this in Supabase SQL editor BEFORE deploying the tracking code.
-- The app degrades gracefully if the table is missing (events are dropped, pages keep working).

create table if not exists analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  visitor_id text not null,
  session_id text not null,
  event_type text not null,
  page_path text not null,
  product_id text,
  element text,
  referrer text,
  utm_source text,
  device text
);

create index if not exists analytics_events_created_at_idx on analytics_events (created_at desc);
create index if not exists analytics_events_visitor_idx on analytics_events (visitor_id);
create index if not exists analytics_events_type_time_idx on analytics_events (event_type, created_at desc);
create index if not exists analytics_events_product_idx on analytics_events (product_id, created_at desc);
