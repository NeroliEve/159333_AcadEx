-- Backfill legacy sold listings into the permanent archived state.
update public.listings
set
  status = 'archived',
  archived_at = coalesce(archived_at, now()),
  updated_at = now()
where status = 'sold';
