import { useState } from 'react'
import type { ProjectDocumentItem } from '@/types/projectManagement'
import { ProjectStorageService } from '@/services/projectStorageService'
import {
  Download,
  Eye,
  FileCode,
  FileSpreadsheet,
  FileText,
  Image,
  Lock,
  Presentation,
} from 'lucide-react'
import { toast } from 'sonner'
import { ArtifactPreviewModal } from './ArtifactPreviewModal'

interface DocumentViewerProps {
  documents: ProjectDocumentItem[]
  title?: string
  isStaff?: boolean
}

function getDocumentIcon(docType: ProjectDocumentItem['documentType']) {
  switch (docType) {
    case 'presentation':
      return <Presentation className="h-5 w-5 text-amber-600" />
    case 'pdf':
      return <FileText className="h-5 w-5 text-rose-600" />
    case 'architecture_diagram':
      return <Image className="h-5 w-5 text-indigo-600" />
    case 'report':
      return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
    case 'documentation':
      return <FileCode className="h-5 w-5 text-sky-600" />
    default:
      return <FileText className="h-5 w-5 text-slate-500" />
  }
}

export function DocumentViewer({ documents, title, isStaff }: DocumentViewerProps) {
  const [activePreviewDoc, setActivePreviewDoc] = useState<ProjectDocumentItem | null>(null)

  const handleOpenPreview = (doc: ProjectDocumentItem) => {
    setActivePreviewDoc(doc)
  }

  const handleDownload = async (doc: ProjectDocumentItem) => {
    try {
      await ProjectStorageService.triggerDownload(doc.storagePath, doc.fileName)
      toast.success(`Downloading ${doc.fileName}`)
    } catch (err: any) {
      toast.error(err.message || 'Download failed.')
    }
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200/90 bg-white p-8 text-center text-xs text-slate-500">
        <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
        No documentation or presentation files are currently attached to this project.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Featured Header Card */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-2xs font-bold uppercase tracking-wider text-slate-600">
              Project Assets & Governance
            </span>
            <h3 className="mt-1 text-lg font-bold text-[#0F172A]">
              {title || 'Approved Documentation, Presentations & Artifacts'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Securely stored artifacts, executive slide decks, architecture diagrams, and regulatory reports.
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-2xs font-bold text-emerald-800 shrink-0">
            {documents.length} Authorized {documents.length === 1 ? 'Document' : 'Documents'}
          </span>
        </div>
      </div>

      {/* Documents Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => {
          return (
            <div
              key={doc.id}
              className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs transition-all hover:border-[#0F766E]/40 hover:shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-2.5">
                      {getDocumentIcon(doc.documentType)}
                    </div>
                    <div>
                      <span className="font-mono text-2xs font-bold uppercase tracking-wider text-slate-400">
                        {doc.documentType.replace('_', ' ')}
                      </span>
                      <h4 className="font-bold text-sm text-[#0F172A] leading-snug line-clamp-1">
                        {doc.title}
                      </h4>
                    </div>
                  </div>

                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-2xs font-bold text-slate-600 shrink-0">
                    v{doc.currentVersion}
                  </span>
                </div>

                {doc.description && (
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {doc.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 text-2xs text-slate-500 pt-1">
                  <span className="font-mono font-semibold">
                    {(doc.fileSize / 1024).toFixed(1)} KB
                  </span>
                  <span>•</span>
                  <span className="truncate max-w-[140px]" title={doc.fileName}>
                    {doc.fileName}
                  </span>
                  {doc.accessPolicy === 'admin_only' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-2xs font-bold text-amber-800">
                      <Lock className="h-3 w-3" /> Admin Only
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenPreview(doc)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <Eye className="h-3.5 w-3.5" /> Preview
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload(doc)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#0F766E] px-3 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#0D655E] transition-all"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Interactive Unified Artifact Preview Modal */}
      {activePreviewDoc && (
        <ArtifactPreviewModal
          doc={activePreviewDoc}
          onClose={() => setActivePreviewDoc(null)}
          onDownload={handleDownload}
        />
      )}
    </div>
  )
}
