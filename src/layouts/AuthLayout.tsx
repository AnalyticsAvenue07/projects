import type { ReactNode } from 'react'
import { Link } from 'react-router'
import analyticsLogo from '/logo/logo.png'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#F8FBFF_0%,#EEF6F8_45%,#F8FAFC_100%)] px-4 py-10 text-[#0F172A] lg:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-[#0F766E]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[#0284C7]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center">
        <Link to="/login" className="mb-8 flex items-center gap-3 rounded-3xl bg-white/80 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-[#E2E8F0] backdrop-blur-xl transition-transform hover:-translate-y-0.5">
          <img src={analyticsLogo} alt="Analytics Avenue logo" className="h-14 w-14 object-contain" />
          <div className="flex items-center gap-1 text-2xl font-bold tracking-tight">
            <span className="text-[#1C3D76]">Analytics</span>
            <span className="text-[#080808]">Avenue</span>
          </div>
        </Link>

        <div className="w-full max-w-md rounded-[28px] border border-[#E2E8F0] bg-white/95 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
