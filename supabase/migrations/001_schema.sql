-- Activities table (public, admin-seeded)
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  location_text text not null,
  location_url text not null,
  lat double precision,
  lng double precision,
  type text not null default 'activity' check (type in ('activity', 'event')),
  age_range text[] not null default '{}',
  area text not null default 'Seattle',
  cost text not null default 'Free' check (cost in ('Free', '$', '$$', '$$$')),
  vibes text[] not null default '{}',
  why_its_worth_it text not null default '',
  what_to_watch_out_for text[] not null default '{}',
  tips text,
  nearby_food jsonb not null default '[]',
  start_date date,
  end_date date,
  recurrence text check (recurrence in ('one-time', 'seasonal', 'annual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profiles (auto-created on sign-up)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Plan items (user's personal calendar)
create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null,
  type text not null default 'activity' check (type in ('activity', 'life_block', 'custom', 'restaurant')),
  title text,
  date date not null,
  start_time time,
  end_time time,
  duration_minutes integer,
  travel_time_before integer,
  travel_time_after integer,
  sort_order integer not null default 0,
  notes text,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Plan notes (one free-text note section per user)
create table public.plan_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now()
);

-- Shared plans (read-only links)
create table public.shared_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique,
  title text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Activity photos (memories)
create table public.activity_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  plan_item_id uuid references public.plan_items(id) on delete set null,
  photo_url text not null,
  date_completed date not null,
  created_at timestamptz not null default now()
);

-- Saved activities (bookmarks)
create table public.saved_activities (
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, activity_id)
);

-- Indexes
create index idx_plan_items_user_date on public.plan_items(user_id, date);
create index idx_plan_items_activity on public.plan_items(activity_id);
create index idx_shared_plans_slug on public.shared_plans(slug);
create index idx_activity_photos_user on public.activity_photos(user_id);
create index idx_activity_photos_activity on public.activity_photos(activity_id);

-- Row Level Security
alter table public.activities enable row level security;
alter table public.profiles enable row level security;
alter table public.plan_items enable row level security;
alter table public.plan_notes enable row level security;
alter table public.shared_plans enable row level security;
alter table public.activity_photos enable row level security;
alter table public.saved_activities enable row level security;

-- Activities: anyone can read
create policy "Activities are publicly readable" on public.activities
  for select using (true);

-- Profiles: users can read/update their own
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Plan items: users can CRUD their own
create policy "Users can read own plan items" on public.plan_items
  for select using (auth.uid() = user_id);
create policy "Users can insert own plan items" on public.plan_items
  for insert with check (auth.uid() = user_id);
create policy "Users can update own plan items" on public.plan_items
  for update using (auth.uid() = user_id);
create policy "Users can delete own plan items" on public.plan_items
  for delete using (auth.uid() = user_id);

-- Shared plan viewers can read plan items
create policy "Shared plan viewers can read plan items" on public.plan_items
  for select using (
    exists (
      select 1 from public.shared_plans
      where shared_plans.user_id = plan_items.user_id
      and shared_plans.is_active = true
    )
  );

-- Plan notes: users can CRUD their own
create policy "Users can read own plan notes" on public.plan_notes
  for select using (auth.uid() = user_id);
create policy "Users can insert own plan notes" on public.plan_notes
  for insert with check (auth.uid() = user_id);
create policy "Users can update own plan notes" on public.plan_notes
  for update using (auth.uid() = user_id);

-- Shared plans: users manage their own, public can read active
create policy "Users can manage own shared plans" on public.shared_plans
  for all using (auth.uid() = user_id);
create policy "Anyone can read active shared plans" on public.shared_plans
  for select using (is_active = true);

-- Activity photos: users manage their own
create policy "Users can read own photos" on public.activity_photos
  for select using (auth.uid() = user_id);
create policy "Users can insert own photos" on public.activity_photos
  for insert with check (auth.uid() = user_id);
create policy "Users can delete own photos" on public.activity_photos
  for delete using (auth.uid() = user_id);
-- Shared plan viewers can see photos
create policy "Shared plan viewers can read photos" on public.activity_photos
  for select using (
    exists (
      select 1 from public.shared_plans
      where shared_plans.user_id = activity_photos.user_id
      and shared_plans.is_active = true
    )
  );

-- Saved activities: users manage their own
create policy "Users can manage saved activities" on public.saved_activities
  for all using (auth.uid() = user_id);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_activities_updated_at
  before update on public.activities
  for each row execute procedure public.update_updated_at();

create trigger update_plan_items_updated_at
  before update on public.plan_items
  for each row execute procedure public.update_updated_at();

create trigger update_plan_notes_updated_at
  before update on public.plan_notes
  for each row execute procedure public.update_updated_at();

-- Storage bucket for photos
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict do nothing;

create policy "Anyone can read photos" on storage.objects
  for select using (bucket_id = 'photos');
create policy "Auth users can upload photos" on storage.objects
  for insert with check (bucket_id = 'photos' and auth.role() = 'authenticated');
create policy "Users can delete own photos" on storage.objects
  for delete using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);
