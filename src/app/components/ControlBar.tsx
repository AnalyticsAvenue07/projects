import { Search } from 'lucide-react'
import { useSearchFilters } from '@/contexts/SearchFiltersContext'

export function ControlBar() {
  const { resultsQuery, setResultsQuery } = useSearchFilters()

  return (
    <section className="mb-6 rounded-3xl border border-[#E2E8F0] bg-white/95 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0F766E]">Workspace view</p>
          <h2 className="mt-1 text-xl font-semibold text-[#0F172A]">Explore enterprise-ready solutions across industries</h2>
          <p className="mt-2 max-w-2xl text-[#475569]">Search and evaluate solutions spanning healthcare, HR, real estate, supply chain, document intelligence, and generative AI applications.</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#475569]" />
          <input
            type="text"
            value={resultsQuery}
            onChange={(e) => setResultsQuery(e.target.value)}
            placeholder="Search in results..."
            className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-2.5 pl-11 pr-4 text-[15px] font-medium text-[#0F172A] shadow-sm placeholder:text-[#94A3B8] transition-all duration-200 focus:border-[#0F766E] focus:outline-none focus:ring-4 focus:ring-[rgba(15,118,110,0.12)]"
          />
        </div>

      </div>
    </section>
  )
}
