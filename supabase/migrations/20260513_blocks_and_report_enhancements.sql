-- =====================================================================
-- Phase 2 of the reporting feature:
--   1. user_blocks table + RLS
--   2. reporters can read their own reports
--   3. auto-action on 3+ distinct pending reports for a listing or user
-- =====================================================================

-- ── 1. user_blocks ───────────────────────────────────────────────────
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self_block check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_id_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists "user_blocks_select_self" on public.user_blocks;
create policy "user_blocks_select_self"
on public.user_blocks
for select
to authenticated
using (blocker_id = auth.uid());

drop policy if exists "user_blocks_insert_self" on public.user_blocks;
create policy "user_blocks_insert_self"
on public.user_blocks
for insert
to authenticated
with check (blocker_id = auth.uid());

drop policy if exists "user_blocks_delete_self" on public.user_blocks;
create policy "user_blocks_delete_self"
on public.user_blocks
for delete
to authenticated
using (blocker_id = auth.uid());

-- ── 2. Reporters can read their own reports ──────────────────────────
drop policy if exists "reports_select_self" on public.reports;
create policy "reports_select_self"
on public.reports
for select
to authenticated
using (reporter_id = auth.uid());

-- ── 3. Auto-hide listings on 3+ distinct pending reports ─────────────
-- When a new report comes in, count the distinct reporters with a pending
-- report targeting the same listing. If the count crosses 3, soft-hide the
-- listing (set deleted_at). Logged to admin_action_logs with admin_id = null
-- so the auto-action shows in the audit trail.
--
-- User suspension is deliberately NOT auto-actioned: three sockpuppet
-- accounts could otherwise permanently lock out an innocent user before an
-- admin reviews. Suspending users stays a manual admin decision.

create or replace function public.auto_action_on_report_threshold()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  threshold constant int := 3;
  distinct_count int;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  if new.reported_listing_id is not null then
    select count(distinct reporter_id) into distinct_count
    from public.reports
    where reported_listing_id = new.reported_listing_id
      and status = 'pending';

    if distinct_count >= threshold then
      update public.listings
        set deleted_at = now()
        where id = new.reported_listing_id
          and deleted_at is null;

      if found then
        insert into public.admin_action_logs (admin_id, action_type, target_type, target_id, notes)
        values (null, 'auto_hide_listing', 'listing', new.reported_listing_id,
                'Auto-hidden after ' || distinct_count || ' distinct pending reports.');
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists auto_action_on_report_insert on public.reports;
create trigger auto_action_on_report_insert
  after insert on public.reports
  for each row execute function public.auto_action_on_report_threshold();

-- admin_action_logs.admin_id has to allow null for system actions
alter table public.admin_action_logs
  alter column admin_id drop not null;
