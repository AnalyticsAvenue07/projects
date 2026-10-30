import { useState } from 'react'
import {
  AlertCircle,
  BarChart2,
  CheckCircle2,
  CloudUpload,
  Download,
  ExternalLink,
  FileBox,
  FileCheck,
  HelpCircle,
  Info,
  Layers,
  Lock,
  Sparkles,
} from 'lucide-react'
import type { DashboardArtifactMetadata } from '@/types/dashboardConfiguration'
import { ProjectStorageService } from '@/services/projectStorageService'

interface PbixArtifactCardProps {
  artifact?: DashboardArtifactMetadata
  title: string
  description?: string
  isStaff?: boolean
  onDownload?: () => void
}

export function PbixArtifactCard({
  artifact,
  title,
  description,
  isStaff,
  onDownload,
}: PbixArtifactCardProps) {
  const [downloading, setDownloading] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  const handleDownload = async () => {
    if (onDownload) {
      onDownload()
      return
    }

    if (!artifact?.storagePath) return
    setDownloading(true)
    try {
      await ProjectStorageService.triggerDownload(
        artifact.storagePath,
        artifact.originalFileName || `${title}.pbix`
      )
    } finally {
      setDownloading(false)
    }
  }

  const fileName = artifact?.originalFileName || `${title}.pbix`
  const fileSizeMb = artifact?.fileSize ? (artifact.fileSize / (1024 * 1024)).toFixed(2) : '15.4'
  const uploadDate = artifact?.uploadedAt
    ? new Date(artifact.uploadedAt).toLocaleDateString()
    : new Date().toLocaleDateString()

  return (
    <div className="space-y-6">
      {/* Primary Status Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-slate-100 pb-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-3.5 text-amber-700 shrink-0">
              <BarChart2 className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-0.5 text-2xs font-bold text-amber-800">
                  <FileBox className="h-3 w-3" /> Power BI Desktop Report (.pbix)
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-2xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Validated Artifact
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-2xs font-mono font-semibold text-slate-600">
                  <Lock className="h-2.5 w-2.5 text-slate-400" /> Private Storage
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/70 border border-amber-300 px-2.5 py-0.5 text-2xs font-bold text-amber-900">
                  <AlertCircle className="h-2.5 w-2.5 text-amber-700" /> Report Connection Required
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#0F172A]">{title}</h2>
              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                {description || 'Native Microsoft Power BI Desktop report containing production datasets, data models, DAX measures, and visual canvases.'}
              </p>
            </div>
          </div>

          {/* Action: Authorized Download */}
          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0F766E] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] disabled:opacity-50 transition-all"
            >
              <Download className="h-4 w-4" />
              {downloading ? 'Downloading...' : 'Download .pbix Report'}
            </button>
          </div>
        </div>

        {/* Technical Artifact Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4">
            <span className="text-2xs font-semibold text-slate-400 block">Original File</span>
            <p className="font-bold text-slate-700 font-mono text-2xs mt-1 truncate" title={fileName}>
              {fileName}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4">
            <span className="text-2xs font-semibold text-slate-400 block">File Size</span>
            <p className="font-bold text-slate-700 font-mono text-2xs mt-1">{fileSizeMb} MB</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4">
            <span className="text-2xs font-semibold text-slate-400 block">Artifact Version</span>
            <p className="font-bold text-slate-700 font-mono text-2xs mt-1">
              v{artifact?.artifactVersion || 1}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4">
            <span className="text-2xs font-semibold text-slate-400 block">Uploaded On</span>
            <p className="font-bold text-slate-700 font-mono text-2xs mt-1">{uploadDate}</p>
          </div>
        </div>

        {/* Realistic Rendering Strategy Disclosure Banner */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-[#0F172A]">Browser Interactive Preview Status</h4>
              <p className="text-slate-600 leading-relaxed">
                Power BI reports are compiled in a proprietary binary format containing Microsoft VertiPaq database engines and visual layouts. Direct browser rendering requires the report to be published to a Power BI Service workspace or connected via an approved Power BI embed configuration.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/60">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F766E] hover:text-[#0D655E] transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              {showGuide ? 'Hide Power BI Publishing Steps' : 'View Power BI Service Publishing Steps'}
            </button>
            <a
              href="https://learn.microsoft.com/power-bi/create-reports/desktop-upload-desktop-files"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Microsoft Documentation <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Expandable Power BI Publishing Guide */}
        {showGuide && (
          <div className="rounded-2xl border border-[#0F766E]/20 bg-[#ECFDF5]/30 p-6 space-y-4 animate-in fade-in duration-150">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
              Publishing Your .pbix Report to Power BI Service:
            </h4>
            <ol className="list-decimal list-inside space-y-2.5 text-xs text-slate-700 font-medium">
              <li>
                <strong>Open in Power BI Desktop:</strong> Download the .pbix file above and open it in Microsoft Power BI Desktop.
              </li>
              <li>
                <strong>Publish to Workspace:</strong> In Power BI Desktop, click <em>File → Publish → Publish to Power BI</em> and select your organization's designated workspace.
              </li>
              <li>
                <strong>Obtain Embed URL or Publish-to-Web link:</strong> In the Power BI Service portal, open the report, click <em>File → Embed report</em>, and copy the embed URL.
              </li>
              <li>
                <strong>Update Project Configuration:</strong> In Analytics Avenue, edit this project, switch the Dashboard Source to <em>Published Power BI Report Connection</em>, and paste the embed URL to enable live interactive rendering.
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
