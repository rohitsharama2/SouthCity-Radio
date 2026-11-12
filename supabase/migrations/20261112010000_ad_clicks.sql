create table public.ad_clicks (
  id bigint generated always as identity primary key,
  ad_index integer not null check (ad_index >= 0),
  action text not null check (action in ('open', 'website', 'whatsapp')),
  created_at timestamptz not null default now()
);
alter table public.ad_clicks enable row level security;
create policy "Anyone records ad clicks" on public.ad_clicks for insert to anon, authenticated with check (true);
create policy "Staff reads ad clicks" on public.ad_clicks for select to authenticated using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('station_manager', 'admin')));
grant insert (ad_index, action) on public.ad_clicks to anon, authenticated;
grant select on public.ad_clicks to authenticated;
