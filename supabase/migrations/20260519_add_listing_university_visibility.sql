alter table public.listings
add column if not exists show_seller_university boolean not null default true;
