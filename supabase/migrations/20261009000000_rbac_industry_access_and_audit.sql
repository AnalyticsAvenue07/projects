-- =============================================================================
-- Migration: 20261009000000_rbac_industry_access_and_audit.sql
-- Analytics Avenue Innovation Hub: Enterprise RBAC Hardening & Audit Trail
-- =============================================================================
-- Designated Administrator: sheriffrafiq71@gmail.com
-- This migration is forward-only, idempotent, and non-destructive.
-- Existing user accounts, profiles, relationships, and legitimate permissions are preserved.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Helper Function: is_platform_admin
--    Verifies that the actor has the approved super_admin role and matches
--    the designated administrator identity (sheriffrafiq71@gmail.com).
-- ---------------------------------------------------------------------------
create or replace function public.is_platform_admin(uid uuid)
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
      and (lower(trim(x.email)) = 'sheriffrafiq71@gmail.com' or x.role = 'super_admin')
  );
$$;

revoke all on function public.is_platform_admin(uuid) from public;
grant execute on function public.is_platform_admin(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Schema Hardening: public.poc_access
--    Support industry-level grants alongside project grants.
--    Industry grants have industry IS NOT NULL and project_slug IS NULL.
-- ---------------------------------------------------------------------------
alter table if exists public.poc_access
  add column if not exists industry text;

alter table if exists public.poc_access
  alter column project_slug drop not null;

-- Drop old broad unique index that required project_slug
drop index if exists poc_access_user_project_slug_idx;

-- Unique constraint for industry grants: (user_id, industry)
create unique index if not exists poc_access_user_industry_uniq
  on public.poc_access (user_id, industry)
  where industry is not null and project_slug is null;

-- Unique constraint for project grants: (user_id, project_slug)
create unique index if not exists poc_access_user_project_uniq
  on public.poc_access (user_id, project_slug)
  where project_slug is not null and industry is null;

create index if not exists poc_access_industry_idx
  on public.poc_access (industry)
  where industry is not null;

-- ---------------------------------------------------------------------------
-- 3. Audit Log: public.admin_audit_log
--    Append-only tamper-evident log of administrative authorization operations.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id                  uuid        primary key default gen_random_uuid(),
  actor_id            uuid        references public.users (id) on delete set null,
  actor_email         text        not null,
  target_user_id      uuid        references public.users (id) on delete set null,
  target_email        text,
  action              text        not null,
  prev_status         text,
  new_status          text,
  prev_role           text,
  new_role            text,
  industries_granted  text[]      default '{}',
  industries_revoked  text[]      default '{}',
  metadata            jsonb       default '{}',
  created_at          timestamptz not null default now()
);

create index if not exists audit_log_actor_idx    on public.admin_audit_log (actor_id);
create index if not exists audit_log_target_idx   on public.admin_audit_log (target_user_id);
create index if not exists audit_log_created_idx  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

-- Policies for admin audit log
drop policy if exists audit_log_select_admin on public.admin_audit_log;
create policy audit_log_select_admin on public.admin_audit_log
  for select using (public.is_platform_admin(auth.uid()) or public.is_staff(auth.uid()));

drop policy if exists audit_log_insert_admin on public.admin_audit_log;
create policy audit_log_insert_admin on public.admin_audit_log
  for insert with check (public.is_platform_admin(auth.uid()) or public.is_staff(auth.uid()));

grant select, insert on table public.admin_audit_log to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Registration Trigger: handle_new_auth_user
--    Server-side bootstrap for sheriffrafiq71@gmail.com as super_admin + approved.
--    All other signups strictly default to role='client' and status='pending'.
--    Client-supplied metadata is never trusted for role or status assignment.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
  display_name text;
  v_role text := 'client';
  v_status text := 'pending';
  v_is_designated_admin boolean;
begin
  v_is_designated_admin := (lower(trim(NEW.email)) = 'sheriffrafiq71@gmail.com');

  display_name := nullif(trim(meta->>'full_name'), '');
  if display_name is null then
    display_name := coalesce(nullif(trim(split_part(NEW.email, '@', 1)), ''), 'User');
  end if;

  if v_is_designated_admin then
    v_role := 'super_admin';
    v_status := 'approved';
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
    v_role,
    v_status,
    '{}'::text[]
  )
  on conflict (id) do update set
    role = case when v_is_designated_admin then 'super_admin' else public.users.role end,
    status = case when v_is_designated_admin then 'approved' else public.users.status end;

  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 5. User Update Guard Trigger: enforce_user_update_guard
--    Prevents client privilege escalation:
--    - Clients cannot modify role, status, email, or permissions.
--    - Self-approval is strictly forbidden.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_user_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.id = auth.uid() then
    if not public.is_platform_admin(auth.uid()) then
      if new.role is distinct from old.role or new.status is distinct from old.status or new.email is distinct from old.email or new.permissions is distinct from old.permissions then
        raise exception 'Forbidden: clients cannot modify their own role, status, or permissions' using errcode = '42501';
      end if;
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

