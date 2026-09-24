-- SouthCity accounts: one profile per Supabase Auth user, plus followed stations and shows.
-- Run once in the Supabase SQL editor (or `supabase db push`). Safe to read top to bottom:
-- every table has row-level security, and listeners can never change their own role.

create type public.app_role as enum ('listener', 'dj', 'station_manager', 'admin');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  role public.app_role not null default 'listener',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users read their own profile" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users rename themselves" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Column privileges stop a user from promoting themselves: only display_name is writable.
-- Profiles are created by the trigger below, never by the client.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

-- Creates the profile when someone first signs in. The name comes from the sign-in form or
-- the identity provider, falling back to the part of the email before the @.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
        nullif(split_part(new.email, '@', 1), ''),
        'Listener'
      ),
      30
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Favorite stations and followed shows. Items are catalog IDs, not copies of catalog data.
create table public.follows (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('station', 'show')),
  item_id text not null check (item_id ~ '^[a-z0-9-]{1,40}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, kind, item_id)
);

alter table public.follows enable row level security;

create policy "Users read their own follows" on public.follows
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users add their own follows" on public.follows
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users remove their own follows" on public.follows
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.follows from anon, authenticated;
grant select, insert, delete on public.follows to authenticated;
