import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import {
  deriveAllowedIndustries,
  fetchAccessForUser,
  invalidateAccessCache,
} from '@/services/pocAccess'
import {
  approveAndGrantIndustries,
  updateUserIndustryAccess,
  rejectUser,
} from '@/services/adminAccess'
import { getVisibleProjects } from '@/config/projects'
import { notifyUser } from '@/services/notifications'
import { fetchAllUsers } from '@/services/users'
import { sendAccess, sendApproval, sendRejection } from '@/services/email'
import { useAuthStore } from '@/stores/authStore'
import type { AppUser, ProjectRegistryItem } from '@/types/domain'
import { isStaffRole } from '@/types/domain'

// Derive canonical industry list from registry
const ALL_INDUSTRIES = Array.from(
  new Set(getVisibleProjects().map((p) => p.category).filter(Boolean) as string[])
).sort()

type UserFilter = 'all' | 'pending' | 'approved' | 'rejected'

export function AdminAccessManagementPage() {
  const actor = useAuthStore((s) => s.profile)
  const [users, setUsers] = useState<AppUser[]>([])
  const [userFilter, setUserFilter] = useState<UserFilter>('all')
  const [userId, setUserId] = useState('')
  const [selectedAccess, setSelectedAccess] = useState<Set<string>>(new Set())
  const [savedAccess, setSavedAccess] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Filter users by both status tab and search term
  const filteredUsers = useMemo(() => {
    const term = userSearch.toLowerCase().trim()
    const list = users.filter((u) => {
      if (userFilter !== 'all' && u.status !== userFilter) return false
      if (!term) return true
      return (
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.company?.toLowerCase().includes(term) ?? false)
      )
    })

    if (userId && !list.some((u) => u.id === userId)) {
      const selected = users.find((u) => u.id === userId)
      if (selected) {
        return [selected, ...list]
      }
    }
    return list
  }, [users, userSearch, userId, userFilter])

  const loadMeta = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const usersResponse = await fetchAllUsers()
      // Show all users (not just approved clients) so admin can manage pending too
      setUsers(usersResponse.filter((u) => !isStaffRole(u.role)))
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  const loadAccess = useCallback(async (uid: string) => {
    if (!uid) {
      setSelectedAccess(new Set())
      setSavedAccess(new Set())
      return
    }
    try {
      invalidateAccessCache(uid)
      const rows = await fetchAccessForUser(uid, true)
      const industries = deriveAllowedIndustries(rows)
      setSelectedAccess(new Set(industries))
      setSavedAccess(new Set(industries))
    } catch {
      setSelectedAccess(new Set())
      setSavedAccess(new Set())
    }
  }, [])

  useEffect(() => {
    void loadAccess(userId)
  }, [userId, loadAccess])

  const selectedUser = useMemo(() => users.find((u) => u.id === userId), [users, userId])
  const isPending = selectedUser?.status === 'pending'
  const isApproved = selectedUser?.status === 'approved'

  function toggleIndustry(industry: string) {
    setSelectedAccess((prev) => {
      const next = new Set(prev)
      if (next.has(industry)) next.delete(industry)
      else next.add(industry)
      return next
    })
  }

  /**
   * For pending users: atomically approve + save industries.
   * For approved users: update industry grants only.
   * All operations are verified server-side (SECURITY DEFINER functions).
   */
  async function applyGrants() {
    if (!userId) {
      setErr('Please select a user before saving access.')
      setSuccess(null)
      return
    }
    if (!actor) {
      setErr('Admin profile is not loaded yet. Please refresh the page and try again.')
      setSuccess(null)
      return
    }
    setErr(null)
    setSuccess(null)
    setSaving(true)

    try {
      const industries = Array.from(selectedAccess)

      if (isPending) {
        // Atomic approve + grant
        await approveAndGrantIndustries(userId, industries)
        try {
          await notifyUser(userId, 'Access approved', 'Your Analytics Avenue account has been approved. Assigned industries are now available.')
        } catch {}
        try {
          await sendApproval(selectedUser!.email, selectedUser!.name, actor?.name || actor?.email || 'Admin')
        } catch {}
        setSuccess('Account approved and industry access saved successfully.')
      } else {
        // Update industry grants for an already-approved user
        await updateUserIndustryAccess(userId, industries)

        const newIndustries = industries.filter((i) => !savedAccess.has(i))
        if (newIndustries.length > 0 && selectedUser) {
          try {
            await notifyUser(userId, 'Access updated', 'Your assigned industries have been updated by an administrator.')
          } catch {}
          try {
            await sendAccess(selectedUser.email, selectedUser.name, newIndustries)
          } catch (emailError: unknown) {
            console.error('Access email failed', emailError)
            setErr(`Access saved, but email notification failed: ${emailError instanceof Error ? emailError.message : String(emailError)}`)
          }
        }
        setSuccess('Industry access saved successfully.')
      }

      await loadAccess(userId)
      await loadMeta()
    } catch (e: unknown) {
      const errorMsg =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as any).message)
            : String(e || 'Failed to save access.')
      setErr(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  async function handleReject() {
    if (!userId || !selectedUser) return
    if (!window.confirm(`Reject access for ${selectedUser.email}?`)) return
    setErr(null)
    setSuccess(null)
    setSaving(true)
    try {
      await rejectUser(userId)
      try {
        await notifyUser(userId, 'Access update', 'Your access request was not approved.')
      } catch {}
      try {
        await sendRejection(selectedUser.email, selectedUser.name, 'Your account request was not approved at this time.')
      } catch {}
      setSuccess(`${selectedUser.name} has been rejected.`)
      await loadMeta()
      setUserId('')
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Rejection failed')
    } finally {
      setSaving(false)
    }
  }

  // Has the admin changed anything from the saved state?
  const hasChanges =
    selectedAccess.size !== savedAccess.size ||
    Array.from(selectedAccess).some((i) => !savedAccess.has(i))

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#E2E8F0] bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0F766E]">Access management</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Industry access management</h1>
            <p className="mt-2 max-w-2xl text-[#475569]">
              Approve pending clients and assign industry access, or update access for existing clients. All authorization changes are enforced by the database.
            </p>
          </div>
        </div>
      </section>

      {err && <p className="text-sm font-medium text-[#B91C1C]">{err}</p>}
      {success && <p className="text-sm font-medium text-[#047857]">{success}</p>}

      {loading ? (
        <p className="text-[15px] font-medium text-[#475569]">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: User picker ────────────────────────────────────── */}
          <section className="lg:col-span-1 rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] h-fit space-y-4">
            <h2 className="font-bold text-[#1E293B]">Select user</h2>

            {/* Status filter tabs */}
            <div className="flex gap-1.5 flex-wrap">
              {(['all', 'pending', 'approved', 'rejected'] as UserFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setUserFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                    userFilter === f
                      ? 'bg-[#0F766E] text-white border-[#0F766E]'
                      : 'border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Search autocomplete */}
            <div className="relative" ref={wrapperRef}>
              <input
                type="search"
                placeholder="Search by name, email, or company…"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full px-3 py-2 border-[1.5px] border-[#E2E8F0] bg-[#F8FAFC] rounded-lg text-[14px] font-medium focus:bg-white focus:border-[#0F766E] focus:outline-none"
              />

              {showSuggestions && filteredUsers.length > 0 && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[#E2E8F0] bg-white shadow-lg py-1">
                  {filteredUsers.map((u) => (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => {
                        setUserId(u.id)
                        setUserSearch('')
                        setShowSuggestions(false)
                        setErr(null)
                        setSuccess(null)
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-[#F1F5F9] transition-colors border-b last:border-b-0 border-[#F1F5F9]"
                    >
                      <p className="font-bold text-sm text-[#1E293B]">{u.name}</p>
                      <p className="text-xs text-[#64748B] mt-0.5">{u.email}</p>
                      <span
                        className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          u.status === 'approved'
                            ? 'bg-[#DCFCE7] text-[#15803D]'
                            : u.status === 'pending'
                              ? 'bg-[#FEF3C7] text-[#A16207]'
                              : 'bg-[#FEE2E2] text-[#B91C1C]'
                        }`}
                      >
                        {u.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {showSuggestions && userSearch && filteredUsers.length === 0 && (
                <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-[#E2E8F0] bg-white shadow-lg p-4 text-center text-sm text-[#64748B]">
                  No matching users found
                </div>
              )}
            </div>

            {/* Selected user card */}
            {selectedUser ? (
              <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E]">Selected Client</p>
                <p className="font-bold text-[#1E293B] mt-1.5 text-base">{selectedUser.name}</p>
                <p className="text-sm font-medium text-[#475569] mt-0.5">{selectedUser.email}</p>
                {selectedUser.company && (
                  <p className="text-xs text-[#64748B] mt-1">Company: {selectedUser.company}</p>
                )}
                <div className="mt-3 pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                  <div className="flex gap-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                        selectedUser.status === 'approved'
                          ? 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]'
                          : selectedUser.status === 'pending'
                            ? 'bg-[#FEF3C7] text-[#A16207] border-[#FDE68A]'
                            : 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]'
                      }`}
                    >
                      {selectedUser.status}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUserId('')
                      setErr(null)
                      setSuccess(null)
                    }}
                    className="text-xs text-[#B91C1C] hover:underline font-bold"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-[#CBD5E1] text-center text-sm text-[#64748B]">
                Search and choose a user from the suggestion list.
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={!userId || saving}
                className={`w-full py-2.5 rounded-lg font-bold text-[14px] disabled:opacity-50 transition-colors ${
                  isPending
                    ? 'bg-[#15803D] text-white hover:bg-[#166534]'
                    : 'bg-[#0F766E] text-white hover:bg-[#0D5F58]'
                }`}
                onClick={() => void applyGrants()}
              >
                {saving
                  ? 'Saving…'
                  : isPending
                    ? 'Approve + Save Access'
                    : hasChanges
                      ? 'Save access changes'
                      : 'Save access'}
              </button>

              {(isPending || isApproved) && selectedUser?.status !== 'rejected' && (
                <button
                  type="button"
                  disabled={!userId || saving}
                  className="w-full py-2.5 border border-[#FCA5A5] rounded-lg font-bold text-[14px] text-[#B91C1C] hover:bg-[#FEF2F2] disabled:opacity-50"
                  onClick={() => void handleReject()}
                >
                  {saving ? 'Rejecting…' : 'Reject account'}
                </button>
              )}
            </div>

            {/* Unsaved changes indicator */}
            {hasChanges && userId && (
              <p className="text-[12px] font-semibold text-[#D97706] text-center">
                ⚠ Unsaved changes — click Save to apply
              </p>
            )}
          </section>

          {/* ── Right: Industry checkboxes ────────────────────────────── */}
          <section className="lg:col-span-2 rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1E293B]">
                {isPending ? 'Assign industries (pending approval)' : 'Industry access'}
              </h2>
              {userId && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedAccess(new Set(ALL_INDUSTRIES))
                    }
                    className="text-xs font-bold text-[#0F766E] hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-[#CBD5E1]">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedAccess(new Set())}
                    className="text-xs font-bold text-[#475569] hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {!userId ? (
              <p className="text-[15px] font-medium text-[#475569]">Select a user to manage their industry access.</p>
            ) : (
              <>
                {isPending && (
                  <div className="mb-4 p-3 rounded-xl bg-[#FEF3C7] border border-[#FDE68A]">
                    <p className="text-sm font-semibold text-[#A16207]">
                      ⚠ This account is pending. Clicking "Approve + Save Access" will atomically approve the account and grant the selected industries.
                    </p>
                  </div>
                )}

                <div className="max-h-[480px] overflow-y-auto space-y-2 pr-1">
                  {ALL_INDUSTRIES.map((industry) => {
                    const isSaved = savedAccess.has(industry)
                    const isSelected = selectedAccess.has(industry)
                    const changed = isSelected !== isSaved

                    return (
                      <label
                        key={industry}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-[#0F766E]/40 bg-[#ECFDF5]'
                            : 'border-[#CBD5E1] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-[#0F766E]"
                          checked={isSelected}
                          onChange={() => toggleIndustry(industry)}
                        />
                        <div className="flex-1">
                          <p className="font-bold text-[#1E293B]">{industry}</p>
                          <p className="text-[13px] font-medium text-[#475569]">
                            All visible projects in this industry
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {isSaved && (
                            <span className="text-[10px] font-bold text-[#0F766E] bg-[#DCFCE7] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              Saved ✓
                            </span>
                          )}
                          {changed && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                              isSelected
                                ? 'text-[#D97706] bg-[#FEF3C7]'
                                : 'text-[#B91C1C] bg-[#FEE2E2]'
                            }`}>
                              {isSelected ? '+ Will grant' : '− Will revoke'}
                            </span>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>

                <p className="mt-3 text-sm text-[#64748B]">
                  {selectedAccess.size} of {ALL_INDUSTRIES.length} industries selected
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
