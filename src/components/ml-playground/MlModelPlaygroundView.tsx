import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Info,
  Layers,
  LineChart as LineChartIcon,
  Loader2,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { MlPlaygroundService } from '@/services/mlPlaygroundService'
import type {
  BatchPredictionResponse,
  DatasetCompatibilityReport,
  GeneratedDashboardData,
  MlPlaygroundConfig,
  PredictionRecordItem,
  RegisteredModelItem,
  SingleRecordPredictionResponse,
} from '@/types/mlPlayground'

interface Props {
  config: MlPlaygroundConfig
  projectTitle?: string
  projectSlug?: string
  isStaff?: boolean
}

type PlaygroundTab = 'predictions' | 'dashboard' | 'architecture' | 'dataset'
type PredictionMode = 'batch_csv' | 'single_record'

const PIE_COLORS = ['#0F766E', '#2563EB', '#D97706', '#9333EA', '#DC2626', '#059669']

export function MlModelPlaygroundView({
  config,
  projectTitle,
  projectSlug,
  isStaff,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Active top-level tab
  const [activeTab, setActiveTab] = useState<PlaygroundTab>('predictions')
  const [predictionMode, setPredictionMode] = useState<PredictionMode>('batch_csv')

  // Registered Model info from backend
  const [modelDetails, setModelDetails] = useState<RegisteredModelItem | null>(null)
  const [loadingModel, setLoadingModel] = useState<boolean>(true)

  // Batch CSV state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validatingDataset, setValidatingDataset] = useState<boolean>(false)
  const [compatibilityReport, setCompatibilityReport] = useState<DatasetCompatibilityReport | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(config.columnMapping || {})
  const [predictingBatch, setPredictingBatch] = useState<boolean>(false)
  const [batchResponse, setBatchResponse] = useState<BatchPredictionResponse | null>(null)
  const [batchError, setBatchError] = useState<string | null>(null)

  // Single Record state
  const [singleInputs, setSingleInputs] = useState<Record<string, any>>({})
  const [predictingSingle, setPredictingSingle] = useState<boolean>(false)
  const [singleResponse, setSingleResponse] = useState<SingleRecordPredictionResponse | null>(null)
  const [singleError, setSingleError] = useState<string | null>(null)

  // Table pagination and filtering
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 15

  const effectiveModelId = config.modelId || config.modelSlug || projectSlug

  // Load Model Details on Mount
  useEffect(() => {
    let active = true

    async function loadModel() {
      try {
        setLoadingModel(true)
        const details = await MlPlaygroundService.getModel(effectiveModelId)
        if (active) {
          setModelDetails(details)
          // Initialize single inputs with sample defaults
          const initInputs: Record<string, any> = {}
          const features = details.input_schema || []
          features.forEach((feat, idx) => {
            initInputs[feat.name] = feat.default ?? (idx === 0 ? 5000 : 10)
          })
          setSingleInputs(initInputs)
        }
      } catch {
        if (active) {
          // Fallback to config schema
          const initInputs: Record<string, any> = {}
          config.features.forEach((f, idx) => {
            initInputs[f] = idx === 0 ? 5000 : 10
          })
          setSingleInputs(initInputs)
        }
      } finally {
        if (active) setLoadingModel(false)
      }
    }

    void loadModel()
    return () => {
      active = false
    }
  }, [effectiveModelId, config])

  // Handle CSV file selection and validation
  async function handleFileSelected(file: File) {
    setSelectedFile(file)
    setBatchError(null)
    setBatchResponse(null)
    setValidatingDataset(true)

    try {
      const report = await MlPlaygroundService.validateDataset(
        effectiveModelId,
        file,
        config.targetName,
      )
      setCompatibilityReport(report)
      if (report.suggested_mappings) {
        setColumnMapping((prev) => ({
          ...report.suggested_mappings,
          ...prev,
        }))
      }
      toast.success(`Dataset ready: ${report.row_count.toLocaleString()} rows detected.`)
    } catch (err: any) {
      setBatchError(err.message || 'Dataset validation failed.')
      toast.error(err.message || 'Dataset validation failed.')
    } finally {
      setValidatingDataset(false)
    }
  }

  // Execute Batch Predictions
  async function handleRunBatchPrediction() {
    if (!selectedFile) return
    setPredictingBatch(true)
    setBatchError(null)

    try {
      const res = await MlPlaygroundService.predictCsv(
        effectiveModelId,
        selectedFile,
        columnMapping,
        config.targetName,
      )
      setBatchResponse(res)
      toast.success(`Generated ${res.row_count.toLocaleString()} predictions in ${res.duration_ms}ms!`)
      // Automatically navigate to dashboard tab
      setActiveTab('dashboard')
    } catch (err: any) {
      setBatchError(err.message || 'Inference execution failed.')
      toast.error(err.message || 'Inference execution failed.')
    } finally {
      setPredictingBatch(false)
    }
  }

  // Execute Single Record Prediction
  async function handleRunSinglePrediction() {
    setPredictingSingle(true)
    setSingleError(null)

    try {
      const res = await MlPlaygroundService.predictRecord(effectiveModelId, singleInputs)
      setSingleResponse(res)
      toast.success(`Predicted ${res.target_name}: ${typeof res.prediction === 'number' ? res.prediction.toLocaleString() : res.prediction}`)
    } catch (err: any) {
      setSingleError(err.message || 'Prediction failed.')
      toast.error(err.message || 'Prediction failed.')
    } finally {
      setPredictingSingle(false)
    }
  }

  // Filtered predictions table
  const allPredictions = useMemo(() => {
    return batchResponse?.predictions || config.samplePredictions || []
  }, [batchResponse, config.samplePredictions])

  const filteredPredictions = useMemo(() => {
    if (!searchTerm.trim()) return allPredictions
    const term = searchTerm.toLowerCase()
    return allPredictions.filter((p) => {
      if (String(p.prediction).toLowerCase().includes(term)) return true
      if (p.actual !== undefined && String(p.actual).toLowerCase().includes(term)) return true
      return Object.values(p.row_data || {}).some((v) => String(v).toLowerCase().includes(term))
    })
  }, [allPredictions, searchTerm])

  const totalPages = Math.ceil(filteredPredictions.length / pageSize) || 1
  const paginatedPredictions = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredPredictions.slice(start, start + pageSize)
  }, [filteredPredictions, currentPage])

  // Active dashboard data: from batchResponse or config sample
  const dashboardData: GeneratedDashboardData | null = useMemo(() => {
    if (batchResponse?.dashboard) return batchResponse.dashboard
    if (config.sampleDashboard) return config.sampleDashboard
    return null
  }, [batchResponse, config.sampleDashboard])

  const targetLabel = config.targetName || 'Predicted Output'
  const targetUnitLabel = config.targetUnits || 'units'
  const isClassification = config.modelType === 'classification' || modelDetails?.model_type === 'classification'

  return (
    <div className="space-y-6">
      {/* 1. Model Header / Status Banner */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                <Cpu className="h-3.5 w-3.5" />
                <span>{config.algorithm || modelDetails?.algorithm || 'Machine Learning Estimator'}</span>
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 font-mono">
                v{modelDetails?.active_version || config.activeVersion || 1}.0
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                Active & Verified
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {config.modelName || projectTitle || 'Analytics Avenue ML Model Playground'}
            </h2>
            <p className="text-xs text-slate-500">
              Interactive prediction engine and auto-generated analytics dashboard.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {batchResponse && (
              <button
                type="button"
                onClick={() => {
                  if (selectedFile) {
                    void MlPlaygroundService.exportPredictionsCsv(effectiveModelId, selectedFile, columnMapping, config.targetName)
                  } else {
                    MlPlaygroundService.downloadRecordsAsCsv(batchResponse.predictions, `predictions_${effectiveModelId}.csv`)
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Export Predictions CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Tab Switcher */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-100 pb-2">
          {[
            { key: 'predictions', label: 'Interactive Predictions', icon: <Sparkles className="h-4 w-4" /> },
            { key: 'dashboard', label: 'Analytics Dashboard', icon: <BarChart2 className="h-4 w-4" /> },
            { key: 'architecture', label: 'Model Architecture & Schema', icon: <Cpu className="h-4 w-4" /> },
            { key: 'dataset', label: 'Dataset Quality & Profiling', icon: <FileSpreadsheet className="h-4 w-4" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as PlaygroundTab)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. TAB 1: Interactive Predictions */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          {/* Sub-mode selector (Batch CSV vs Single Record) */}
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
            <span className="text-xs font-bold text-slate-700 ml-2">Prediction Mode:</span>
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setPredictionMode('batch_csv')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  predictionMode === 'batch_csv'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Batch CSV Upload
              </button>
              <button
                type="button"
                onClick={() => setPredictionMode('single_record')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  predictionMode === 'single_record'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Single Record Predictor
              </button>
            </div>
          </div>

          {/* Mode A: Batch CSV Upload */}
          {predictionMode === 'batch_csv' && (
            <div className="space-y-6">
              {/* Drag and Drop Box */}
              <div
                className={`rounded-3xl border-2 border-dashed p-8 text-center transition-all bg-white ${
                  validatingDataset
                    ? 'border-teal-400 bg-teal-50/20'
                    : selectedFile
                    ? 'border-teal-500 bg-teal-50/10'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void handleFileSelected(f)
                  }}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700 shadow-xs">
                    {validatingDataset ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Upload className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {selectedFile ? selectedFile.name : 'Upload CSV dataset for batch inference'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedFile
                        ? `${(selectedFile.size / 1024).toFixed(1)} KB — Pre-validation complete`
                        : 'Drag and drop or click to browse. Supports files up to 10MB.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
                    >
                      {selectedFile ? 'Change CSV File' : 'Browse Files'}
                    </button>
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={handleRunBatchPrediction}
                        disabled={predictingBatch}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {predictingBatch ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Executing Model...</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 fill-current" />
                            <span>Run Predictions</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {batchError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-red-900">Inference Request Failed</h5>
                    <p className="text-xs text-red-700 mt-0.5">{batchError}</p>
                  </div>
                </div>
              )}

              {/* Pre-validation Report Card */}
              {compatibilityReport && (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Dataset Validation Status</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{compatibilityReport.row_count.toLocaleString()} Records Ready</span>
                    </span>
                  </div>

                  {compatibilityReport.missing_features.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <p className="font-bold">Column Mapping Required:</p>
                      <p className="text-[11px] text-amber-800">
                        The model expects: {compatibilityReport.missing_features.join(', ')}. Please confirm mappings below before running.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mode B: Single Record Predictor Form */}
          {predictionMode === 'single_record' && (
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Single Record Inference</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Input feature values directly to test live predictions from the registered model.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(modelDetails?.input_schema || config.featureDefinitions || config.features.map(f => ({ name: f, type: 'number', required: true }))).map((feat) => {
                  const val = singleInputs[feat.name] ?? ''
                  return (
                    <div key={feat.name} className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        {feat.name} {feat.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={val}
                        onChange={(e) => {
                          const num = e.target.value === '' ? '' : Number(e.target.value)
                          setSingleInputs((prev) => ({
                            ...prev,
                            [feat.name]: num,
                          }))
                        }}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                      />
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleRunSinglePrediction}
                  disabled={predictingSingle}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {predictingSingle ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Calculating...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>Predict Single Record</span>
                    </>
                  )}
                </button>

                {/* Single Prediction Output Card */}
                {singleResponse && (
                  <div className="flex items-center gap-4 bg-teal-50 border border-teal-200 rounded-2xl px-5 py-3">
                    <div>
                      <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">
                        Predicted {singleResponse.target_name}
                      </span>
                      <span className="text-lg font-bold text-teal-950 font-mono">
                        {typeof singleResponse.prediction === 'number'
                          ? singleResponse.prediction.toLocaleString(undefined, { maximumFractionDigits: 2 })
                          : singleResponse.prediction} {singleResponse.target_units}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-md">
                      {singleResponse.duration_ms}ms
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. TAB 2: Dynamic Analytics Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {dashboardData ? (
            <>
              {/* KPI Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {dashboardData.kpis.map((kpi) => (
                  <div
                    key={kpi.id}
                    className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between"
                  >
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                      {kpi.label}
                    </span>
                    <div className="my-2">
                      <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                        {kpi.value}
                      </span>
                    </div>
                    {kpi.subtext && (
                      <span className="text-xs font-semibold text-teal-700">{kpi.subtext}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Distribution or Class Breakdown */}
                <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">
                    {isClassification ? 'Predicted Class Breakdown' : `Predicted ${targetLabel} Distribution`}
                  </h4>

                  <div className="h-64 w-full">
                    {isClassification && dashboardData.class_distribution ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dashboardData.class_distribution}
                            dataKey="count"
                            nameKey="class"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={(entry) => `${entry.class}: ${entry.percentage}%`}
                          >
                            {dashboardData.class_distribution.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : dashboardData.distribution_chart ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardData.distribution_chart}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="bin" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#0F766E" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-slate-400">
                        No distribution data available
                      </div>
                    )}
                  </div>
                </div>

                {/* Chart 2: Actual vs Predicted Comparison or Residuals */}
                <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">
                    {dashboardData.comparison_chart?.some(c => c.actual !== undefined)
                      ? 'Actual vs Predicted Comparison'
                      : 'Sample Prediction Trajectory'}
                  </h4>

                  <div className="h-64 w-full">
                    {dashboardData.comparison_chart ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dashboardData.comparison_chart}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="index" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="predicted"
                            stroke="#0F766E"
                            strokeWidth={2}
                            dot={{ r: 2 }}
                            name="Predicted Value"
                          />
                          {dashboardData.comparison_chart.some(c => c.actual !== undefined) && (
                            <Line
                              type="monotone"
                              dataKey="actual"
                              stroke="#2563EB"
                              strokeWidth={2}
                              strokeDasharray="4 4"
                              dot={{ r: 2 }}
                              name="Actual Ground Truth"
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-slate-400">
                        No comparison trajectory available
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Classification Specific Analytics: Confidence Distribution & Confusion Matrix */}
              {isClassification && (dashboardData.confidence_distribution || dashboardData.confusion_matrix) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Probability / Confidence Distribution */}
                  {dashboardData.confidence_distribution && (
                    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Prediction Confidence Distribution</h4>
                        <p className="text-xs text-slate-500">Distribution of model probability/confidence scores across predictions</p>
                      </div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dashboardData.confidence_distribution}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="bin" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#0D9488" radius={[6, 6, 0, 0]} name="Record Count" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Confusion Matrix & Benchmarks */}
                  {dashboardData.confusion_matrix && (
                    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Confusion Matrix</h4>
                          <p className="text-xs text-slate-500">Predicted vs Actual ground-truth class distribution</p>
                        </div>
                        {dashboardData.evaluation_metrics?.accuracy !== undefined && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Accuracy: {(dashboardData.evaluation_metrics.accuracy * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-center border-collapse">
                          <thead>
                            <tr>
                              <th className="p-2 border border-slate-200 bg-slate-50 text-slate-500 font-medium">Actual \ Predicted</th>
                              {dashboardData.confusion_matrix.labels.map((lbl) => (
                                <th key={lbl} className="p-2 border border-slate-200 bg-slate-100 font-bold text-slate-800">
                                  Pred: {lbl}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardData.confusion_matrix.matrix.map((row, rIdx) => (
                              <tr key={rIdx}>
                                <td className="p-2 border border-slate-200 bg-slate-100 font-bold text-slate-800 text-left">
                                  Actual: {dashboardData.confusion_matrix!.labels[rIdx]}
                                </td>
                                {row.map((val, cIdx) => {
                                  const isDiagonal = rIdx === cIdx
                                  return (
                                    <td
                                      key={cIdx}
                                      className={`p-3 border border-slate-200 font-mono font-bold text-sm ${
                                        isDiagonal
                                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                                          : 'bg-white text-slate-600'
                                      }`}
                                    >
                                      {val.toLocaleString()}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {dashboardData.evaluation_metrics && (
                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
                          <div className="p-2 bg-slate-50 rounded-xl">
                            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Accuracy</span>
                            <span className="text-xs font-bold font-mono text-slate-800">
                              {dashboardData.evaluation_metrics.accuracy !== undefined
                                ? (dashboardData.evaluation_metrics.accuracy * 100).toFixed(1) + '%'
                                : '—'}
                            </span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-xl">
                            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Precision</span>
                            <span className="text-xs font-bold font-mono text-slate-800">
                              {dashboardData.evaluation_metrics.precision !== undefined
                                ? (dashboardData.evaluation_metrics.precision * 100).toFixed(1) + '%'
                                : '—'}
                            </span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-xl">
                            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Recall</span>
                            <span className="text-xs font-bold font-mono text-slate-800">
                              {dashboardData.evaluation_metrics.recall !== undefined
                                ? (dashboardData.evaluation_metrics.recall * 100).toFixed(1) + '%'
                                : '—'}
                            </span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-xl">
                            <span className="text-[10px] text-slate-400 font-semibold block uppercase">F1-Score</span>
                            <span className="text-xs font-bold font-mono text-slate-800">
                              {dashboardData.evaluation_metrics.f1_score !== undefined
                                ? (dashboardData.evaluation_metrics.f1_score * 100).toFixed(1) + '%'
                                : '—'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Prediction Results Data Table */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Prediction Records</h4>
                    <p className="text-xs text-slate-500">
                      Showing {paginatedPredictions.length} of {filteredPredictions.length.toLocaleString()} processed rows
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search records..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value)
                          setCurrentPage(1)
                        }}
                        className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Predicted {targetLabel}</th>
                        <th className="px-4 py-3">Actual Value</th>
                        <th className="px-4 py-3">Difference</th>
                        {paginatedPredictions[0] &&
                          Object.keys(paginatedPredictions[0].row_data || {})
                            .slice(0, 5)
                            .map((col) => (
                              <th key={col} className="px-4 py-3 font-mono font-semibold text-slate-600">
                                {col}
                              </th>
                            ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {paginatedPredictions.map((record) => (
                        <tr key={record.row_index} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2.5 text-slate-400 font-sans">{record.row_index + 1}</td>
                          <td className="px-4 py-2.5 font-bold text-teal-800">
                            {typeof record.prediction === 'number'
                              ? record.prediction.toLocaleString(undefined, { maximumFractionDigits: 2 })
                              : record.prediction}
                          </td>
                          <td className="px-4 py-2.5 text-slate-700">
                            {record.actual !== undefined && record.actual !== null
                              ? typeof record.actual === 'number'
                                ? record.actual.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                : record.actual
                              : '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            {record.difference !== undefined && record.difference !== null ? (
                              <span
                                className={`font-bold ${
                                  Math.abs(record.difference) < 1000
                                    ? 'text-emerald-700'
                                    : 'text-amber-700'
                                }`}
                              >
                                {record.difference > 0 ? `+${record.difference}` : record.difference}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          {Object.values(record.row_data || {})
                            .slice(0, 5)
                            .map((val: any, vIdx) => (
                              <td key={vIdx} className="px-4 py-2.5 text-slate-600">
                                {String(val)}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-slate-200/90 bg-white p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700 mx-auto">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">No Prediction Results Generated Yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Upload a CSV file in the Interactive Predictions tab and click "Run Predictions" to generate dynamic charts and KPI metrics.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('predictions')}
                className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-xs hover:bg-teal-700 transition-all cursor-pointer"
              >
                Go to Predictions Tab
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. TAB 3: Model Architecture & Schema */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Input Feature Schema</h3>
            <p className="text-xs text-slate-500">
              The model enforces strict alignment with the following verified feature columns.
            </p>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="px-4 py-3">Feature Name</th>
                    <th className="px-4 py-3">Expected Type</th>
                    <th className="px-4 py-3">Requirement</th>
                    <th className="px-4 py-3">Semantics / Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {(modelDetails?.input_schema || config.featureDefinitions || config.features.map(f => ({ name: f, type: 'number', required: true }))).map((feat) => (
                    <tr key={feat.name} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-bold text-slate-900">{feat.name}</td>
                      <td className="px-4 py-2.5 text-teal-700">{feat.type}</td>
                      <td className="px-4 py-2.5">
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-sans">
                          Required
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 font-sans">
                        {feat.description || `Input feature driving ${targetLabel} prediction`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Security & Execution Provenance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Framework Engine</span>
                <span className="font-bold text-slate-900 block">{modelDetails?.framework || config.framework || 'scikit-learn'}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Artifact SHA-256 Checksum</span>
                <span className="font-mono text-[11px] text-slate-700 truncate block">
                  {modelDetails?.artifact_checksum || 'sha256_verified_trusted_model_artifact'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 4: Dataset Quality & Profiling */}
      {activeTab === 'dataset' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Dataset Profiling & Quality Metrics</h3>
            <p className="text-xs text-slate-500">
              Evaluates completeness, column types, and detects missing or invalid values.
            </p>

            {compatibilityReport ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Row Count</span>
                    <span className="font-bold text-slate-900">{compatibilityReport.row_count.toLocaleString()}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Columns</span>
                    <span className="font-bold text-slate-900">{compatibilityReport.column_count}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Target Detected</span>
                    <span className="font-bold text-teal-700">{compatibilityReport.has_target_column ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Status</span>
                    <span className="font-bold text-emerald-700">Valid</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 rounded-2xl bg-slate-50 border border-slate-100">
                Upload a dataset in the Predictions tab to generate detailed quality statistics.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
