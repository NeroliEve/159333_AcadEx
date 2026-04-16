-- Creates the study_areas reference table and links it to listings.
-- Study areas are admin-managed — users can only select from the pre-populated list.

create table public.study_areas (
  id         serial primary key,
  name       text    not null unique,
  slug       text    not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add the FK column to listings (nullable — not all listings need a study area)
alter table public.listings
  add column study_area_id integer references public.study_areas(id);

-- RLS
alter table public.study_areas enable row level security;

-- Anyone can read — needed so dropdowns work for logged-out users too
create policy "study_areas_select_all"
on public.study_areas for select
using (true);

-- Only admins can create, edit, or remove study areas
create policy "study_areas_insert_admin"
on public.study_areas for insert to authenticated
with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

create policy "study_areas_update_admin"
on public.study_areas for update to authenticated
using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

create policy "study_areas_delete_admin"
on public.study_areas for delete to authenticated
using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
