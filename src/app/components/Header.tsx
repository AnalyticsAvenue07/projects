import { Bell, Database, LogOut, Menu, Settings, Shield, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import analyticsLogo from '/logo/logo.png'
import { isDemoMode } from '@/services/dataMode'
import { Link, useNavigate } from 'react-router'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover'
import { fetchNotificationsForUser, markNotificationRead } from '@/services/notifications'
import { useAuthStore } from '@/stores/authStore'
import { isStaffRole } from '@/types/domain'
import type { NotificationRow } from '@/types/domain'

export function Header() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)

  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [notifOpen, setNotifOpen] = useState(false)

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    fetchNotificationsForUser()
      .then((rows) => {
        if (!cancelled) setNotifications(rows)
      })
      .catch(() => {
        if (!cancelled) setNotifications([])
      })
    return () => {
      cancelled = true
    }
  }, [profile, notifOpen])

  const unread = notifications.filter((n) => !n.is_read).length

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E2E8F0] bg-white/95 shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-3 rounded-2xl px-2 py-1 transition-colors hover:bg-[#F8FAFC]">
            <img src={analyticsLogo} alt="Analytics Avenue logo" className="h-12 w-12 object-contain" />
            <div className="flex items-center gap-1 text-xl font-bold tracking-tight">
              <span className="text-[#1C3D76]">Analytics</span>
              <span className="text-[#080808]">Avenue</span>
            </div>
          </Link>

          {isDemoMode() && (
            <div
              className="group relative inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm cursor-help hover:bg-emerald-100 transition-colors"
              title="Running in offline demo mode with sample enterprise datasets. No backend connection required."
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Demo Mode</span>
              <span className="hidden md:inline text-[10px] text-emerald-600 font-medium">(Offline Data)</span>

              <div className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white shadow-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100 z-50">
                Running in offline demo mode with sample enterprise datasets. No backend connection required.
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900" />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="relative rounded-xl p-2.5 transition-all duration-200 hover:bg-[#F8FAFC] hover:text-[#0F766E]"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-[#1E293B]" />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#0F766E] text-white text-[10px] font-bold flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 p-0 border-[#CBD5E1] shadow-lg">
              <div className="px-4 py-3 border-b border-[#CBD5E1] font-bold text-[#1E293B]">Notifications</div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[15px] font-medium text-[#475569]">No notifications yet.</div>
                ) : (
                  notifications.map((n) => (
                    <button
                      type="button"
                      key={n.id}
                      className="w-full text-left px-4 py-3 border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors"
                      onClick={async () => {
                        if (!n.is_read) {
                          try {
                            await markNotificationRead(n.id)
                            setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
                          } catch {
                            /* ignore */
                          }
                        }
                      }}
                    >
                      <div className="font-bold text-[14px] text-[#1E293B]">{n.title}</div>
                      <div className="text-[13px] font-medium text-[#475569] mt-0.5 line-clamp-2">{n.message}</div>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="rounded-xl p-1.5 transition-all duration-200 hover:bg-[#F8FAFC]">
                <div className="w-9 h-9 rounded-full bg-[#0F766E] flex items-center justify-center shadow-md">
                  <User className="w-5 h-5 text-white" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 border-[#CBD5E1]">
              <div className="px-2 py-1.5 text-xs font-semibold text-[#475569] truncate">{profile?.email}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => navigate('/profile')}>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => navigate('/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              {profile && isStaffRole(profile.role) && profile.status === 'approved' && (
                <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => navigate('/admin')}>
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="font-medium cursor-pointer text-[#B91C1C]"
                onClick={async () => {
                  await signOut()
                  navigate('/login')
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button type="button" className="rounded-xl p-2.5 transition-all duration-200 hover:bg-[#F8FAFC]">
            <Menu className="w-5 h-5 text-[#1E293B]" />
          </button>
        </div>
      </div>
    </header>
  )
}
