-- Tables backing the "Suggest a Bucket List Item" and
-- "Report an Issue / Share an Idea" forms. Anyone (signed in or not) can
-- submit; only the service role reads them (admin uses SQL editor).

create table public.activity_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  description text,
  location text,
  submitted_by text,
  created_at timestamptz not null default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  message text not null,
  submitted_by text,
  page_url text,
  created_at timestamptz not null default now()
);

alter table public.activity_suggestions enable row level security;
alter table public.feedback enable row level security;

-- Anyone (anon + authenticated) can insert. No public SELECT policy — only
-- service role can read, which admin uses via SQL editor.
create policy "Anyone can submit suggestions" on public.activity_suggestions
  for insert with check (true);
create policy "Anyone can submit feedback" on public.feedback
  for insert with check (true);
