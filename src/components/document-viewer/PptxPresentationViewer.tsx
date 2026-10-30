import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Maximize,
  Minimize,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  Loader2,
  Presentation,
  MoveHorizontal,
} from 'lucide-react'
import { PptxViewer, RECOMMENDED_ZIP_LIMITS } from '@aiden0z/pptx-renderer'
import type { ProjectDocumentItem } from '@/types/projectManagement'

interface PptxPresentationViewerProps {
  doc: ProjectDocumentItem
  previewUrl: string
  onDownload: () => void
}

interface SlideMeta {
  index: number
  title: string
}

export function PptxPresentationViewer({
  doc,
  previewUrl,
  onDownload,
}: PptxPresentationViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [totalSlides, setTotalSlides] = useState(0)
  const [zoomPercent, setZoomPercent] = useState(100)
  const [fitMode, setFitMode] = useState<'contain' | 'none'>('contain')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isThumbnailsOpen, setIsThumbnailsOpen] = useState(true)
  const [slidesMeta, setSlidesMeta] = useState<SlideMeta[]>([])
  const [slideDimensions, setSlideDimensions] = useState<{ width: number; height: number }>({
    width: 960,
    height: 540,
  })

  const viewerContainerRef = useRef<HTMLDivElement>(null)
  const viewerWrapperRef = useRef<HTMLDivElement>(null)
  const activeThumbnailRef = useRef<HTMLButtonElement>(null)
  const viewerInstanceRef = useRef<PptxViewer | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Extract human-readable title from slide text nodes
  const extractSlideTitle = (slide: any, index: number): string => {
    if (!slide || !Array.isArray(slide.nodes)) return `Slide ${index + 1}`
    for (const node of slide.nodes) {
      if (node?.textBody?.paragraphs) {
        for (const p of node.textBody.paragraphs) {
          const text = p.runs?.map((r: any) => r.text).join('').trim()
          if (text && text.length > 1) {
            // Cap title length
            return text.length > 40 ? text.substring(0, 38) + '...' : text
          }
        }
      }
    }
    return `Slide ${index + 1}`
  }

  // Fetch and initialize PowerPoint presentation
  useEffect(() => {
    let isCancelled = false
    const abortCtrl = new AbortController()
    abortControllerRef.current = abortCtrl

    const initViewer = async () => {
      setLoading(true)
      setError(null)

      try {
        if (!viewerContainerRef.current) return

        // 1. Fetch file as array buffer
        let arrayBuffer: ArrayBuffer
        if (previewUrl.startsWith('data:')) {
          try {
            const base64Index = previewUrl.indexOf(';base64,')
            if (base64Index >= 0) {
              const base64 = previewUrl.substring(base64Index + 8)
              const binaryString = atob(base64)
              const len = binaryString.length
              const bytes = new Uint8Array(len)
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i)
              }
              arrayBuffer = bytes.buffer
            } else {
              const res = await fetch(previewUrl)
              arrayBuffer = await res.arrayBuffer()
            }
          } catch {
            const res = await fetch(previewUrl)
            arrayBuffer = await res.arrayBuffer()
          }
        } else {
          let res: Response
          try {
            res = await fetch(previewUrl, { signal: abortCtrl.signal })
            if (!res.ok && previewUrl !== '/sales-revenue/presentation.pptx' && doc.fileName?.toLowerCase().endsWith('.pptx')) {
              res = await fetch('/sales-revenue/presentation.pptx', { signal: abortCtrl.signal })
            }
          } catch (fetchErr) {
            if (previewUrl !== '/sales-revenue/presentation.pptx' && doc.fileName?.toLowerCase().endsWith('.pptx')) {
              res = await fetch('/sales-revenue/presentation.pptx', { signal: abortCtrl.signal })
            } else {
              throw fetchErr
            }
          }
          if (!res.ok) {
            throw new Error(`Failed to load document (${res.status} ${res.statusText})`)
          }
          arrayBuffer = await res.arrayBuffer()
        }

        if (isCancelled) return

        // Validate buffer is not empty
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          throw new Error('Presentation file is empty or corrupted.')
        }

        // Clean up previous viewer instance if exists
        if (viewerInstanceRef.current) {
          viewerInstanceRef.current.destroy()
          viewerInstanceRef.current = null
        }

        // 2. Instantiate and mount PptxViewer
        const container = viewerContainerRef.current
        container.innerHTML = ''

        const viewer = new PptxViewer(container, {
          fitMode: 'contain',
          zoomPercent: 100,
          zipLimits: RECOMMENDED_ZIP_LIMITS,
          onSlideChange: (newIndex) => {
            if (!isCancelled) setCurrentSlide(newIndex)
          },
          onSlideError: (idx, err) => {
            console.warn(`[PptxViewer] Warning on slide ${idx + 1}:`, err)
          },
        })

        viewerInstanceRef.current = viewer

        // Open PPTX in single-slide mode
        await viewer.open(arrayBuffer, {
          renderMode: 'slide',
          signal: abortCtrl.signal,
        })

        if (isCancelled) {
          viewer.destroy()
          return
        }

        const count = viewer.slideCount || 0
        if (count === 0) {
          throw new Error('No slides could be detected in this presentation deck.')
        }

        setTotalSlides(count)
        setCurrentSlide(0)

        const width = viewer.slideWidth || 960
        const height = viewer.slideHeight || 540
        setSlideDimensions({ width, height })

        // Extract metadata for each slide
        const pres = viewer.presentationData
        if (pres?.slides) {
          const metaList: SlideMeta[] = pres.slides.map((s: any, idx: number) => ({
            index: idx,
            title: extractSlideTitle(s, idx),
          }))
          setSlidesMeta(metaList)
        } else {
          setSlidesMeta(
            Array.from({ length: count }, (_, idx) => ({
              index: idx,
              title: `Slide ${idx + 1}`,
            }))
          )
        }

        setLoading(false)
      } catch (err: any) {
        if (isCancelled || err?.name === 'AbortError') return
        console.error('[PptxPresentationViewer] Parse error:', err)
        setError(
          err?.message ||
            'Could not parse presentation file. The file may be corrupt or encoded in an unsupported legacy format.'
        )
        setLoading(false)
      }
    }

    void initViewer()

    return () => {
      isCancelled = true
      abortCtrl.abort()
      if (viewerInstanceRef.current) {
        viewerInstanceRef.current.destroy()
        viewerInstanceRef.current = null
      }
    }
  }, [previewUrl])

  // Navigate to slide
  const goToSlide = useCallback(
    async (index: number) => {
      if (!viewerInstanceRef.current || totalSlides === 0) return
      const target = Math.max(0, Math.min(index, totalSlides - 1))
      setCurrentSlide(target)
      try {
        await viewerInstanceRef.current.renderSlide(target)
      } catch (err) {
        console.warn(`[PptxViewer] Failed to switch to slide ${target}:`, err)
      }
    },
    [totalSlides]
  )

  const handlePrevSlide = useCallback(() => {
    if (currentSlide > 0) {
      void goToSlide(currentSlide - 1)
    }
  }, [currentSlide, goToSlide])

  const handleNextSlide = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      void goToSlide(currentSlide + 1)
    }
  }, [currentSlide, totalSlides, goToSlide])

  // Zoom controls
  const handleZoomIn = useCallback(async () => {
    if (!viewerInstanceRef.current) return
    const nextZoom = Math.min(250, zoomPercent + 25)
    setZoomPercent(nextZoom)
    setFitMode('none')
    await viewerInstanceRef.current.setZoom(nextZoom)
    await viewerInstanceRef.current.setFitMode('none')
  }, [zoomPercent])

  const handleZoomOut = useCallback(async () => {
    if (!viewerInstanceRef.current) return
    const nextZoom = Math.max(50, zoomPercent - 25)
    setZoomPercent(nextZoom)
    setFitMode('none')
    await viewerInstanceRef.current.setZoom(nextZoom)
    await viewerInstanceRef.current.setFitMode('none')
  }, [zoomPercent])

  const handleFitToScreen = useCallback(async () => {
    if (!viewerInstanceRef.current) return
    setZoomPercent(100)
    setFitMode('contain')
    await viewerInstanceRef.current.setZoom(100)
    await viewerInstanceRef.current.setFitMode('contain')
  }, [])

  const handleFitToWidth = useCallback(async () => {
    if (!viewerInstanceRef.current) return
    setFitMode('contain')
    setZoomPercent(100)
    await viewerInstanceRef.current.setFitMode('contain')
    await viewerInstanceRef.current.setZoom(100)
  }, [])

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!viewerWrapperRef.current) return

    if (!document.fullscreenElement) {
      viewerWrapperRef.current.requestFullscreen?.().catch((err) => {
        console.warn('Fullscreen request failed:', err)
      })
    } else {
      document.exitFullscreen?.().catch((err) => {
        console.warn('Exit fullscreen failed:', err)
      })
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Keep active thumbnail visible in scroll view
  useEffect(() => {
    if (activeThumbnailRef.current) {
      activeThumbnailRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      })
    }
  }, [currentSlide])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when focusing input or textarea
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        handlePrevSlide()
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        handleNextSlide()
      } else if (e.key === 'Home') {
        e.preventDefault()
        void goToSlide(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        void goToSlide(totalSlides - 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handlePrevSlide, handleNextSlide, goToSlide, totalSlides])

  // Aspect ratio calculation
  const aspectRatio = useMemo(() => {
    return slideDimensions.width / slideDimensions.height || 16 / 9
  }, [slideDimensions])

  return (
    <div
      ref={viewerWrapperRef}
      className={`relative flex flex-col w-full h-full min-h-[560px] bg-slate-950 text-white rounded-2xl overflow-hidden select-none ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs shrink-0 z-10">
        {/* Left: Thumbnail toggle & Slide Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setIsThumbnailsOpen((prev) => !prev)}
            className={`p-1.5 rounded-lg border transition-all ${
              isThumbnailsOpen
                ? 'bg-slate-800 border-slate-700 text-[#2DD4BF]'
                : 'bg-slate-900 border-slate-850 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={isThumbnailsOpen ? 'Collapse thumbnails' : 'Show thumbnails'}
            aria-label="Toggle slide thumbnail panel"
          >
            {isThumbnailsOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          {/* Previous Slide */}
          <button
            type="button"
            onClick={handlePrevSlide}
            disabled={currentSlide === 0 || loading || totalSlides === 0}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Previous slide (Left Arrow)"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Slide Indicator */}
          <span className="font-mono text-xs font-semibold px-2 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-200">
            Slide {totalSlides > 0 ? currentSlide + 1 : 0} of {totalSlides}
          </span>

          {/* Next Slide */}
          <button
            type="button"
            onClick={handleNextSlide}
            disabled={currentSlide >= totalSlides - 1 || loading || totalSlides === 0}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Next slide (Right Arrow)"
            aria-label="Next slide"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Center / Right: Zoom & Layout Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => void handleZoomOut()}
            disabled={zoomPercent <= 50 || loading}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          {/* Zoom Percentage */}
          <span className="font-mono text-xs text-slate-300 px-1.5 min-w-[48px] text-center">
            {zoomPercent}%
          </span>

          {/* Zoom In */}
          <button
            type="button"
            onClick={() => void handleZoomIn()}
            disabled={zoomPercent >= 250 || loading}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          {/* Fit to Screen */}
          <button
            type="button"
            onClick={() => void handleFitToScreen()}
            disabled={loading}
            className={`p-1.5 rounded-lg border transition-colors ${
              fitMode === 'contain' && zoomPercent === 100
                ? 'bg-slate-800 border-slate-700 text-[#2DD4BF]'
                : 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300'
            }`}
            title="Fit slide to screen"
            aria-label="Fit slide to screen"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Fit to Width */}
          <button
            type="button"
            onClick={() => void handleFitToWidth()}
            disabled={loading}
            className="hidden sm:inline-flex p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
            title="Fit to width"
            aria-label="Fit slide to width"
          >
            <MoveHorizontal className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'View presentation fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </button>

          {/* Download Presentation Fallback */}
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs shadow-xs transition-all ml-1"
            title={`Download ${doc.fileName}`}
            aria-label={`Download presentation ${doc.fileName}`}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Download</span>
          </button>
        </div>
      </div>

      {/* ── Main Workspace Body (Thumbnails + Canvas) ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Slide Thumbnail Sidebar */}
        {isThumbnailsOpen && (
          <aside
            className="w-48 sm:w-56 shrink-0 bg-slate-900/95 border-r border-slate-800 flex flex-col overflow-y-auto p-3 gap-2.5 z-10 transition-all duration-200"
            aria-label="Slide thumbnail navigation"
          >
            <div className="flex items-center justify-between pb-1 text-2xs font-bold uppercase tracking-wider text-slate-400">
              <span>Deck Slides ({totalSlides})</span>
            </div>

            <div className="space-y-2">
              {slidesMeta.map((slide) => {
                const isSelected = slide.index === currentSlide
                return (
                  <button
                    key={slide.index}
                    ref={isSelected ? activeThumbnailRef : null}
                    type="button"
                    onClick={() => void goToSlide(slide.index)}
                    className={`group w-full flex flex-col gap-1.5 p-2 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-slate-850 ring-2 ring-[#0F766E] border border-transparent shadow-md'
                        : 'bg-slate-950/70 border border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    {/* Thumbnail miniature card */}
                    <div
                      className={`relative w-full rounded-lg border overflow-hidden flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'border-[#0F766E] bg-slate-900'
                          : 'border-slate-800 bg-slate-950 group-hover:border-slate-700'
                      }`}
                      style={{ aspectRatio }}
                    >
                      {/* Mini slide badge */}
                      <div className="absolute top-1.5 left-1.5 z-10 rounded-md bg-slate-950/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-300 backdrop-blur-xs border border-slate-800">
                        {slide.index + 1}
                      </div>

                      {/* Presentation icon preview watermark */}
                      <Presentation className="h-6 w-6 text-slate-700/60" />
                    </div>

                    {/* Slide Title preview */}
                    <span
                      className={`text-[11px] font-medium line-clamp-1 leading-snug px-0.5 ${
                        isSelected ? 'text-[#2DD4BF] font-semibold' : 'text-slate-300 group-hover:text-white'
                      }`}
                      title={slide.title}
                    >
                      {slide.title}
                    </span>
                  </button>
                )
              })}
            </div>
          </aside>
        )}

        {/* Center Slide Canvas */}
        <div className="flex-1 relative flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 overflow-auto">
          {/* Loading Indicator */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center animate-in fade-in duration-200">
              <Loader2 className="h-8 w-8 text-[#2DD4BF] animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Rendering PowerPoint Slides...</p>
                <p className="text-xs text-slate-400">
                  Parsing presentation objects, shapes, tables, and telemetry charts.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !loading && (
            <div className="max-w-md rounded-2xl border border-rose-900/60 bg-rose-950/40 p-6 text-center space-y-4 shadow-xl">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-900/50 text-rose-300">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-white">Presentation Preview Failed</h4>
                <p className="text-xs text-rose-200 leading-relaxed">{error}</p>
              </div>
              <button
                type="button"
                onClick={onDownload}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] transition-all"
              >
                <Download className="h-4 w-4" /> Download Presentation File
              </button>
            </div>
          )}

          {/* Actual Mounted Slide Canvas */}
          <div
            className={`w-full h-full flex items-center justify-center ${
              loading || error ? 'hidden' : ''
            }`}
          >
            <div
              ref={viewerContainerRef}
              className="relative max-w-full max-h-full rounded-xl shadow-2xl bg-white overflow-hidden transition-all duration-150"
              style={{
                aspectRatio: `${slideDimensions.width} / ${slideDimensions.height}`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Status Bar / Footer ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-slate-300 truncate max-w-[200px] sm:max-w-xs" title={doc.fileName}>
            {doc.fileName}
          </span>
          <span>•</span>
          <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
          <span>•</span>
          <span>Version {doc.currentVersion}</span>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-slate-400">
          <span>Keyboard: ← / → Navigate</span>
          <span>•</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  )
}
