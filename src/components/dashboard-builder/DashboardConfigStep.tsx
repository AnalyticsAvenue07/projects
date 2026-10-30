import { useState, useRef, useMemo } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  BarChart2,
  Check,
  CheckCircle2,
  FileBox,
  FileSpreadsheet,
  FileText,
  Globe,
  Info,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  DashboardConfig,
  DashboardSourceType,
  PowerBiEmbedConfig,
} from '@/types/dashboardConfiguration'
import {
  validateDashboardConfig,
  validatePowerBiUrl,
} from '@/types/dashboardConfiguration'
import {
  ProjectStorageService,
  MAX_PBIX_SIZE_BYTES,
  MAX_PDF_DASHBOARD_SIZE_BYTES,
} from '@/services/projectStorageService'
import { PdfDashboardViewer } from '@/components/dashboard-viewer/PdfDashboardViewer'
import { PowerBiReportViewer } from '@/components/dashboard-viewer/PowerBiReportViewer'
import { PbixArtifactCard } from '@/components/dashboard-viewer/PbixArtifactCard'
import { DashboardViewer } from '@/components/dashboard-viewer/DashboardViewer'
import { DatasetUploader } from '@/components/dataset-manager/DatasetUploader'
import { ColumnMapper } from '@/components/dataset-manager/ColumnMapper'
import { DashboardConfigBuilder } from '@/components/dashboard-builder/DashboardConfigBuilder'
import {
  ProjectDatasetService,
  generateDefaultDashboardConfig,
  type DatasetAnalysisResult,
} from '@/services/projectDatasetService'
import {
  DashboardService,
  type EmbedConfigStatus,
  type PowerBiReportItem,
  type TestConnectionResult,
  type PbixInspectionResult,
} from '@/services/dashboardService'

interface DashboardConfigStepProps {
  projectId: string
  projectTitle: string
  projectDescription?: string
  config: DashboardConfig
  onChange: (updated: DashboardConfig) => void
  activeDatasetAnalysis?: DatasetAnalysisResult | null
  onDatasetAnalyzed?: (res: DatasetAnalysisResult) => void
  columnMapping?: Record<string, string>
  onMappingChange?: (mapping: Record<string, string>) => void
  rawDatasetRows?: Record<string, any>[]
}

