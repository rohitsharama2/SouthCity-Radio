-- Persistent station catalog deletion state. Apply after the accounts migration.
create table public.station_catalog (
  id text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null
);

insert into public.station_catalog (id) values
  ('southcity'), ('jazz'), ('indie'), ('community'), ('classical'), ('folk')
on conflict (id) do nothing;

alter table public.station_catalog enable row level security;
create policy "Anyone reads station catalog" on public.station_catalog for select to anon, authenticated using (true);
create policy "Staff update station catalog" on public.station_catalog for update to authenticated using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('station_manager', 'admin')));
revoke all on public.station_catalog from anon, authenticated;
grant select on public.station_catalog to anon, authenticated;
grant update (deleted_at) on public.station_catalog to authenticated;
