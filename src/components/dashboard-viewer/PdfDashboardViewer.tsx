import { useState, useRef, useEffect } from 'react'
import {
  Download,
  ExternalLink,
  FileText,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import type { DashboardArtifactMetadata } from '@/types/dashboardConfiguration'
import { ProjectStorageService } from '@/services/projectStorageService'

interface PdfDashboardViewerProps {
  artifact?: DashboardArtifactMetadata
  previewUrl?: string
  title: string
  description?: string
  onDownload?: () => void
}

export function PdfDashboardViewer({
  artifact,
  previewUrl: initialPreviewUrl,
  title,
  description,
  onDownload,
}: PdfDashboardViewerProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string>(initialPreviewUrl || '')
  const [loading, setLoading] = useState(!initialPreviewUrl)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState<number>(100)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Resolve preview URL from storage if not provided
  useEffect(() => {
    if (initialPreviewUrl) {
      setResolvedUrl(initialPreviewUrl)
      setLoading(false)
      return
    }

    if (!artifact?.storagePath) {
      setError('No PDF storage reference found.')
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    ProjectStorageService.getDocumentUrl(artifact.storagePath, artifact.originalFileName)
      .then((url) => {
        if (!active) return
        if (!url) {
          setError('Failed to resolve authorized preview URL for the PDF dashboard.')
        } else {
          setResolvedUrl(url)
        }
      })
      .catch((err) => {
        if (!active) return
        setError(err.message || 'Error loading PDF preview.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [artifact, initialPreviewUrl])

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {
        // Fallback or ignore
      })
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const handleDownload = () => {
    if (onDownload) {
      onDownload()
    } else if (artifact?.storagePath) {
      void ProjectStorageService.triggerDownload(
        artifact.storagePath,
        artifact.originalFileName || `${title}.pdf`
      )
    } else if (resolvedUrl) {
      const a = document.createElement('a')
      a.href = resolvedUrl
      a.download = artifact?.originalFileName || `${title}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : 'w-full'
      }`}
    >
      {/* Top Banner / Disclaimer */}
      <div className="flex items-center justify-between gap-3 px-6 py-2.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-2xs font-bold text-rose-300">
            <FileText className="h-3 w-3" /> PDF Dashboard
          </span>
          <span className="font-semibold text-slate-200 truncate max-w-md">
            {artifact?.originalFileName || `${title}.pdf`}
          </span>
          {artifact?.fileSize ? (
            <span className="text-2xs font-mono text-slate-400">
              ({(artifact.fileSize / (1024 * 1024)).toFixed(2)} MB)
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {/* Page Navigation Controls */}
          <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg p-1 text-slate-300">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 hover:text-white rounded hover:bg-slate-700 disabled:opacity-40 transition-colors"
              title="Previous Page"
              aria-label="Previous Page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-2xs font-mono px-1.5 font-bold">Page {currentPage}</span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-1 hover:text-white rounded hover:bg-slate-700 transition-colors"
              title="Next Page"
              aria-label="Next Page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 rounded-lg p-1 text-slate-300">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(50, z - 15))}
              className="p-1 hover:text-white rounded hover:bg-slate-700"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-2xs font-mono px-1 font-bold">{zoom}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(200, z + 15))}
              className="p-1 hover:text-white rounded hover:bg-slate-700"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(100)}
              className="p-1 hover:text-white rounded hover:bg-slate-700 ml-1 text-2xs"
              title="Reset Zoom / Fit Width"
              aria-label="Reset Zoom / Fit Width"
            >
              Fit
            </button>
          </div>

          {/* Fullscreen button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          {/* Open in new tab */}
          {resolvedUrl && (
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Tab</span>
            </a>
          )}

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        </div>
      </div>

      {/* Mode Advisory Notice */}
      <div className="bg-amber-50/70 border-b border-amber-200 px-6 py-2 text-2xs text-amber-900 flex items-center gap-2">
        <Info className="h-3.5 w-3.5 text-amber-700 shrink-0" />
        <span>
          <strong>PDF Dashboard View:</strong> Document preview format. Live interactive drilldowns, cross-highlighting, and real-time slice-and-dice require the native Power BI Service report.
        </span>
      </div>

      {/* Main PDF Canvas */}
      <div className="flex-1 bg-slate-100 min-h-[620px] relative flex items-center justify-center overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <Loader2 className="h-8 w-8 text-[#0F766E] animate-spin" />
            <p className="text-xs font-semibold text-slate-600">Loading authorized PDF dashboard...</p>
          </div>
        ) : error || !resolvedUrl ? (
          <div className="rounded-2xl border border-rose-200 bg-white p-8 max-w-md text-center space-y-3 shadow-xs">
            <AlertTriangle className="h-8 w-8 text-rose-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">Preview Unavailable</h4>
            <p className="text-xs text-slate-500">{error || 'PDF stream could not be loaded.'}</p>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-bold text-white hover:bg-[#0D655E]"
            >
              <Download className="h-3.5 w-3.5" /> Download PDF File
            </button>
          </div>
        ) : (
          <div
            className="w-full h-full min-h-[620px] transition-transform duration-150 origin-top flex items-center justify-center"
            style={{ transform: zoom !== 100 ? `scale(${zoom / 100})` : 'none' }}
          >
            <iframe
              src={`${resolvedUrl}#page=${currentPage}&toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
              title={title}
              className="w-full h-full min-h-[620px] border-0 bg-white shadow-inner"
            />
          </div>
        )}
      </div>
    </div>
  )
}
