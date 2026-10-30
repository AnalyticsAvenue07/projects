-- =============================================================================
-- Migration: 20261021000000_ml_model_playground.sql
-- Analytics Avenue Innovation Hub: Universal ML Model Playground,
-- Model Registry, Versioning, Dynamic Prediction Engine & Dashboard Generation
-- =============================================================================
-- Forward-only, idempotent, and non-destructive.
-- Existing user accounts, profiles, relationships, and projects are strictly preserved.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Extend project_catalog check constraint to include ml_playground project type
-- ---------------------------------------------------------------------------
alter table public.project_catalog drop constraint if exists project_catalog_project_type_check;
alter table public.project_catalog add constraint project_catalog_project_type_check
  check (project_type in ('showcase', 'dashboard', 'ai_app', 'notebook', 'presentation', 'external_app', 'ml_playground'));

-- ---------------------------------------------------------------------------
-- 2. Registered ML Models: public.ml_models
--    Registry of approved, trusted machine learning models with schemas & metadata.
-- ---------------------------------------------------------------------------
create table if not exists public.ml_models (
  id                  uuid        primary key default gen_random_uuid(),
  project_id          uuid        references public.project_catalog (id) on delete cascade,
  name                text        not null,
  slug                text        not null unique,
  framework           text        not null default 'scikit-learn',
  model_type          text        not null default 'regression' check (model_type in ('regression', 'classification', 'forecasting', 'anomaly')),
  algorithm           text,
  storage_path        text,
  artifact_checksum   text,
  artifact_size       bigint      not null default 0,
  input_schema        jsonb       not null default '[]'::jsonb,
  output_schema       jsonb       not null default '{}'::jsonb,
  dashboard_config    jsonb       not null default '{}'::jsonb,
  active_version      int         not null default 1,
  status              text        not null default 'active' check (status in ('active', 'maintenance', 'deprecated', 'draft')),
  api_endpoint        text,
  created_by          uuid        references public.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists ml_models_slug_idx       on public.ml_models (slug);
create index if not exists ml_models_project_idx    on public.ml_models (project_id);
create index if not exists ml_models_status_idx     on public.ml_models (status);
create index if not exists ml_models_type_idx       on public.ml_models (model_type);
create index if not exists ml_models_created_by_idx on public.ml_models (created_by);

-- ---------------------------------------------------------------------------
-- 3. Model Versions: public.ml_model_versions
--    Immutable historical versions of model artifacts and schemas for auditing & rollback.
-- ---------------------------------------------------------------------------
create table if not exists public.ml_model_versions (
  id                  uuid        primary key default gen_random_uuid(),
  model_id            uuid        not null references public.ml_models (id) on delete cascade,
  version_number      int         not null,
  storage_path        text,
  artifact_checksum   text,
  artifact_size       bigint      not null default 0,
  input_schema        jsonb       not null default '[]'::jsonb,
  changelog           text,
  created_by          uuid        references public.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  unique (model_id, version_number)
);

create index if not exists ml_model_versions_model_idx   on public.ml_model_versions (model_id);
create index if not exists ml_model_versions_created_idx on public.ml_model_versions (created_at desc);

-- ---------------------------------------------------------------------------
-- 4. Prediction Runs: public.ml_prediction_runs
--    Telemetry log for dynamic batch inference runs, evaluation metrics & timing.
-- ---------------------------------------------------------------------------
create table if not exists public.ml_prediction_runs (
  id                  uuid        primary key default gen_random_uuid(),
  project_id          uuid        references public.project_catalog (id) on delete cascade,
  model_id            uuid        references public.ml_models (id) on delete set null,
  model_version       int         not null default 1,
  dataset_name        text        not null,
  row_count           int         not null default 0,
  summary_stats       jsonb       not null default '{}'::jsonb,
  evaluation_metrics  jsonb,
  duration_ms         int         not null default 0,
  created_by          uuid        references public.users (id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists ml_prediction_runs_project_idx on public.ml_prediction_runs (project_id);
create index if not exists ml_prediction_runs_model_idx   on public.ml_prediction_runs (model_id);
create index if not exists ml_prediction_runs_actor_idx   on public.ml_prediction_runs (created_by);
create index if not exists ml_prediction_runs_created_idx on public.ml_prediction_runs (created_at desc);

-- ---------------------------------------------------------------------------
-- 5. Updated At Trigger
-- ---------------------------------------------------------------------------
drop trigger if exists trg_ml_models_updated on public.ml_models;
create trigger trg_ml_models_updated
before update on public.ml_models
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Row Level Security Policies
-- ---------------------------------------------------------------------------
alter table public.ml_models enable row level security;
alter table public.ml_model_versions enable row level security;
alter table public.ml_prediction_runs enable row level security;

-- ml_models: Staff have full management access
drop policy if exists ml_models_staff_all on public.ml_models;
create policy ml_models_staff_all on public.ml_models
  for all using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- ml_models: Approved clients can select models for published visible projects in authorized industries
drop policy if exists ml_models_client_select on public.ml_models;
create policy ml_models_client_select on public.ml_models
  for select using (
    status = 'active'
    and (
      public.is_staff(auth.uid())
      or exists (
        select 1 from public.project_catalog pc
        join public.users u on u.id = auth.uid()
        where pc.id = public.ml_models.project_id
          and pc.status = 'published'
          and pc.visibility = 'visible'
          and u.status = 'approved'
          and (
            exists (
              select 1 from public.poc_access pa
              where pa.user_id = auth.uid()
                and (pa.industry = pc.industry or pa.project_slug = pc.slug)
            )
          )
      )
    )
  );

-- ml_model_versions: Staff full access
drop policy if exists ml_model_versions_staff_all on public.ml_model_versions;
create policy ml_model_versions_staff_all on public.ml_model_versions
  for all using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- ml_model_versions: Client select for permitted projects
drop policy if exists ml_model_versions_client_select on public.ml_model_versions;
create policy ml_model_versions_client_select on public.ml_model_versions
  for select using (
    exists (
      select 1 from public.ml_models mm
      join public.project_catalog pc on pc.id = mm.project_id
      where mm.id = public.ml_model_versions.model_id
        and mm.status = 'active'
        and pc.status = 'published'
        and pc.visibility = 'visible'
        and exists (
          select 1 from public.users u
          where u.id = auth.uid()
            and u.status = 'approved'
            and (
              public.is_staff(auth.uid())
              or exists (
                select 1 from public.poc_access pa
                where pa.user_id = auth.uid()
                  and (pa.industry = pc.industry or pa.project_slug = pc.slug)
              )
            )
        )
    )
  );

-- ml_prediction_runs: Staff full access
drop policy if exists ml_prediction_runs_staff_all on public.ml_prediction_runs;
create policy ml_prediction_runs_staff_all on public.ml_prediction_runs
  for all using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- ml_prediction_runs: Authenticated users can insert their own runs
drop policy if exists ml_prediction_runs_user_insert on public.ml_prediction_runs;
create policy ml_prediction_runs_user_insert on public.ml_prediction_runs
  for insert with check (
    auth.uid() is not null
    and (created_by is null or created_by = auth.uid())
  );

-- ml_prediction_runs: Users can read their own prediction runs
drop policy if exists ml_prediction_runs_user_select on public.ml_prediction_runs;
create policy ml_prediction_runs_user_select on public.ml_prediction_runs
  for select using (
    public.is_staff(auth.uid())
    or created_by = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 7. Grants
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on table public.ml_models to authenticated, service_role;
grant select, insert, update, delete on table public.ml_model_versions to authenticated, service_role;
grant select, insert on table public.ml_prediction_runs to authenticated, service_role;
