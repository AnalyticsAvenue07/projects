import { Activity, Briefcase, Shield, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchAdminStats, type AdminStats } from '@/services/adminStats'

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <article className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0F766E]">{label}</p>
          <p className="mt-3 text-3xl font-bold text-[#0F172A]">{value}</p>
        </div>
        <div className="rounded-2xl bg-[#ECFDF5] p-3 text-[#0F766E]">{icon}</div>
      </div>
    </article>
  )
}

export function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAdminStats()
      .then((s) => {
        if (!cancelled) {
          setStats(s)
          setLoading(false)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <p className="text-[15px] font-medium text-[#B91C1C]">{error}</p>
  }

  if (!stats) {
    return <p className="text-[15px] font-medium text-[#475569]">Loading overview…</p>
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#E2E8F0] bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0F766E]">Admin overview</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Workspace health and recent activity</h1>
            <p className="mt-2 max-w-2xl text-[#475569]">Monitor platform activity and user adoption without affecting any existing workflows or backend processes.</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={stats.totalUsers} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Pending approvals" value={stats.pendingUsers} icon={<Shield className="h-5 w-5" />} />
        <StatCard label="Active users" value={stats.approvedUsers} icon={<Activity className="h-5 w-5" />} />
        <StatCard label="Total POCs" value={stats.totalPocs} icon={<Briefcase className="h-5 w-5" />} />
      </div>

      <section className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <h2 className="text-xl font-bold text-[#0F172A]">Recently added users</h2>
        <p className="mt-1 text-sm text-[#475569]">A quick view of newly registered or updated users in the current workspace.</p>
        <div className="mt-5 divide-y divide-[#E2E8F0]">
          {stats.recentUsers.length === 0 ? (
            <p className="text-[15px] font-medium text-[#475569] py-4">No users yet.</p>
          ) : (
            stats.recentUsers.map((u) => (
              <div key={u.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-[#1E293B]">{u.name}</p>
                  <p className="text-[14px] font-medium text-[#475569]">{u.email}</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-md border border-[#CBD5E1] text-[#475569]">
                    {u.role}
                  </span>
                  <span
                    className={`px-2.5 py-1 text-xs font-bold rounded-md border ${
                      u.status === 'approved'
                        ? 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]'
                        : u.status === 'pending'
                          ? 'bg-[#FEF3C7] text-[#A16207] border-[#FDE68A]'
                          : 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]'
                    }`}
                  >
                    {u.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
