-- Run in Supabase SQL Editor after the accounts migration.
-- Safe to rerun, even before this email has registered or verified its address.
-- This does not create an Auth user or bypass email verification.
begin;

create or replace function public.grant_southcity_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(new.email) = 'rsouthcity@gmail.com'
     and new.email_confirmed_at is not null then
    update public.profiles set role = 'admin' where id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.grant_southcity_admin() from public, anon, authenticated;

-- PostgreSQL runs same-event triggers alphabetically. This runs after
-- on_auth_user_created, which creates the profile in the accounts migration.
-- The update event also handles confirmation after an unverified signup.
drop trigger if exists zz_grant_southcity_admin on auth.users;
create trigger zz_grant_southcity_admin
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function public.grant_southcity_admin();

-- Grant immediately if the verified account already exists.
update public.profiles
set role = 'admin'
where id in (
  select id from auth.users
  where lower(email) = 'rsouthcity@gmail.com'
    and email_confirmed_at is not null
);

commit;

-- An empty result means the account has not registered yet. An unverified
-- account stays a listener until its sign-in link is used successfully.
select u.email, u.email_confirmed_at is not null as email_verified, p.role
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) = 'rsouthcity@gmail.com';
