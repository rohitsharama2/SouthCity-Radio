-- SouthCity Live's published settings: a single row. Listeners read it; only station managers
-- and administrators create or change it. The SouthCity server saves with the publisher's own
-- session (it has no service-role key), so these policies are the real authorization check.
-- Until the first publish there is no row and the app uses its built-in defaults.
-- Run once in the Supabase SQL editor (or `supabase db push`) after the accounts migration.

create table public.live_station (
  id boolean primary key default true check (id),
  name text not null check (char_length(name) between 1 and 80),
  description text not null check (char_length(description) between 1 and 400),
  genre text not null check (char_length(genre) between 1 and 40),
  language text not null check (char_length(language) between 1 and 40),
  stream_url text not null check (stream_url ~ '^https?://' and char_length(stream_url) <= 500),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null
);

alter table public.live_station enable row level security;

create policy "Anyone reads the live station settings" on public.live_station
  for select to anon, authenticated
  using (true);

create policy "Publishers create the live station settings" on public.live_station
  for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role in ('station_manager', 'admin')
    )
  );

create policy "Publishers change the live station settings" on public.live_station
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
revoke all on public.live_station from anon, authenticated;
grant select on public.live_station to anon, authenticated;
grant insert (name, description, genre, language, stream_url) on public.live_station to authenticated;
grant update (name, description, genre, language, stream_url) on public.live_station to authenticated;

-- Stamps every save with the time and the publisher, whatever the client sends.
create function public.stamp_live_station()
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

create trigger stamp_live_station
  before insert or update on public.live_station
  for each row execute function public.stamp_live_station();
