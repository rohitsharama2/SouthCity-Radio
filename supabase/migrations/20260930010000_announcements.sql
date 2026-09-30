-- Home announcement ticker settings. Apply after the accounts migration.
-- Public reads, staff-only writes, and server-stamped audit columns.
create table public.announcements (
  id boolean primary key default true check (id),
  settings jsonb not null check (jsonb_typeof(settings) = 'object' and settings ? 'enabled' and settings ? 'messages' and jsonb_typeof(settings->'enabled') = 'boolean' and jsonb_typeof(settings->'messages') = 'array' and jsonb_array_length(settings->'messages') <= 6),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null
);

alter table public.announcements enable row level security;

create policy "Anyone reads the announcements" on public.announcements
  for select to anon, authenticated
  using (true);

create policy "Publishers create the announcements" on public.announcements
  for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role in ('station_manager', 'admin')
    )
  );

create policy "Publishers change the announcements" on public.announcements
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
revoke all on public.announcements from anon, authenticated;
grant select on public.announcements to anon, authenticated;
grant insert (settings) on public.announcements to authenticated;
grant update (settings) on public.announcements to authenticated;

-- Stamps every save with the time and the publisher, whatever the client sends.
create function public.stamp_announcements()
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

create trigger stamp_announcements
  before insert or update on public.announcements
  for each row execute function public.stamp_announcements();
