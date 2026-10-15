-- Read-only: run in Supabase SQL Editor to verify the deployed grant and account.
-- Inspect the function for admin@radiosouthcity.com and email confirmation checks.
select pg_get_functiondef(to_regprocedure('public.grant_southcity_admin()'))
  as deployed_admin_grant;

select tgname, tgenabled, pg_get_triggerdef(oid) as trigger_definition
from pg_trigger
where tgrelid = 'auth.users'::regclass
  and tgname = 'zz_grant_southcity_admin'
  and not tgisinternal;

-- Empty results mean that email has not registered. An admin role confirms access.
select u.email, u.email_confirmed_at is not null as email_verified, p.role
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) in ('admin@radiosouthcity.com', 'rsouthcity@gmail.com');
