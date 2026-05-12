-- Track when a user last viewed their transactions list so we can compute an
-- unseen-update badge (e.g. "the seller just accepted/completed your request").

alter table public.profiles
  add column if not exists transactions_seen_at timestamptz;
