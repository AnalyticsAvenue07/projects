import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { PocDetailBody } from '@/app/components/PocDetailBody'
import { EnterpriseEmpty } from '@/components/empty-states/EnterpriseEmpty'
import { fetchPocBySlug, getCachedPocBySlug } from '@/services/pocs'
import { deriveAllowedIndustries, fetchAccessForUser } from '@/services/pocAccess'
import { useAuthStore } from '@/stores/authStore'
import { isStaffRole } from '@/types/domain'
import type { Poc } from '@/types/domain'

export function PocDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const profile = useAuthStore((s) => s.profile)
  const statePoc = (location.state as { poc?: Poc } | null)?.poc
  const [poc, setPoc] = useState<Poc | null | undefined>(() => {
    if (!slug) return undefined
    return statePoc ?? getCachedPocBySlug(slug) ?? undefined
  })

  useEffect(() => {
    if (!slug) return
    const currentSlug = slug
    let cancelled = false

    async function loadPoc() {
      try {
        if (!profile || profile.status !== 'approved') {
          if (!cancelled) setPoc(null)
          return
        }

        if (!isStaffRole(profile.role)) {
          const rows = await fetchAccessForUser(profile.id)
          const allowedIndustries = deriveAllowedIndustries(rows)
          const project = await fetchPocBySlug(currentSlug)
          if (!project || !allowedIndustries.has(project.industry ?? '')) {
            if (!cancelled) setPoc(null)
            return
          }
        }

        const row = await fetchPocBySlug(currentSlug)
        if (!cancelled) setPoc(row)
      } catch {
        if (!cancelled) setPoc(null)
      }
    }

    void loadPoc()

    return () => {
      cancelled = true
    }
  }, [profile, slug])

  const readOnly = !profile || !isStaffRole(profile.role)

  if (poc === undefined) {
    return <div className="p-6 text-[15px] font-medium text-[#475569]">Loading…</div>
  }

  if (!poc) {
    return (
      <div className="p-6">
        <EnterpriseEmpty
          title="Solution not available"
          description="This POC does not exist or you do not have access. Return to your dashboard to browse assigned solutions."
          action={
            <Link
              to="/dashboard"
              className="inline-flex px-6 py-2.5 bg-[#0F766E] text-white rounded-lg font-bold text-[15px] hover:bg-[#0D5F58] transition-colors"
            >
              Back to dashboard
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 text-[14px] font-bold text-[#0284C7] hover:underline"
      >
        ← Back
      </button>
      <PocDetailBody poc={poc} readOnly={readOnly} />
    </div>
  )
}
