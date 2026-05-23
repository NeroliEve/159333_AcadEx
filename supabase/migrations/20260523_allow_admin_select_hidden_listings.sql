-- Hidden listings still need to be selectable by active admins so Postgres RLS
-- allows admin moderation updates such as restoring deleted_at to null.
drop policy if exists "listings_select_active_admin_all" on public.listings;

create policy "listings_select_active_admin_all"
on public.listings
for select
to authenticated
using (public.is_active_admin());
