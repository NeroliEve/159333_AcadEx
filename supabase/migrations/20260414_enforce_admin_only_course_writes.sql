-- Remove legacy write policies that still allow non-admin course changes.
drop policy if exists "courses_insert_authenticated" on public.courses;
drop policy if exists "courses_update_creator_or_admin" on public.courses;

-- Recreate admin-only write policies so course management is restricted to admins.
drop policy if exists "courses_insert_admin_only" on public.courses;
create policy "courses_insert_admin_only"
on public.courses
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "courses_update_admin_only" on public.courses;
create policy "courses_update_admin_only"
on public.courses
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "courses_delete_admin_only" on public.courses;
create policy "courses_delete_admin_only"
on public.courses
for delete
to authenticated
using (public.is_admin());
