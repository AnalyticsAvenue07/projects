-- Supabase RLS only works after the API role can access the table at all.
-- Grant authenticated/service_role table privileges for app tables; policies still
-- restrict which rows/actions are actually allowed.

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on table public.users to authenticated, service_role;
grant select, insert, update, delete on table public.pocs to authenticated, service_role;
grant select, insert, update, delete on table public.poc_access to authenticated, service_role;
grant select, insert, update, delete on table public.notifications to authenticated, service_role;
