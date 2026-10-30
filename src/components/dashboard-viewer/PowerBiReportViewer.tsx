import { useState, useRef, useEffect, useCallback } from 'react'
import {
  AlertCircle,
  BarChart2,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileBox,
  Filter,
  Info,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import type { DashboardArtifactMetadata, PowerBiEmbedConfig } from '@/types/dashboardConfiguration'
import { DashboardService } from '@/services/dashboardService'
import { ProjectStorageService } from '@/services/projectStorageService'

interface PowerBiReportViewerProps {
  config: PowerBiEmbedConfig
  pbixArtifact?: DashboardArtifactMetadata
  title: string
  description?: string
  isStaff?: boolean
}

export function PowerBiReportViewer({
  config,
  pbixArtifact,
  title,
  description,
  isStaff,
}: PowerBiReportViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const reportInstanceRef = useRef<any>(null)
  const powerbiServiceRef = useRef<any>(null)
  const refreshTimerRef = useRef<any>(null)

  const [loading, setLoading] = useState(true)
  const [loadStatus, setLoadStatus] = useState('Initializing Power BI connection...')
  const [error, setError] = useState<string | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [showArtifactDetails, setShowArtifactDetails] = useState(false)
  const [filtersVisible, setFiltersVisible] = useState(true)
  const [activePageName, setActivePageName] = useState<string>('')
  const [reportPages, setReportPages] = useState<Array<{ name: string; displayName: string }>>([])
  const [connectionMode, setConnectionMode] = useState<string>('app_owns_data')

  // Fullscreen support
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

  // Handle downloading original .pbix file
  const handleDownloadPbix = async () => {
    if (!pbixArtifact?.storagePath) return
    setDownloading(true)
    try {
      await ProjectStorageService.triggerDownload(
        pbixArtifact.storagePath,
        pbixArtifact.originalFileName || `${title}.pbix`
      )
    } finally {
      setDownloading(false)
    }
  }

  // Toggle filter pane in Power BI Report
  const toggleFilterPane = async () => {
    if (!reportInstanceRef.current) return
    try {
      const nextVisible = !filtersVisible
      await reportInstanceRef.current.updateSettings({
        panes: {
          filters: {
            visible: nextVisible,
            expanded: nextVisible,
          },
        },
      })
      setFiltersVisible(nextVisible)
    } catch {
      // Ignored if not supported on current visual state
    }
  }

  // Reload report
  const handleReload = () => {
    if (reportInstanceRef.current) {
      setLoading(true)
      setLoadStatus('Reloading Power BI report canvas...')
      reportInstanceRef.current.reload().catch(() => {
        void initReport()
      })
    } else {
      void initReport()
    }
  }

  // Clean up current report instance and timers
  const cleanupReport = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    if (reportInstanceRef.current) {
      try {
        reportInstanceRef.current.off('loaded')
        reportInstanceRef.current.off('rendered')
        reportInstanceRef.current.off('error')
        reportInstanceRef.current.off('pageChanged')
      } catch {
        // Safe ignore
      }
      reportInstanceRef.current = null
    }

    if (powerbiServiceRef.current && containerRef.current) {
      try {
        powerbiServiceRef.current.reset(containerRef.current)
      } catch {
        // Safe ignore
      }
    }
  }, [])

  // Initialize or embed report using official Power BI JS SDK
  const initReport = useCallback(async () => {
    cleanupReport()
    setError(null)
    setErrorDetail(null)
    setLoading(true)
    setLoadStatus('Authorizing report access with Microsoft Entra ID...')

    // Check if target is Publish to Web
    const isPublishToWeb =
      config.embedMode === 'publish_to_web' ||
      (config.reportUrl && config.reportUrl.includes('/view'))

    let workspaceId = config.workspaceId
    let reportId = config.reportId

    // If IDs are missing but reportUrl exists, try to extract them
    if ((!workspaceId || !reportId) && config.reportUrl) {
      const extracted = DashboardService.extractPowerBiIdentifiers(config.reportUrl)
      if (extracted.workspaceId && !workspaceId) workspaceId = extracted.workspaceId
      if (extracted.reportId && !reportId) reportId = extracted.reportId
    }

    // Direct publish to web iframe fallback if not an organizational/service embed
    if (isPublishToWeb && (!workspaceId || !reportId)) {
      setConnectionMode('publish_to_web')
      setLoading(false)
      return
    }

    if (!workspaceId || !reportId) {
      setError('Report Connection Incomplete')
      setErrorDetail(
        'Workspace ID and Report ID must be configured to render this Power BI report interactively. Contact an administrator to connect the report.'
      )
      setLoading(false)
      return
    }

    try {
      // 1. Fetch authorized embed configuration and short-lived embed token from backend
      setLoadStatus('Requesting short-lived Power BI embed token...')
      const embedData = await DashboardService.getEmbedToken(workspaceId, reportId)

      setConnectionMode(embedData.embedding_model || 'app_owns_data')

      if (!containerRef.current) return

      // 2. Load official Microsoft Power BI SDK dynamically (safe for Node & browser)
      setLoadStatus('Loading Microsoft Power BI embedding engine...')
      const pbi = await import('powerbi-client')

      const powerbiService = new pbi.service.Service(
        pbi.factories.hpmFactory,
        pbi.factories.wpmpFactory,
        pbi.factories.routerFactory
      )
      powerbiServiceRef.current = powerbiService

      // Clean existing container DOM nodes
      powerbiService.reset(containerRef.current)

      // 3. Assemble embedding configuration
      const tokenType =
        embedData.token_type === 'Aad'
          ? pbi.models.TokenType.Aad
          : pbi.models.TokenType.Embed

      const embedConfig: any = {
        type: 'report',
        id: embedData.report_id,
        embedUrl: embedData.embed_url,
        accessToken: embedData.access_token,
        tokenType: tokenType,
        permissions: pbi.models.Permissions.Read,
        settings: {
          panes: {
            filters: {
              expanded: false,
              visible: true,
            },
            pageNavigation: {
              visible: true,
              position: pbi.models.PageNavigationPosition.Bottom,
            },
          },
          bars: {
            statusBar: { visible: true },
          },
          background: pbi.models.BackgroundType.Transparent,
          layoutType: pbi.models.LayoutType.Master,
        },
      }

      setLoadStatus('Rendering visual canvas and active datasets...')

      // 4. Embed report in container
      const report = powerbiService.embed(containerRef.current, embedConfig)
      reportInstanceRef.current = report

      // 5. Attach supported SDK event listeners
      report.on('loaded', async () => {
        setLoading(false)
        try {
          const pages = await report.getPages()
          const pageList = pages.map((p: any) => ({
            name: p.name,
            displayName: p.displayName || p.name,
          }))
          setReportPages(pageList)
          const active = pages.find((p: any) => p.isActive)
          if (active) setActivePageName(active.displayName || active.name)
        } catch {
          // Page discovery non-critical
        }
      })

      report.on('rendered', () => {
        setLoading(false)
      })

      report.on('pageChanged', (e: any) => {
        if (e.detail?.newPage?.displayName) {
          setActivePageName(e.detail.newPage.displayName)
        }
      })

      report.on('error', (errEvent: any) => {
        console.error('[PowerBI] Report event error:', errEvent.detail)
        const detailedMsg = errEvent.detail?.message || 'Report encountered a visual rendering error.'
        setError('Power BI Visual Error')
        setErrorDetail(detailedMsg)
        setLoading(false)
      })

      // 6. Schedule automatic token renewal before expiration
      if (embedData.expiration) {
        const expiresAt = new Date(embedData.expiration).getTime()
        const now = Date.now()
        // Refresh 8 minutes before expiration, minimum 1 minute
        const refreshDelay = Math.max(expiresAt - now - 8 * 60 * 1000, 60 * 1000)

        refreshTimerRef.current = setTimeout(async () => {
          try {
            const renewed = await DashboardService.refreshEmbedToken(
              workspaceId!,
              reportId!,
              embedData.token_id
            )
            if (reportInstanceRef.current && renewed.access_token) {
              await reportInstanceRef.current.setAccessToken(renewed.access_token)
            }
          } catch (renewErr) {
            console.warn('[PowerBI] Embed token refresh failed:', renewErr)
          }
        }, refreshDelay)
      }
    } catch (err: any) {
      console.error('[PowerBiReportViewer] Initialization failure:', err)
      setError('Unable to load Power BI Report')
      setErrorDetail(
        err.message ||
          'Failed to authenticate with Microsoft Entra ID or retrieve the Power BI report configuration. Ensure the service principal has workspace permissions.'
      )
      setLoading(false)
    }
  }, [config.workspaceId, config.reportId, config.reportUrl, config.embedMode, cleanupReport])

  useEffect(() => {
    void initReport()
    return () => {
      cleanupReport()
    }
  }, [initReport, cleanupReport])

  const isPublishToWeb =
    config.embedMode === 'publish_to_web' || (config.reportUrl && config.reportUrl.includes('/view'))

  return (
    <div
      ref={containerRef}
      className={`flex flex-col rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : 'w-full'
      }`}
    >
      {/* ── TOP CONTROL BAR ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-[#0B132B] border-b border-slate-800 text-xs text-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-2xs font-bold text-amber-300">
            <BarChart2 className="h-3.5 w-3.5 text-amber-400" />
            Power BI Interactive Report
          </span>
          <span className="font-bold text-slate-200 truncate">{title}</span>
          {activePageName && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-2xs text-slate-300">
              <Eye className="h-3 w-3 text-slate-400" /> Page: {activePageName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Filter Pane Button */}
          {!isPublishToWeb && (
            <button
              type="button"
              onClick={toggleFilterPane}
              className={`p-1.5 rounded-lg border transition-colors ${
                filtersVisible
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Toggle Filter Pane"
              aria-label="Toggle Filter Pane"
            >
              <Filter className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Reload Report Button */}
          <button
            type="button"
            onClick={handleReload}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Reload Report"
            aria-label="Reload Report"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          {/* Artifact Details Toggle */}
          {pbixArtifact && (
            <button
              type="button"
              onClick={() => setShowArtifactDetails(!showArtifactDetails)}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-2xs font-semibold text-slate-300 hover:text-white transition-colors"
              title="View original .pbix file metadata"
            >
              <FileBox className="h-3 w-3" />
              <span className="hidden md:inline">Artifact Info</span>
            </button>
          )}

          {/* Download Original .pbix Button (Authorized Access Preserved) */}
          {pbixArtifact && (
            <button
              type="button"
              onClick={handleDownloadPbix}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] px-3 py-1.5 text-xs font-bold text-white transition-all shadow-xs disabled:opacity-50"
              title="Download original .pbix desktop archive"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {downloading ? 'Downloading...' : 'Download .pbix'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── EXPANDABLE ARTIFACT AUDIT DRAWER ────────────────────── */}
      {showArtifactDetails && pbixArtifact && (
        <div className="bg-[#1E293B] border-b border-slate-700 px-6 py-3 text-xs text-slate-300 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileBox className="h-4 w-4 text-amber-400" />
              <span>
                <strong>Original Artifact:</strong> {pbixArtifact.originalFileName} (
                {(pbixArtifact.fileSize / (1024 * 1024)).toFixed(2)} MB)
              </span>
              <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.2 text-2xs font-semibold">
                Validated .pbix
              </span>
              <span className="text-2xs text-slate-400">
                Uploaded {new Date(pbixArtifact.uploadedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-2xs text-slate-400">
              <Lock className="h-3 w-3 text-slate-400" /> Private Enterprise Storage Reference
            </div>
          </div>
        </div>
      )}

      {/* ── PUBLISH TO WEB SECURITY ADVISORY ─────────────────────── */}
      {isPublishToWeb && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-2xs text-amber-900 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0" />
          <span>
            <strong>Publish-to-Web Report:</strong> This dashboard is served via Power BI web publishing.
            For private enterprise reports requiring Microsoft Entra ID tenant authorization, configure a workspace connection.
          </span>
        </div>
      )}

      {/* ── MAIN EMBED CANVAS ───────────────────────────────────── */}
      <div className="relative w-full aspect-video min-h-[620px] bg-slate-900 flex items-center justify-center">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/80 backdrop-blur-xs text-center p-6">
            <Loader2 className="h-9 w-9 text-amber-400 animate-spin" />
            <p className="text-sm font-bold text-white tracking-wide">{loadStatus}</p>
            <p className="text-2xs text-slate-400 max-w-sm">
              Establishing encrypted session with Microsoft Power BI Service. Real-time slicers and interactive visual canvases will render shortly.
            </p>
          </div>
        )}

        {/* Error State */}
        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-white p-8 max-w-lg text-center space-y-4 shadow-lg mx-4">
            <div className="rounded-2xl bg-rose-50 p-3.5 text-rose-600 inline-block mx-auto">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-slate-800">{error}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{errorDetail}</p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => void initReport()}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#0F766E] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0D655E] transition-all shadow-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry Connection
              </button>

              {pbixArtifact && (
                <button
                  type="button"
                  onClick={handleDownloadPbix}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  <Download className="h-3.5 w-3.5" /> Download .pbix
                </button>
              )}
            </div>
          </div>
        ) : isPublishToWeb && (!config.workspaceId || !config.reportId) ? (
          /* Pure publish-to-web fallback iframe */
          <iframe
            src={config.embedUrl || config.reportUrl}
            title={title}
            className="w-full h-full min-h-[620px] border-0"
            allowFullScreen
          />
        ) : (
          /* Official Power BI SDK mount node */
          <div
            id="powerbi-report-container"
            className="w-full h-full min-h-[620px] bg-slate-900"
          />
        )}
      </div>
    </div>
  )
}
