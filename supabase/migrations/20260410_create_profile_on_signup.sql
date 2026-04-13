-- Automatically create a profile row when a new auth user is created.
-- The username, first_name, and last_name are passed as user metadata
-- from the sign-up form via supabase.auth.signUp({ options: { data: {...} } }).

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username, first_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'username',
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
