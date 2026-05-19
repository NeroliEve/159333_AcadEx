alter type public.transaction_status add value if not exists 'declined';

alter table public.transactions
  add column if not exists request_message text,
  add column if not exists declined_at timestamptz;

alter table public.transactions
  drop constraint if exists transactions_request_message_length_check;

alter table public.transactions
  add constraint transactions_request_message_length_check
  check (request_message is null or char_length(request_message) <= 500);

alter table public.conversations
  add column if not exists archived_at timestamptz,
  add column if not exists delete_after timestamptz;

create index if not exists conversations_delete_after_idx
  on public.conversations (delete_after)
  where delete_after is not null;

create index if not exists transactions_declined_buy_attempts_idx
  on public.transactions (listing_id, buyer_id, declined_at)
  where offered_listing_id is null;

alter table public.messages
  drop constraint if exists messages_conversation_id_fkey;

alter table public.messages
  add constraint messages_conversation_id_fkey
  foreign key (conversation_id)
  references public.conversations(id)
  on delete cascade;

alter table public.transactions
  drop constraint if exists transactions_conversation_id_fkey;

alter table public.transactions
  add constraint transactions_conversation_id_fkey
  foreign key (conversation_id)
  references public.conversations(id)
  on delete set null;

alter table public.reports
  drop constraint if exists reports_reported_conversation_id_fkey;

alter table public.reports
  add constraint reports_reported_conversation_id_fkey
  foreign key (reported_conversation_id)
  references public.conversations(id)
  on delete set null;

alter table public.reports
  drop constraint if exists reports_reported_message_id_fkey;

alter table public.reports
  add constraint reports_reported_message_id_fkey
  foreign key (reported_message_id)
  references public.messages(id)
  on delete set null;

do $$
begin
  create extension if not exists pg_cron with schema extensions;
exception
  when insufficient_privilege or feature_not_supported then
    raise notice 'pg_cron is unavailable in this environment; archive cleanup job was not created.';
end
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'delete-archived-conversations') then
    perform cron.unschedule('delete-archived-conversations');
  end if;

  perform cron.schedule(
    'delete-archived-conversations',
    '0 * * * *',
    $cron$
      delete from public.conversations
      where delete_after is not null
        and delete_after <= now();
    $cron$
  );
exception
  when others then
    raise notice 'pg_cron schema/functions are unavailable; archive cleanup job was not created.';
end
$$;
