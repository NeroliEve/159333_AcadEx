-- Authenticated users may edit their own public profile fields, but must never
-- update authorization or moderation columns directly through the Data API.

revoke update on table public.profiles from authenticated;
revoke update on table public.profiles from anon;

grant update (
  avatar_url,
  bio,
  degree_id,
  first_name,
  last_name,
  transactions_seen_at,
  university,
  university_id,
  username,
  year_level
) on table public.profiles to authenticated;

drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
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
