-- pair_entries table for cloud sync
create extension if not exists pgcrypto;

create table if not exists public.pair_entries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  pair text not null,
  word text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  skip_count integer not null default 0,
  favorite boolean not null default false,
  memo text not null default ''
);

create unique index if not exists pair_entries_user_pair_uniq
  on public.pair_entries(user_id, pair);

create index if not exists pair_entries_user_id_idx
  on public.pair_entries(user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pair_entries_updated_at on public.pair_entries;
create trigger trg_pair_entries_updated_at
before update on public.pair_entries
for each row execute function public.set_updated_at();

alter table public.pair_entries enable row level security;

-- CREATE POLICY does not support IF NOT EXISTS in Supabase Postgres.
-- Drop-and-create keeps this script re-runnable.
drop policy if exists "Users can read own entries" on public.pair_entries;
create policy "Users can read own entries"
  on public.pair_entries for select
  using (auth.uid()::text = user_id);

drop policy if exists "Users can insert own entries" on public.pair_entries;
create policy "Users can insert own entries"
  on public.pair_entries for insert
  with check (auth.uid()::text = user_id);

drop policy if exists "Users can update own entries" on public.pair_entries;
create policy "Users can update own entries"
  on public.pair_entries for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

drop policy if exists "Users can delete own entries" on public.pair_entries;
create policy "Users can delete own entries"
  on public.pair_entries for delete
  using (auth.uid()::text = user_id);
