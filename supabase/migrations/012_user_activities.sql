-- Private bucket list items ("Dreams") — user-created, user-scoped

create table public.user_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  location_text text,
  lat double precision,
  lng double precision,
  emoji text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_user_activities_user on public.user_activities(user_id);

alter table public.user_activities enable row level security;

create policy "Users can read own dreams" on public.user_activities
  for select using (auth.uid() = user_id);
create policy "Users can insert own dreams" on public.user_activities
  for insert with check (auth.uid() = user_id);
create policy "Users can update own dreams" on public.user_activities
  for update using (auth.uid() = user_id);
create policy "Users can delete own dreams" on public.user_activities
  for delete using (auth.uid() = user_id);

create trigger update_user_activities_updated_at
  before update on public.user_activities
  for each row execute procedure public.update_updated_at();

-- saved_activities: allow pointing to a user_activity instead of a curated activity.
-- Replaces the composite PK with a surrogate id + partial unique indexes so that
-- (user, curated) and (user, dream) are each unique but either column may be null.
alter table public.saved_activities drop constraint saved_activities_pkey;
alter table public.saved_activities alter column activity_id drop not null;
alter table public.saved_activities add column id uuid not null default gen_random_uuid();
alter table public.saved_activities add primary key (id);
alter table public.saved_activities add column user_activity_id uuid references public.user_activities(id) on delete cascade;
alter table public.saved_activities add constraint saved_activities_target_check
  check ((activity_id is not null)::int + (user_activity_id is not null)::int = 1);
create unique index saved_activities_user_activity_unique
  on public.saved_activities(user_id, activity_id) where activity_id is not null;
create unique index saved_activities_user_dream_unique
  on public.saved_activities(user_id, user_activity_id) where user_activity_id is not null;

-- activity_photos: allow attaching to a dream instead of a curated activity.
alter table public.activity_photos alter column activity_id drop not null;
alter table public.activity_photos add column user_activity_id uuid references public.user_activities(id) on delete cascade;
alter table public.activity_photos add constraint activity_photos_target_check
  check ((activity_id is not null)::int + (user_activity_id is not null)::int = 1);
create index idx_activity_photos_user_activity on public.activity_photos(user_activity_id);

-- plan_items: allow adding dreams to outings / the calendar.
alter table public.plan_items add column user_activity_id uuid references public.user_activities(id) on delete set null;
create index idx_plan_items_user_activity on public.plan_items(user_activity_id);
