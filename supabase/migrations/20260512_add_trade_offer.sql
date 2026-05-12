-- Trade-offer support for transactions.
-- When a buyer requests a trade, they nominate one of their own available
-- listings as the offered book. On completion, both listings are marked sold.

alter table public.transactions
  add column if not exists offered_listing_id uuid
  references public.listings (id) on delete set null;

create index if not exists transactions_offered_listing_id_idx
  on public.transactions (offered_listing_id);
