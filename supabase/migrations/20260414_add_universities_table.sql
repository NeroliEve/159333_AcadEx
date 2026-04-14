create table public.universities (
  id bigint generated always as identity primary key,
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint universities_name_not_blank check (btrim(name) <> ''),
  constraint universities_slug_not_blank check (btrim(slug) <> '')
);

alter table public.universities enable row level security;

create trigger set_universities_updated_at
before update on public.universities
for each row
execute function public.set_updated_at();

create policy "universities_select_anon"
on public.universities
for select
to anon
using (true);

create policy "universities_select_authenticated"
on public.universities
for select
to authenticated
using (true);

create policy "universities_insert_admin_only"
on public.universities
for insert
to authenticated
with check (public.is_admin());

create policy "universities_update_admin_only"
on public.universities
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "universities_delete_admin_only"
on public.universities
for delete
to authenticated
using (public.is_admin());

insert into public.universities (name, slug)
values
  ('Auckland University of Technology', 'auckland-university-of-technology'),
  ('Lincoln University', 'lincoln-university'),
  ('Massey University', 'massey-university'),
  ('The University of Auckland', 'the-university-of-auckland'),
  ('University of Canterbury', 'university-of-canterbury'),
  ('University of Otago', 'university-of-otago'),
  ('University of Waikato', 'university-of-waikato'),
  ('Victoria University of Wellington', 'victoria-university-of-wellington')
on conflict (name) do nothing;

alter table public.profiles
add column university_id bigint references public.universities (id) on delete set null;

create index profiles_university_id_idx on public.profiles (university_id);

alter table public.courses
add column university_id bigint references public.universities (id) on delete set null;

create index courses_university_id_idx on public.courses (university_id);

create or replace function public.sync_profile_university_fields()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  resolved_university public.universities%rowtype;
  normalized_name text;
begin
  if new.university_id is not null then
    select *
    into resolved_university
    from public.universities
    where id = new.university_id;

    if not found then
      raise exception 'University % does not exist.', new.university_id;
    end if;

    new.university := resolved_university.name;
    return new;
  end if;

  normalized_name := nullif(btrim(new.university), '');

  if normalized_name is null then
    new.university := null;
    new.university_id := null;
    return new;
  end if;

  select *
  into resolved_university
  from public.universities
  where lower(name) = lower(normalized_name)
  limit 1;

  if found then
    new.university := resolved_university.name;
    new.university_id := resolved_university.id;
  else
    new.university := normalized_name;
    new.university_id := null;
  end if;

  return new;
end;
$function$;

create or replace function public.sync_course_university_fields()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  resolved_university public.universities%rowtype;
  normalized_name text;
begin
  if new.university_id is not null then
    select *
    into resolved_university
    from public.universities
    where id = new.university_id;

    if not found then
      raise exception 'University % does not exist.', new.university_id;
    end if;

    new.university := resolved_university.name;
    return new;
  end if;

  normalized_name := nullif(btrim(new.university), '');

  if normalized_name is null then
    new.university := '';
    new.university_id := null;
    return new;
  end if;

  select *
  into resolved_university
  from public.universities
  where lower(name) = lower(normalized_name)
  limit 1;

  if found then
    new.university := resolved_university.name;
    new.university_id := resolved_university.id;
  else
    new.university := normalized_name;
    new.university_id := null;
  end if;

  return new;
end;
$function$;

drop trigger if exists sync_profile_university_fields on public.profiles;
create trigger sync_profile_university_fields
before insert or update on public.profiles
for each row
execute function public.sync_profile_university_fields();

drop trigger if exists sync_course_university_fields on public.courses;
create trigger sync_course_university_fields
before insert or update on public.courses
for each row
execute function public.sync_course_university_fields();

update public.profiles
set university = university;

update public.courses
set university = university;
