-- Migration 022: Business ops dashboard tables.
-- Three tables: recurring tasks (master list), one-off weekly tasks,
-- and a completions ledger so recurring tasks can be checked off per-week
-- without mutating the task itself.

create table if not exists public.ops_recurring_tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  notes       text,
  day_of_week text,                         -- null = anytime this week
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.ops_recurring_tasks
  drop constraint if exists ops_recurring_tasks_day_check;
alter table public.ops_recurring_tasks
  add constraint ops_recurring_tasks_day_check
  check (day_of_week is null or day_of_week in (
    'monday','tuesday','wednesday','thursday','friday','saturday','sunday'
  ));

create table if not exists public.ops_weekly_tasks (
  id            uuid primary key default gen_random_uuid(),
  week_starting date not null,              -- always the Monday of that week
  title         text not null,
  notes         text,
  is_done       boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_ops_weekly_tasks_week
  on public.ops_weekly_tasks(week_starting);

create table if not exists public.ops_recurring_completions (
  id                 uuid primary key default gen_random_uuid(),
  recurring_task_id  uuid not null references public.ops_recurring_tasks(id) on delete cascade,
  week_starting      date not null,
  completed_at       timestamptz not null default now(),
  unique(recurring_task_id, week_starting)
);

create index if not exists idx_ops_completions_week
  on public.ops_recurring_completions(week_starting);
