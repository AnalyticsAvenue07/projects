import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { Header } from '@/app/components/Header'
import { PageSuspenseSkeleton } from '@/components/PageSuspenseSkeleton'
import { Toaster } from '@/app/components/ui/sonner'

/** Authenticated pages without filter sidebar (profile, settings). */
export function MainShellPlain() {
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Header />
      <main className="h-[calc(100vh-57px)] overflow-y-auto">
        <Suspense fallback={<PageSuspenseSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <Toaster position="bottom-right" richColors />
    </div>
  )
}
