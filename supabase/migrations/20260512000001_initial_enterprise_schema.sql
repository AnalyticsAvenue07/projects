-- Analytics Avenue: core tables, RLS, helpers, seed POCs
-- Apply in Supabase SQL Editor or: supabase db push

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  company text,
  phone text,
  designation text,
  industry text,
  use_case text,
  role text not null default 'client' check (role in ('super_admin', 'admin', 'client', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  permissions text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists users_status_idx on public.users (status);
create index if not exists users_role_idx on public.users (role);
create index if not exists users_email_idx on public.users (email);
create index if not exists users_permissions_idx on public.users using gin (permissions);

create table if not exists public.pocs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  industry text,
  slug text not null unique,
  thumbnail text,
  visibility text not null default 'visible' check (visibility in ('visible', 'hidden')),
  created_at timestamptz not null default now(),
  tags text[] not null default '{}',
  client text,
  solution_function text,
  tech text,
  contact text,
  featured boolean not null default false,
  sort_rank int not null default 0,
  date_label text
);

create index if not exists pocs_slug_idx on public.pocs (slug);
create index if not exists pocs_visibility_idx on public.pocs (visibility);

create table if not exists public.poc_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  project_slug text not null,
  granted_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, project_slug)
);

create index if not exists poc_access_user_idx on public.poc_access (user_id);
create index if not exists poc_access_project_slug_idx on public.poc_access (project_slug);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  user_id uuid not null references public.users (id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id);
create index if not exists notifications_unread_idx on public.notifications (user_id, is_read);

create or replace function public.is_staff(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users x
    where x.id = uid
      and x.status = 'approved'
      and x.role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_super_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users x
    where x.id = uid
      and x.status = 'approved'
      and x.role = 'super_admin'
  );
$$;

create or replace function public.enforce_user_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.id = auth.uid() and not public.is_staff(auth.uid()) then
    if new.role is distinct from old.role or new.status is distinct from old.status or new.email is distinct from old.email or new.permissions is distinct from old.permissions then
      raise exception 'Forbidden' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists users_update_guard on public.users;
create trigger users_update_guard
before update on public.users
for each row
execute function public.enforce_user_update_guard();

create or replace function public.notify_admins_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  for r in
    select id from public.users where role in ('admin', 'super_admin') and status = 'approved'
  loop
    insert into public.notifications (title, message, user_id)
    values (
      'New signup request',
      format('%s (%s) requested access.', coalesce(new.name, 'User'), new.email),
      r.id
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_users_notify_admins on public.users;
create trigger trg_users_notify_admins
after insert on public.users
for each row
execute function public.notify_admins_new_user();

alter table public.users enable row level security;
alter table public.pocs enable row level security;
alter table public.poc_access enable row level security;
alter table public.notifications enable row level security;

drop policy if exists users_select_self_or_staff on public.users;
create policy users_select_self_or_staff on public.users
for select using (auth.uid() = id or public.is_staff(auth.uid()));

drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
for insert with check (auth.uid() = id);

drop policy if exists users_update_self_or_staff on public.users;
create policy users_update_self_or_staff on public.users
for update using (auth.uid() = id or public.is_staff(auth.uid()))
with check (auth.uid() = id or public.is_staff(auth.uid()));

drop policy if exists users_delete_staff on public.users;
create policy users_delete_staff on public.users
for delete using (public.is_staff(auth.uid()));

drop policy if exists pocs_select on public.pocs;
create policy pocs_select on public.pocs
for select using (
  public.is_staff(auth.uid())
  or exists (
    select 1
    from public.poc_access a
    join public.users u on u.id = a.user_id
    where a.project_slug = pocs.slug
      and a.user_id = auth.uid()
      and u.status = 'approved'
  )
);

drop policy if exists pocs_write_staff on public.pocs;
create policy pocs_write_staff on public.pocs
for all using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

drop policy if exists poc_access_select on public.poc_access;
create policy poc_access_select on public.poc_access
for select using (user_id = auth.uid() or public.is_staff(auth.uid()));

drop policy if exists poc_access_write_staff on public.poc_access;
create policy poc_access_write_staff on public.poc_access
for all using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
for select using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notifications_insert_staff on public.notifications;
create policy notifications_insert_staff on public.notifications
for insert with check (public.is_staff(auth.uid()));

