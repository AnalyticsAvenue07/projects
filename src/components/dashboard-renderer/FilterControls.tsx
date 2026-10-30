import { useMemo } from 'react'
import type { FilterConfig } from '@/types/dashboardConfiguration'
import { Filter, RotateCcw } from 'lucide-react'

export interface FilterControlsProps {
  filters: FilterConfig[]
  datasetRows: Record<string, any>[]
  activeFilters: Record<string, any>
  onFilterChange: (field: string, value: any) => void
  onResetFilters: () => void
}

export function FilterControls({
  filters,
  datasetRows,
  activeFilters,
  onFilterChange,
  onResetFilters,
}: FilterControlsProps) {
  // Extract distinct options for each filter
  const filterOptions = useMemo(() => {
    const map: Record<string, string[]> = {}
    filters.forEach((filter) => {
      if (filter.options && filter.options.length > 0) {
        map[filter.field] = filter.options
      } else {
        const distinct = Array.from(
          new Set(
            datasetRows
              .map((r) => String(r[filter.field] ?? ''))
              .filter((v) => v.trim().length > 0)
          )
        ).sort()
        map[filter.field] = distinct
      }
    })
    return map
  }, [filters, datasetRows])

  if (filters.length === 0) return null

  const activeCount = Object.values(activeFilters).filter(
    (v) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
  ).length

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#0F766E]" />
          <h3 className="text-sm font-bold text-[#0F172A]">Dataset Filters</h3>
          {activeCount > 0 && (
            <span className="rounded-full bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 text-xs font-bold text-[#0F766E]">
              {activeCount} active
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filters.map((filter) => {
          const options = filterOptions[filter.field] || []
          const currentValue = activeFilters[filter.field]

          if (filter.filterType === 'multiselect') {
            const selectedArray: string[] = Array.isArray(currentValue) ? currentValue : []
            return (
              <div key={filter.id} className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {filter.label}
                </label>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 rounded-2xl border border-slate-200 bg-slate-50/50">
                  {options.map((opt) => {
                    const isSelected = selectedArray.includes(opt)
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const next = isSelected
                            ? selectedArray.filter((x) => x !== opt)
                            : [...selectedArray, opt]
                          onFilterChange(filter.field, next)
                        }}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-[#0F766E] text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          }

          // Single Select
          return (
            <div key={filter.id} className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {filter.label}
              </label>
              <select
                value={currentValue ?? ''}
                onChange={(e) => onFilterChange(filter.field, e.target.value || undefined)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              >
                <option value="">All {filter.label}</option>
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>
    </div>
  )
}
