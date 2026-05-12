-- The previous partial unique index limited a listing to ONE pending
-- transaction total. That breaks the intended marketplace flow where many
-- buyers can have pending requests on the same listing and the seller picks
-- one to accept.
--
-- The right invariant is: one pending request PER BUYER per listing. That
-- still stops a single user from spamming requests for the same book while
-- letting the seller see and choose between requests from different buyers.

drop index if exists public.transactions_one_active_pending_per_listing_idx;

create unique index if not exists transactions_one_pending_per_buyer_listing_idx
  on public.transactions (listing_id, buyer_id)
  where status = 'pending';
