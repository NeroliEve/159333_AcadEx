create policy "courses_select_anon"
on public.courses
for select
to anon
using (true);

create policy "listings_select_anon_available"
on public.listings
for select
to anon
using (
  status = 'available'
  and deleted_at is null
  and archived_at is null
);
