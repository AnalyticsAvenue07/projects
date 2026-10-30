import { useState, type ChangeEvent, type DragEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  Info,
  Loader2,
  Table,
} from 'lucide-react'
import {
  ProjectDatasetService,
  type DatasetAnalysisResult,
} from '@/services/projectDatasetService'

export interface DatasetUploaderProps {
  onAnalyzed: (result: DatasetAnalysisResult) => void
  currentAnalysis?: DatasetAnalysisResult | null
}

export function DatasetUploader({ onAnalyzed, currentAnalysis }: DatasetUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    if (!file) return
    const nameLower = file.name.toLowerCase()
    const isSupported = nameLower.endsWith('.csv') || nameLower.endsWith('.xlsx') || nameLower.endsWith('.xls')
    if (!isSupported) {
      setError('Please select a valid CSV (.csv) or Excel (.xlsx, .xls) dataset file.')
      return
    }

    setError(null)
    setAnalyzing(true)

    try {
      const result = await ProjectDatasetService.analyzeDatasetFile(file)
      onAnalyzed(result)
    } catch (err: any) {
      setError(err.message || 'Failed to parse dataset file.')
    } finally {
      setAnalyzing(false)
    }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFile(e.dataTransfer.files[0])
    }
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => {
    setIsDragging(false)
  }

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      void handleFile(e.target.files[0])
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Box */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`relative rounded-3xl border-2 border-dashed p-8 text-center transition-all ${
          isDragging
            ? 'border-[#0F766E] bg-[#ECFDF5]/60'
            : 'border-slate-300 bg-white hover:border-[#0F766E]/50 hover:bg-slate-50/50'
        }`}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={onInputChange}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          disabled={analyzing}
        />

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ECFDF5] text-[#0F766E]">
          {analyzing ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : (
            <FileUp className="h-7 w-7" />
          )}
        </div>

        <h4 className="mt-4 text-base font-bold text-[#0F172A]">
          {analyzing ? 'Analyzing Dataset Structure...' : 'Choose or drag a CSV or Excel file'}
        </h4>
        <p className="mt-1 text-xs text-slate-500">
          Accepts CSV (.csv) and Excel (.xlsx, .xls) files with automated column profiling and type inference (Max 20MB)
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Analysis & Quality Summary */}
      {currentAnalysis && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-teal-50 p-2.5 text-[#0F766E]">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0F172A]">{currentAnalysis.filename}</h4>
                <p className="text-xs text-slate-500">
                  {(currentAnalysis.fileSize / 1024).toFixed(1)} KB • {currentAnalysis.rowCount.toLocaleString()} rows • {currentAnalysis.headers.length} columns
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Validated Structure
            </span>
          </div>

          {/* Quality Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completeness</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{currentAnalysis.quality.completenessPct}%</p>
              <span className="text-2xs text-slate-400">Non-null cell coverage</span>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Duplicate Rows</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{currentAnalysis.quality.duplicateRowsCount}</p>
              <span className="text-2xs text-slate-400">Identical primary keys</span>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Headers Inferred</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{currentAnalysis.headers.length}</p>
              <span className="text-2xs text-slate-400">Supported columns</span>
            </div>
          </div>

          {/* Sample Rows Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Table className="h-4 w-4 text-[#0F766E]" />
                Dataset Sample Preview (First 5 Rows)
              </h5>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    {currentAnalysis.headers.map((h) => (
                      <th key={h} className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{h}</span>
                          <span className="text-2xs font-normal text-slate-400 lowercase">
                            {currentAnalysis.schemaMeta[h] || 'string'}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentAnalysis.sampleRows.slice(0, 5).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50">
                      {currentAnalysis.headers.map((h) => (
                        <td key={h} className="px-4 py-2 whitespace-nowrap text-slate-600">
                          {String(row[h] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
