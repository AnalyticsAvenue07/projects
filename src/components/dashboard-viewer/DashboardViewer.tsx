import { useState } from 'react'
import type { DashboardConfig } from '@/types/dashboardConfiguration'
import { PdfDashboardViewer } from './PdfDashboardViewer'
import { PowerBiReportViewer } from './PowerBiReportViewer'
import { PbixArtifactCard } from './PbixArtifactCard'
import { GenericDashboardRenderer } from '@/components/dashboard-renderer/GenericDashboardRenderer'
import { AlertCircle, BarChart2, Download, FileSpreadsheet } from 'lucide-react'
import { ProjectStorageService } from '@/services/projectStorageService'

interface DashboardViewerProps {
  config: DashboardConfig
  title: string
  description?: string
  datasetRows?: Record<string, any>[]
  isStaff?: boolean
}

export function DashboardViewer({
  config,
  title,
  description,
  datasetRows = [],
  isStaff,
}: DashboardViewerProps) {
  const [downloadingPbix, setDownloadingPbix] = useState(false)
  const sourceType = config.sourceType || (config.charts && config.charts.length > 0 ? 'visual_builder' : 'powerbi_pbix')

  const handleDownloadPbix = async () => {
    if (!config.pbixArtifact?.storagePath) return
    setDownloadingPbix(true)
    try {
      await ProjectStorageService.triggerDownload(
        config.pbixArtifact.storagePath,
        config.pbixArtifact.originalFileName || `${title}.pbix`
      )
    } finally {
      setDownloadingPbix(false)
    }
  }

  if (sourceType === 'pdf') {
    return (
      <PdfDashboardViewer
        artifact={config.pdfArtifact}
        title={title}
        description={description}
      />
    )
  }

  // 1. If Power BI Service Embed is explicitly selected
  if (sourceType === 'powerbi_embed' && config.powerBiEmbed) {
    return (
      <PowerBiReportViewer
        config={config.powerBiEmbed}
        title={title}
        description={description}
        isStaff={isStaff}
      />
    )
  }

  // 2. If Power BI .pbix is selected
  if (sourceType === 'powerbi_pbix') {
    // If a live Power BI report connection has been configured for this .pbix project,
    // render the actual interactive Power BI report with the original .pbix artifact available for download!
    const hasReportConnection = Boolean(
      config.powerBiEmbed?.reportId ||
      config.powerBiEmbed?.workspaceId ||
      (config.powerBiEmbed?.reportUrl && config.powerBiEmbed.reportUrl.trim().length > 0)
    )

    if (hasReportConnection && config.powerBiEmbed) {
      return (
        <PowerBiReportViewer
          config={config.powerBiEmbed}
          pbixArtifact={config.pbixArtifact}
          title={title}
          description={description}
          isStaff={isStaff}
        />
      )
    }

    // Credential-Free Native Dashboard View (if dataset attached or charts configured)
    const hasNativeCharts = Boolean(
      (config.charts && config.charts.length > 0) || (datasetRows && datasetRows.length > 0) || config.datasetId
    )

    if (hasNativeCharts && (datasetRows.length > 0 || (config.charts && config.charts.length > 0))) {
      return (
        <div className="space-y-6">
          {/* Native Telemetry & Download Header Banner */}
          <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <div className="rounded-xl bg-amber-100 p-2 text-amber-800 shrink-0 mt-0.5">
                <BarChart2 className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-800">
                    Native Dashboard View
                  </p>
                  <span className="rounded-full bg-amber-100 px-2 py-0.2 text-2xs font-semibold text-amber-800">
                    Credential-Free
                  </span>
                </div>
                <p className="text-2xs text-slate-500 mt-0.5 leading-relaxed">
                  Interactive charts dynamically computed from the attached dataset. The original Microsoft Power BI Desktop archive ({config.pbixArtifact?.originalFileName || 'report.pbix'}) is preserved in private storage.
                </p>
              </div>
            </div>

            {config.pbixArtifact && (
              <button
                type="button"
                onClick={handleDownloadPbix}
                disabled={downloadingPbix}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-1.5 text-xs font-bold text-amber-900 shadow-2xs hover:bg-amber-50 active:scale-98 transition-all shrink-0 self-start sm:self-center"
              >
                <Download className="h-3.5 w-3.5 text-amber-700" />
                {downloadingPbix ? 'Preparing...' : 'Download .pbix Report'}
              </button>
            )}
          </div>

          <GenericDashboardRenderer
            config={config}
            datasetRows={datasetRows}
            title={title}
            description={description}
          />
        </div>
      )
    }

    // Otherwise, display the validated artifact card with clear connection-required guidance
    return (
      <PbixArtifactCard
        artifact={config.pbixArtifact}
        title={title}
        description={description}
        isStaff={isStaff}
      />
    )
  }

  if (sourceType === 'visual_builder' || (config.charts && config.charts.length > 0)) {
    return (
      <GenericDashboardRenderer
        config={config}
        datasetRows={datasetRows}
        title={title}
        description={description}
      />
    )
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-3">
      <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
      <h3 className="text-sm font-bold text-slate-800">Dashboard Configuration Pending</h3>
      <p className="text-xs text-slate-500">
        No dashboard artifact or report connection has been configured for this project yet.
      </p>
    </div>
  )
}
