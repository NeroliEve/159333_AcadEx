do $$
begin
  if not exists (select 1 from pg_type where typname = 'transaction_payment_status') then
    create type public.transaction_payment_status as enum (
      'not_required',
      'unpaid',
      'checkout_pending',
      'paid',
      'failed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'wallet_transaction_type') then
    create type public.wallet_transaction_type as enum ('sale', 'withdrawal');
  end if;

  if not exists (select 1 from pg_type where typname = 'wallet_transaction_status') then
    create type public.wallet_transaction_status as enum ('completed');
  end if;
end $$;

alter table public.transactions
  add column if not exists payment_status public.transaction_payment_status not null default 'not_required',
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists paid_at timestamptz;

update public.transactions
set payment_status = case
  when offered_listing_id is not null then 'not_required'::public.transaction_payment_status
  when status = 'completed' then 'paid'::public.transaction_payment_status
  else 'unpaid'::public.transaction_payment_status
end
where payment_status = 'not_required';

create unique index if not exists transactions_stripe_checkout_session_id_idx
  on public.transactions (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  transaction_id uuid references public.transactions (id) on delete set null,
  type public.wallet_transaction_type not null,
  amount numeric(10, 2) not null check (amount > 0),
  status public.wallet_transaction_status not null default 'completed',
  source_key text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_seller_created_idx
  on public.wallet_transactions (seller_id, created_at desc);

alter table public.wallet_transactions enable row level security;

drop policy if exists "wallet_transactions_select_own" on public.wallet_transactions;
create policy "wallet_transactions_select_own"
on public.wallet_transactions
for select
to authenticated
using (seller_id = auth.uid());
