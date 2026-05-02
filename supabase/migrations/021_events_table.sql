-- Migration 021: Event queue for automated family event discovery.
-- Scraped events land here, get AI-enriched, await admin review, then
-- are promoted to the activities table on approval.

create table if not exists public.event_queue (
  id                uuid primary key default gen_random_uuid(),

  -- Raw data as received from the source
  raw_title         text not null,
  raw_description   text,
  raw_location      text,
  raw_start_at      timestamptz not null,
  raw_end_at        timestamptz,
  raw_image_url     text,
  raw_cost_text     text,

  -- Source tracking (used for dedup on re-fetch)
  source_type       text not null,
  source_id         text not null,
  source_url        text,

  -- AI enrichment results (filled by cron after Gemini call)
  ai_title          text,
  ai_description    text,
  ai_age_ranges     text[] not null default '{}',
  ai_cost           text,
  ai_vibes          text[] not null default '{}',
  ai_area           text,
  ai_location_text  text,
  ai_lat            numeric,
  ai_lng            numeric,
  ai_is_family_friendly boolean,
  ai_confidence     numeric,
  ai_reasoning      text,
  ai_enriched_at    timestamptz,

  -- Admin review workflow
  review_status     text not null default 'pending',
  reviewed_at       timestamptz,
  reviewed_by       uuid,
  rejection_reason  text,

  -- Link to the resulting activity once approved
  activity_id       uuid references public.activities(id) on delete set null,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique(source_type, source_id)
);

alter table public.event_queue
  drop constraint if exists event_queue_review_status_check;
alter table public.event_queue
  add constraint event_queue_review_status_check
  check (review_status in ('pending', 'approved', 'rejected', 'auto_approved'));

alter table public.event_queue
  drop constraint if exists event_queue_source_type_check;
alter table public.event_queue
  add constraint event_queue_source_type_check
  check (source_type in ('parentmap', 'visitseattle', 'seattle_center', 'manual'));

create index if not exists idx_event_queue_pending
  on public.event_queue(review_status, raw_start_at)
  where review_status = 'pending';

create index if not exists idx_event_queue_source
  on public.event_queue(source_type, source_id);

create index if not exists idx_event_queue_start
  on public.event_queue(raw_start_at);
