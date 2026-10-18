import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '@/stores/authStore'

export function RequireApproved() {
  const profile = useAuthStore((s) => s.profile)
  const initialized = useAuthStore((s) => s.initialized)
  const location = useLocation()

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] text-[#475569] font-medium">
        Loading…
      </div>
    )
  }

  if (!profile) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (profile.status === 'pending') {
    return <Navigate to="/pending-approval" replace state={{ from: location.pathname }} />
  }

  if (profile.status === 'rejected') {
    return <Navigate to="/rejected-access" replace />
  }

  return <Outlet />
}
