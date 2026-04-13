create policy "listings_delete_own"
on public.listings
for delete
to authenticated
using (
  seller_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  )
);
