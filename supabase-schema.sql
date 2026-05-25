-- pair_entries table for cloud sync

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


  on public.pair_entries for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);


  on public.pair_entries for delete
  using (auth.uid()::text = user_id);


-- user_settings table for per-user preferences
create table if not exists public.user_settings (
  user_id text primary key,
  id_opt_in boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger trg_user_settings_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own"
  on public.user_settings for select
  using (auth.uid()::text = user_id);

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own"
  on public.user_settings for insert
  with check (auth.uid()::text = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own"
  on public.user_settings for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);
