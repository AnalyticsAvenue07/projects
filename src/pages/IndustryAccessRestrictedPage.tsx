import { Link, useLocation } from 'react-router'
import { Lock } from 'lucide-react'

interface LocationState {
  from?: string
  industry?: string
  reason?: string
}

/**
 * IndustryAccessRestrictedPage
 *
 * Shown when a client navigates (directly or via URL) to a project or route
 * belonging to an industry they are not authorized to access.
 *
 * Security: this page NEVER renders protected project data. It is purely
 * informational. The backend independently enforces the same restrictions.
 */
export function IndustryAccessRestrictedPage() {
  const location = useLocation()
  const state = (location.state as LocationState | null) ?? {}
  const industry = state.industry
  const fromPath = state.from

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white border border-[#E2E8F0] rounded-3xl p-10 shadow-[0_18px_40px_rgba(15,23,42,0.08)] text-center">
        {/* Lock icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FEF3C7]">
          <Lock className="h-8 w-8 text-[#D97706]" />
        </div>

        {/* Heading */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#D97706] mb-3">
          Access restricted
        </p>
        <h1 className="text-2xl font-bold text-[#0F172A] mb-3">
          {industry ? `${industry} industry access required` : 'Access Restricted'}
        </h1>

        {/* Message */}
        <p className="text-[#475569] leading-relaxed mb-2">
          You do not currently have permission to access this{' '}
          {industry ? <><strong className="text-[#1E293B]">{industry}</strong> </> : ''}
          industry.
        </p>
        <p className="text-[#64748B] text-sm leading-relaxed mb-8">
          Contact your platform administrator to request access. Once access is granted, this
          content will become available.
        </p>

        {/* Administrator contact note */}
        <div className="mb-8 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 text-left">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[#0F766E] mb-1">
            Administrator
          </p>
          <p className="text-[14px] font-medium text-[#1E293B]">sheriffrafiq71@gmail.com</p>
          <p className="text-[13px] text-[#64748B] mt-1">
            Provide your name, email, and the industry you need access to.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-[#0F766E] text-white rounded-xl font-bold text-[15px] hover:bg-[#0D5F58] transition-colors"
          >
            Back to dashboard
          </Link>
          {fromPath && fromPath !== location.pathname && (
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center px-6 py-2.5 border border-[#CBD5E1] text-[#475569] rounded-xl font-bold text-[15px] hover:bg-[#F1F5F9] transition-colors"
            >
              Go back
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
