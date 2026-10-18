import { Navigate, Outlet, useLocation, useParams } from 'react-router'
import { useAuthStore } from '@/stores/authStore'
import { isStaffRole } from '@/types/domain'
import { useMyIndustryAccess } from '@/hooks/useMyIndustryAccess'
import { getProjectByRoute, getProjectBySlug } from '@/config/projects'

/**
 * Props: provide either `industry` (static) or derive it from the current route/slug.
 */
interface RequireIndustryAccessProps {
  /** Hardcoded industry to require (e.g. "EV"). Use when wrapping a specific route group. */
  industry?: string
}

/**
 * RequireIndustryAccess
 *
 * Route guard that:
 * 1. Shows a loading state while auth/access is initializing (deny-by-default during load)
 * 2. Allows staff (admin/super_admin) through unconditionally
 * 3. Derives the project's industry from the current path or :slug param
 * 4. Redirects to /industry-restricted if access is not granted
 *
 * Security notes:
 * - The access check uses data fetched from Supabase (not localStorage or URL params)
 * - An error or unknown state results in DENY (redirect), never ALLOW
 * - This is a UX guard; the authoritative check is RLS + Supabase
 */
export function RequireIndustryAccess({ industry: staticIndustry }: RequireIndustryAccessProps) {
  const profile = useAuthStore((s) => s.profile)
  const initialized = useAuthStore((s) => s.initialized)
  const location = useLocation()
  const params = useParams<{ slug?: string }>()

  const { allowedIndustries, loading } = useMyIndustryAccess()

  // 1. Still initializing auth
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] text-[#475569] font-medium">
        Loading…
      </div>
    )
  }

  // 2. Not authenticated
  if (!profile) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // 3. Pending → pending approval page
  if (profile.status === 'pending') {
    return <Navigate to="/pending-approval" replace state={{ from: location.pathname }} />
  }

  // 4. Rejected
  if (profile.status === 'rejected') {
    return <Navigate to="/rejected-access" replace />
  }

  // 5. Staff bypass
  if (isStaffRole(profile.role)) {
    return <Outlet />
  }

  // 6. Still loading industry access
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] text-[#475569] font-medium">
        Checking access…
      </div>
    )
  }

  // 7. Determine the required industry
  let requiredIndustry: string | null = staticIndustry ?? null

  if (!requiredIndustry) {
    // Try to derive from the current URL path
    const currentPath = '/' + location.pathname.replace(/^\/+/, '')
    const pathWithoutSuffix = currentPath.replace(/\/(full|section)$/, '')
    const project =
      getProjectByRoute(pathWithoutSuffix) ??
      getProjectByRoute(currentPath) ??
      (params.slug ? getProjectBySlug(params.slug) : null)

    requiredIndustry = project?.category ?? null
  }

  // 8. If we can't determine the industry, deny (fail secure)
  if (!requiredIndustry) {
    return (
      <Navigate
        to="/industry-restricted"
        replace
        state={{ from: location.pathname, reason: 'unknown-industry' }}
      />
    )
  }

  // 9. Check access
  if (!allowedIndustries.has(requiredIndustry)) {
    return (
      <Navigate
        to="/industry-restricted"
        replace
        state={{ from: location.pathname, industry: requiredIndustry }}
      />
    )
  }

  return <Outlet />
}
