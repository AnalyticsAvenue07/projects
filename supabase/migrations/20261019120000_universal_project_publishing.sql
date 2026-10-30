-- =============================================================================
-- Migration: 20261019120000_universal_project_publishing.sql
-- Analytics Avenue Universal Project Publishing Center:
-- Jupyter Notebooks, Presentation & Document Artifacts, Hosted Web App URLs,
-- and Registered AI/ML Microservice Solutions
-- =============================================================================
-- Forward-only, idempotent, and non-destructive.
-- Existing user accounts, profiles, relationships, and POCs are strictly preserved.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Extend project_catalog check constraint to include new project types
-- ---------------------------------------------------------------------------
alter table public.project_catalog drop constraint if exists project_catalog_project_type_check;
alter table public.project_catalog add constraint project_catalog_project_type_check
  check (project_type in ('showcase', 'dashboard', 'ai_app', 'notebook', 'presentation', 'external_app'));

-- ---------------------------------------------------------------------------
-- 2. Project Documents: public.project_documents
--    Stores metadata and secure storage references for PDFs, PPTX decks,
--    architecture diagrams, whitepapers, and reports with RBAC access policies.
-- ---------------------------------------------------------------------------
create table if not exists public.project_documents (
  id                  uuid        primary key default gen_random_uuid(),
  project_id          uuid        not null references public.project_catalog (id) on delete cascade,
  title               text        not null,
  description         text,
  document_type       text        not null check (document_type in ('presentation', 'pdf', 'architecture_diagram', 'report', 'documentation', 'other')),
  access_policy       text        not null default 'project_grant' check (access_policy in ('project_grant', 'admin_only')),
  current_version     int         not null default 1,
  storage_path        text        not null,
  file_name           text        not null,
  file_size           bigint      not null default 0,
  mime_type           text        not null,
  created_by          uuid        references public.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists project_documents_project_idx on public.project_documents (project_id);
create index if not exists project_documents_policy_idx  on public.project_documents (access_policy);
create index if not exists project_documents_created_idx on public.project_documents (created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Project Document Versions: public.project_document_versions
--    Immutable historical versions of documents for audit trails and rollback.
-- ---------------------------------------------------------------------------
create table if not exists public.project_document_versions (
  id                  uuid        primary key default gen_random_uuid(),
  document_id         uuid        not null references public.project_documents (id) on delete cascade,
  version_number      int         not null,
  storage_path        text        not null,
  file_name           text        not null,
  file_size           bigint      not null default 0,
  mime_type           text        not null,
  changelog           text,
  created_by          uuid        references public.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  unique (document_id, version_number)
);

create index if not exists project_doc_versions_doc_idx on public.project_document_versions (document_id);
create index if not exists project_doc_versions_created_idx on public.project_document_versions (created_at desc);

-- ---------------------------------------------------------------------------
-- 4. Triggers
-- ---------------------------------------------------------------------------
drop trigger if exists trg_project_documents_updated on public.project_documents;
create trigger trg_project_documents_updated
before update on public.project_documents
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Row Level Security Policies
-- ---------------------------------------------------------------------------
alter table public.project_documents enable row level security;
alter table public.project_document_versions enable row level security;

-- project_documents: Staff have full management access
drop policy if exists project_documents_staff_all on public.project_documents;
create policy project_documents_staff_all on public.project_documents
  for all using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- project_documents: Approved clients can only read documents where:
-- 1. access_policy = 'project_grant' (admin_only documents are strictly concealed)
-- 2. Parent project is published & visible
-- 3. Client has industry grant or explicit project grant
drop policy if exists project_documents_client_select on public.project_documents;
create policy project_documents_client_select on public.project_documents
  for select using (
    access_policy = 'project_grant'
    and exists (
      select 1 from public.project_catalog pc
      where pc.id = public.project_documents.project_id
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

-- project_document_versions: Staff full access
drop policy if exists project_doc_versions_staff_all on public.project_document_versions;
create policy project_doc_versions_staff_all on public.project_document_versions
  for all using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- project_document_versions: Client select
drop policy if exists project_doc_versions_client_select on public.project_document_versions;
create policy project_doc_versions_client_select on public.project_document_versions
  for select using (
    exists (
      select 1 from public.project_documents pd
      join public.project_catalog pc on pc.id = pd.project_id
      where pd.id = public.project_document_versions.document_id
        and pd.access_policy = 'project_grant'
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

-- ---------------------------------------------------------------------------
-- 6. Grants
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on table public.project_documents to authenticated, service_role;
grant select, insert, update, delete on table public.project_document_versions to authenticated, service_role;
