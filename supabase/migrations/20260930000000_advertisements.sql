-- Four Home advertisement slots. Apply after the accounts migration.
-- Public reads, staff-only writes, and server-stamped audit columns.
create table public.advertisements (
  id boolean primary key default true check (id),
  cards jsonb not null check (jsonb_typeof(cards) = 'array' and jsonb_array_length(cards) = 4),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null
);

alter table public.advertisements enable row level security;

create policy "Anyone reads the advertisements" on public.advertisements
  for select to anon, authenticated
  using (true);

create policy "Publishers create the advertisements" on public.advertisements
  for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role in ('station_manager', 'admin')
    )
  );

create policy "Publishers change the advertisements" on public.advertisements
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role in ('station_manager', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role in ('station_manager', 'admin')
    )
  );

-- Only the settings themselves are writable; the row id and audit columns are not.
revoke all on public.advertisements from anon, authenticated;
grant select on public.advertisements to anon, authenticated;
grant insert (cards) on public.advertisements to authenticated;
grant update (cards) on public.advertisements to authenticated;

-- Stamps every save with the time and the publisher, whatever the client sends.
create function public.stamp_advertisements()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

create trigger stamp_advertisements
  before insert or update on public.advertisements
  for each row execute function public.stamp_advertisements();
