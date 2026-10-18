import { useCallback, useEffect, useRef, useState } from 'react'
import { deriveAllowedIndustries, fetchAccessForUser, invalidateAccessCache } from '@/services/pocAccess'
import { useAuthStore } from '@/stores/authStore'
import { isStaffRole } from '@/types/domain'

export interface IndustryAccessState {
  /** Set of industry names the current user may access. Empty set = no access (not null). */
  allowedIndustries: Set<string>
  /** True while the access list is being fetched from Supabase. */
  loading: boolean
  /** Non-null if the fetch failed. */
  error: string | null
  /** Force-refresh the access list from Supabase (bypasses cache). */
  refresh: () => Promise<void>
}

/**
 * Reactive hook that returns the current authenticated user's allowed industries.
 *
 * Security design:
 * - Staff (admin/super_admin) get ALL industries — they bypass client restrictions.
 * - Unapproved, pending, or rejected users get an empty set.
 * - The actual authoritative check is enforced by Supabase RLS + SECURITY DEFINER
 *   functions on the backend. This hook is a UX optimization only.
 * - An empty set means DENY, not unknown. Never treat loading/error as ALLOW.
 */
export function useMyIndustryAccess(): IndustryAccessState {
  const profile = useAuthStore((s) => s.profile)
  const initialized = useAuthStore((s) => s.initialized)

  const [allowedIndustries, setAllowedIndustries] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchAccess = useCallback(
    async (force = false) => {
      // Abort any previous in-flight request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      if (!initialized) {
        // Still initializing — stay loading
        setLoading(true)
        return
      }

      if (!profile || profile.status !== 'approved') {
        // Pending, rejected, or unauthenticated — deny all
        setAllowedIndustries(new Set())
        setLoading(false)
        setError(null)
        return
      }

      if (isStaffRole(profile.role)) {
        // Staff see everything — no restriction
        // Return a sentinel Set that contains ALL_INDUSTRIES marker
        // (caller checks isStaffRole independently, so this is belt-and-suspenders)
        setAllowedIndustries(new Set(['__STAFF_ALL__']))
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        if (force) {
          invalidateAccessCache(profile.id)
        }
        const rows = await fetchAccessForUser(profile.id, force)

        if (controller.signal.aborted) return

        const industries = deriveAllowedIndustries(rows)
        setAllowedIndustries(industries)
        setError(null)
      } catch (err: unknown) {
        if (controller.signal.aborted) return
        const msg = err instanceof Error ? err.message : 'Failed to load industry access'
        setError(msg)
        // On error: DENY (empty set) — never fall open
        setAllowedIndustries(new Set())
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    },
    [profile, initialized]
  )

  useEffect(() => {
    void fetchAccess()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchAccess])

  const refresh = useCallback(() => fetchAccess(true), [fetchAccess])

  return { allowedIndustries, loading, error, refresh }
}

/**
 * Returns true if the given industry is accessible to the current user.
 * Staff always returns true. Pending/rejected/unapproved always returns false.
 * During loading, returns false (deny-by-default).
 */
export function useHasIndustryAccess(industry: string | null | undefined): boolean {
  const profile = useAuthStore((s) => s.profile)
  const { allowedIndustries, loading } = useMyIndustryAccess()

  if (!industry) return false
  if (loading) return false
  if (!profile || profile.status !== 'approved') return false
  if (isStaffRole(profile.role)) return true
  if (allowedIndustries.has('__STAFF_ALL__')) return true

  return allowedIndustries.has(industry)
}
