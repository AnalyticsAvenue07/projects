import { useEffect, useState } from 'react'
import { AlertCircle, BookOpen, Download, Loader2 } from 'lucide-react'
import { SafeNotebookRenderer } from '@/components/notebook-viewer/SafeNotebookRenderer'
import { ProjectStorageService } from '@/services/projectStorageService'
import type { NotebookConfig, ProjectDocumentItem } from '@/types/projectManagement'

interface NotebookPreviewViewerProps {
  doc: ProjectDocumentItem
  previewUrl: string
  onDownload: () => void
}

export function NotebookPreviewViewer({ doc, previewUrl, onDownload }: NotebookPreviewViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<NotebookConfig | null>(null)

  useEffect(() => {
    let isCancelled = false
    const abortCtrl = new AbortController()

    const loadNotebook = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(previewUrl, { signal: abortCtrl.signal })
        if (!res.ok) {
          throw new Error(`Failed to load notebook file (${res.status} ${res.statusText})`)
        }
        const rawJson = await res.text()
        if (isCancelled) return

        const parsedConfig = ProjectStorageService.parseNotebookJson(rawJson, doc.fileName, doc.fileSize)
        setConfig(parsedConfig)
        setLoading(false)
      } catch (err: any) {
        if (isCancelled || err?.name === 'AbortError') return
        console.error('[NotebookPreviewViewer] Error parsing notebook:', err)
        setError(err?.message || 'Failed to parse Jupyter Notebook JSON.')
        setLoading(false)
      }
    }

    void loadNotebook()

    return () => {
      isCancelled = true
      abortCtrl.abort()
    }
  }, [previewUrl, doc.fileName, doc.fileSize])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
        <Loader2 className="h-8 w-8 text-[#0F766E] animate-spin" />
        <p className="text-xs font-semibold text-slate-600">Loading Jupyter Research Notebook...</p>
      </div>
    )
  }

  if (error || !config) {
    return (
      <div className="max-w-md mx-auto my-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-900">Notebook Preview Unavailable</h4>
          <p className="text-xs text-rose-700">{error || 'Could not parse notebook cells'}</p>
        </div>
        <button
          type="button"
          onClick={onDownload}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E]"
        >
          <Download className="h-4 w-4" /> Download Raw Notebook (.ipynb)
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-2xl overflow-hidden border border-slate-200">
      {/* Notebook Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-sky-50 border border-sky-200 p-2 text-sky-700">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <span className="font-mono text-2xs font-bold text-slate-500 uppercase tracking-wider">
              Jupyter Research Notebook
            </span>
            <p className="text-xs font-bold text-slate-800">
              {config.metadata.kernel} • {config.cells.length} Cells ({config.metadata.codeCellCount} Code, {config.metadata.markdownCellCount} Markdown)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs shadow-2xs transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Download (.ipynb)
        </button>
      </div>

      {/* Notebook Body */}
      <div className="flex-1 overflow-auto max-h-[70vh] p-4 bg-slate-50/50">
        <SafeNotebookRenderer config={config} title={doc.title} />
      </div>
    </div>
  )
}
