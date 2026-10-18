-- Ensure role/status remain the direct source of truth in public.users.
-- Safe to run after the initial schema migration.

alter table if exists public.users
add column if not exists role text;

alter table if exists public.users
add column if not exists status text;

update public.users
set role = 'client'
where role is null or btrim(role) = '';

update public.users
set status = 'pending'
where status is null or btrim(status) = '';

alter table if exists public.users
add column if not exists permissions text[] not null default '{}';

alter table public.users
alter column role set default 'client';

alter table public.users
alter column role set not null;

alter table public.users
alter column status set default 'pending';

alter table public.users
alter column status set not null;

alter table public.users
drop constraint if exists users_role_check;

alter table public.users
add constraint users_role_check
check (role in ('super_admin', 'admin', 'client', 'viewer'));

alter table public.users
drop constraint if exists users_status_check;

alter table public.users
add constraint users_status_check
check (status in ('pending', 'approved', 'rejected'));

create index if not exists users_role_idx on public.users (role);
create index if not exists users_status_idx on public.users (status);
create index if not exists users_permissions_idx on public.users using gin (permissions);
