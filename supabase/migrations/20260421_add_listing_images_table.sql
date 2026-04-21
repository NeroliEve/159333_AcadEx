create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.listing_images enable row level security;

create index if not exists listing_images_listing_id_sort_order_idx
on public.listing_images (listing_id, sort_order);

create unique index if not exists listing_images_one_primary_per_listing_idx
on public.listing_images (listing_id)
where is_primary = true;

create unique index if not exists listing_images_listing_id_sort_order_unique_idx
on public.listing_images (listing_id, sort_order);

alter table public.listing_images
  drop constraint if exists listing_images_sort_order_range;

alter table public.listing_images
  add constraint listing_images_sort_order_range
  check (sort_order >= 0 and sort_order < 3);

drop policy if exists "listing_images_select_public" on public.listing_images;
drop policy if exists "listing_images_select_authenticated" on public.listing_images;
create policy "listing_images_select_public"
on public.listing_images
for select
to anon, authenticated
using (true);

drop policy if exists "listing_images_insert_owner_or_admin" on public.listing_images;
create policy "listing_images_insert_owner_or_admin"
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
        or exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
      )
  )
);

drop policy if exists "listing_images_update_owner_or_admin" on public.listing_images;
create policy "listing_images_update_owner_or_admin"
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
        or exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
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
        or exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
      )
  )
);

drop policy if exists "listing_images_delete_owner_or_admin" on public.listing_images;
create policy "listing_images_delete_owner_or_admin"
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
        or exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
      )
  )
);
