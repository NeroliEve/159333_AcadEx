do $$
declare
  trigger_record record;
begin
  for trigger_record in
    select t.tgname
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'reviews'
      and not t.tgisinternal
      and p.prosrc ilike '%completed transactions%'
  loop
    execute format('drop trigger if exists %I on public.reviews', trigger_record.tgname);
  end loop;
end
$$;

create or replace function public.ensure_review_transaction_reviewable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tx record;
begin
  select buyer_id, seller_id, status, reservation_confirmed_at
  into tx
  from public.transactions
  where id = new.transaction_id;

  if not found then
    raise exception 'Transaction not found for review.';
  end if;

  if tx.status <> 'completed'
    and not (tx.status = 'cancelled' and tx.reservation_confirmed_at is not null)
  then
    raise exception 'Reviews may only be created for completed or cancelled transactions.';
  end if;

  if new.reviewer_id = new.reviewee_id then
    raise exception 'Users cannot review themselves.';
  end if;

  if new.reviewer_id = tx.buyer_id then
    if new.reviewee_id <> tx.seller_id or new.reviewer_role <> 'buyer' then
      raise exception 'Buyer reviews must target the seller.';
    end if;
  elsif new.reviewer_id = tx.seller_id then
    if new.reviewee_id <> tx.buyer_id or new.reviewer_role <> 'seller' then
      raise exception 'Seller reviews must target the buyer.';
    end if;
  else
    raise exception 'Only transaction participants can leave reviews.';
  end if;

  return new;
end;
$$;

drop trigger if exists reviews_validate_transaction_reviewable on public.reviews;

create trigger reviews_validate_transaction_reviewable
before insert or update of transaction_id, reviewer_id, reviewee_id, reviewer_role
on public.reviews
for each row
execute function public.ensure_review_transaction_reviewable();
