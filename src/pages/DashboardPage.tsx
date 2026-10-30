import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ControlBar } from '@/app/components/ControlBar'
import { SolutionCard } from '@/app/components/SolutionCard'
import { Skeleton } from '@/app/components/ui/skeleton'
import { EnterpriseEmpty } from '@/components/empty-states/EnterpriseEmpty'
import { useAuthStore } from '@/stores/authStore'
import { isStaffRole } from '@/types/domain'
import { getAllProjects, getVisibleProjects } from '@/config/projects'
import {
  fetchAllProjectRegistryItems,
  fetchMyProjectRegistryItems,
  getCachedMyProjects,
  mapCatalogItemToRegistryItem,
} from '@/services/pocs'
import { ProjectManagementService } from '@/services/projectManagementService'
import { prefetchRoute } from '@/utils/routePrefetch'
import { useSearchFilters } from '@/contexts/SearchFiltersContext'
import type { ProjectRegistryItem } from '@/types/domain'

export function DashboardPage() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const profileLoading = useAuthStore((s) => s.profileLoading)
  const profileError = useAuthStore((s) => s.profileError)

  const [projects, setProjects] = useState<ProjectRegistryItem[]>(() => {
    if (!profile || profile.status !== 'approved') return []
    if (isStaffRole(profile.role)) {
      const staticProjects = getVisibleProjects()
      try {
        const dynamicItems = ProjectManagementService.getLocalCatalog()
          .filter((p) => p.status === 'published' && p.visibility === 'visible')
          .map(mapCatalogItemToRegistryItem)
        const seen = new Set<string>()
        const combined: ProjectRegistryItem[] = []
        for (const p of [...staticProjects, ...dynamicItems]) {
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
    return getCachedMyProjects(profile.id) ?? []
  })

  const [loadingProjects, setLoadingProjects] = useState(() => {
    if (!profile || profile.status !== 'approved') return false
    return false
  })
  const { resultsQuery, selectedFilters } = useSearchFilters()

  const loadDashboardProjects = useCallback(async (force = false) => {
    if (!profile || profile.status !== 'approved') {
      setProjects([])
      setLoadingProjects(false)
      return
    }

    if (isStaffRole(profile.role)) {
      setLoadingProjects(true)
      try {
        const rows = await fetchAllProjectRegistryItems()
        setProjects(rows.filter((p) => p.visible))
      } catch {
        setProjects(getVisibleProjects())
      } finally {
        setLoadingProjects(false)
      }
      return
    }

    const cached = getCachedMyProjects(profile.id)
    if (!force && cached) {
      setProjects(cached.filter((p) => p.visible))
    } else {
      setLoadingProjects(true)
    }

    try {
      const rows = await fetchMyProjectRegistryItems(profile.id, force)
      setProjects(rows.filter((p) => p.visible))
    } catch {
      setProjects([])
    } finally {
      setLoadingProjects(false)
    }
  }, [profile])

  useEffect(() => {
    void loadDashboardProjects()

    const handleCatalogChanged = () => {
      void loadDashboardProjects(true)
    }

    window.addEventListener('aa_project_catalog_changed', handleCatalogChanged)
    return () => {
      window.removeEventListener('aa_project_catalog_changed', handleCatalogChanged)
    }
  }, [loadDashboardProjects])

  if (profileLoading && !profile) {
    return (
      <div className="p-6">
        <div className="mb-6 rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <Skeleton className="h-6 w-48" />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-4 h-24 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-6">
        <EnterpriseEmpty
          title="Profile unavailable"
          description={
            profileError ??
            'Your session is active but no platform profile was found. Please contact an administrator.'
          }
        />
      </div>
    )
  }

  if (profile.status === 'pending') {
    return (
      <div className="p-6">
        <EnterpriseEmpty
          title="Account under review"
          description="Your account is under admin review. Please wait until access is granted."
        />
      </div>
    )
  }

  if (profile.status === 'rejected') {
    return (
      <div className="p-6">
        <EnterpriseEmpty
          title="Access not granted"
          description="Your registration was not approved for this workspace. If you believe this is a mistake, please contact your Analytics Avenue administrator."
        />
      </div>
    )
  }

  if (loadingProjects) {
    return (
      <div className="p-6">
        <div className="mb-6 rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="mt-3 h-4 w-80" />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-4 h-24 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="p-6">
        <ControlBar />
        <EnterpriseEmpty
          title="No projects assigned"
          description="You do not have access to any projects yet. Please request access from your administrator."
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      <section className="mb-6 rounded-3xl border border-[#E2E8F0] bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0F766E]">POC overview</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Welcome to the Analytics Avenue Innovation Hub</h1>
            <p className="mt-2 max-w-2xl text-[#475569]">Access a curated portfolio of AI, analytics, automation, and industry-specific proof-of-concepts developed to showcase practical business transformation opportunities.</p>
          </div>
        </div>
      </section>
      <ControlBar />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {(() => {
          const norm = (s: string): string => s.toLowerCase().trim()
          const searchTerm = norm(resultsQuery)
          const activeIndustryFilters = Array.from(selectedFilters)
            .filter((f) => f.startsWith('Industry-'))
            .map((f) => f.slice(f.indexOf('-') + 1))

          const filtered = projects.filter((p: ProjectRegistryItem) => {
            if (p.visible === false) return false
            const haystack = norm([p.title, p.description, p.category].join(' '))
            if (searchTerm && !haystack.includes(searchTerm)) return false

            if (activeIndustryFilters.length === 0) return true
            return activeIndustryFilters.some((label) => norm(p.category) === norm(label))
          })

          return filtered.map((project: ProjectRegistryItem, index: number) => (
            <SolutionCard
              key={project.slug}
              rank={index + 1}
              title={project.title}
              description={project.description}
              tags={[project.category]}
              date="Updated 2026"
              featured={project.featured}
              onClick={() => navigate(project.route)}
              onMouseEnter={() => prefetchRoute(project.route)}
            />
          ))
        })()}
      </div>
    </div>
  )
}
