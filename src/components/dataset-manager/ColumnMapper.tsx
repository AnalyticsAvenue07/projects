import { useEffect, useState } from 'react'
import type { DatasetColumnSchema } from '@/types/dashboardConfiguration'
import { ArrowRight, CheckCircle2, HelpCircle, XCircle } from 'lucide-react'

export interface ColumnMapperProps {
  templateColumns: DatasetColumnSchema[]
  uploadedHeaders: string[]
  initialMapping?: Record<string, string>
  onMappingChange: (mapping: Record<string, string>, isComplete: boolean) => void
}

/**
 * Normalizes string for fuzzy header matching
 */
function normalizeHeader(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function ColumnMapper({
  templateColumns,
  uploadedHeaders,
  initialMapping = {},
  onMappingChange,
}: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = { ...initialMapping }

    // Auto-match if not yet mapped
    templateColumns.forEach((col) => {
      if (!initial[col.name]) {
        const normTarget = normalizeHeader(col.name)
        const match = uploadedHeaders.find((h) => {
          const normH = normalizeHeader(h)
          return (
            normH === normTarget ||
            normH.includes(normTarget) ||
            normTarget.includes(normH)
          )
        })
        if (match) {
          initial[col.name] = match
        }
      }
    })

    return initial
  })

  // Validate required columns
  const missingRequired = templateColumns.filter(
    (col) => col.required && (!mapping[col.name] || !uploadedHeaders.includes(mapping[col.name]))
  )
  const isComplete = missingRequired.length === 0

  useEffect(() => {
    onMappingChange(mapping, isComplete)
  }, [mapping, isComplete, onMappingChange])

  const handleSelectChange = (templateField: string, uploadedCol: string) => {
    setMapping((prev) => ({
      ...prev,
      [templateField]: uploadedCol,
    }))
  }

  const handleAutoMap = () => {
    const next: Record<string, string> = {}
    templateColumns.forEach((col) => {
      const normTarget = normalizeHeader(col.name)
      const match = uploadedHeaders.find((h) => {
        const normH = normalizeHeader(h)
        return normH === normTarget || normH.includes(normTarget) || normTarget.includes(normH)
      })
      if (match) next[col.name] = match
    })
    setMapping(next)
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h4 className="text-base font-bold text-[#0F172A]">Column Mapping</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Map uploaded CSV headers to the expected dashboard template fields
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAutoMap}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Auto-Match Fields
          </button>
          {isComplete ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              All Required Mapped
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700">
              <XCircle className="h-3.5 w-3.5" />
              {missingRequired.length} required unmapped
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {templateColumns.map((col) => {
          const mappedHeader = mapping[col.name] || ''
          const isMapped = mappedHeader !== '' && uploadedHeaders.includes(mappedHeader)

          return (
            <div
              key={col.name}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 transition-colors ${
                isMapped
                  ? 'border-slate-200 bg-white'
                  : col.required
                  ? 'border-amber-200/80 bg-amber-50/40'
                  : 'border-slate-100 bg-[#F8FAFC]'
              }`}
            >
              <div className="sm:w-1/2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#0F172A]">{col.label || col.name}</span>
                  {col.required ? (
                    <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-2xs font-bold text-rose-700">
                      Required
                    </span>
                  ) : (
                    <span className="text-2xs font-semibold text-slate-400">Optional</span>
                  )}
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-2xs font-mono text-slate-600">
                    {col.dataType}
                  </span>
                </div>
                {col.description && <p className="text-xs text-slate-500 mt-1">{col.description}</p>}
              </div>

              <div className="flex items-center gap-2 sm:w-1/2">
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 hidden sm:block" />
                <select
                  value={mappedHeader}
                  onChange={(e) => handleSelectChange(col.name, e.target.value)}
                  className={`w-full rounded-2xl border px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 ${
                    isMapped
                      ? 'border-[#0F766E]/40 bg-white text-slate-800 focus:border-[#0F766E] focus:ring-[#0F766E]'
                      : 'border-slate-300 bg-white text-slate-400 focus:border-amber-500 focus:ring-amber-500'
                  }`}
                >
                  <option value="">-- Choose CSV Column --</option>
                  {uploadedHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
