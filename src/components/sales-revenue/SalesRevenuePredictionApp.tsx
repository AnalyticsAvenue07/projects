import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
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
  Sparkles,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import {
  SalesRevenueInferenceService,
  type CsvValidationClientResult,
  type InferenceResponse,
  type ModelInfoResponse,
  type PredictionRecord,
} from '@/services/salesRevenueInferenceService'
import { SAMPLE_SALES_REVENUE_CSV, SALES_REVENUE_FEATURES } from '@/services/demoData/salesRevenueProjectData'

export function SalesRevenuePredictionApp() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [modelInfo, setModelInfo] = useState<ModelInfoResponse | null>(null)
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'healthy' | 'unavailable'>('checking')
  const [serviceError, setServiceError] = useState<string | null>(null)

  // Selected file and client-side prevalidation
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<CsvValidationClientResult | null>(null)

  // Prediction execution
  const [predicting, setPredicting] = useState(false)
  const [predictionResponse, setPredictionResponse] = useState<InferenceResponse | null>(null)
  const [predictionError, setPredictionError] = useState<string | null>(null)

  // Results table search/filter
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // Initial health & model info load
  useEffect(() => {
    let active = true

    async function probeService() {
      try {
        const health = await SalesRevenueInferenceService.checkHealth()
        if (active) {
          setServiceStatus(health.model_loaded ? 'healthy' : 'unavailable')
        }
        const info = await SalesRevenueInferenceService.getModelInfo()
        if (active) {
          setModelInfo(info)
        }
      } catch (err: any) {
        if (active) {
          setServiceStatus('unavailable')
          setServiceError(err.message || 'Service unreachable')
        }
      }
    }

    void probeService()

    return () => {
      active = false
    }
  }, [])

  // Handle file selection
  const handleFileChange = async (file: File) => {
    setSelectedFile(file)
    setPredictionResponse(null)
    setPredictionError(null)
    setValidating(true)

    try {
      const result = await SalesRevenueInferenceService.preValidateCsv(file)
      setValidationResult(result)
      if (result.isValid) {
        toast.success(`Validated ${file.name}: ${result.rowCount} rows ready for inference`)
      } else {
        toast.error(`Validation failed: ${result.error}`)
      }
    } catch (e: any) {
      toast.error(`Error validating file: ${e.message}`)
    } finally {
      setValidating(false)
    }
  }

  // Load sample test CSV
  const handleLoadSampleCsv = () => {
    const blob = new Blob([SAMPLE_SALES_REVENUE_CSV], { type: 'text/csv' })
    const sampleFile = new File([blob], 'sales_revenue_sample_test.csv', { type: 'text/csv' })
    void handleFileChange(sampleFile)
  }

  // Submit for real inference
  const handleRunPrediction = async () => {
    if (!selectedFile || !validationResult?.isValid) return

    setPredicting(true)
    setPredictionError(null)

    try {
      const response = await SalesRevenueInferenceService.predictCsv(selectedFile)
      setPredictionResponse(response)
      toast.success(`Successfully computed predictions for ${response.prediction_count} rows!`)
    } catch (e: any) {
      setPredictionError(e.message || 'Prediction request failed.')
      toast.error(e.message || 'Inference error')
    } finally {
      setPredicting(false)
    }
  }

  // Trigger download of results CSV
  const handleDownloadResults = () => {
    if (!predictionResponse) return
    SalesRevenueInferenceService.downloadResults(
      predictionResponse.predictions,
      selectedFile?.name || 'sales_revenue_predictions.csv'
    )
    toast.success('Downloaded predictions with original input features')
  }

  // Filtered predictions table
  const filteredPredictions = useMemo(() => {
    if (!predictionResponse) return []
    if (!searchTerm.trim()) return predictionResponse.predictions

    const term = searchTerm.toLowerCase().trim()
    return predictionResponse.predictions.filter((p) => {
      const rowStr = JSON.stringify(p.row_data).toLowerCase()
      const predStr = String(p.predicted_revenue)
      const actualStr = p.actual_revenue !== null ? String(p.actual_revenue) : ''
      return rowStr.includes(term) || predStr.includes(term) || actualStr.includes(term)
    })
  }, [predictionResponse, searchTerm])

  const totalPages = Math.ceil(filteredPredictions.length / pageSize) || 1
  const displayedPredictions = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredPredictions.slice(start, start + pageSize)
  }, [filteredPredictions, currentPage])

  // Distribution chart data
  const distributionChartData = useMemo(() => {
    if (!predictionResponse || predictionResponse.predictions.length === 0) return []
    const preds = predictionResponse.predictions.map((p) => p.predicted_revenue)
    const min = Math.min(...preds)
    const max = Math.max(...preds)
    const binCount = 8
    const binSize = (max - min) / binCount || 1

    const bins = Array.from({ length: binCount }, (_, i) => {
      const binStart = min + i * binSize
      const binEnd = binStart + binSize
      const count = preds.filter((p) => p >= binStart && (i === binCount - 1 ? p <= binEnd : p < binEnd)).length
      return {
        range: `${(binStart / 1000).toFixed(0)}k - ${(binEnd / 1000).toFixed(0)}k`,
        count,
      }
    })
    return bins
  }, [predictionResponse])

  // Row comparison chart data (first 30 items for visual clarity)
  const comparisonChartData = useMemo(() => {
    if (!predictionResponse) return []
    return predictionResponse.predictions.slice(0, 30).map((p) => ({
      name: `Store #${p.row_index + 1}`,
      'Predicted Revenue': p.predicted_revenue,
      ...(p.actual_revenue !== null ? { 'Actual Revenue': p.actual_revenue } : {}),
    }))
  }, [predictionResponse])

  return (
    <div className="space-y-8">
      {/* 1. Header Banner & Model Status Card */}
      <div className="rounded-3xl border border-teal-200/90 bg-gradient-to-br from-teal-50/70 via-white to-emerald-50/60 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1 text-xs font-bold text-[#0F766E]">
                <Cpu className="h-3.5 w-3.5" />
                Real Python / scikit-learn Inference
              </span>

              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-2xs font-bold ${
                  serviceStatus === 'healthy'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : serviceStatus === 'checking'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    serviceStatus === 'healthy'
                      ? 'bg-emerald-600 animate-pulse'
                      : serviceStatus === 'checking'
                      ? 'bg-amber-600'
                      : 'bg-rose-600'
                  }`}
                />
                {serviceStatus === 'healthy'
                  ? 'Inference Engine Ready'
                  : serviceStatus === 'checking'
                  ? 'Probing Backend...'
                  : 'FastAPI Service Unavailable'}
              </span>

              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-2xs font-mono font-semibold text-slate-600">
                Port 8008
              </span>
            </div>

            <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
              Interactive Sales Revenue Forecasting Gateway
            </h2>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Upload a real retail store CSV containing the 15 required marketing and operational metrics. The
              authoritative trained Linear Regression artifact (<code>trained_model.joblib</code>) validates the schema,
              executes live mathematical inference, and produces real predicted monthly revenues.
            </p>
          </div>

          {/* Model Specs Card */}
          <div className="shrink-0 rounded-2xl border border-slate-200/80 bg-white p-4 text-xs space-y-2 shadow-2xs md:w-80">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-semibold">Trained Model</span>
              <span className="font-bold text-slate-800 font-mono">LinearRegression</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-semibold">Input Feature Count</span>
              <span className="font-bold text-slate-800">15 Features</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-semibold">Holdout Benchmark</span>
              <span className="font-bold text-emerald-700 font-mono">R² 0.930 | MAE 11.9k</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Target Column</span>
              <span className="font-bold text-slate-800 font-mono">monthly_revenue</span>
            </div>
          </div>
        </div>

        {/* 15 Feature Checklist Accordion / Chips */}
        <div className="mt-4 pt-4 border-t border-teal-100/80">
          <p className="text-2xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Authoritative Feature Schema (Exact 15 Variables Expected):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SALES_REVENUE_FEATURES.map((feat) => (
              <span
                key={feat}
                className="rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-2xs font-mono font-medium text-slate-700 shadow-3xs"
              >
                {feat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Backend Unreachable Alert Banner (if applicable) */}
      {serviceStatus === 'unavailable' && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-xs text-rose-900 shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-950">Inference Service Connection Required</p>
              <p className="text-rose-800 leading-relaxed">
                The Sales Revenue Python FastAPI inference backend is not currently running at{' '}
                <code>http://127.0.0.1:8008</code>. To start the real model serving daemon:
              </p>
              <div className="mt-2 rounded-xl bg-slate-900 p-3 font-mono text-xs text-emerald-400 select-all">
                py -3.10 backend/sales_revenue_service/run_service.py
              </div>
              <p className="text-2xs text-rose-700 pt-1">
                Once started, click the button below to re-test the connection. Real predictions are never simulated or
                mocked.
              </p>
              <button
                type="button"
                onClick={() => {
                  setServiceStatus('checking')
                  void SalesRevenueInferenceService.checkHealth()
                    .then((h) => setServiceStatus(h.model_loaded ? 'healthy' : 'unavailable'))
                    .catch(() => setServiceStatus('unavailable'))
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-800 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Re-check Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CSV Upload & Validation Card */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">Step 1: Upload or Select Store CSV Dataset</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a custom CSV file or test instantly with the verified benchmark holdout dataset.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLoadSampleCsv}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] px-4 py-2 text-xs font-bold text-[#0F766E] hover:bg-[#D1FAE5] transition-all shrink-0"
          >
            <Sparkles className="h-4 w-4" /> Load Sample Test CSV
          </button>
        </div>

        {/* Drag-and-Drop Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files?.[0]
            if (file) void handleFileChange(file)
          }}
          className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 hover:border-teal-500 bg-[#F8FAFC] hover:bg-teal-50/20 p-8 text-center transition-all group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFileChange(file)
            }}
            className="hidden"
          />

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 group-hover:border-teal-400 group-hover:text-teal-600 transition-colors shadow-2xs">
            {validating ? (
              <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
            ) : (
              <Upload className="h-7 w-7" />
            )}
          </div>

          <p className="mt-4 text-xs font-bold text-slate-800">
            {selectedFile ? selectedFile.name : 'Click to browse or drag and drop your store CSV here'}
          </p>
          <p className="mt-1 text-2xs text-slate-500">
            Comma-separated CSV with headers matching the 15 features (Max 10MB, up to 20,000 rows)
          </p>
        </div>

        {/* Client-Side Validation Results Panel */}
        {validationResult && (
          <div
            className={`rounded-2xl border p-5 space-y-4 text-xs transition-all ${
              validationResult.isValid
                ? 'border-emerald-200 bg-emerald-50/40 text-emerald-950'
                : 'border-rose-200 bg-rose-50/40 text-rose-950'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {validationResult.isValid ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold">
                    {validationResult.isValid
                      ? 'Dataset Validation Passed — Ready for Model Execution'
                      : 'Dataset Validation Incomplete'}
                  </h4>
                  <p className="text-2xs text-slate-600">
                    File: <span className="font-mono font-semibold">{selectedFile?.name}</span> (
                    {(validationResult.fileSize / 1024).toFixed(1)} KB, {validationResult.rowCount} rows)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white border px-3 py-1 text-2xs font-bold text-slate-700 shadow-3xs">
                  {validationResult.headers.length - validationResult.missingColumns.length} / 15 Features Matched
                </span>
                {validationResult.hasTargetColumn && (
                  <span className="rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-2xs font-bold text-emerald-800 shadow-3xs">
                    Target Column Present (Evaluation Enabled)
                  </span>
                )}
              </div>
            </div>

            {/* Missing columns alert */}
            {validationResult.missingColumns.length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-white p-3 text-2xs text-rose-800 space-y-1">
                <p className="font-bold">Missing Required Features ({validationResult.missingColumns.length}):</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {validationResult.missingColumns.map((col) => (
                    <span
                      key={col}
                      className="rounded-md bg-rose-100 text-rose-900 font-mono font-semibold px-2 py-0.5"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Extra columns note */}
            {validationResult.extraColumns.length > 0 && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 text-2xs text-sky-900 space-y-1">
                <p className="font-bold">
                  Additional Identifiers Detected ({validationResult.extraColumns.length}):
                </p>
                <p className="text-sky-800">
                  {validationResult.extraColumns.join(', ')} — Will be preserved intact in prediction results and
                  downloadable CSV.
                </p>
              </div>
            )}

            {/* Sample Preview Table */}
            {validationResult.sampleRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-2xs font-bold uppercase tracking-wider text-slate-500">
                  <span>First 5 Sample Rows Preview:</span>
                  <span>{validationResult.headers.length} Columns</span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white max-h-48">
                  <table className="w-full text-left text-2xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-mono">#</th>
                        {validationResult.headers.map((h) => (
                          <th key={h} className="px-3 py-2 font-mono whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {validationResult.sampleRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/80">
                          <td className="px-3 py-1.5 font-mono font-bold text-slate-400">{rIdx + 1}</td>
                          {validationResult.headers.map((h) => (
                            <td key={h} className="px-3 py-1.5 font-mono whitespace-nowrap">
                              {String(row[h] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <span className="text-2xs text-slate-500">
                {validationResult.isValid
                  ? 'All data validation checks satisfied. Click execute to stream features into the model.'
                  : 'Please adjust your CSV columns to include all 15 required features.'}
              </span>

              <button
                type="button"
                disabled={!validationResult.isValid || predicting}
                onClick={handleRunPrediction}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0F766E] px-8 py-3 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {predicting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Executing Model Inference...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white" />
                    Run Model Prediction ({validationResult.rowCount} Rows)
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Prediction Error Banner */}
        {predictionError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Inference Execution Error</p>
              <p className="mt-0.5 text-rose-800">{predictionError}</p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Prediction Results Dashboard */}
      {predictionResponse && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 text-2xs font-bold uppercase tracking-wider">
                Live Prediction Results
              </span>
              <h3 className="mt-1 text-xl font-black text-[#0F172A] tracking-tight">
                Model Output Telemetry & Forecast Dashboard
              </h3>
              <p className="text-xs text-slate-500">
                Generated from model: <span className="font-semibold text-slate-700">{predictionResponse.model_name}</span>{' '}
                (v{predictionResponse.model_version})
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadResults}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0F766E] px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] transition-all shrink-0"
            >
              <Download className="h-4 w-4" /> Download Predictions CSV
            </button>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Total Store Records</span>
              <p className="mt-1 text-2xl font-black text-[#0F172A]">{predictionResponse.input_row_count}</p>
              <span className="text-2xs text-emerald-600 font-semibold">100% Valid Predictions</span>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Mean Predicted Revenue</span>
              <p className="mt-1 text-2xl font-black text-[#0F766E]">
                ₹{predictionResponse.summary_statistics.mean.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <span className="text-2xs text-slate-500 font-semibold">
                Median: ₹{predictionResponse.summary_statistics.median.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Forecast Spread (Min - Max)</span>
              <p className="mt-1 text-lg font-black text-slate-800">
                ₹{(predictionResponse.summary_statistics.min / 1000).toFixed(0)}k — ₹
                {(predictionResponse.summary_statistics.max / 1000).toFixed(0)}k
              </p>
              <span className="text-2xs text-slate-500 font-semibold">
                Std Dev: ₹{predictionResponse.summary_statistics.std.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Ground-Truth Evaluation</span>
              {predictionResponse.evaluation_metrics ? (
                <>
                  <p className="mt-1 text-2xl font-black text-emerald-600">
                    R² {predictionResponse.evaluation_metrics.r2_score.toFixed(3)}
                  </p>
                  <span className="text-2xs text-slate-500 font-semibold">
                    MAE: ₹{predictionResponse.evaluation_metrics.mae.toLocaleString()}
                  </span>
                </>
              ) : (
                <>
                  <p className="mt-1 text-base font-bold text-slate-500">Unlabelled Data</p>
                  <span className="text-2xs text-slate-400">Target column not in CSV</span>
                </>
              )}
            </div>
          </div>

          {/* Visual Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Distribution Histogram */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#0F172A]">Predicted Revenue Distribution</h4>
                  <p className="text-2xs text-slate-500">Frequency of predicted store revenues across binned brackets</p>
                </div>
                <BarChart3 className="h-5 w-5 text-slate-400" />
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis
                      dataKey="range"
                      tick={{ fontSize: 10, fill: '#64748B' }}
                      angle={-25}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="count" name="Store Count" fill="#0F766E" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Row-level Trend / Comparison */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#0F172A]">
                    {predictionResponse.has_ground_truth ? 'Actual vs Predicted Revenue' : 'Row-Level Predicted Revenues'}
                  </h4>
                  <p className="text-2xs text-slate-500">
                    {predictionResponse.has_ground_truth
                      ? 'Comparison of genuine test target against saved linear model outputs'
                      : 'Sample store revenue forecasts in upload sequence'}
                  </p>
                </div>
                <LineChartIcon className="h-5 w-5 text-slate-400" />
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 9, fill: '#64748B' }}
                      angle={-35}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#64748B' }}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(v: any) => `₹${Number(v).toLocaleString()}`}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line
                      type="monotone"
                      dataKey="Predicted Revenue"
                      stroke="#0F766E"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    {predictionResponse.has_ground_truth && (
                      <Line
                        type="monotone"
                        dataKey="Actual Revenue"
                        stroke="#F59E0B"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ r: 3 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Prediction Results Table */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-[#0F172A]">Detailed Prediction Audit Table</h4>
                <p className="text-2xs text-slate-500">
                  Showing {displayedPredictions.length} of {filteredPredictions.length} matching rows
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by row data or revenue..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-slate-200/80 text-slate-600 font-bold">
                  <tr>
                    <th className="px-4 py-3 font-mono">Row #</th>
                    <th className="px-4 py-3 text-right">Predicted Revenue</th>
                    {predictionResponse.has_ground_truth && (
                      <>
                        <th className="px-4 py-3 text-right">Actual Revenue</th>
                        <th className="px-4 py-3 text-right">Residual (Diff)</th>
                      </>
                    )}
                    <th className="px-4 py-3">Footfall</th>
                    <th className="px-4 py-3">Digital Spend</th>
                    <th className="px-4 py-3">TV Spend</th>
                    <th className="px-4 py-3">Satisfaction</th>
                    <th className="px-4 py-3">Competitors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-2xs">
                  {displayedPredictions.map((p) => {
                    const row = p.row_data || {}
                    return (
                      <tr key={p.row_index} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-slate-400">{p.row_index + 1}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-[#0F766E] text-xs">
                          ₹{p.predicted_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        {predictionResponse.has_ground_truth && (
                          <>
                            <td className="px-4 py-2.5 text-right font-medium text-slate-600">
                              {p.actual_revenue !== null
                                ? `₹${p.actual_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                : '—'}
                            </td>
                            <td
                              className={`px-4 py-2.5 text-right font-bold ${
                                (p.difference ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {p.difference !== null
                                ? `${(p.difference >= 0 ? '+' : '')}₹${p.difference.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })}`
                                : '—'}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-2.5 text-slate-600">{row.store_footfall ?? '—'}</td>
                        <td className="px-4 py-2.5 text-slate-600">₹{Number(row.ad_spend_digital || 0).toFixed(0)}</td>
                        <td className="px-4 py-2.5 text-slate-600">₹{Number(row.ad_spend_tv || 0).toFixed(0)}</td>
                        <td className="px-4 py-2.5 text-slate-600">{row.customer_satisfaction_score ?? '—'}</td>
                        <td className="px-4 py-2.5 text-slate-600">{row.competitor_count_nearby ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
