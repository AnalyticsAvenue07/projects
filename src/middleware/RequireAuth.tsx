import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '@/stores/authStore'

/**
 * Client-side route guard: requires Supabase session.
 */
export function RequireAuth() {
  const session = useAuthStore((s) => s.session)
  const initialized = useAuthStore((s) => s.initialized)
  const location = useLocation()

  if (!initialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F1F5F9] text-[#475569]">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-[#0F766E]/20 border-t-[#0F766E]" />
        <span className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Loading application...</span>
      </div>
    )
  }

  const supabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F1F5F9] p-6 text-center">
        <p className="text-[#1E293B] font-bold text-lg mb-2">Supabase is not configured</p>
        <p className="text-[15px] text-[#475569] max-w-md">
          Add <code className="font-mono text-sm">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-mono text-sm">VITE_SUPABASE_ANON_KEY</code> to your environment, then reload.
        </p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
