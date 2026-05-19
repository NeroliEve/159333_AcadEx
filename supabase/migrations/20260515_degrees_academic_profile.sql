do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'academic_year_level'
      and n.nspname = 'public'
  ) then
    create type public.academic_year_level as enum ('1', '2', '3', '4', '5', 'postgraduate');
  end if;
end
$$;

create table if not exists public.degrees (
  id bigint generated always as identity primary key,
  name text not null unique,
  slug text not null unique,
  study_area_id integer not null references public.study_areas (id) on delete restrict,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint degrees_name_not_blank check (btrim(name) <> ''),
  constraint degrees_slug_not_blank check (btrim(slug) <> '')
);

alter table public.degrees enable row level security;

drop trigger if exists set_degrees_updated_at on public.degrees;
create trigger set_degrees_updated_at
before update on public.degrees
for each row
execute function public.set_updated_at();

grant select on public.degrees to anon, authenticated;
grant insert, update, delete on public.degrees to authenticated;
grant usage, select on sequence public.degrees_id_seq to authenticated;

drop policy if exists "degrees_select_anon" on public.degrees;
create policy "degrees_select_anon"
on public.degrees
for select
to anon
using (true);

drop policy if exists "degrees_select_authenticated" on public.degrees;
create policy "degrees_select_authenticated"
on public.degrees
for select
to authenticated
using (true);

drop policy if exists "degrees_insert_active_admin_only" on public.degrees;
create policy "degrees_insert_active_admin_only"
on public.degrees
for insert
to authenticated
with check (public.is_active_admin());

drop policy if exists "degrees_update_active_admin_only" on public.degrees;
create policy "degrees_update_active_admin_only"
on public.degrees
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "degrees_delete_active_admin_only" on public.degrees;
create policy "degrees_delete_active_admin_only"
on public.degrees
for delete
to authenticated
using (public.is_active_admin());

insert into public.degrees (name, slug, study_area_id)
values
  ('Business', 'business', (select id from public.study_areas where slug = 'business-commerce')),
  ('Computer Science', 'computer-science', (select id from public.study_areas where slug = 'information-technology')),
  ('Science', 'science', (select id from public.study_areas where slug = 'science-mathematics')),
  ('Engineering', 'engineering', (select id from public.study_areas where slug = 'engineering')),
  ('Law', 'law', (select id from public.study_areas where slug = 'law')),
  ('Health Science', 'health-science', (select id from public.study_areas where slug = 'health-medicine')),
  ('Education', 'education', (select id from public.study_areas where slug = 'education')),
  ('Arts', 'arts', (select id from public.study_areas where slug = 'arts-humanities')),
  ('Social Sciences', 'social-sciences', (select id from public.study_areas where slug = 'social-sciences')),
  ('Design', 'design', (select id from public.study_areas where slug = 'architecture-design')),
  ('Agriculture and Environment', 'agriculture-environment', (select id from public.study_areas where slug = 'agriculture-environment')),
  ('Music and Performing Arts', 'music-performing-arts', (select id from public.study_areas where slug = 'music-performing-arts'))
on conflict (name) do nothing;

alter table public.profiles
  add column if not exists degree_id bigint references public.degrees (id) on delete set null,
  add column if not exists year_level public.academic_year_level;

create index if not exists profiles_degree_id_idx on public.profiles (degree_id);
create index if not exists profiles_year_level_idx on public.profiles (year_level);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  metadata_university_id bigint;
  metadata_degree_id bigint;
  metadata_year_level public.academic_year_level;
begin
  if (new.raw_user_meta_data->>'university_id') ~ '^[0-9]+$' then
    metadata_university_id := (new.raw_user_meta_data->>'university_id')::bigint;
  end if;

  if (new.raw_user_meta_data->>'degree_id') ~ '^[0-9]+$' then
    metadata_degree_id := (new.raw_user_meta_data->>'degree_id')::bigint;
  end if;

  if new.raw_user_meta_data->>'year_level' in ('1', '2', '3', '4', '5', 'postgraduate') then
    metadata_year_level := (new.raw_user_meta_data->>'year_level')::public.academic_year_level;
  end if;

  insert into public.profiles (
    id,
    email,
    username,
    first_name,
    last_name,
    university_id,
    degree_id,
    year_level
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'username',
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    metadata_university_id,
    metadata_degree_id,
    metadata_year_level
  );

  return new;
end;
$$;
