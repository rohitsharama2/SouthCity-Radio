-- Add the requested drafts without inventing business details or publishing them.
-- Apply after 20261002010000_flexible_advertisements.sql. Safe to rerun.
do $$
declare
  current_cards jsonb;
  draft_title text;
begin
  insert into public.advertisements (cards) values ('[]'::jsonb)
    on conflict (id) do nothing;
  select cards into current_cards from public.advertisements where id = true for update;
  foreach draft_title in array array['Home Chef', 'Property Listing'] loop
    if not exists (
      select 1 from jsonb_array_elements(current_cards) card
      where card ->> 'title' = draft_title
    ) then
      if jsonb_array_length(current_cards) >= 20 then
        raise exception 'The advertisement list is full. Remove a card before adding the drafts.';
      end if;
      current_cards := current_cards || jsonb_build_array(jsonb_build_object(
        'title', draft_title, 'sponsor', '', 'description', '',
        'imageUrl', '', 'linkUrl', '', 'enabled', false
      ));
    end if;
  end loop;
  update public.advertisements set cards = current_cards where id = true;
end;
$$;
