import { useEffect, useState, useMemo } from 'react'
import {
  BarChart2,
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Lock,
  Presentation,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import type { ProjectDocumentItem } from '@/types/projectManagement'
import { ProjectStorageService } from '@/services/projectStorageService'
import { PptxPresentationViewer } from './PptxPresentationViewer'
import { CsvPreviewViewer } from './CsvPreviewViewer'
import { TextPreviewViewer } from './TextPreviewViewer'
import { ImagePreviewViewer } from './ImagePreviewViewer'
import { PdfPreviewViewer } from './PdfPreviewViewer'
import { NotebookPreviewViewer } from './NotebookPreviewViewer'

interface ArtifactPreviewModalProps {
  doc: ProjectDocumentItem
  onClose: () => void
  onDownload: (doc: ProjectDocumentItem) => void
}

function getDocumentIcon(docType: ProjectDocumentItem['documentType']) {
  switch (docType) {
    case 'presentation':
      return <Presentation className="h-5 w-5 text-amber-600" />
    case 'pdf':
      return <FileText className="h-5 w-5 text-rose-600" />
    case 'architecture_diagram':
      return <ImageIcon className="h-5 w-5 text-indigo-600" />
    case 'report':
      return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
    case 'documentation':
      return <FileCode className="h-5 w-5 text-sky-600" />
    default:
      return <FileText className="h-5 w-5 text-slate-500" />
  }
}

export type ArtifactKind = 'pptx' | 'pdf' | 'pbix' | 'image' | 'csv' | 'text' | 'notebook' | 'unsupported'

export function detectArtifactKind(fileName: string, mimeType?: string): ArtifactKind {
  const ext = fileName.toLowerCase().split('.').pop() || ''
  const mime = (mimeType || '').toLowerCase()

  if (ext === 'pbix' || mime.includes('pbix') || mime.includes('powerbi')) {
    return 'pbix'
  }
  if (ext === 'pptx' || ext === 'ppt' || mime.includes('presentationml') || mime.includes('powerpoint')) {
    return 'pptx'
  }
  if (ext === 'pdf' || mime === 'application/pdf') {
    return 'pdf'
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext) || mime.startsWith('image/')) {
    return 'image'
  }
  if (ext === 'csv' || mime === 'text/csv') {
    return 'csv'
  }
  if (['txt', 'md'].includes(ext) || mime === 'text/plain' || mime === 'text/markdown') {
    return 'text'
  }
  if (ext === 'ipynb' || mime === 'application/x-ipynb+json') {
    return 'notebook'
  }
  return 'unsupported'
}

