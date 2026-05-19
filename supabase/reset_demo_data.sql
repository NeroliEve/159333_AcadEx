-- Acadex demo/test data reset.
--
-- Purpose:
-- - Remove the unused support_tickets table and support-ticket-only enums.
-- - Clear demo/test data from non-reference public tables.
-- - Preserve reference data in study_areas, degrees, courses, and universities.
-- - Preserve all remaining table structures, constraints, indexes, RLS policies,
--   triggers, and functions.
--
-- Auth users and Storage objects are reset separately through Supabase Admin/API
-- actions where available.

begin;

-- 1. Remove the unused support tickets table. Policies, indexes, and triggers
-- attached to this table are dropped automatically with the table.
drop table if exists public.support_tickets;

-- These enums were only used by public.support_tickets. The IF EXISTS clauses
-- keep the script idempotent if a previous migration has already removed them.
drop type if exists public.support_ticket_category;
drop type if exists public.support_ticket_status;

-- 2. Clear non-reference app data.
--
-- These tables do not include the preserved reference tables:
--   public.study_areas
--   public.degrees
--   public.courses
--   public.universities
--
-- Keep public.profiles out of TRUNCATE because reference tables contain
-- created_by foreign keys to profiles. A DELETE later preserves those rows and
-- applies their ON DELETE SET NULL behavior instead of truncating them.
truncate table
  public.admin_action_logs,
  public.conversations,
  public.listing_images,
  public.listings,
  public.messages,
  public.reports,
  public.reviews,
  public.saved_listings,
  public.transactions,
  public.user_blocks,
  public.wallet_transactions
restart identity;

-- 3. Clear profile rows without truncating tables that reference profiles.
-- This preserves reference rows and only nulls created_by/suspended_by fields
-- where foreign keys are defined with ON DELETE SET NULL.
delete from public.profiles;

-- 4. Safety checks: fail the transaction if any preserved reference table was
-- accidentally emptied, or if any reset table still has rows.
do $$
declare
  reset_rows bigint;
begin
  if (select count(*) from public.study_areas) = 0 then
    raise exception 'Safety check failed: public.study_areas is empty';
  end if;

  if (select count(*) from public.degrees) = 0 then
    raise exception 'Safety check failed: public.degrees is empty';
  end if;

  if (select count(*) from public.courses) = 0 then
    raise exception 'Safety check failed: public.courses is empty';
  end if;

  if (select count(*) from public.universities) = 0 then
    raise exception 'Safety check failed: public.universities is empty';
  end if;

  select
    (select count(*) from public.admin_action_logs) +
    (select count(*) from public.conversations) +
    (select count(*) from public.listing_images) +
    (select count(*) from public.listings) +
    (select count(*) from public.messages) +
    (select count(*) from public.profiles) +
    (select count(*) from public.reports) +
    (select count(*) from public.reviews) +
    (select count(*) from public.saved_listings) +
    (select count(*) from public.transactions) +
    (select count(*) from public.user_blocks) +
    (select count(*) from public.wallet_transactions)
  into reset_rows;

  if reset_rows <> 0 then
    raise exception 'Safety check failed: reset public tables still contain % rows', reset_rows;
  end if;
end $$;

commit;
