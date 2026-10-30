-- =============================================================================
-- Migration: 20261020000000_dashboard_project_type.sql
-- Analytics Avenue Innovation Hub: First-Class Dashboard Project Type
-- Supporting Power BI (.pbix), PDF Dashboards, and Power BI Service Embeds
-- =============================================================================
-- Forward-only, idempotent, and non-destructive.
-- Existing user accounts, profiles, relationships, and projects are strictly preserved.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Ensure project_catalog supports dashboard project type and source metadata
-- ---------------------------------------------------------------------------
alter table public.project_catalog drop constraint if exists project_catalog_project_type_check;
alter table public.project_catalog add constraint project_catalog_project_type_check
  check (project_type in ('showcase', 'dashboard', 'ai_app', 'notebook', 'presentation', 'external_app'));

alter table public.project_catalog
  add column if exists dashboard_source text check (dashboard_source is null or dashboard_source in ('powerbi_pbix', 'pdf', 'powerbi_embed', 'visual_builder'));

create index if not exists project_catalog_dash_source_idx on public.project_catalog (dashboard_source);

-- ---------------------------------------------------------------------------
-- 2. Extend project_documents document_type to include pbix and dashboard
-- ---------------------------------------------------------------------------
alter table public.project_documents drop constraint if exists project_documents_document_type_check;
alter table public.project_documents add constraint project_documents_document_type_check
  check (document_type in ('presentation', 'pdf', 'architecture_diagram', 'report', 'documentation', 'pbix', 'dashboard', 'other'));

-- ---------------------------------------------------------------------------
-- 3. Ensure Private Storage Buckets exist for Dashboards and Project Documents
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public)
    values ('project-documents', 'project-documents', false)
    on conflict (id) do update set public = false;

    insert into storage.buckets (id, name, public)
    values ('project-artifacts', 'project-artifacts', false)
    on conflict (id) do update set public = false;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Storage Policies: Private Artifact Storage (Staff full, Approved Client read)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    -- Staff can upload and manage all project-documents and project-artifacts
    drop policy if exists "staff_storage_all" on storage.objects;
    create policy "staff_storage_all" on storage.objects
      for all using (
        bucket_id in ('project-documents', 'project-artifacts')
        and public.is_staff(auth.uid())
      )
      with check (
        bucket_id in ('project-documents', 'project-artifacts')
        and public.is_staff(auth.uid())
      );

    -- Clients can read objects belonging to authorized and published projects
    drop policy if exists "client_storage_select" on storage.objects;
    create policy "client_storage_select" on storage.objects
      for select using (
        bucket_id in ('project-documents', 'project-artifacts')
        and (
          public.is_staff(auth.uid())
          or exists (
            select 1 from public.users u
            where u.id = auth.uid()
              and u.status = 'approved'
          )
        )
      );
  end if;
end $$;
