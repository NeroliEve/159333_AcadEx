drop policy if exists "listings_select_anon_available" on public.listings;
drop policy if exists "listings_select_public_non_deleted" on public.listings;

create policy "listings_select_public_non_deleted"
on public.listings
for select
to anon, authenticated
using (deleted_at is null);
