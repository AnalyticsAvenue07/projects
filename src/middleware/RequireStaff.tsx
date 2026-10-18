import { Navigate, Outlet } from 'react-router'
import { useAuthStore } from '@/stores/authStore'
import { isStaffRole } from '@/types/domain'

/** Requires approved admin or super_admin. */
export function RequireStaff() {
  const profile = useAuthStore((s) => s.profile)

  if (!profile || profile.status !== 'approved' || !isStaffRole(profile.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
