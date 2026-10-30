import { Download, ExternalLink, FileText } from 'lucide-react'
import type { ProjectDocumentItem } from '@/types/projectManagement'

interface PdfPreviewViewerProps {
  doc: ProjectDocumentItem
  previewUrl: string
  onDownload: () => void
}

export function PdfPreviewViewer({ doc, previewUrl, onDownload }: PdfPreviewViewerProps) {
  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 text-white">
      {/* PDF Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-rose-950 border border-rose-800 p-1.5 text-rose-400">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <span className="font-mono text-2xs text-slate-400 uppercase tracking-wider">
              PDF Document
            </span>
            <p className="text-xs font-bold text-slate-200">{doc.fileName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in New Tab
          </a>

          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        </div>
      </div>

      {/* Embedded Iframe */}
      <div className="flex-1 min-h-[580px] bg-white">
        <iframe
          src={`${previewUrl}#toolbar=1&navpanes=1`}
          title={doc.title}
          className="w-full h-full min-h-[580px] border-0"
        />
      </div>
    </div>
  )
}
