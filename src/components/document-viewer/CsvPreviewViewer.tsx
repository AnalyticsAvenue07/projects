import { useEffect, useState, useMemo } from 'react'
import { Download, FileSpreadsheet, Loader2, Search, AlertCircle } from 'lucide-react'
import { parseCsvText } from '@/utils/csvParser'
import type { ProjectDocumentItem } from '@/types/projectManagement'

interface CsvPreviewViewerProps {
  doc: ProjectDocumentItem
  previewUrl: string
  onDownload: () => void
}

const PREVIEW_ROW_LIMIT = 100

export function CsvPreviewViewer({ doc, previewUrl, onDownload }: CsvPreviewViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, any>[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [filterQuery, setFilterQuery] = useState('')

  useEffect(() => {
    let isCancelled = false
    const abortCtrl = new AbortController()

    const loadCsv = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(previewUrl, { signal: abortCtrl.signal })
        if (!res.ok) {
          throw new Error(`Failed to load CSV file (${res.status} ${res.statusText})`)
        }
        const text = await res.text()
        if (isCancelled) return

        const result = parseCsvText(text)
        setHeaders(result.headers || [])
        setRows(result.rows || [])
        setTotalRows(result.rowCount || 0)
        setLoading(false)
      } catch (err: any) {
        if (isCancelled || err?.name === 'AbortError') return
        console.error('[CsvPreviewViewer] Error parsing CSV:', err)
        setError(err?.message || 'Failed to load and parse CSV dataset.')
        setLoading(false)
      }
    }

    void loadCsv()

    return () => {
      isCancelled = true
      abortCtrl.abort()
    }
  }, [previewUrl])

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!filterQuery.trim()) return rows.slice(0, PREVIEW_ROW_LIMIT)
    const q = filterQuery.toLowerCase()
    return rows
      .filter((row) =>
        Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q))
      )
      .slice(0, PREVIEW_ROW_LIMIT)
  }, [rows, filterQuery])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
        <Loader2 className="h-8 w-8 text-[#0F766E] animate-spin" />
        <p className="text-xs font-semibold text-slate-600">Loading structured CSV data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-900">CSV Preview Unavailable</h4>
          <p className="text-xs text-rose-700">{error}</p>
        </div>
        <button
          type="button"
          onClick={onDownload}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E]"
        >
          <Download className="h-4 w-4" /> Download Raw CSV File
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-2xl overflow-hidden border border-slate-200">
      {/* CSV Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2 text-emerald-700">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div>
            <span className="font-mono text-2xs font-bold text-slate-500 uppercase tracking-wider">
              Structured Tabular Dataset
            </span>
            <p className="text-xs font-bold text-slate-800">
              {headers.length} Columns • {totalRows.toLocaleString()} Records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter preview rows..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0F766E]"
            />
          </div>

          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs shadow-2xs transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download Full CSV
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {totalRows > PREVIEW_ROW_LIMIT && (
        <div className="px-4 py-1.5 bg-sky-50 border-b border-sky-100 text-2xs font-semibold text-sky-800">
          Showing preview of first {PREVIEW_ROW_LIMIT} rows for high performance. Download full CSV for all {totalRows.toLocaleString()} rows.
        </div>
      )}

      {/* Table Container */}
      <div className="flex-1 overflow-auto max-h-[60vh]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#F8FAFC] text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 border-r border-slate-200 w-12 text-center text-2xs text-slate-400 font-mono">
                #
              </th>
              {headers.map((col, idx) => (
                <th key={idx} className="py-2.5 px-3.5 border-r border-slate-200 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
            {filteredRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-teal-50/40 transition-colors">
                <td className="py-2 px-3 border-r border-slate-100 text-center text-2xs text-slate-400 select-none">
                  {rIdx + 1}
                </td>
                {headers.map((col, cIdx) => (
                  <td key={cIdx} className="py-2 px-3.5 border-r border-slate-100 whitespace-nowrap text-2xs">
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
