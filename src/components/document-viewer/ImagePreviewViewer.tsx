import { useState } from 'react'
import { Download, Image as ImageIcon, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import type { ProjectDocumentItem } from '@/types/projectManagement'

interface ImagePreviewViewerProps {
  doc: ProjectDocumentItem
  previewUrl: string
  onDownload: () => void
}

export function ImagePreviewViewer({ doc, previewUrl, onDownload }: ImagePreviewViewerProps) {
  const [zoomPercent, setZoomPercent] = useState(100)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)

  const handleZoomIn = () => setZoomPercent((z) => Math.min(300, z + 25))
  const handleZoomOut = () => setZoomPercent((z) => Math.max(25, z - 25))
  const handleResetZoom = () => setZoomPercent(100)

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 text-white select-none">
      {/* Image Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-indigo-950 border border-indigo-800 p-1.5 text-indigo-400">
            <ImageIcon className="h-4 w-4" />
          </div>
          <div>
            <span className="font-mono text-2xs text-slate-400 uppercase tracking-wider">
              Image Artifact
            </span>
            <p className="text-xs font-bold text-slate-200">
              {dimensions ? `${dimensions.width} × ${dimensions.height} px` : doc.fileName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomPercent <= 25}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <span className="font-mono text-xs text-slate-300 min-w-[48px] text-center">
            {zoomPercent}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomPercent >= 300}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
            title="Reset zoom"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        </div>
      </div>

      {/* Image Canvas */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto min-h-[450px]">
        <img
          src={previewUrl}
          alt={doc.title}
          onLoad={(e) => {
            const img = e.currentTarget
            setDimensions({ width: img.naturalWidth, height: img.naturalHeight })
          }}
          style={{
            transform: `scale(${zoomPercent / 100})`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out',
          }}
          className="max-h-[65vh] max-w-full rounded-lg shadow-2xl object-contain"
        />
      </div>
    </div>
  )
}
