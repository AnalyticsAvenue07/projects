import { useState, useRef, useEffect } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  Globe,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'
import type { PowerBiEmbedConfig } from '@/types/dashboardConfiguration'

interface PowerBiEmbedViewerProps {
  config: PowerBiEmbedConfig
  title: string
  description?: string
}

export function PowerBiEmbedViewer({ config, title, description }: PowerBiEmbedViewerProps) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const isPublishToWeb = config.embedMode === 'publish_to_web' || config.reportUrl.includes('/view')

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {})
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

  const handleIframeLoad = () => {
    setLoading(false)
  }

  const handleReload = () => {
    setLoading(true)
    setLoadError(false)
    const iframe = containerRef.current?.querySelector('iframe')
    if (iframe) {
      const currentSrc = iframe.src
      iframe.src = ''
      setTimeout(() => {
        iframe.src = currentSrc
      }, 100)
    }
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : 'w-full'
      }`}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 px-6 py-3 bg-slate-900 border-b border-slate-800 text-xs text-white">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-2xs font-bold text-amber-300">
            Power BI Service
          </span>
          <span className="font-semibold text-slate-200 truncate">{title}</span>
          {config.reportId && (
            <span className="hidden md:inline font-mono text-2xs text-slate-400">
              ID: {config.reportId.slice(0, 8)}...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Reload button */}
          <button
            type="button"
            onClick={handleReload}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Reload Report"
            aria-label="Reload Report"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

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

          {/* Open in Power BI */}
          <a
            href={config.reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Open in Power BI</span>
          </a>
        </div>
      </div>

      {/* Security Banner: Publish to Web Warning */}
      {isPublishToWeb && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-2xs text-amber-900 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0" />
          <span>
            <strong>Publish-to-Web Report:</strong> This dashboard is embedded via Power BI Publish-to-Web. Any user with network access can view this report. Ensure no non-public or sensitive PII data is contained in this report.
          </span>
        </div>
      )}

      {/* Auth required banner */}
      {config.requiresAuth && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-2 text-2xs text-blue-900 flex items-center gap-2">
          <Lock className="h-4 w-4 text-blue-700 shrink-0" />
          <span>
            <strong>Organizational Authentication:</strong> {config.authInstructions || 'Sign in with your corporate Microsoft 365 / Power BI account to view this report.'}
          </span>
        </div>
      )}

      {/* Embed Canvas */}
      <div className="relative w-full aspect-video min-h-[580px] bg-slate-50 flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-xs">
            <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
            <p className="text-xs font-semibold text-slate-700">Connecting to Power BI Service...</p>
          </div>
        )}

        {loadError ? (
          <div className="rounded-2xl border border-rose-200 bg-white p-8 max-w-md text-center space-y-3 shadow-xs">
            <AlertCircle className="h-8 w-8 text-rose-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">Power BI Embedding Blocked</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your browser or organization's Power BI tenant policies may restrict direct embedding in external frames.
            </p>
            <div className="pt-2">
              <a
                href={config.reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-500"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Launch in New Window
              </a>
            </div>
          </div>
        ) : (
          <iframe
            src={config.embedUrl || config.reportUrl}
            title={title}
            className="w-full h-full border-0 min-h-[580px]"
            allowFullScreen
            onLoad={handleIframeLoad}
            onError={() => {
              setLoading(false)
              setLoadError(true)
            }}
          />
        )}
      </div>
    </div>
  )
}