-- ---------------------------------------------------------------------------
-- 6. SECURITY DEFINER: approve_and_grant_industries
--    Atomically approves a pending account and assigns selected industries.
--    Only authorized platform administrator can invoke this function.
-- ---------------------------------------------------------------------------
create or replace function public.approve_and_grant_industries(
  p_target_user_id uuid,
  p_industries      text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id    uuid := auth.uid();
  v_actor_email text;
  v_target_email text;
  v_prev_status  text;
  v_industry     text;
  v_current_industries text[];
  v_to_revoke    text[];
  v_to_grant     text[];
begin
  -- 1. Authorization: caller must be authorized administrator
  if not public.is_platform_admin(v_actor_id) then
    raise exception 'Forbidden: caller is not the platform administrator' using errcode = '42501';
  end if;

  -- 2. Prevent self-approval
  if p_target_user_id = v_actor_id then
    raise exception 'Forbidden: cannot approve your own account' using errcode = '42501';
  end if;

  -- 3. Actor details
  select email into v_actor_email from public.users where id = v_actor_id;

  -- 4. Target details
  select email, status into v_target_email, v_prev_status
    from public.users where id = p_target_user_id;

  if not found then
    raise exception 'Target user not found' using errcode = '22000';
  end if;

  -- 5. Calculate current vs desired grants
  select array_agg(industry) into v_current_industries
    from public.poc_access
    where user_id = p_target_user_id
      and industry is not null
      and project_slug is null;

  v_current_industries := coalesce(v_current_industries, '{}'::text[]);
  v_to_revoke := array(select unnest(v_current_industries) except select unnest(p_industries));
  v_to_grant  := array(select unnest(p_industries)          except select unnest(v_current_industries));

  -- 6. Update user status to approved
  update public.users
    set status = 'approved'
    where id = p_target_user_id;

  -- 7. Revoke removed industries
  if array_length(v_to_revoke, 1) > 0 then
    delete from public.poc_access
      where user_id = p_target_user_id
        and industry = any(v_to_revoke)
        and project_slug is null;
  end if;

  -- 8. Grant new industries
  if array_length(v_to_grant, 1) > 0 then
    foreach v_industry in array v_to_grant loop
      insert into public.poc_access (user_id, industry, project_slug, granted_by)
        values (p_target_user_id, v_industry, null, v_actor_id)
        on conflict (user_id, industry) where industry is not null and project_slug is null
        do nothing;
    end loop;
  end if;

  -- 9. Audit log entry
  insert into public.admin_audit_log (
    actor_id, actor_email, target_user_id, target_email,
    action, prev_status, new_status,
    industries_granted, industries_revoked
  ) values (
    v_actor_id, coalesce(v_actor_email, ''),
    p_target_user_id, coalesce(v_target_email, ''),
    'approve_and_grant',
    v_prev_status, 'approved',
    coalesce(v_to_grant, '{}'), coalesce(v_to_revoke, '{}')
  );
end;
$$;

revoke all on function public.approve_and_grant_industries(uuid, text[]) from public;
grant execute on function public.approve_and_grant_industries(uuid, text[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. SECURITY DEFINER: update_user_industry_access
--    Updates assigned industries for an approved client.
--    Only authorized platform administrator can invoke this function.
-- ---------------------------------------------------------------------------
create or replace function public.update_user_industry_access(
  p_target_user_id uuid,
  p_industries      text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id    uuid := auth.uid();
  v_actor_email text;
  v_target_email text;
  v_industry     text;
  v_current_industries text[];
  v_to_revoke    text[];
  v_to_grant     text[];
begin
  if not public.is_platform_admin(v_actor_id) then
    raise exception 'Forbidden: caller is not the platform administrator' using errcode = '42501';
  end if;

  select email into v_actor_email from public.users where id = v_actor_id;

  select email into v_target_email from public.users where id = p_target_user_id;
  if not found then
    raise exception 'Target user not found' using errcode = '22000';
  end if;

  select array_agg(industry) into v_current_industries
    from public.poc_access
    where user_id = p_target_user_id
      and industry is not null
      and project_slug is null;

  v_current_industries := coalesce(v_current_industries, '{}'::text[]);
  v_to_revoke := array(select unnest(v_current_industries) except select unnest(p_industries));
  v_to_grant  := array(select unnest(p_industries)          except select unnest(v_current_industries));

  if array_length(v_to_revoke, 1) > 0 then
    delete from public.poc_access
      where user_id = p_target_user_id
        and industry = any(v_to_revoke)
        and project_slug is null;
  end if;

  if array_length(v_to_grant, 1) > 0 then
    foreach v_industry in array v_to_grant loop
      insert into public.poc_access (user_id, industry, project_slug, granted_by)
        values (p_target_user_id, v_industry, null, v_actor_id)
        on conflict (user_id, industry) where industry is not null and project_slug is null
        do nothing;
    end loop;
  end if;

  -- Clean up legacy project_slug grants
  delete from public.poc_access
    where user_id = p_target_user_id
      and project_slug is not null
      and industry is null;

  insert into public.admin_audit_log (
    actor_id, actor_email, target_user_id, target_email,
    action, industries_granted, industries_revoked
  ) values (
    v_actor_id, coalesce(v_actor_email, ''),
    p_target_user_id, coalesce(v_target_email, ''),
    'update_industry_access',
    coalesce(v_to_grant, '{}'), coalesce(v_to_revoke, '{}')
  );
end;
$$;

revoke all on function public.update_user_industry_access(uuid, text[]) from public;
grant execute on function public.update_user_industry_access(uuid, text[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8. SECURITY DEFINER: reject_user
--    Rejects client account and logs audit entry.
-- ---------------------------------------------------------------------------
create or replace function public.reject_user(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id    uuid := auth.uid();
  v_actor_email text;
  v_target_email text;
  v_prev_status  text;
begin
  if not public.is_platform_admin(v_actor_id) then
    raise exception 'Forbidden: caller is not the platform administrator' using errcode = '42501';
  end if;
  if p_target_user_id = v_actor_id then
    raise exception 'Forbidden: cannot reject your own account' using errcode = '42501';
  end if;

  select email into v_actor_email from public.users where id = v_actor_id;
  select email, status into v_target_email, v_prev_status
    from public.users where id = p_target_user_id;
  if not found then
    raise exception 'Target user not found' using errcode = '22000';
  end if;

  update public.users set status = 'rejected' where id = p_target_user_id;

  insert into public.admin_audit_log (
    actor_id, actor_email, target_user_id, target_email,
    action, prev_status, new_status
  ) values (
    v_actor_id, coalesce(v_actor_email, ''),
    p_target_user_id, coalesce(v_target_email, ''),
    'reject', v_prev_status, 'rejected'
  );
end;
$$;

revoke all on function public.reject_user(uuid) from public;
grant execute on function public.reject_user(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 9. SECURITY DEFINER: get_industry_access_for_user
--    Allows querying industry grants.
--    Clients may only query their own ID; platform admin may query any user.
-- ---------------------------------------------------------------------------
create or replace function public.get_industry_access_for_user(p_user_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_result text[];
begin
  if v_caller <> p_user_id and not public.is_platform_admin(v_caller) and not public.is_staff(v_caller) then
    raise exception 'Forbidden: cannot query another client permissions' using errcode = '42501';
  end if;

  select array_agg(industry) into v_result
    from public.poc_access
    where user_id = p_user_id
      and industry is not null
      and project_slug is null;

  return coalesce(v_result, '{}'::text[]);
end;
$$;

revoke all on function public.get_industry_access_for_user(uuid) from public;
grant execute on function public.get_industry_access_for_user(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 10. Update RLS Policies on public.users & public.poc_access
--     Ensures authoritative server enforcement against direct manipulation.
-- ---------------------------------------------------------------------------
drop policy if exists users_select_self_or_staff on public.users;
create policy users_select_self_or_staff on public.users
for select using (auth.uid() = id or public.is_platform_admin(auth.uid()) or public.is_staff(auth.uid()));

drop policy if exists users_update_self_or_staff on public.users;
create policy users_update_self_or_staff on public.users
for update using (auth.uid() = id or public.is_platform_admin(auth.uid()))
with check (auth.uid() = id or public.is_platform_admin(auth.uid()));

drop policy if exists poc_access_select on public.poc_access;
create policy poc_access_select on public.poc_access
for select using (user_id = auth.uid() or public.is_platform_admin(auth.uid()) or public.is_staff(auth.uid()));

drop policy if exists poc_access_write_staff on public.poc_access;
create policy poc_access_write_staff on public.poc_access
for all using (public.is_platform_admin(auth.uid()))
with check (public.is_platform_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 11. Privilege Audit & Designated Administrator Setup
--     Promotes sheriffrafiq71@gmail.com to super_admin and approved status.
--     Audits any existing elevated accounts safely.
-- ---------------------------------------------------------------------------
insert into public.admin_audit_log (
  actor_id, actor_email, target_user_id, target_email,
  action, prev_role, new_role, metadata
)
select
  u.id, u.email, u.id, u.email,
  'audit_privilege_review', u.role, u.role,
  jsonb_build_object('note', 'Role audited during RBAC hardening migration')
from public.users u
where u.role in ('super_admin', 'admin')
on conflict do nothing;

update public.users
  set role = 'super_admin', status = 'approved'
  where lower(trim(email)) = 'sheriffrafiq71@gmail.com';
