-- Migration 019: share Plan-my-day recommendations + crew (frequent recipients).
-- Idempotent.

-- Snapshot of a generated 3-option set so a recipient can vote on it.
create table if not exists public.shared_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique,
  date date not null,
  weather jsonb,
  options jsonb not null,
  committed_option_index integer,
  committed_outing_id uuid references public.outings(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_shared_recommendations_slug on public.shared_recommendations(slug);
create index if not exists idx_shared_recommendations_user on public.shared_recommendations(user_id, created_at desc);

-- A pick / vote on a shared recommendation.
create table if not exists public.recommendation_picks (
  id uuid primary key default gen_random_uuid(),
  shared_recommendation_id uuid not null references public.shared_recommendations(id) on delete cascade,
  voter_name text not null,
  option_index integer not null check (option_index >= 0 and option_index <= 2),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_recommendation_picks_share on public.recommendation_picks(shared_recommendation_id, created_at desc);

-- Crew: people the user shares plans with frequently.
create table if not exists public.crew_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_crew_members_user on public.crew_members(user_id, sort_order);

-- RLS — all access goes through server actions using the admin client,
-- so we lock the tables down to owners only at the row level. Public read
-- of a share happens server-side by slug via the admin client.
alter table public.shared_recommendations enable row level security;
alter table public.recommendation_picks enable row level security;
alter table public.crew_members enable row level security;

-- shared_recommendations: owner manages own
drop policy if exists "Users manage own shared recommendations" on public.shared_recommendations;
create policy "Users manage own shared recommendations" on public.shared_recommendations
  for all using (auth.uid() = user_id);

-- recommendation_picks: owner can read picks on their shares
drop policy if exists "Users read picks on own shares" on public.recommendation_picks;
create policy "Users read picks on own shares" on public.recommendation_picks
  for select using (
    exists (
      select 1 from public.shared_recommendations sr
      where sr.id = recommendation_picks.shared_recommendation_id
      and sr.user_id = auth.uid()
    )
  );

-- crew_members: owner manages own
drop policy if exists "Users manage own crew" on public.crew_members;
create policy "Users manage own crew" on public.crew_members
  for all using (auth.uid() = user_id);
