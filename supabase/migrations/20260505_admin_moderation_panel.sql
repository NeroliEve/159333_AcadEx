do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'profile_account_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.profile_account_status as enum ('active', 'suspended');
  end if;
end
$$;

alter table public.profiles
  add column if not exists account_status public.profile_account_status not null default 'active',
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references public.profiles(id) on delete set null;

create index if not exists profiles_account_status_idx on public.profiles (account_status);
create index if not exists profiles_suspended_by_idx on public.profiles (suspended_by);

create or replace function public.is_active_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and account_status = 'active'
  );
$$;

alter table if exists public.profiles enable row level security;
alter table if exists public.reports enable row level security;
alter table if exists public.admin_action_logs enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
on public.profiles
for select
using (true);

drop policy if exists "profiles_update_self_or_active_admin" on public.profiles;
create policy "profiles_update_self_or_active_admin"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or public.is_active_admin()
)
with check (
  id = auth.uid()
  or public.is_active_admin()
);

drop policy if exists "reports_select_active_admin_only" on public.reports;
create policy "reports_select_active_admin_only"
on public.reports
for select
to authenticated
using (public.is_active_admin());

drop policy if exists "reports_update_active_admin_only" on public.reports;
create policy "reports_update_active_admin_only"
on public.reports
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "admin_action_logs_select_active_admin_only" on public.admin_action_logs;
create policy "admin_action_logs_select_active_admin_only"
on public.admin_action_logs
for select
to authenticated
using (public.is_active_admin());

drop policy if exists "admin_action_logs_insert_active_admin_only" on public.admin_action_logs;
create policy "admin_action_logs_insert_active_admin_only"
on public.admin_action_logs
for insert
to authenticated
with check (public.is_active_admin());

drop policy if exists "courses_insert_admin_only" on public.courses;
create policy "courses_insert_active_admin_only"
on public.courses
for insert
to authenticated
with check (public.is_active_admin());

drop policy if exists "courses_update_admin_only" on public.courses;
create policy "courses_update_active_admin_only"
on public.courses
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "courses_delete_admin_only" on public.courses;
create policy "courses_delete_active_admin_only"
on public.courses
for delete
to authenticated
using (public.is_active_admin());

drop policy if exists "universities_insert_admin_only" on public.universities;
create policy "universities_insert_active_admin_only"
on public.universities
for insert
to authenticated
with check (public.is_active_admin());

drop policy if exists "universities_update_admin_only" on public.universities;
create policy "universities_update_active_admin_only"
on public.universities
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "universities_delete_admin_only" on public.universities;
create policy "universities_delete_active_admin_only"
on public.universities
for delete
to authenticated
using (public.is_active_admin());

drop policy if exists "study_areas_insert_admin" on public.study_areas;
create policy "study_areas_insert_active_admin"
on public.study_areas
for insert
to authenticated
with check (public.is_active_admin());

drop policy if exists "study_areas_update_admin" on public.study_areas;
create policy "study_areas_update_active_admin"
on public.study_areas
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "study_areas_delete_admin" on public.study_areas;
create policy "study_areas_delete_active_admin"
on public.study_areas
for delete
to authenticated
using (public.is_active_admin());

drop policy if exists "listings_update_own" on public.listings;
create policy "listings_update_owner_or_active_admin"
on public.listings
for update
to authenticated
using (
  seller_id = auth.uid()
  or public.is_active_admin()
);

drop policy if exists "listings_delete_own" on public.listings;
create policy "listings_delete_owner_or_active_admin"
on public.listings
for delete
to authenticated
using (
  seller_id = auth.uid()
  or public.is_active_admin()
);

drop policy if exists "listing_images_insert_owner_or_admin" on public.listing_images;
create policy "listing_images_insert_owner_or_active_admin"
on public.listing_images
for insert
to authenticated
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and (
        l.seller_id = auth.uid()
        or public.is_active_admin()
      )
  )
);

drop policy if exists "listing_images_update_owner_or_admin" on public.listing_images;
create policy "listing_images_update_owner_or_active_admin"
on public.listing_images
for update
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and (
        l.seller_id = auth.uid()
        or public.is_active_admin()
      )
  )
)
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and (
        l.seller_id = auth.uid()
        or public.is_active_admin()
      )
  )
);

drop policy if exists "listing_images_delete_owner_or_admin" on public.listing_images;
create policy "listing_images_delete_owner_or_active_admin"
on public.listing_images
for delete
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and (
        l.seller_id = auth.uid()
        or public.is_active_admin()
      )
  )
);
