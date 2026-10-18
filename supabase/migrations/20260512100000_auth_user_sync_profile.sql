-- Sync public.users from auth.users on signup (works with "Confirm email" enabled:
-- no JWT yet, so client-side INSERT into public.users fails RLS.)
-- Run this on your Supabase project (SQL Editor) if you already applied the initial migration.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
  display_name text;
begin
  display_name := nullif(trim(meta->>'full_name'), '');
  if display_name is null then
    display_name := coalesce(nullif(trim(split_part(NEW.email, '@', 1)), ''), 'User');
  end if;

  insert into public.users (
    id,
    name,
    email,
    company,
    phone,
    designation,
    industry,
    use_case,
    role,
    status,
    permissions
  )
  values (
    NEW.id,
    display_name,
    lower(trim(NEW.email)),
    nullif(trim(meta->>'company_name'), ''),
    nullif(trim(meta->>'phone'), ''),
    nullif(trim(meta->>'designation'), ''),
    nullif(trim(meta->>'industry'), ''),
    nullif(trim(meta->>'use_case'), ''),
    'client',
    'pending',
    '{}'::text[]
  )
  on conflict (id) do nothing;

  return NEW;
end;
$$;

-- Re-run safe: drop then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();