export function DashboardConfigStep({
  projectId,
  projectTitle,
  projectDescription,
  config,
  onChange,
  activeDatasetAnalysis,
  onDatasetAnalyzed,
  columnMapping,
  onMappingChange,
  rawDatasetRows = [],
}: DashboardConfigStepProps) {
  const currentSourceType: DashboardSourceType =
    config.sourceType || (config.charts && config.charts.length > 0 ? 'visual_builder' : 'powerbi_pbix')

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Local state for Power BI embed URL
  const [powerBiUrl, setPowerBiUrl] = useState(config.powerBiEmbed?.reportUrl || '')
  const [requiresAuth, setRequiresAuth] = useState(Boolean(config.powerBiEmbed?.requiresAuth))
  const [authInstructions, setAuthInstructions] = useState(config.powerBiEmbed?.authInstructions || '')

  // PBIX Report Connection State
  const [pbixWorkspaceId, setPbixWorkspaceId] = useState(config.powerBiEmbed?.workspaceId || '')
  const [pbixReportId, setPbixReportId] = useState(config.powerBiEmbed?.reportId || '')
  const [pbixQuickUrl, setPbixQuickUrl] = useState(config.powerBiEmbed?.reportUrl || '')
  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null)
  const [discoveringReports, setDiscoveringReports] = useState(false)
  const [discoveredReports, setDiscoveredReports] = useState<PowerBiReportItem[]>([])

  // PBIX Inspection & Dataset Attachment State
  const [inspectingPbix, setInspectingPbix] = useState(false)
  const [pbixInspection, setPbixInspection] = useState<PbixInspectionResult | null>(null)
  const [datasetUploading, setDatasetUploading] = useState(false)
  const [datasetError, setDatasetError] = useState<string | null>(null)
  const datasetFileInputRef = useRef<HTMLInputElement>(null)

  const handleQuickUrlChange = (val: string) => {
    setPbixQuickUrl(val)
    const extracted = DashboardService.extractPowerBiIdentifiers(val)
    if (extracted.workspaceId) setPbixWorkspaceId(extracted.workspaceId)
    if (extracted.reportId) setPbixReportId(extracted.reportId)
  }

  const handleTestPbixConnection = async () => {
    if (!pbixWorkspaceId.trim()) {
      toast.error('Please enter a Power BI Workspace ID.')
      return
    }
    setTestingConnection(true)
    setTestResult(null)
    try {
      const res = await DashboardService.testConnection(pbixWorkspaceId, pbixReportId)
      setTestResult(res)
      if (res.success) {
        toast.success(res.message || 'Power BI connection verified!')
      } else {
        toast.error(res.message || 'Connection test failed.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify connection.')
      setTestResult({
        success: false,
        status: 'error',
        message: err.message || 'Connection test failed.',
        workspace_id: pbixWorkspaceId,
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const handleDiscoverPbixReports = async () => {
    if (!pbixWorkspaceId.trim()) {
      toast.error('Please enter a Power BI Workspace ID first.')
      return
    }
    setDiscoveringReports(true)
    try {
      const reports = await DashboardService.getPowerBiReports(pbixWorkspaceId.trim())
      setDiscoveredReports(reports)
      if (reports.length > 0) {
        toast.success(`Found ${reports.length} report(s) in workspace!`)
      } else {
        toast.info('No reports found in this workspace.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not query reports. Check backend credentials.')
    } finally {
      setDiscoveringReports(false)
    }
  }

  const handleApplyPbixConnection = () => {
    if (!pbixWorkspaceId.trim() || !pbixReportId.trim()) {
      toast.error('Both Workspace ID and Report ID are required.')
      return
    }
    const embedCfg: PowerBiEmbedConfig = {
      workspaceId: pbixWorkspaceId.trim(),
      reportId: pbixReportId.trim(),
      reportUrl:
        pbixQuickUrl.trim() ||
        `https://app.powerbi.com/groups/${pbixWorkspaceId.trim()}/reports/${pbixReportId.trim()}`,
      reportName: testResult?.report_name,
      embedUrl: testResult?.embed_url,
      connectionState: 'ready_for_preview',
      embeddingType: 'app_owns_data',
      lastConnectedAt: new Date().toISOString(),
    }
    onChange({
      ...config,
      version: 2,
      powerBiEmbed: embedCfg,
    })
    toast.success('Power BI report connection saved! Interactive preview is now active.')
  }

  const handleDisconnectPbix = () => {
    onChange({
      ...config,
      powerBiEmbed: undefined,
    })
    setTestResult(null)
    toast.info('Report connection removed. File remains available for download.')
  }

  // Validate Power BI URL
  const powerBiUrlCheck = useMemo(() => {
    if (!powerBiUrl.trim()) return null
    return validatePowerBiUrl(powerBiUrl)
  }, [powerBiUrl])

  // Change source type
  const handleSelectSourceType = (type: DashboardSourceType) => {
    setUploadError(null)
    onChange({
      ...config,
      version: 2,
      sourceType: type,
    })
  }

  // Handle File Upload (PBIX or PDF)
  const handleFileUpload = async (file: File) => {
    setUploadError(null)
    setUploading(true)
    setUploadProgress(15)

    try {
      const isPbix = currentSourceType === 'powerbi_pbix'
      const validation = isPbix
        ? ProjectStorageService.validatePbixFile(file)
        : ProjectStorageService.validatePdfDashboardFile(file)

      if (!validation.isValid) {
        setUploadError(validation.error || 'File validation failed.')
        toast.error(validation.error || 'File validation failed.')
        setUploading(false)
        return
      }

      setUploadProgress(45)

      // Upload to private storage
      const artifact = await ProjectStorageService.uploadDashboardArtifact(
        file,
        projectId || 'draft_project',
        isPbix ? 'powerbi_pbix' : 'pdf'
      )

      setUploadProgress(100)

      if (isPbix) {
        setInspectingPbix(true)
        DashboardService.inspectPbixFile(file)
          .then((insp) => {
            setPbixInspection(insp)
            if (insp.is_valid_pbix) {
              toast.info(`Inspected ${insp.page_count} page(s) and ${insp.visual_count} visual(s) in .pbix`)
            }
          })
          .catch((err) => {
            console.warn('[DashboardConfigStep] PBIX inspection skipped/unavailable:', err)
          })
          .finally(() => {
            setInspectingPbix(false)
          })

        onChange({
          ...config,
          version: 2,
          sourceType: 'powerbi_pbix',
          pbixArtifact: artifact,
        })
        toast.success(`Power BI file "${file.name}" uploaded and validated.`)
      } else {
        onChange({
          ...config,
          version: 2,
          sourceType: 'pdf',
          pdfArtifact: artifact,
        })
        toast.success(`PDF dashboard "${file.name}" uploaded and ready for preview.`)
      }
    } catch (err: any) {
      console.error('[DashboardConfigStep] upload failure:', err)
      setUploadError(err.message || 'File upload failed. Please try again.')
      toast.error(err.message || 'File upload failed.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDatasetAttach = async (file: File) => {
    setDatasetError(null)
    setDatasetUploading(true)
    try {
      const analysis = await ProjectDatasetService.analyzeDatasetFile(file)
      const saved = await ProjectDatasetService.saveDataset(file.name, analysis)
      const autoConfig = generateDefaultDashboardConfig(analysis, projectTitle)

      onDatasetAnalyzed?.(analysis)

      onChange({
        ...config,
        datasetId: saved.id,
        datasetName: file.name,
        kpis: autoConfig.kpis,
        charts: autoConfig.charts,
        filters: autoConfig.filters,
        tableColumns: autoConfig.tableColumns,
      })

      toast.success(
        `Attached dataset "${file.name}" (${analysis.rowCount} rows). Native interactive dashboard generated!`
      )
    } catch (err: any) {
      console.error('[DashboardConfigStep] dataset attach error:', err)
      setDatasetError(err.message || 'Failed to parse dataset file.')
      toast.error(err.message || 'Failed to parse dataset.')
    } finally {
      setDatasetUploading(false)
      if (datasetFileInputRef.current) datasetFileInputRef.current.value = ''
    }
  }

  const handleRemoveAttachedDataset = () => {
    onChange({
      ...config,
      datasetId: undefined,
      datasetName: undefined,
      kpis: undefined,
      charts: undefined,
      filters: undefined,
      tableColumns: undefined,
    })
    toast.info('Attached dataset and native charts removed.')
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      void handleFileUpload(file)
    }
  }

  const handleRemoveArtifact = () => {
    if (currentSourceType === 'powerbi_pbix') {
      onChange({
        ...config,
        pbixArtifact: undefined,
      })
      toast.info('Power BI artifact removed.')
    } else if (currentSourceType === 'pdf') {
      onChange({
        ...config,
        pdfArtifact: undefined,
      })
      toast.info('PDF dashboard artifact removed.')
    }
  }

  const handleSavePowerBiUrl = () => {
    if (!powerBiUrlCheck || !powerBiUrlCheck.isValid) {
      toast.error(powerBiUrlCheck?.error || 'Invalid Power BI URL.')
      return
    }

    const embedCfg: PowerBiEmbedConfig = {
      reportUrl: powerBiUrl.trim(),
      embedMode: powerBiUrlCheck.embedMode,
      reportId: powerBiUrlCheck.reportId,
      requiresAuth,
      authInstructions: authInstructions.trim() || undefined,
    }

    onChange({
      ...config,
      version: 2,
      sourceType: 'powerbi_embed',
      powerBiEmbed: embedCfg,
    })
    toast.success('Power BI report configuration saved.')
  }

  // Active validation check
  const validationResult = useMemo(() => {
    return validateDashboardConfig(config)
  }, [config])

  return (
    <div className="space-y-8">
      {/* ── STEP B: SELECT DASHBOARD SOURCE ────────────────────────── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Select Dashboard Source</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose the architecture format powering this business dashboard solution.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-bold text-[#0F766E]">
              <BarChart2 className="h-3.5 w-3.5" /> First-Class Dashboard Type
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Option 1: Power BI .pbix Upload */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleSelectSourceType('powerbi_pbix')}
            className={`rounded-2xl border-2 p-5 cursor-pointer transition-all flex flex-col justify-between ${
              currentSourceType === 'powerbi_pbix'
                ? 'border-[#0F766E] bg-[#ECFDF5]/40 shadow-sm ring-1 ring-[#0F766E]'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                  <BarChart2 className="h-5 w-5" />
                </div>
                {currentSourceType === 'powerbi_pbix' && (
                  <CheckCircle2 className="h-5 w-5 text-[#0F766E]" />
                )}
              </div>
              <h4 className="text-sm font-bold text-[#0F172A]">Power BI Report (.pbix)</h4>
              <p className="text-2xs text-slate-500 mt-1.5 leading-relaxed">
                Upload native Power BI Desktop (.pbix) reports. Files are preserved in secure private storage with authorized download.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs">
              <span className="font-mono text-slate-400">Max 100 MB</span>
              <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                .pbix binary
              </span>
            </div>
          </div>

          {/* Option 2: PDF Dashboard */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleSelectSourceType('pdf')}
            className={`rounded-2xl border-2 p-5 cursor-pointer transition-all flex flex-col justify-between ${
              currentSourceType === 'pdf'
                ? 'border-[#0F766E] bg-[#ECFDF5]/40 shadow-sm ring-1 ring-[#0F766E]'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-xl bg-rose-50 p-2.5 text-rose-700">
                  <FileText className="h-5 w-5" />
                </div>
                {currentSourceType === 'pdf' && (
                  <CheckCircle2 className="h-5 w-5 text-[#0F766E]" />
                )}
              </div>
              <h4 className="text-sm font-bold text-[#0F172A]">PDF Dashboard (.pdf)</h4>
              <p className="text-2xs text-slate-500 mt-1.5 leading-relaxed">
                Upload an executive PDF dashboard or report export. Renders actual PDF pages with responsive zoom and navigation.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs">
              <span className="font-mono text-slate-400">Max 50 MB</span>
              <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                .pdf document
              </span>
            </div>
          </div>

          {/* Option 3: Published Power BI Report Connection */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleSelectSourceType('powerbi_embed')}
            className={`rounded-2xl border-2 p-5 cursor-pointer transition-all flex flex-col justify-between ${
              currentSourceType === 'powerbi_embed'
                ? 'border-[#0F766E] bg-[#ECFDF5]/40 shadow-sm ring-1 ring-[#0F766E]'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                  <Globe className="h-5 w-5" />
                </div>
                {currentSourceType === 'powerbi_embed' && (
                  <CheckCircle2 className="h-5 w-5 text-[#0F766E]" />
                )}
              </div>
              <h4 className="text-sm font-bold text-[#0F172A]">Power BI Service Embed</h4>
              <p className="text-2xs text-slate-500 mt-1.5 leading-relaxed">
                Connect a live interactive report hosted on Power BI Service. Preserves filters, drilldowns, and responsive layout.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs">
              <span className="font-mono text-slate-400">Live Service</span>
              <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                Interactive
              </span>
            </div>
          </div>

          {/* Option 4: Visual Analytics Builder (Preserved) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleSelectSourceType('visual_builder')}
            className={`rounded-2xl border-2 p-5 cursor-pointer transition-all flex flex-col justify-between ${
              currentSourceType === 'visual_builder'
                ? 'border-[#0F766E] bg-[#ECFDF5]/40 shadow-sm ring-1 ring-[#0F766E]'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-xl bg-teal-50 p-2.5 text-[#0F766E]">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                {currentSourceType === 'visual_builder' && (
                  <CheckCircle2 className="h-5 w-5 text-[#0F766E]" />
                )}
              </div>
              <h4 className="text-sm font-bold text-[#0F172A]">Visual Analytics Builder</h4>
              <p className="text-2xs text-slate-500 mt-1.5 leading-relaxed">
                Build no-code KPI metric cards and charts directly from an uploaded CSV dataset with custom column mappings.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs">
              <span className="font-mono text-slate-400">CSV Dataset</span>
              <span className="font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                No-Code Charts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP C: UPLOAD / CONFIGURE ACTIVE SOURCE ────────────────── */}

      {/* 1. POWER BI .PBIX UPLOAD */}
      {currentSourceType === 'powerbi_pbix' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-[#0F172A]">Upload Power BI Report (.pbix)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload your completed Microsoft Power BI (.pbix) report file.
              </p>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pbix,application/x-pbix,application/octet-stream"
              className="hidden"
              onChange={handleFileInputChange}
            />

            {!config.pbixArtifact ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-slate-200 bg-[#F8FAFC] p-8 text-center hover:border-[#0F766E]/40 hover:bg-[#ECFDF5]/10 cursor-pointer transition-all flex flex-col items-center justify-center space-y-3"
              >
                <div className="rounded-2xl bg-amber-50 p-4 text-amber-700">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">
                    Click to browse or drag & drop your Power BI report (.pbix)
                  </p>
                  <p className="text-2xs text-slate-400 mt-1">
                    Maximum file size: {(MAX_PBIX_SIZE_BYTES / (1024 * 1024)).toFixed(0)} MB. Only valid .pbix archives are accepted.
                  </p>
                </div>
                {uploading && (
                  <div className="w-full max-w-xs space-y-1.5 pt-2">
                    <div className="flex justify-between text-2xs text-slate-500 font-semibold">
                      <span>Validating and uploading artifact...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0F766E] transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                {uploadError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-amber-700">
                    <BarChart2 className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-800 font-mono">
                        {config.pbixArtifact.originalFileName}
                      </p>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-2xs font-bold text-emerald-700">
                        Valid .pbix
                      </span>
                    </div>
                    <p className="text-2xs text-slate-500 mt-0.5">
                      {(config.pbixArtifact.fileSize / (1024 * 1024)).toFixed(2)} MB • Uploaded {new Date(config.pbixArtifact.uploadedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCw className="h-3 w-3" /> Replace File
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveArtifact}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                </div>
              </div>
            )}

            {/* PBIX Inspection Status & Loading */}
            {inspectingPbix && (
              <div className="rounded-2xl border border-teal-200 bg-[#ECFDF5]/60 p-4 flex items-center gap-3 text-xs text-[#0F766E]">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>Inspecting Power BI archive structure, page layout, and visual telemetry...</span>
              </div>
            )}

            {pbixInspection && pbixInspection.is_valid_pbix && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Power BI Archive Inspection Passed
                    </span>
                  </div>
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-2xs font-mono font-semibold text-slate-700">
                    {pbixInspection.version || 'Power BI Desktop'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-2xs font-semibold text-slate-400 uppercase">Report Pages</p>
                    <p className="text-base font-bold text-slate-800 mt-0.5">{pbixInspection.page_count}</p>
                    {pbixInspection.pages.length > 0 && (
                      <p className="text-2xs text-slate-500 mt-1 truncate">
                        {pbixInspection.pages.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-2xs font-semibold text-slate-400 uppercase">Total Visuals</p>
                    <p className="text-base font-bold text-slate-800 mt-0.5">{pbixInspection.visual_count}</p>
                    <p className="text-2xs text-slate-500 mt-1">
                      {Object.keys(pbixInspection.visual_types).length} component types
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-2xs font-semibold text-slate-400 uppercase">Internal Storage</p>
                    <p className="text-xs font-bold text-amber-700 mt-1">Microsoft VertiPaq</p>
                    <p className="text-2xs text-slate-500 mt-1">Compiled binary model</p>
                  </div>
                </div>

                {Object.keys(pbixInspection.visual_types).length > 0 && (
                  <div className="text-2xs text-slate-600 flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="font-semibold text-slate-500">Detected visual components:</span>
                    {Object.entries(pbixInspection.visual_types).map(([vType, cnt]) => (
                      <span key={vType} className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-slate-700">
                        {vType}: {cnt}
                      </span>
                    ))}
                  </div>
                )}

                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-2xs text-amber-900 leading-relaxed">
                  <p className="font-bold mb-0.5">Interactivity Technical Notice:</p>
                  {pbixInspection.guidance_message}
                </div>
              </div>
            )}

            {/* Rendering Advice & Publishing Guidance */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600 flex items-start gap-3">
              <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-slate-800">Browser Interactivity Options:</p>
                <p className="leading-relaxed text-2xs">
                  Outside Power BI Service, desktop VertiPaq tabular queries cannot execute in the browser. You can either <strong>attach a source dataset (CSV or Excel)</strong> below for credential-free native charts, or <strong>connect your published Power BI Service report</strong>. In both cases, the original .pbix file remains safely downloadable.
                </p>
              </div>
            </div>
          </div>

          {/* ── STEP 2A: ATTACH SOURCE DATASET FOR NATIVE VIEW (CREDENTIAL-FREE) ── */}
          {config.pbixArtifact && (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#0F172A]">
                      Option A: Attach Source Dataset for Native View
                    </h3>
                    {config.datasetId ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-2xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Native Dashboard Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-2xs font-bold text-[#0F766E]">
                        Credential-Free
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload a CSV or Excel dataset (.csv, .xlsx, .xls) to render interactive KPI cards, charts, and summary tables directly inside Analytics Avenue without any Microsoft credentials.
                  </p>
                </div>

                {config.datasetId && (
                  <button
                    type="button"
                    onClick={handleRemoveAttachedDataset}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" /> Remove Dataset
                  </button>
                )}
              </div>

              {/* Hidden Dataset File Input */}
              <input
                ref={datasetFileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleDatasetAttach(file)
                }}
              />

              {config.datasetId ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-800">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-800 font-mono">
                          {config.datasetName || 'Attached dataset'}
                        </p>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-2xs font-bold text-emerald-800">
                          Auto-Profiled
                        </span>
                      </div>
                      <p className="text-2xs text-slate-500 mt-0.5">
                        {config.kpis?.length || 0} KPI cards • {config.charts?.length || 0} charts generated • Native interactivity active
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => datasetFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <RefreshCw className="h-3 w-3" /> Replace Dataset
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => datasetFileInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-slate-200 bg-[#F8FAFC] p-8 text-center hover:border-[#0F766E]/40 hover:bg-[#ECFDF5]/10 cursor-pointer transition-all flex flex-col items-center justify-center space-y-3"
                >
                  <div className="rounded-2xl bg-teal-50 p-4 text-[#0F766E]">
                    <FileSpreadsheet className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      Click to attach a CSV or Excel dataset (.csv, .xlsx, .xls)
                    </p>
                    <p className="text-2xs text-slate-400 mt-1">
                      Automatically profiles columns and generates KPI cards and charts (Max 20MB)
                    </p>
                  </div>
                  {datasetUploading && (
                    <div className="flex items-center gap-2 text-2xs font-bold text-[#0F766E]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Profiling dataset and generating native charts...</span>
                    </div>
                  )}
                  {datasetError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>{datasetError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2B: CONNECT PUBLISHED POWER BI REPORT ──────────────── */}
          {config.pbixArtifact && (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#0F172A]">
                      Connect Published Power BI Report
                    </h3>
                    {config.powerBiEmbed?.reportId ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-2xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Report Connected & Interactive
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-2xs font-bold text-amber-800">
                        <AlertCircle className="h-3 w-3 text-amber-600" /> Connection Optional (Download Only)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Link your Power BI Service report so users can interact with the live report directly inside Analytics Avenue.
                  </p>
                </div>

                {config.powerBiEmbed?.reportId && (
                  <button
                    type="button"
                    onClick={handleDisconnectPbix}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" /> Disconnect Report
                  </button>
                )}
              </div>

              {/* Quick URL Auto-Detection */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Quick Import: Paste Power BI Service Report Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://app.powerbi.com/groups/workspace-id/reports/report-id/..."
                    value={pbixQuickUrl}
                    onChange={(e) => handleQuickUrlChange(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-mono font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
                  />
                  <p className="text-2xs text-slate-400">
                    Pasting a Power BI URL automatically extracts your Workspace ID and Report ID below.
                  </p>
                </div>

                {/* Workspace ID & Discovery */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Power BI Workspace (Group) ID *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. 11111111-2222-3333-4444-555555555555"
                        value={pbixWorkspaceId}
                        onChange={(e) => setPbixWorkspaceId(e.target.value)}
                        className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleDiscoverPbixReports}
                        disabled={discoveringReports || !pbixWorkspaceId.trim()}
                        className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shrink-0"
                        title="Discover reports in this workspace via Microsoft API"
                      >
                        {discoveringReports ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          'Discover'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Report ID or Discovered Reports Picker */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Power BI Report ID *
                    </label>
                    {discoveredReports.length > 0 ? (
                      <select
                        value={pbixReportId}
                        onChange={(e) => setPbixReportId(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-[#0F766E] focus:outline-none"
                      >
                        <option value="">-- Select Discovered Report ({discoveredReports.length}) --</option>
                        {discoveredReports.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.id.slice(0, 8)}...)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g. 66666666-7777-8888-9999-000000000000"
                        value={pbixReportId}
                        onChange={(e) => setPbixReportId(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
                      />
                    )}
                  </div>
                </div>

                {/* Test & Save Actions */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestPbixConnection}
                    disabled={testingConnection || !pbixWorkspaceId.trim()}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all"
                  >
                    {testingConnection ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Test Connection
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyPbixConnection}
                    disabled={!pbixWorkspaceId.trim() || !pbixReportId.trim()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#0F766E] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] disabled:opacity-50 transition-all"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Apply Report Connection
                  </button>
                </div>

                {/* Connection Test Result Feedback */}
                {testResult && (
                  <div
                    className={`rounded-2xl border p-4 text-xs ${
                      testResult.success
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-rose-200 bg-rose-50 text-rose-800'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-bold">
                          {testResult.success ? 'Connection Verified' : 'Connection Notice'}
                        </p>
                        <p className="mt-0.5 text-2xs leading-relaxed">{testResult.message}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: LIVE PREVIEW SECTION ──────────────────────────── */}
          {config.pbixArtifact && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Project Detail Page Live Preview
                </h4>
                {config.powerBiEmbed?.reportId ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-2xs font-bold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> Interactive Power BI Canvas Active
                  </span>
                ) : (config.charts && config.charts.length > 0) || config.datasetId ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-2xs font-bold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> Native Interactive Canvas Active
                  </span>
                ) : null}
              </div>

              <DashboardViewer
                config={config}
                datasetRows={
                  rawDatasetRows.length > 0
                    ? rawDatasetRows
                    : (activeDatasetAnalysis?.allRows || [])
                }
                title={projectTitle || 'Untitled Dashboard'}
                description={projectDescription}
                isStaff={true}
              />
            </div>
          )}
        </div>
      )}

      {/* 2. PDF DASHBOARD UPLOAD */}
      {currentSourceType === 'pdf' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-[#0F172A]">Upload PDF Dashboard Report (.pdf)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload your exported PDF dashboard pages or analytics report.
              </p>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileInputChange}
            />

            {!config.pdfArtifact ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-slate-200 bg-[#F8FAFC] p-8 text-center hover:border-[#0F766E]/40 hover:bg-[#ECFDF5]/10 cursor-pointer transition-all flex flex-col items-center justify-center space-y-3"
              >
                <div className="rounded-2xl bg-rose-50 p-4 text-rose-700">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">
                    Click to browse or drag & drop your PDF dashboard (.pdf)
                  </p>
                  <p className="text-2xs text-slate-400 mt-1">
                    Maximum file size: {(MAX_PDF_DASHBOARD_SIZE_BYTES / (1024 * 1024)).toFixed(0)} MB. Valid PDF documents only.
                  </p>
                </div>
                {uploading && (
                  <div className="w-full max-w-xs space-y-1.5 pt-2">
                    <div className="flex justify-between text-2xs text-slate-500 font-semibold">
                      <span>Uploading PDF document...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0F766E] transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                {uploadError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-rose-700">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-800 font-mono">
                        {config.pdfArtifact.originalFileName}
                      </p>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-2xs font-bold text-emerald-700">
                        Valid PDF
                      </span>
                    </div>
                    <p className="text-2xs text-slate-500 mt-0.5">
                      {(config.pdfArtifact.fileSize / (1024 * 1024)).toFixed(2)} MB • Uploaded {new Date(config.pdfArtifact.uploadedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCw className="h-3 w-3" /> Replace PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveArtifact}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live PDF Viewer Preview */}
          {config.pdfArtifact && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Live Document Preview
              </h4>
              <PdfDashboardViewer
                artifact={config.pdfArtifact}
                title={projectTitle || 'Untitled Dashboard'}
                description={projectDescription}
              />
            </div>
          )}
        </div>
      )}

      {/* 3. POWER BI SERVICE EMBED */}
      {currentSourceType === 'powerbi_embed' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-[#0F172A]">Connect Published Power BI Report</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Embed an authorized Power BI report from your organization or a public report link.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Power BI Report URL or Embed Link *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://app.powerbi.com/view?r=eyJrIjoi... or https://app.powerbi.com/reportEmbed?reportId=..."
                    value={powerBiUrl}
                    onChange={(e) => setPowerBiUrl(e.target.value)}
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-mono font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSavePowerBiUrl}
                    className="rounded-2xl bg-[#0F766E] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] transition-all"
                  >
                    Apply URL
                  </button>
                </div>

                {powerBiUrl && powerBiUrlCheck && (
                  <div className="pt-2 text-xs">
                    {powerBiUrlCheck.isValid ? (
                      <div className="space-y-2">
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-800 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>
                            Valid Power BI endpoint ({powerBiUrlCheck.embedMode === 'publish_to_web' ? 'Publish-to-Web' : 'Power BI Service'}).
                          </span>
                        </div>
                        {powerBiUrlCheck.warning && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-amber-800 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <span>{powerBiUrlCheck.warning}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-rose-800 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                        <span>{powerBiUrlCheck.error}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dedicated Authentication Settings */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresAuth}
                    onChange={(e) => setRequiresAuth(e.target.checked)}
                    className="rounded text-[#0F766E] focus:ring-[#0F766E]"
                  />
                  Requires Corporate Microsoft 365 / Power BI Account Authentication
                </label>
                {requiresAuth && (
                  <input
                    type="text"
                    placeholder="e.g. Ensure you are signed in to your corporate Microsoft 365 tenant with Power BI Pro or Premium Per User license."
                    value={authInstructions}
                    onChange={(e) => setAuthInstructions(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Live Power BI Embed Preview */}
          {config.powerBiEmbed?.reportUrl && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Live Report Embed Preview
              </h4>
              <PowerBiReportViewer
                config={config.powerBiEmbed}
                title={projectTitle || 'Untitled Dashboard'}
                description={projectDescription}
              />
            </div>
          )}
        </div>
      )}

      {/* 4. VISUAL BUILDER (PRESERVED) */}
      {currentSourceType === 'visual_builder' && (
        <div className="space-y-6">
          {onDatasetAnalyzed && (
            <DatasetUploader
              onAnalyzed={onDatasetAnalyzed}
              currentAnalysis={activeDatasetAnalysis}
            />
          )}

          {activeDatasetAnalysis && onMappingChange && (
            <ColumnMapper
              templateColumns={[]}
              uploadedHeaders={activeDatasetAnalysis.headers}
              initialMapping={columnMapping}
              onMappingChange={(m) => onMappingChange(m)}
            />
          )}

          <DashboardConfigBuilder
            config={config}
            availableColumns={
              activeDatasetAnalysis?.headers ||
              (rawDatasetRows.length > 0 ? Object.keys(rawDatasetRows[0]) : [])
            }
            onChange={(newConfig) => {
              onChange({
                ...newConfig,
                sourceType: 'visual_builder',
              })
            }}
          />
        </div>
      )}
    </div>
  )
}
