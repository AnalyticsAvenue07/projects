-- Ensure the project access table has a project_slug column and migrate any legacy poc_id values.
alter table if exists public.poc_access add column if not exists project_slug text;

update public.poc_access
set project_slug = p.slug
from public.pocs p
where public.poc_access.project_slug is null
  and public.poc_access.poc_id = p.id;

create unique index if not exists poc_access_user_project_slug_idx on public.poc_access (user_id, project_slug);
create index if not exists poc_access_project_slug_idx on public.poc_access (project_slug);

alter table if exists public.poc_access drop column if exists poc_id;
