do $$
begin
  create type public.transaction_request_type as enum ('buy', 'trade');
exception
  when duplicate_object then null;
end $$;

alter table public.transactions
  add column if not exists request_type public.transaction_request_type not null default 'buy';

update public.transactions
set request_type = 'trade'
where offered_listing_id is not null;
