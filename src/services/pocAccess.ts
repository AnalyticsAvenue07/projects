import { getSupabase } from '@/lib/supabase/client'
import { getProjectBySlug } from '@/config/projects'
import type { ProjectAccess } from '@/types/domain'

export interface ProjectAccessRow extends ProjectAccess {}

const accessCache = new Map<string, { rows: ProjectAccessRow[]; timestamp: number }>()
const ACCESS_CACHE_TTL = 60_000 // 1 minute

export function invalidateAccessCache(userId?: string) {
  if (userId) accessCache.delete(userId)
  else accessCache.clear()
}

export function deriveAllowedIndustries(rows: ProjectAccessRow[]): Set<string> {
  const industries = new Set<string>()

  for (const row of rows) {
    if (row.industry) {
      industries.add(row.industry)
      continue
    }

    const project = row.project_slug ? getProjectBySlug(row.project_slug) : null
    if (project?.category) {
      industries.add(project.category)
    }
  }

  return industries
}

export async function fetchAccessForUser(userId: string, force = false): Promise<ProjectAccessRow[]> {
  const now = Date.now()
  const cached = accessCache.get(userId)
  if (!force && cached && (now - cached.timestamp < ACCESS_CACHE_TTL)) {
    return cached.rows
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('poc_access')
    .select('id, user_id, project_slug, industry, granted_by, created_at')
    .eq('user_id', userId)
  if (error) {
    if (cached) return cached.rows
    throw error
  }
  const rows = (data ?? []) as ProjectAccessRow[]
  accessCache.set(userId, { rows, timestamp: now })
  return rows
}

export async function grantProjectAccess(userId: string, projectSlug: string, grantedBy: string): Promise<void> {
  invalidateAccessCache(userId)
  const supabase = getSupabase()
  const { error } = await supabase.from('poc_access').upsert(
    [
      {
        user_id: userId,
        project_slug: projectSlug,
        granted_by: grantedBy,
      },
    ],
    {
      onConflict: 'user_id,project_slug',
      ignoreDuplicates: true,
    }
  )
  if (error) throw error
}

export async function grantIndustryAccess(userId: string, industry: string, grantedBy: string): Promise<void> {
  invalidateAccessCache(userId)
  const supabase = getSupabase()
  const { error } = await supabase.from('poc_access').upsert(
    [
      {
        user_id: userId,
        industry,
        granted_by: grantedBy,
        project_slug: null,
      },
    ],
    {
      onConflict: 'user_id,industry',
    }
  )
  if (error) throw error
}

export async function revokeProjectAccess(userId: string, projectSlug: string): Promise<void> {
  invalidateAccessCache(userId)
  const supabase = getSupabase()
  const { error } = await supabase
    .from('poc_access')
    .delete()
    .eq('user_id', userId)
    .eq('project_slug', projectSlug)
  if (error) throw error
}

export async function revokeIndustryAccess(userId: string, industry: string): Promise<void> {
  invalidateAccessCache(userId)
  const supabase = getSupabase()
  const { error } = await supabase
    .from('poc_access')
    .delete()
    .eq('user_id', userId)
    .eq('industry', industry)
  if (error) throw error
}

export async function grantFullVisibleAccess(
  userId: string,
  grantedBy: string,
  visibleProjects: { slug: string; category?: string | null }[]
): Promise<void> {
  invalidateAccessCache(userId)
  const supabase = getSupabase()
  const industries = Array.from(new Set(visibleProjects.map((project) => project.category).filter(Boolean) as string[]))
  const rows = industries.map((industry) => ({
    user_id: userId,
    industry,
    project_slug: null,
    granted_by: grantedBy,
  }))
  if (rows.length === 0) return
  const { error } = await supabase.from('poc_access').upsert(rows, {
    onConflict: 'user_id,industry',
  })
  if (error) throw error
}

export const grantPoc = grantProjectAccess
export const revokePoc = revokeProjectAccess
