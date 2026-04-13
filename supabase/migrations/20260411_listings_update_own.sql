create policy "listings_update_own"
on public.listings
for update
to authenticated
using (
  seller_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  )
);
