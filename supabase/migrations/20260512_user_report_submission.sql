-- Allow authenticated, non-suspended users to file reports against listings,
-- users, messages, or conversations. Admin select/update policies already
-- exist from 20260505_admin_moderation_panel.sql.

drop policy if exists "reports_insert_self" on public.reports;
create policy "reports_insert_self"
on public.reports
for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.account_status = 'active'
  )
);

-- Ensure exactly one target is referenced per report. Without this, reports
-- could be filed against nothing or multiple targets at once.
alter table public.reports
  drop constraint if exists reports_exactly_one_target_chk;

alter table public.reports
  add constraint reports_exactly_one_target_chk
  check (
    (case when reported_listing_id      is not null then 1 else 0 end)
  + (case when reported_user_id         is not null then 1 else 0 end)
  + (case when reported_message_id      is not null then 1 else 0 end)
  + (case when reported_conversation_id is not null then 1 else 0 end)
    = 1
  );
