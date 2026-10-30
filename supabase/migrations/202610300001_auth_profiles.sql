-- Provision a profile for every auth user so permission snapshots work for OAuth accounts.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  email_name text := split_part(coalesce(new.email, ''), '@', 1);
  display_name text := coalesce(
    nullif(trim(metadata->>'full_name'), ''),
    nullif(trim(metadata->>'name'), ''),
    nullif(trim(email_name), ''),
    'Member-' || left(new.id::text, 8)
  );
begin
  insert into public.user_profiles (id, username, email, avatar_url)
  values (
    new.id,
    left(display_name, 80) || '-' || left(new.id::text, 8),
    coalesce(new.email, ''),
    nullif(left(metadata->>'avatar_url', 2000), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        avatar_url = coalesce(excluded.avatar_url, public.user_profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
