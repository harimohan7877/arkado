-- Arkado Analytics Phase A: search terms tracking.
-- Run once in Supabase SQL editor. Idempotent (IF NOT EXISTS).
-- Before this runs, search events are dropped silently; the site keeps working.
-- Privacy: search_query is stored lowercase, max 80 chars; the dashboard only
-- shows queries searched 2+ times, so one-off personal searches never surface.
alter table analytics_events add column if not exists search_query text;
