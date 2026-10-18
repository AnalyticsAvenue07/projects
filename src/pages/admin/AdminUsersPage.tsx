import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle, ChevronDown, ChevronUp, Lock, X } from 'lucide-react'
import { notifyUser } from '@/services/notifications'
import { deleteUserRow, fetchAllUsers } from '@/services/users'
import { approveAndGrantIndustries, rejectUser } from '@/services/adminAccess'
import { fetchAccessForUser, deriveAllowedIndustries } from '@/services/pocAccess'
import { sendApproval, sendRejection } from '@/services/email'
import { useAuthStore } from '@/stores/authStore'
import type { AppUser, UserRole, UserStatus } from '@/types/domain'
import { canAssignSuperAdmin, isStaffRole } from '@/types/domain'
import { getVisibleProjects } from '@/config/projects'
import { updateUserRole } from '@/services/users'

// Derive the canonical industry list from the project registry
const ALL_INDUSTRIES = Array.from(
  new Set(getVisibleProjects().map((p) => p.category).filter(Boolean) as string[])
).sort()

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

/** Modal for combined Approve + Assign industries workflow */
function ApproveModal({
  user,
  onClose,
  onSuccess,
}: {
  user: AppUser
  onClose: () => void
  onSuccess: () => void
}) {
  const actor = useAuthStore((s) => s.profile)
  const [selectedIndustries, setSelectedIndustries] = useState<Set<string>>(new Set())
  const [currentGrants, setCurrentGrants] = useState<Set<string>>(new Set())
  const [loadingGrants, setLoadingGrants] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  // Load current grants so the modal shows the existing state
  useEffect(() => {
    void fetchAccessForUser(user.id)
      .then((rows) => {
        const grants = deriveAllowedIndustries(rows)
        setCurrentGrants(grants)
        setSelectedIndustries(new Set(grants))
      })
      .catch(() => {
        setCurrentGrants(new Set())
        setSelectedIndustries(new Set())
      })
      .finally(() => setLoadingGrants(false))
  }, [user.id])

  function toggle(industry: string) {
    setSelectedIndustries((prev) => {
      const next = new Set(prev)
      if (next.has(industry)) next.delete(industry)
      else next.add(industry)
      return next
    })
  }

  async function handleApprove() {
    if (!actor) return
    setErr(null)
    setSaving(true)
    try {
      const industries = Array.from(selectedIndustries)
      // Atomic DB operation: approve + grant industries in one transaction
      await approveAndGrantIndustries(user.id, industries)

      // Send notifications (non-blocking — failures don't fail the approval)
      try {
        await notifyUser(
          user.id,
          'Access approved',
          'Your Analytics Avenue account has been approved. Assigned industries are now available on your dashboard.'
        )
      } catch {}
      try {
        await sendApproval(user.email, user.name, actor?.name || actor?.email || 'Admin')
      } catch {}

      onSuccess()
    } catch (e: unknown) {
      const errorMsg =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as any).message)
            : String(e || 'Approval failed. Please try again.')
      setErr(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#E2E8F0]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0F766E]">
              Approve account
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#0F172A]">{user.name}</h2>
            <p className="text-sm text-[#64748B]">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[#F1F5F9] text-[#64748B]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Industry selection */}
        <div className="p-6 max-h-[50vh] overflow-y-auto">
          <p className="text-sm font-semibold text-[#1E293B] mb-3">
            Select industries to grant access to:
          </p>
          {loadingGrants ? (
            <p className="text-sm text-[#64748B]">Loading current grants…</p>
          ) : (
            <div className="space-y-2">
              {ALL_INDUSTRIES.map((industry) => (
                <label
                  key={industry}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#0F766E]"
                    checked={selectedIndustries.has(industry)}
                    onChange={() => toggle(industry)}
                  />
                  <span className="font-medium text-[#1E293B]">{industry}</span>
                  {currentGrants.has(industry) && (
                    <span className="ml-auto text-[11px] font-bold text-[#0F766E] bg-[#ECFDF5] px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}

          {selectedIndustries.size === 0 && !loadingGrants && (
            <p className="mt-3 text-sm text-[#D97706] font-medium">
              ⚠ No industries selected. The client will be approved but have no industry access.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#E2E8F0] space-y-3">
          {err && <p className="text-sm font-medium text-[#B91C1C]">{err}</p>}

          {!confirmed ? (
            <>
              <p className="text-sm text-[#475569]">
                Approving will grant access to{' '}
                <strong>{selectedIndustries.size}</strong> industr
                {selectedIndustries.size === 1 ? 'y' : 'ies'}
                {selectedIndustries.size > 0 && (
                  <>: {Array.from(selectedIndustries).join(', ')}</>
                )}
                .
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmed(true)}
                  disabled={loadingGrants}
                  className="flex-1 py-2.5 bg-[#0F766E] text-white rounded-xl font-bold text-[14px] hover:bg-[#0D5F58] disabled:opacity-50"
                >
                  Confirm and approve
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 border border-[#CBD5E1] rounded-xl font-bold text-[14px] text-[#475569] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void handleApprove()}
                disabled={saving}
                className="flex-1 py-2.5 bg-[#15803D] text-white rounded-xl font-bold text-[14px] hover:bg-[#166534] disabled:opacity-50"
              >
                {saving ? 'Approving…' : '✓ Yes, approve this account'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmed(false)}
                disabled={saving}
                className="px-4 py-2.5 border border-[#CBD5E1] rounded-xl font-bold text-[14px] text-[#475569] hover:bg-[#F8FAFC]"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const roles: UserRole[] = ['client', 'admin', 'super_admin']

export function AdminUsersPage() {
  const actor = useAuthStore((s) => s.profile)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const [users, setUsers] = useState<AppUser[]>([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [approveModal, setApproveModal] = useState<AppUser | null>(null)

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    setErr(null)
    try {
      const rows = await fetchAllUsers()
      setUsers(rows)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(true)
  }, [load, actor?.id])

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase()
    return users.filter((u) => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false
      if (!n) return true
      return (
        u.name.toLowerCase().includes(n) ||
        u.email.toLowerCase().includes(n) ||
        (u.company?.toLowerCase().includes(n) ?? false)
      )
    })
  }, [users, q, statusFilter])

  async function handleReject(u: AppUser) {
    if (!window.confirm(`Reject access for ${u.email}?`)) return
    setErr(null)
    setSuccess(null)
    try {
      await rejectUser(u.id)
      try {
        await notifyUser(u.id, 'Access update', 'Your access request was not approved for this workspace.')
      } catch {}
      try {
        await sendRejection(u.email, u.name, 'Your account request was not approved at this time.')
      } catch {}
      setSuccess(`${u.name} has been rejected.`)
      await load(false)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Rejection failed')
    }
  }

  async function setRole(u: AppUser, role: UserRole) {
    if (role === 'super_admin' && actor && !canAssignSuperAdmin(actor.role)) {
      setErr('Only a super admin can assign the super admin role.')
      return
    }
    setErr(null)
    try {
      await updateUserRole(u.id, role)
      await load(false)
      if (u.id === actor?.id) await refreshProfile()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Role update failed')
    }
  }

  async function remove(u: AppUser) {
    if (!window.confirm(`Remove platform profile for ${u.email}? They will lose access.`)) return
    setErr(null)
    try {
      await deleteUserRow(u.id)
      await load(false)
      if (u.id === actor?.id) {
        await useAuthStore.getState().signOut()
        window.location.href = '/login'
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const pendingCount = users.filter((u) => u.status === 'pending').length
  const approvedCount = users.filter((u) => u.status === 'approved').length
  const rejectedCount = users.filter((u) => u.status === 'rejected').length

  return (
    <div className="space-y-6">
      {/* Approve modal */}
      {approveModal && (
        <ApproveModal
          user={approveModal}
          onClose={() => setApproveModal(null)}
          onSuccess={() => {
            setApproveModal(null)
            setSuccess(`${approveModal.name} has been approved.`)
            void load(false)
          }}
        />
      )}

      {/* Header */}
      <section className="rounded-3xl border border-[#E2E8F0] bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0F766E]">User management</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Approve, assign, and manage access</h1>
            <p className="mt-2 max-w-2xl text-[#475569]">
              Review pending registrations, approve clients with industry access, or reject requests. All authorization changes are enforced server-side.
            </p>
          </div>
          {/* Summary counts */}
          <div className="flex gap-3 shrink-0">
            <div className="text-center px-4 py-2 rounded-xl bg-[#FEF3C7] border border-[#FDE68A]">
              <p className="text-lg font-bold text-[#A16207]">{pendingCount}</p>
              <p className="text-[11px] font-semibold text-[#A16207]">Pending</p>
            </div>
            <div className="text-center px-4 py-2 rounded-xl bg-[#DCFCE7] border border-[#86EFAC]">
              <p className="text-lg font-bold text-[#15803D]">{approvedCount}</p>
              <p className="text-[11px] font-semibold text-[#15803D]">Approved</p>
            </div>
            <div className="text-center px-4 py-2 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5]">
              <p className="text-lg font-bold text-[#B91C1C]">{rejectedCount}</p>
              <p className="text-[11px] font-semibold text-[#B91C1C]">Rejected</p>
            </div>
          </div>
        </div>
      </section>

      {/* Search + filter */}
      <section className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  statusFilter === s
                    ? 'bg-[#0F766E] text-white border-[#0F766E]'
                    : 'border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC]'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative w-full max-w-sm">
            <input
              type="search"
              placeholder="Search users…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-[15px] font-medium text-[#0F172A] shadow-sm placeholder:text-[#94A3B8] focus:border-[#0F766E] focus:outline-none focus:ring-4 focus:ring-[rgba(15,118,110,0.12)]"
            />
          </div>
        </div>
      </section>

      {err && <p className="text-sm font-medium text-[#B91C1C] px-1">{err}</p>}
      {success && <p className="text-sm font-medium text-[#047857] px-1">{success}</p>}

      {/* User table */}
      <section className="overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        {loading ? (
          <p className="p-6 text-[15px] font-medium text-[#475569]">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-[15px] font-medium text-[#475569]">No users match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead className="bg-[#F8FAFC] border-b border-[#CBD5E1]">
                <tr>
                  <th className="px-4 py-3 font-bold text-[#475569]">User</th>
                  <th className="px-4 py-3 font-bold text-[#475569]">Company</th>
                  <th className="px-4 py-3 font-bold text-[#475569]">Registered</th>
                  <th className="px-4 py-3 font-bold text-[#475569]">Status</th>
                  <th className="px-4 py-3 font-bold text-[#475569]">Role</th>
                  <th className="px-4 py-3 font-bold text-[#475569]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CBD5E1]">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F8FAFC]/80">
                    <td className="px-4 py-3">
                      <p className="font-bold text-[#1E293B]">{u.name}</p>
                      <p className="text-[#475569] font-medium text-xs">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#475569]">{u.company ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-[#475569] text-xs whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 text-xs font-bold rounded-md border ${
                          u.status === 'approved'
                            ? 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]'
                            : u.status === 'pending'
                              ? 'bg-[#FEF3C7] text-[#A16207] border-[#FDE68A]'
                              : 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.role === 'super_admin' && actor && !canAssignSuperAdmin(actor.role) ? (
                        <span className="text-xs font-bold text-[#475569]">super_admin</span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => void setRole(u, e.target.value as UserRole)}
                          className="px-2 py-1.5 border-[1.5px] border-[#CBD5E1] rounded-lg text-[13px] font-bold text-[#1E293B] bg-white"
                        >
                          {roles
                            .filter(
                              (r) =>
                                r !== 'super_admin' ||
                                (actor && canAssignSuperAdmin(actor.role)) ||
                                r === u.role
                            )
                            .map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {/* Pending: show Approve (with industry modal) and Reject */}
                        {u.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0F766E] text-white hover:bg-[#0D5F58] flex items-center gap-1"
                              onClick={() => setApproveModal(u)}
                            >
                              <CheckCircle className="h-3 w-3" />
                              Approve + Assign
                            </button>
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[#CBD5E1] text-[#B91C1C] hover:bg-[#FEF2F2]"
                              onClick={() => void handleReject(u)}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {/* Rejected: allow re-approval */}
                        {u.status === 'rejected' && (
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0F766E] text-white hover:bg-[#0D5F58]"
                            onClick={() => setApproveModal(u)}
                          >
                            Approve
                          </button>
                        )}
                        {/* Approved: remove only */}
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#B91C1C] border border-[#FCA5A5] hover:bg-[#FEF2F2]"
                          onClick={() => void remove(u)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
