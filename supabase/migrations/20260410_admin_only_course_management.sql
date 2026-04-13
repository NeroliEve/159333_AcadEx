-- Only admins may insert, update, or delete courses.
-- Regular authenticated users and anon can only read (already covered by
-- the courses_select_anon policy added in 20260319).

create policy "courses_insert_admin_only"
on public.courses
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  )
);

create policy "courses_update_admin_only"
on public.courses
for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  )
);

create policy "courses_delete_admin_only"
on public.courses
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  )
);