export function ArtifactPreviewModal({ doc, onClose, onDownload }: ArtifactPreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingUrl, setLoadingUrl] = useState(true)
  const [urlError, setUrlError] = useState<string | null>(null)

  const kind = useMemo(() => detectArtifactKind(doc.fileName, doc.mimeType), [doc.fileName, doc.mimeType])

  const fetchUrl = async () => {
    setLoadingUrl(true)
    setUrlError(null)
    try {
      let url = await ProjectStorageService.getDocumentUrl(doc.storagePath, doc.fileName)

      // Intelligent static asset fallback
      if (!url) {
        if (doc.fileName?.toLowerCase().endsWith('.pptx') || doc.documentType === 'presentation') {
          url = '/sales-revenue/presentation.pptx'
        } else if (doc.fileName?.toLowerCase() === 'sales_revenue_data.csv') {
          url = '/sales-revenue/sales_revenue_data.csv'
        } else if (doc.fileName?.toLowerCase() === 'readme.md') {
          url = '/sales-revenue/README.md'
        } else if (doc.fileName?.toLowerCase() === 'requirements.txt') {
          url = '/sales-revenue/requirements.txt'
        }
      }

      if (!url) {
        throw new Error('Document reference could not be resolved or access expired.')
      }

      setPreviewUrl(url)
    } catch (err: any) {
      console.error('[ArtifactPreviewModal] URL resolve error:', err)
      setUrlError(err?.message || 'Failed to load authorized preview reference.')
      setPreviewUrl(null)
    } finally {
      setLoadingUrl(false)
    }
  }

  useEffect(() => {
    void fetchUrl()
  }, [doc.storagePath, doc.fileName])

  // Escape key closes modal (when not caught by child viewer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const handleDownloadClick = () => {
    onDownload(doc)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
    >
      <div className="flex flex-col w-full max-w-6xl max-h-[92vh] rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-[#F8FAFC]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-xl border border-slate-200 bg-white p-2 shrink-0">
              {getDocumentIcon(doc.documentType)}
            </div>
            <div className="min-w-0">
              <h3 id="preview-modal-title" className="text-base font-bold text-[#0F172A] truncate">
                {doc.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-2xs text-slate-500 font-mono mt-0.5">
                <span className="truncate max-w-[200px]" title={doc.fileName}>
                  {doc.fileName}
                </span>
                <span>•</span>
                <span>v{doc.currentVersion}</span>
                <span>•</span>
                <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                {doc.accessPolicy === 'admin_only' && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-2xs font-bold text-amber-800">
                      <Lock className="h-2.5 w-2.5" /> Admin Only
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              type="button"
              onClick={handleDownloadClick}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] transition-all"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Close document preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50 min-h-[460px] flex items-center justify-center">
          {loadingUrl ? (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
              <Loader2 className="h-8 w-8 text-[#0F766E] animate-spin" />
              <p className="text-xs font-semibold text-slate-600">Resolving authorized document stream...</p>
            </div>
          ) : urlError || !previewUrl ? (
            <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center space-y-4 shadow-sm">
              <AlertCircle className="mx-auto h-10 w-10 text-rose-500" />
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">Preview Unavailable</h4>
                <p className="text-xs text-slate-500">
                  {urlError || 'Preview is not available for this artifact.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => void fetchUrl()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
                <button
                  type="button"
                  onClick={handleDownloadClick}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E]"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              </div>
            </div>
          ) : (
            // Format-specific interactive viewer components
            kind === 'pbix' ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 max-w-lg text-center space-y-5 shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-700">
                  <BarChart2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-0.5 text-2xs font-bold text-amber-800 uppercase tracking-wider">
                    Power BI Desktop Report (.pbix)
                  </span>
                  <h4 className="text-base font-bold text-[#0F172A]">{doc.title}</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    This file is a native Power BI Desktop (.pbix) report artifact. PBIX files contain proprietary data models, queries, and visualizations. Interactive browser rendering requires publication to Power BI Service.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-left text-2xs font-mono space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">File Name:</span>
                    <span className="text-slate-700 font-semibold">{doc.fileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">File Size:</span>
                    <span className="text-slate-700 font-semibold">{(doc.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-emerald-700 font-bold">Securely Stored</span>
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadClick}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] transition-all"
                  >
                    <Download className="h-4 w-4" /> Download .pbix Report
                  </button>
                </div>
              </div>
            ) : kind === 'pptx' ? (
              <PptxPresentationViewer
                doc={doc}
                previewUrl={previewUrl}
                onDownload={handleDownloadClick}
              />
            ) : kind === 'pdf' ? (
              <PdfPreviewViewer
                doc={doc}
                previewUrl={previewUrl}
                onDownload={handleDownloadClick}
              />
            ) : kind === 'image' ? (
              <ImagePreviewViewer
                doc={doc}
                previewUrl={previewUrl}
                onDownload={handleDownloadClick}
              />
            ) : kind === 'csv' ? (
              <CsvPreviewViewer
                doc={doc}
                previewUrl={previewUrl}
                onDownload={handleDownloadClick}
              />
            ) : kind === 'text' ? (
              <TextPreviewViewer
                doc={doc}
                previewUrl={previewUrl}
                onDownload={handleDownloadClick}
              />
            ) : kind === 'notebook' ? (
              <NotebookPreviewViewer
                doc={doc}
                previewUrl={previewUrl}
                onDownload={handleDownloadClick}
              />
            ) : (
              // Unsupported fallback
              <div className="rounded-3xl border border-slate-200 bg-white p-8 max-w-md text-center space-y-4 shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200">
                  <FileText className="h-7 w-7 text-slate-400" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Inline Preview Not Supported ({doc.fileName.split('.').pop()?.toUpperCase()})
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Preview is not available for this artifact format. You can securely download this file to view or execute it on your workstation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadClick}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0F766E] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] transition-all"
                >
                  <Download className="h-4 w-4" /> Download File ({(doc.fileSize / 1024).toFixed(1)} KB)
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
