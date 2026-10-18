import { deriveAllowedIndustries, fetchAccessForUser } from '@/services/pocAccess'
import { getAllProjects, getProjectBySlug, getVisibleProjects } from '@/config/projects'
import type { Poc, ProjectRegistryItem } from '@/types/domain'

let myPocsCache: Poc[] | null = null
let adminPocsCache: Poc[] | null = null
const pocBySlugCache = new Map<string, Poc>()
const myProjectsCache = new Map<string, ProjectRegistryItem[]>()

export function mapRegistryProjectToPoc(project: ProjectRegistryItem): Poc {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    industry: project.category,
    slug: project.slug,
    thumbnail: null,
    visibility: project.visible ? 'visible' : 'hidden',
    created_at: new Date().toISOString(),
    tags: [project.category],
    client: null,
    solution_function: null,
    tech: null,
    contact: null,
    featured: Boolean(project.featured),
    sort_rank: 0,
    date_label: null,
  }
}

function cachePocs(pocs: Poc[]) {
  for (const poc of pocs) {
    pocBySlugCache.set(poc.slug, poc)
  }
}

export function getCachedMyPocs(): Poc[] {
  return myPocsCache ?? []
}

export function getCachedAdminPocs(): Poc[] {
  return adminPocsCache ?? []
}

export function getCachedPocBySlug(slug: string): Poc | null {
  const cached = pocBySlugCache.get(slug)
  if (cached) return cached
  const project = getProjectBySlug(slug)
  if (project) {
    const poc = mapRegistryProjectToPoc(project)
    pocBySlugCache.set(slug, poc)
    return poc
  }
  return null
}

export function getCachedMyProjects(userId: string): ProjectRegistryItem[] | null {
  return myProjectsCache.get(userId) ?? null
}

export async function fetchMyPocs(userId: string): Promise<Poc[]> {
  const rows = await fetchAccessForUser(userId)
  const allowedIndustries = deriveAllowedIndustries(rows)
  const projects = getVisibleProjects().filter((project) => allowedIndustries.has(project.category))
  const pocs = projects.map(mapRegistryProjectToPoc)
  myPocsCache = pocs
  cachePocs(pocs)
  return pocs
}

export async function fetchPocBySlug(slug: string): Promise<Poc | null> {
  const project = getProjectBySlug(slug)
  if (!project) return null
  const poc = mapRegistryProjectToPoc(project)
  pocBySlugCache.set(poc.slug, poc)
  return poc
}

export async function fetchAllPocsAdmin(): Promise<Poc[]> {
  const projects = getAllProjects()
  const pocs = projects.map(mapRegistryProjectToPoc)
  adminPocsCache = pocs
  cachePocs(pocs)
  return pocs
}

export async function fetchMyProjectRegistryItems(userId: string, force = false): Promise<ProjectRegistryItem[]> {
  const cached = myProjectsCache.get(userId)
  if (!force && cached) {
    // Background revalidate
    void fetchAccessForUser(userId, true).then((rows) => {
      const allowedIndustries = deriveAllowedIndustries(rows)
      const fresh = getVisibleProjects().filter((project) => allowedIndustries.has(project.category))
      myProjectsCache.set(userId, fresh)
    })
    return cached
  }
  const rows = await fetchAccessForUser(userId, force)
  const allowedIndustries = deriveAllowedIndustries(rows)
  const projects = getVisibleProjects().filter((project) => allowedIndustries.has(project.category))
  myProjectsCache.set(userId, projects)
  return projects
}

export async function fetchAllProjectRegistryItems(): Promise<ProjectRegistryItem[]> {
  return getAllProjects()
}

export async function upsertPoc(poc: Partial<Poc>): Promise<void> {
  if (poc.slug && adminPocsCache) {
    const idx = adminPocsCache.findIndex((p) => p.slug === poc.slug)
    if (idx >= 0) {
      adminPocsCache[idx] = { ...adminPocsCache[idx], ...poc } as Poc
    }
  }
}

export async function deletePoc(id?: string): Promise<void> {
  if (id && adminPocsCache) {
    adminPocsCache = adminPocsCache.filter((p) => p.id !== id)
  }
}
