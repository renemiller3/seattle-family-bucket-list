-- Migration 020: weekly Plan-my-day email schedule on profiles.
-- Stored as a lowercase day-of-week string ('monday'..'sunday') or null to disable.
-- Idempotent.

alter table public.profiles
  add column if not exists weekly_plan_day text,
  add column if not exists weekly_plan_include_crew boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_weekly_plan_day_check;
alter table public.profiles
  add constraint profiles_weekly_plan_day_check
  check (weekly_plan_day is null or weekly_plan_day in (
    'monday','tuesday','wednesday','thursday','friday','saturday','sunday'
  ));

create index if not exists idx_profiles_weekly_plan_day
  on public.profiles(weekly_plan_day)
  where weekly_plan_day is not null;
