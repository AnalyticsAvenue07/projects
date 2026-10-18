-- Run once in Supabase SQL Editor after your first Auth user exists
-- and the matching row exists in public.users (after signup).
-- Replace the email with your account.
--
-- `public.users.role` is the app's source of truth:
--   super_admin | admin | client | viewer
-- Admin access also requires `status = 'approved'`.
-- Permissions are stored in public.users.permissions as text[] and default to [] on signup.
--
-- Examples:
-- update public.users set role = 'admin', status = 'approved', permissions = '{}' where email = 'user@example.com';
-- update public.users set role = 'viewer', status = 'approved', permissions = '{view_dashboard}' where email = 'user@example.com';

update public.users
set role = 'super_admin', status = 'approved'
where email = 'sheriffrafiq71@gmail.com';
