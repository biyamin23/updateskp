-- Run this in Supabase SQL Editor.
create table if not exists public.role_updates (
  id text primary key,
  row_number integer,
  nomak text not null,
  name text not null,
  skp text not null,
  skp_name text,
  old_role text,
  options jsonb not null default '[]'::jsonb,
  selected_role text,
  updated_at timestamptz not null default now()
);

create index if not exists role_updates_skp_idx on public.role_updates (skp);
create index if not exists role_updates_nomak_idx on public.role_updates (nomak);

alter table public.role_updates enable row level security;

-- MVP: public read/update access through anon key.
-- Suitable for an internal temporary portal. For a longer-term production app,
-- replace with authentication + adviser-specific policies.
drop policy if exists "Public read role updates" on public.role_updates;
create policy "Public read role updates"
on public.role_updates for select
to anon
using (true);

drop policy if exists "Public insert role updates" on public.role_updates;
create policy "Public insert role updates"
on public.role_updates for insert
to anon
with check (true);

drop policy if exists "Public update role updates" on public.role_updates;
create policy "Public update role updates"
on public.role_updates for update
to anon
using (true)
with check (true);
