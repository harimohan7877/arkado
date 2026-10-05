-- Page-view tracking for the admin dashboard visitor chart.
-- Privacy-friendly: only page path + timestamp, no IP / user-agent / cookies.
-- Run this in Supabase SQL editor. The app degrades gracefully if the table is missing.

create table if not exists page_views (
  id bigint generated always as identity primary key,
  page_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx on page_views (created_at desc);
create index if not exists page_views_path_idx on page_views (page_path);
