import { deriveAllowedIndustries, fetchAccessForUser } from '@/services/pocAccess'
import { getAllProjects, getProjectBySlug, getVisibleProjects } from '@/config/projects'
import type { Poc, ProjectRegistryItem } from '@/types/domain'
import { ProjectManagementService } from '@/services/projectManagementService'
import type { ProjectCatalogItem } from '@/types/projectManagement'

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

export function mapCatalogItemToRegistryItem(item: ProjectCatalogItem): ProjectRegistryItem {
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    route: `/published/${item.slug}`,
    category: item.industry,
    description: item.description,
    visible: item.visibility === 'visible' && item.status === 'published',
    featured: false,
  }
}

export function mapCatalogItemToPoc(item: ProjectCatalogItem): Poc {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    industry: item.industry,
    slug: item.slug,
    thumbnail: item.thumbnail || null,
    visibility: item.visibility,
    created_at: item.createdAt,
    tags: item.tags,
    client: null,
    solution_function: item.category,
    tech: item.tech.join(', '),
    contact: null,
    featured: false,
    sort_rank: 0,
    date_label: new Date(item.publishedAt || item.createdAt).toLocaleDateString(),
  }
}

export function invalidateProjectsCache(userId?: string): void {
  if (userId) {
    myProjectsCache.delete(userId)
  } else {
    myProjectsCache.clear()
  }
  myPocsCache = null
  adminPocsCache = null
  pocBySlugCache.clear()
}

export async function fetchMyPocs(userId: string): Promise<Poc[]> {
  const rows = await fetchAccessForUser(userId)
  const allowedIndustries = deriveAllowedIndustries(rows)
  const staticProjects = getVisibleProjects().filter((project) => allowedIndustries.has(project.category))
  const staticPocs = staticProjects.map(mapRegistryProjectToPoc)

  // Merge published catalog POCs
  try {
    const published = await ProjectManagementService.fetchProjects({ status: 'published' })
    const accessibleCatalog = published
      .filter((p) => p.visibility === 'visible' && p.status === 'published' && allowedIndustries.has(p.industry))
      .map(mapCatalogItemToPoc)
    const seen = new Set<string>()
    const combined: Poc[] = []
    for (const p of [...staticPocs, ...accessibleCatalog]) {
      if (!seen.has(p.slug)) {
        seen.add(p.slug)
        combined.push(p)
      }
    }
    myPocsCache = combined
    cachePocs(combined)
    return combined
  } catch {
    myPocsCache = staticPocs
    cachePocs(staticPocs)
    return staticPocs
  }
}

export async function fetchPocBySlug(slug: string): Promise<Poc | null> {
  const project = getProjectBySlug(slug)
  if (project) {
    const poc = mapRegistryProjectToPoc(project)
    pocBySlugCache.set(poc.slug, poc)
    return poc
  }

  // Look in project catalog
  try {
    const catalogItem = await ProjectManagementService.getProjectBySlug(slug)
    if (catalogItem) {
      const poc = mapCatalogItemToPoc(catalogItem)
      pocBySlugCache.set(poc.slug, poc)
      return poc
    }
  } catch {
    // ignore
  }

  return null
}

export async function fetchAllPocsAdmin(): Promise<Poc[]> {
  const projects = getVisibleProjects()
  const staticPocs = projects.map(mapRegistryProjectToPoc)

  try {
    const catalogItems = await ProjectManagementService.fetchProjects({ status: 'published' })
    const catalogPocs = catalogItems
      .filter((p) => p.visibility === 'visible' && p.status === 'published')
      .map(mapCatalogItemToPoc)
    const seen = new Set<string>()
    const combined: Poc[] = []
    for (const p of [...staticPocs, ...catalogPocs]) {
      if (!seen.has(p.slug)) {
        seen.add(p.slug)
        combined.push(p)
      }
    }
    adminPocsCache = combined
    cachePocs(combined)
    return combined
  } catch {
    adminPocsCache = staticPocs
    cachePocs(staticPocs)
    return staticPocs
  }
}

export async function fetchMyProjectRegistryItems(userId: string, force = false): Promise<ProjectRegistryItem[]> {
  const cached = myProjectsCache.get(userId)
  if (!force && cached) {
    // Background revalidate
    void fetchAccessForUser(userId, true).then(async (rows) => {
      const allowedIndustries = deriveAllowedIndustries(rows)
      const freshStatic = getVisibleProjects().filter((project) => allowedIndustries.has(project.category))
      try {
        const published = await ProjectManagementService.fetchProjects({ status: 'published' })
        const accessibleCatalog = published
          .filter((p) => p.visibility === 'visible' && p.status === 'published' && allowedIndustries.has(p.industry))
          .map(mapCatalogItemToRegistryItem)
        const seen = new Set<string>()
        const combined: ProjectRegistryItem[] = []
        for (const p of [...freshStatic, ...accessibleCatalog]) {
          if (!seen.has(p.slug)) {
            seen.add(p.slug)
            combined.push(p)
          }
        }
        myProjectsCache.set(userId, combined)
      } catch {
        myProjectsCache.set(userId, freshStatic)
      }
    })
    return cached
  }

  const rows = await fetchAccessForUser(userId, force)
  const allowedIndustries = deriveAllowedIndustries(rows)
  const staticProjects = getVisibleProjects().filter((project) => allowedIndustries.has(project.category))

  try {
    const published = await ProjectManagementService.fetchProjects({ status: 'published' })
    const accessibleCatalog = published
      .filter((p) => p.visibility === 'visible' && p.status === 'published' && allowedIndustries.has(p.industry))
      .map(mapCatalogItemToRegistryItem)
    const seen = new Set<string>()
    const combined: ProjectRegistryItem[] = []
    for (const p of [...staticProjects, ...accessibleCatalog]) {
      if (!seen.has(p.slug)) {
        seen.add(p.slug)
        combined.push(p)
      }
    }
    myProjectsCache.set(userId, combined)
    return combined
  } catch {
    myProjectsCache.set(userId, staticProjects)
    return staticProjects
  }
}

export async function fetchAllProjectRegistryItems(): Promise<ProjectRegistryItem[]> {
  const staticProjects = getVisibleProjects()
  try {
    const catalogItems = await ProjectManagementService.fetchProjects({ status: 'published' })
    const catalogRegistry = catalogItems
      .filter((p) => p.visibility === 'visible' && p.status === 'published')
      .map(mapCatalogItemToRegistryItem)
    const seen = new Set<string>()
    const combined: ProjectRegistryItem[] = []
    for (const p of [...staticProjects, ...catalogRegistry]) {
      if (!seen.has(p.slug)) {
        seen.add(p.slug)
        combined.push(p)
      }
    }
    return combined
  } catch {
    return staticProjects
  }
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

