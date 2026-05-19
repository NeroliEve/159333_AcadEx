-- The marketplace now keeps each request attempt in its own conversation so a
-- buyer can re-request after a previous transaction is cancelled or declined.
-- The legacy uniqueness rule allowed only one conversation forever for the
-- same listing/buyer/seller triple, which blocks that flow.

alter table public.conversations
  drop constraint if exists conversations_listing_buyer_seller_key;

drop index if exists public.conversations_listing_buyer_seller_key;
