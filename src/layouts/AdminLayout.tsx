import { Suspense } from 'react'
import { ArrowLeft, Briefcase, Layers, Shield, Users } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Header } from '@/app/components/Header'
import { PageSuspenseSkeleton } from '@/components/PageSuspenseSkeleton'

const nav = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/access-management', label: 'Access' },
  { to: '/admin/project-management', label: 'Projects' },
]

export function AdminLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Header />

      <div className="flex h-[calc(100vh-57px)]">
        <aside className="w-72 shrink-0 border-r border-[#E2E8F0] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[inset_-1px_0_0_rgba(226,232,240,0.7)] overflow-y-auto">
          <div className="border-b border-[#E2E8F0] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0F766E]">Administration</p>
            <h2 className="mt-2 text-xl font-bold text-[#0F172A]">Control center</h2>
            <p className="mt-1 text-sm text-[#475569]">Manage users, access, and workspace governance in a consistent enterprise view.</p>
          </div>
          <nav className="space-y-1 p-3">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl border px-4 py-3 text-[15px] font-semibold transition-all duration-200 ${
                    isActive
                      ? 'border-[#0F766E]/30 bg-[#ECFDF5] text-[#0F766E] shadow-sm'
                      : 'border-transparent text-[#1E293B] hover:border-[#E2E8F0] hover:bg-[#F8FAFC]'
                  }`
                }
              >
                {item.label === 'Overview' && <Shield className="h-4 w-4" />}
                {item.label === 'Users' && <Users className="h-4 w-4" />}
                {item.label === 'Access' && <Briefcase className="h-4 w-4" />}
                {item.label === 'Projects' && <Layers className="h-4 w-4" />}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="p-4 pt-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#0F172A] shadow-sm transition-colors hover:bg-[#F8FAFC]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<PageSuspenseSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
