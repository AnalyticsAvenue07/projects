-- =============================================================================
-- Migration: 20261019000000_project_publishing_center.sql
-- Analytics Avenue Innovation Hub: Self-Service Project Publishing Center,
-- Visual Dashboard Builder, Dataset Management & AI/ML Application Registry
-- =============================================================================
-- This migration is forward-only, idempotent, and non-destructive.
-- Existing user accounts, profiles, relationships, and POCs are strictly preserved.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Project Catalog: public.project_catalog
--    Stores no-code published projects, drafts, showcases, dashboards, and AI apps.
-- ---------------------------------------------------------------------------
create table if not exists public.project_catalog (
  id                  uuid        primary key default gen_random_uuid(),
  title               text        not null,
  slug                text        not null unique,
  description         text        not null,
  detailed_overview   text,
  industry            text        not null,
  category            text        not null default 'General',
  project_type        text        not null check (project_type in ('showcase', 'dashboard', 'ai_app')),
  template_id         text,
  owner_id            uuid        references public.users (id) on delete set null,
  status              text        not null default 'draft' check (status in ('draft', 'validation_failed', 'ready_for_review', 'published', 'unpublished', 'archived')),
  current_version     int         not null default 1,
  visibility          text        not null default 'visible' check (visibility in ('visible', 'hidden')),
  tags                text[]      not null default '{}',
  tech                text[]      not null default '{}',
  business_problem    text,
  business_solution   text,
  target_audience     text,
  thumbnail           text,
  documentation_links jsonb       default '[]'::jsonb,
  draft_config        jsonb       not null default '{}'::jsonb,
  published_config    jsonb,
  last_validated_at   timestamptz,
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists project_catalog_slug_idx       on public.project_catalog (slug);
create index if not exists project_catalog_industry_idx   on public.project_catalog (industry);
create index if not exists project_catalog_status_idx     on public.project_catalog (status);
create index if not exists project_catalog_type_idx       on public.project_catalog (project_type);
create index if not exists project_catalog_owner_idx      on public.project_catalog (owner_id);

-- ---------------------------------------------------------------------------
-- 2. Project Versions: public.project_versions
--    Immutable snapshots of validated project configurations for auditing and rollback.
-- ---------------------------------------------------------------------------
create table if not exists public.project_versions (
  id              uuid        primary key default gen_random_uuid(),
  project_id      uuid        not null references public.project_catalog (id) on delete cascade,
  version_number  int         not null,
  config          jsonb       not null,
  changelog       text,
  created_by      uuid        references public.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (project_id, version_number)
);

create index if not exists project_versions_project_idx on public.project_versions (project_id);
create index if not exists project_versions_created_idx on public.project_versions (created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Project Datasets: public.project_datasets
--    Uploaded datasets, schemas, and sample caches for generic dashboards.
-- ---------------------------------------------------------------------------
create table if not exists public.project_datasets (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  filename        text        not null,
  file_size       bigint      not null default 0,
  row_count       int         not null default 0,
  headers         text[]      not null default '{}',
  schema_meta     jsonb       not null default '{}'::jsonb,
  sample_rows     jsonb       not null default '[]'::jsonb,
  data_json       jsonb,
  storage_path    text,
  created_by      uuid        references public.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists project_datasets_created_by_idx on public.project_datasets (created_by);
create index if not exists project_datasets_created_at_idx on public.project_datasets (created_at desc);

-- ---------------------------------------------------------------------------
-- 4. Registered AI/ML Services: public.registered_ai_services
--    Approved, developer-integrated AI runtimes with strict input/output contracts.
-- ---------------------------------------------------------------------------
create table if not exists public.registered_ai_services (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  slug            text        not null unique,
  industry        text        not null,
  description     text        not null,
  service_url     text        not null,
  health_url      text,
  input_schema    jsonb       not null default '{}'::jsonb,
  output_schema   jsonb       not null default '{}'::jsonb,
  status          text        not null default 'active' check (status in ('active', 'maintenance', 'deprecated')),
  version         text        not null default '1.0.0',
  timeout_ms      int         not null default 15000,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists registered_ai_services_slug_idx     on public.registered_ai_services (slug);
create index if not exists registered_ai_services_industry_idx on public.registered_ai_services (industry);

-- ---------------------------------------------------------------------------
-- 5. Project Audit Log: public.project_audit_log
--    Tamper-evident record of all project administrative and publishing lifecycle actions.
-- ---------------------------------------------------------------------------
create table if not exists public.project_audit_log (
  id              uuid        primary key default gen_random_uuid(),
  project_id      uuid        references public.project_catalog (id) on delete set null,
  project_slug    text        not null,
  project_title   text        not null,
  actor_id        uuid        references public.users (id) on delete set null,
  actor_email     text        not null,
  action          text        not null,
  prev_status     text,
  new_status      text,
  version_number  int,
  metadata        jsonb       default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists project_audit_project_idx on public.project_audit_log (project_id);
create index if not exists project_audit_actor_idx   on public.project_audit_log (actor_id);
create index if not exists project_audit_created_idx on public.project_audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- 6. Updated At Triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_project_catalog_updated on public.project_catalog;
create trigger trg_project_catalog_updated
before update on public.project_catalog
for each row execute function public.set_updated_at();

drop trigger if exists trg_project_datasets_updated on public.project_datasets;
create trigger trg_project_datasets_updated
before update on public.project_datasets
for each row execute function public.set_updated_at();

drop trigger if exists trg_registered_ai_services_updated on public.registered_ai_services;
create trigger trg_registered_ai_services_updated
before update on public.registered_ai_services
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Row Level Security Policies
-- ---------------------------------------------------------------------------
alter table public.project_catalog enable row level security;
alter table public.project_versions enable row level security;
alter table public.project_datasets enable row level security;
alter table public.registered_ai_services enable row level security;
alter table public.project_audit_log enable row level security;

-- project_catalog: Staff have full management access
drop policy if exists project_catalog_staff_all on public.project_catalog;
create policy project_catalog_staff_all on public.project_catalog
  for all using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- project_catalog: Approved clients can only read published & visible projects in authorized industries
drop policy if exists project_catalog_client_select on public.project_catalog;
create policy project_catalog_client_select on public.project_catalog
  for select using (
    status = 'published'
    and visibility = 'visible'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.status = 'approved'
        and (
          public.is_staff(auth.uid())
          or exists (
            select 1 from public.poc_access pa
            where pa.user_id = auth.uid()
              and (pa.industry = public.project_catalog.industry or pa.project_slug = public.project_catalog.slug)
          )
        )
    )
  );

-- project_versions: Staff can read/write, clients can only read published version of accessible projects
drop policy if exists project_versions_staff_all on public.project_versions;
create policy project_versions_staff_all on public.project_versions
  for all using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

drop policy if exists project_versions_client_select on public.project_versions;
create policy project_versions_client_select on public.project_versions
  for select using (
    exists (
      select 1 from public.project_catalog pc
      join public.poc_access pa on (pa.industry = pc.industry or pa.project_slug = pc.slug)
      where pc.id = public.project_versions.project_id
        and pc.status = 'published'
        and pc.visibility = 'visible'
        and pa.user_id = auth.uid()
    )
  );

-- project_datasets: Restricted to staff
drop policy if exists project_datasets_staff_all on public.project_datasets;
create policy project_datasets_staff_all on public.project_datasets
  for all using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- registered_ai_services: Staff have full access, clients can read active services
drop policy if exists registered_ai_services_staff_all on public.registered_ai_services;
create policy registered_ai_services_staff_all on public.registered_ai_services
  for all using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

drop policy if exists registered_ai_services_client_select on public.registered_ai_services;
create policy registered_ai_services_client_select on public.registered_ai_services
  for select using (
    status = 'active'
    and exists (
      select 1 from public.poc_access pa
      where pa.user_id = auth.uid()
        and pa.industry = public.registered_ai_services.industry
    )
  );

-- project_audit_log: Staff only
drop policy if exists project_audit_staff_select on public.project_audit_log;
create policy project_audit_staff_select on public.project_audit_log
  for select using (public.is_staff(auth.uid()));

drop policy if exists project_audit_staff_insert on public.project_audit_log;
create policy project_audit_staff_insert on public.project_audit_log
  for insert with check (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- 8. Grants
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on table public.project_catalog to authenticated, service_role;
grant select, insert, update, delete on table public.project_versions to authenticated, service_role;
grant select, insert, update, delete on table public.project_datasets to authenticated, service_role;
grant select, insert, update, delete on table public.registered_ai_services to authenticated, service_role;
grant select, insert on table public.project_audit_log to authenticated, service_role;
