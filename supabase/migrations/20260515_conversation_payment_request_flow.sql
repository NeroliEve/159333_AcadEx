alter table public.transactions
  add column if not exists payment_requested_at timestamptz,
  add column if not exists payment_requested_by uuid references public.profiles(id) on delete set null;

alter table public.conversations
  add column if not exists close_after timestamptz;

create index if not exists conversations_close_after_idx
  on public.conversations (close_after)
  where close_after is not null and archived_at is null;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'transactions'
  ) then
    execute 'alter publication supabase_realtime add table public.transactions';
  end if;
end
$$;

do $$
begin
  create extension if not exists pg_cron with schema extensions;
exception
  when insufficient_privilege or feature_not_supported then
    raise notice 'pg_cron is unavailable in this environment; conversation close job was not created.';
end
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'archive-closed-conversations') then
    perform cron.unschedule('archive-closed-conversations');
  end if;

  perform cron.schedule(
    'archive-closed-conversations',
    '*/10 * * * *',
    $cron$
      update public.conversations
      set archived_at = now()
      where archived_at is null
        and close_after is not null
        and close_after <= now();
    $cron$
  );
exception
  when others then
    raise notice 'pg_cron schema/functions are unavailable; conversation close job was not created.';
end
$$;
