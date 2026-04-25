-- Migration 018: add nap window to profiles so Plan-my-day can schedule around it.
-- Stored as HH:MM 24-hour text (matches HTML time input value format). Idempotent.

alter table public.profiles
  add column if not exists nap_start_time text,
  add column if not exists nap_end_time text;
