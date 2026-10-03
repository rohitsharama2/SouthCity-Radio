-- Apply after 20260930000000_advertisements.sql. Preserves existing cards and order.
alter table public.advertisements
  drop constraint if exists advertisements_cards_check;
alter table public.advertisements
  add constraint advertisements_cards_check
  check (jsonb_typeof(cards) = 'array' and jsonb_array_length(cards) between 0 and 20);
