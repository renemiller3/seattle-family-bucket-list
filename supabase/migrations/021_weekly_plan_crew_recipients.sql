-- Migration 021: per-crew-member opt-in for the weekly Plan-my-day email.
-- Replaces the all-or-nothing weekly_plan_include_crew flag on profiles
-- with a per-row receives_weekly_plan flag on crew_members. Idempotent.

alter table public.crew_members
  add column if not exists receives_weekly_plan boolean not null default false;

alter table public.profiles
  drop column if exists weekly_plan_include_crew;
