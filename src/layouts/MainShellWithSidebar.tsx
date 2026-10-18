import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { FilterSidebar } from '@/app/components/FilterSidebar'
import { Header } from '@/app/components/Header'
import { PageSuspenseSkeleton } from '@/components/PageSuspenseSkeleton'
import { SearchFiltersProvider, useSearchFilters } from '@/contexts/SearchFiltersContext'
import { Toaster } from '@/app/components/ui/sonner'

function ShellInner() {
  const { selectedFilters, setSelectedFilters } = useSearchFilters()

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Header />

      <div className="flex h-[calc(100vh-57px)]">
        <FilterSidebar
          selectedFilters={selectedFilters}
          onSelectedFiltersChange={setSelectedFilters}
        />

        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<PageSuspenseSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  )
}

/** Main dashboard shell: existing header + w-64 filter sidebar + scrollable content. */
export function MainShellWithSidebar() {
  return (
    <SearchFiltersProvider>
      <ShellInner />
    </SearchFiltersProvider>
  )
}
