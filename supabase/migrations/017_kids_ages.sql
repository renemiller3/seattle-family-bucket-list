-- Migration 017: store kids' ages on profile so the Plan-my-day concierge
-- can filter activities by age appropriateness. Idempotent.

alter table public.profiles
  add column if not exists kids_ages integer[];
