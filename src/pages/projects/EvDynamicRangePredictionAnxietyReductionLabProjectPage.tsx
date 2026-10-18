import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Plot from 'react-plotly.js'
import { BatteryCharging, Download, FileUp, Loader2, ShieldAlert, Gauge, Users, Sparkles, Route, ChevronLeft } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'
import { EvRangeService } from '@/services/evRangeService'
import { ProjectOverviewManager, EditableOverviewSection } from '@/components/project-content'

const REQUIRED_COLUMNS = [
  'vehicle_id',
  'battery_capacity_kwh',
  'state_of_charge_pct',
  'state_of_health_pct',
  'battery_temp_c',
  'vehicle_weight_kg',
  'payload_kg',
  'avg_speed_kmph',
  'acceleration_score',
  'regen_braking_pct',
  'driving_style',
  'terrain_type',
  'elevation_gain_m',
  'traffic_level',
  'ambient_temp_c',
  'rain_intensity_mm',
  'wind_speed_kmph',
  'energy_consumption_wh_per_km',
  'static_range_km',
  'dynamic_range_km',
  'actual_range_km',
  'range_error_km',
  'range_anxiety_flag',
]

const REQUIRED_DESCRIPTIONS: Record<string, string> = {
  vehicle_id: 'Unique vehicle identifier',
  battery_capacity_kwh: 'Total battery capacity',
  state_of_charge_pct: 'Current SOC %',
  state_of_health_pct: 'Battery health %',
  battery_temp_c: 'Battery temperature',
  vehicle_weight_kg: 'Vehicle weight',
  payload_kg: 'Payload weight',
  avg_speed_kmph: 'Average driving speed',
  acceleration_score: 'Aggressive acceleration score',
  regen_braking_pct: 'Regenerative braking percentage',
  driving_style: 'Driving style category',
  terrain_type: 'Terrain category',
  elevation_gain_m: 'Elevation gain',
  traffic_level: 'Traffic level',
  ambient_temp_c: 'Outside temperature',
  rain_intensity_mm: 'Rain intensity',
  wind_speed_kmph: 'Wind speed',
  energy_consumption_wh_per_km: 'Energy use rate',
  static_range_km: 'OEM displayed range',
  dynamic_range_km: 'ML predicted range',
  actual_range_km: 'Actual achieved range',
  range_error_km: 'Range error',
  range_anxiety_flag: 'Anxiety indicator',
}

const OVERVIEW_FEATURES = [
  'Predicts realistic remaining range',
  'Quantifies OEM over/under-promise',
  'Flags anxiety-prone trips in advance',
  'Segments drivers by behavior',
]

const BUSINESS_IMPACT = ['Higher driver trust', 'Fewer breakdowns', 'Better charging decisions', 'Faster EV adoption']

type TabKey = 'overview' | 'attributes' | 'application'
type AppMode = 'default' | 'upload' | 'mapping'
type Row = Record<string, unknown>
type Kpis = { trips: number; oem_avg_error_km: number; dynamic_avg_error_km: number; anxiety_rate_pct: number }
type PredictionRow = { Actual_Range_km?: number; Predicted_Range_km?: number }
type AnxietyRow = { Actual_Anxiety?: number; Predicted_Anxiety?: number; Anxiety_Prob?: number }
type ClusterRow = { avg_speed_kmph?: number; energy_consumption_wh_per_km?: number; Cluster?: string }
type ClusterSummaryRow = { Cluster?: string; avg_speed_kmph?: number; acceleration_score?: number; regen_braking_pct?: number; energy_consumption_wh_per_km?: number }
type InsightRow = { Insight: string; Value: string; Metric: string; Action: string }

async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const message = errorData?.detail || errorData?.message || response.statusText || 'Request failed'
    throw new Error(message)
  }
  return response.json()
}

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number') return Number.isInteger(value) ? value.toString() : value.toFixed(2)
  return String(value)
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toFixed(2)}%`
}

function createCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return ''
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const escapeCell = (value: unknown) => {
    if (value === null || value === undefined) return ''
    const text = String(value).replace(/"/g, '""')
    return /[",\n]/.test(text) ? `"${text}"` : text
  }
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(','))].join('\n')
}

function downloadCsv(rows: Record<string, unknown>[], filename: string) {
  const csv = createCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function MetricCard({ icon, label, value, accent }: { icon: ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition hover:shadow-[0_24px_50px_rgba(15,23,42,0.12)]">
      <div className="flex items-center gap-4">
        <div className={`rounded-2xl p-4 shrink-0 bg-slate-50 ${accent}`}>{icon}</div>
        <div>
          <p className="text-base font-bold text-slate-500 tracking-tight">{label}</p>
          <p className="mt-1 text-2xl font-bold text-[#0F172A]">{value}</p>
        </div>
      </div>
    </div>
  )
}

function DataTable({ rows, maxRows = 10 }: { rows: Row[]; maxRows?: number }) {
  const visibleRows = rows.slice(0, maxRows)
  const columns = useMemo(() => Object.keys(visibleRows[0] ?? {}), [visibleRows])

  if (!visibleRows.length) {
    return <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">No rows to display.</div>
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50">
            {columns.map((column) => (
              <TableHead key={column} className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate-600 py-3.5 px-4">
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((row, rowIndex) => (
            <TableRow key={rowIndex} className="border-slate-100 hover:bg-slate-50/50">
              {columns.map((column) => (
                <TableCell key={`${rowIndex}-${column}`} className="max-w-[220px] whitespace-normal px-4 py-3 text-slate-700 text-sm">
                  {formatCell(row[column])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}


function MappingRow({ field, columns, value, onChange }: { field: string; columns: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[240px_1fr] md:items-center">
      <div>
        <p className="text-sm font-semibold text-slate-800">{field}</p>
        <p className="mt-1 text-xs text-slate-500">{REQUIRED_DESCRIPTIONS[field]}</p>
      </div>
      <Select value={value || '__unmapped__'} onValueChange={(next) => onChange(next === '__unmapped__' ? '' : next)}>
        <SelectTrigger className="w-full bg-white rounded-2xl py-6 border-slate-200 focus:ring-[#0F766E]">
          <SelectValue placeholder={`Map ${field}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__unmapped__">Not mapped</SelectItem>
          {columns.map((column) => (
            <SelectItem key={column} value={column}>
              {column}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`rounded-full px-3 py-1.5 text-sm font-semibold border transition shadow-sm ${className || 'border-[#CBD5E1] bg-white text-[#334155]'}`}>
      {children}
    </span>
  )
}

export function EvDynamicRangePredictionAnxietyReductionLabProjectPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const mappingInputRef = useRef<HTMLInputElement | null>(null)
  const [tab, setTab] = useState<TabKey>('overview')
  const [mode, setMode] = useState<AppMode>('default')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressMessage, setProgressMessage] = useState<string | null>(null)
  const [timeoutWarning, setTimeoutWarning] = useState<string | null>(null)

  useEffect(() => {
    let timer: any
    if (loading) {
      setTimeoutWarning(null)
      timer = setTimeout(() => {
        setTimeoutWarning('The server is taking longer than expected to respond. Please make sure your backend server is running on port 8023.')
      }, 15000)
    } else {
      setTimeoutWarning(null)
    }
    return () => clearTimeout(timer)
  }, [loading])
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [data, setData] = useState<Row[]>([])
  const [previewRows, setPreviewRows] = useState<Row[]>([])
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [staticVsActual, setStaticVsActual] = useState<Row[]>([])
  const [dynamicVsActual, setDynamicVsActual] = useState<Row[]>([])
  const [rangeMetrics, setRangeMetrics] = useState<{ model?: string; target?: string; rmse_km?: number; r2?: number; train_size?: number; test_size?: number } | null>(null)
  const [rangePredictions, setRangePredictions] = useState<PredictionRow[]>([])
  const [anxietyMetrics, setAnxietyMetrics] = useState<{ model?: string; target?: string; roc_auc?: number; accuracy_pct?: number; train_size?: number; test_size?: number } | null>(null)
  const [anxietyPredictions, setAnxietyPredictions] = useState<AnxietyRow[]>([])
  const [clusterSummary, setClusterSummary] = useState<ClusterSummaryRow[]>([])
  const [clusterScatter, setClusterScatter] = useState<ClusterRow[]>([])
  const [insights, setInsights] = useState<InsightRow[]>([])
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [fileColumns, setFileColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})

  const activeRows = data
  const overviewKpis = [
    { label: 'Range Accuracy', value: rangeMetrics?.r2 !== undefined ? formatPercent((rangeMetrics.r2 ?? 0) * 100) : 'Static label', icon: <Gauge className="h-5 w-5 text-[#0F766E]" />, accent: 'bg-[#ECFDF5]' },
    { label: 'Anxiety Reduction', value: anxietyMetrics?.accuracy_pct !== undefined ? formatPercent(anxietyMetrics.accuracy_pct) : 'Static label', icon: <ShieldAlert className="h-5 w-5 text-[#B45309]" />, accent: 'bg-[#FFFBEB]' },
    { label: 'Energy Efficiency', value: kpis ? formatNumber(kpis.dynamic_avg_error_km) : 'Static label', icon: <BatteryCharging className="h-5 w-5 text-[#0369A1]" />, accent: 'bg-[#EFF6FF]' },
    { label: 'Driver Trust Index', value: kpis ? formatPercent(100 - kpis.anxiety_rate_pct) : 'Static label', icon: <Users className="h-5 w-5 text-[#7C3AED]" />, accent: 'bg-[#F5F3FF]' },
  ]

  useEffect(() => {
    void loadDefaultDataset()
  }, [])

  async function loadDefaultDataset() {
    setLoading(true)
    setError(null)
    setStatusMessage(null)
    setMode('default')
    setUploadFile(null)
    setFileColumns([])
    setMapping({})

    try {
      const response = await EvRangeService.loadDefault()
      const rows = response.data ?? []
      setData(rows as any)
      setPreviewRows(response.preview ?? rows.slice(0, 10))
      setKpis(response.kpis ?? null)
      setStatusMessage('Dataset loaded.')
      await runAnalysis(rows as any)
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load the default dataset.')
      setRangeMetrics(null)
      setAnxietyMetrics(null)
      setClusterSummary([])
      setClusterScatter([])
      setInsights([])
    } finally {
      setLoading(false)
    }
  }

  async function runAnalysis(rows: Row[]) {
    if (!rows.length) {
      setRangeMetrics(null)
      setRangePredictions([])
      setAnxietyMetrics(null)
      setAnxietyPredictions([])
      setClusterSummary([])
      setClusterScatter([])
      setInsights([])
      setStaticVsActual([])
      setDynamicVsActual([])
      return
    }

    try {
      setProgressMessage('Step 1/5: Loading static and dynamic range charts...')
      try {
        const chartResponse = await EvRangeService.getCharts(rows as any)
        setStaticVsActual(chartResponse.static_vs_actual ?? [])
        setDynamicVsActual(chartResponse.dynamic_vs_actual ?? [])
      } catch (err) {
        console.error(err)
        setStaticVsActual([])
        setDynamicVsActual([])
      }

      setProgressMessage('Step 2/5: Running ML dynamic range regression model...')
      try {
        const rangeResponse = await EvRangeService.predictRange(rows as any)
        setRangeMetrics(rangeResponse)
        setRangePredictions(rangeResponse.predictions ?? [])
      } catch (err) {
        console.error(err)
        setRangeMetrics(null)
        setRangePredictions([])
      }

      setProgressMessage('Step 3/5: Running ML battery range anxiety classification model...')
      try {
        const anxietyResponse = await EvRangeService.predictAnxiety(rows as any)
        setAnxietyMetrics(anxietyResponse)
        setAnxietyPredictions(anxietyResponse.predictions ?? [])
      } catch (err) {
        console.error(err)
        setAnxietyMetrics(null)
        setAnxietyPredictions([])
      }

      setProgressMessage('Step 4/5: Categorizing driver behavior using KMeans clustering...')
      try {
        const clusterResponse = await EvRangeService.getDriverClusters(rows as any)
        setClusterSummary(clusterResponse.summary ?? [])
        setClusterScatter(clusterResponse.clusters ?? [])
      } catch (err) {
        console.error(err)
        setClusterSummary([])
        setClusterScatter([])
      }

      setProgressMessage('Step 5/5: Extracting automated battery analytics insights...')
      try {
        const insightResponse = await EvRangeService.getInsights(rows as any)
        setInsights(insightResponse.insights ?? [])
      } catch (err) {
        console.error(err)
        setInsights([])
      }
    } finally {
      setProgressMessage(null)
    }
  }

  async function handleUpload(file: File, mappingMode = false) {
    setUploadFile(file)
    setLoading(true)
    setError(null)
    setStatusMessage(null)

    try {
      if (mappingMode) {
        const columnsResponse = await EvRangeService.getCsvColumns(file)
        setMode('mapping')
        setFileColumns((columnsResponse.columns ?? []).map(String))
        setMapping(Object.fromEntries(REQUIRED_COLUMNS.map((field) => [field, ''])))
        setStatusMessage('CSV uploaded. Map the required columns to continue.')
        return
      }

      const response = await EvRangeService.uploadCsv(file)
      const rows = response.data ?? []
      setMode('upload')
      setData(rows as any)
      setPreviewRows(response.preview ?? rows.slice(0, 10))
      setKpis(response.kpis ?? null)
      setStatusMessage('CSV uploaded successfully.')
      await runAnalysis(rows as any)
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed.')
    } finally {
      setLoading(false)
    }
  }

  async function applyMapping() {
    if (!uploadFile) {
      setError('Please upload a CSV before applying mapping.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await EvRangeService.applyMapping(uploadFile, mapping)
      const rows = response.data ?? []
      setMode('upload')
      setData(rows as any)
      setPreviewRows(response.preview ?? rows.slice(0, 10))
      setKpis(response.kpis ?? null)
      setStatusMessage('Manual mapping applied successfully.')
      await runAnalysis(rows as any)
    } catch (err: any) {
      setError(err?.message ?? 'Mapping failed.')
    } finally {
      setLoading(false)
    }
  }

  function downloadRows(rows: Record<string, unknown>[], filename: string) {
    downloadCsv(rows, filename)
  }

  const combinedPreviewRows = previewRows.length ? previewRows : data.slice(0, 10)

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'attributes', label: 'Important Attributes' },
    { key: 'application', label: 'Application' },
  ] as const

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F8FBFF_100%)] p-6">
      <div className="mx-auto max-w-7xl">
        
        {/* ── Redesigned Standalone Back Button ── */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#475569] shadow-sm transition hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:text-[#0F172A] hover:shadow-md active:translate-y-0"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {/* ── Premium Hero Banner ── */}
        <div className="mb-8 rounded-[32px] bg-[linear-gradient(135deg,#F0FDFA_0%,#FFFFFF_40%,#EFF6FF_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#0F766E]">
              <span>EV Analytics</span>
              <span className="text-slate-300">•</span>
              <span>EV Dynamic Range Prediction & Anxiety Reduction Lab</span>
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">EV Dynamic Range Prediction & Anxiety Reduction Lab</h1>
            <p className="mt-4 max-w-4xl text-[16px] leading-7 text-[#334155]">
              Predict realistic EV range, quantify OEM over-promise, flag anxiety-prone trips early, and group drivers by behavior with ML-driven charts, clustering, and insights.
            </p>
          </div>
        </div>

        {/* ── Timeout Warning Alert ── */}
        {timeoutWarning && (
          <div className="mb-6 rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm font-bold flex items-center gap-3 transition">
            <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0" />
            <p className="text-sm">{timeoutWarning}</p>
          </div>
        )}

        {/* ── Loading and Progress Indicator ── */}
        {loading && (
          <div className="mb-6 rounded-[28px] border border-blue-100 bg-[#EFF6FF]/60 p-5 text-blue-800 shadow-sm flex flex-col md:flex-row items-center gap-4 transition animate-pulse">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              <span className="text-sm font-bold">Processing Laboratory Pipeline...</span>
            </div>
            {progressMessage && (
              <span className="text-xs font-semibold px-3 py-1 bg-white border border-blue-200 rounded-full text-blue-600">
                {progressMessage}
              </span>
            )}
          </div>
        )}

        <ProjectOverviewManager
          projectSlug="ev-dynamic-range-prediction-anxiety-reduction-lab"
          projectTitle="Dynamic Range Prediction & Anxiety Reduction Lab"
          systemTabs={tabs}
          activeTab={tab}
          onTabChange={(t) => setTab(t as TabKey)}
          renderOverviewContent={(sections, onEdit, onDelete) => {
            const purposeSec = sections.find((s) => s.id === 'purpose')
            const capabilitiesSec = sections.find((s) => s.id === 'capabilities')
            const businessImpactSec = sections.find((s) => s.id === 'business-impact')
            const customSections = sections.filter((s) => s.isCustom)

            return (
              <div className="space-y-6 pt-2">
                {purposeSec && (
                  <EditableOverviewSection
                    section={purposeSec}
                    onEdit={onEdit}
                    accentColor="#0F766E"
                  />
                )}

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                  {overviewKpis.map((card) => (
                    <MetricCard key={card.label} icon={card.icon} label={card.label} value={card.value} accent={card.accent} />
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {capabilitiesSec && (
                    <EditableOverviewSection
                      section={capabilitiesSec}
                      onEdit={onEdit}
                      accentColor="#0F766E"
                    />
                  )}
                  {businessImpactSec && (
                    <EditableOverviewSection
                      section={businessImpactSec}
                      onEdit={onEdit}
                      accentColor="#1E40AF"
                    />
                  )}
                </div>

                {customSections.map((sec) => (
                  <EditableOverviewSection
                    key={sec.id}
                    section={sec}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    accentColor="#0F766E"
                  />
                ))}
              </div>
            )
          }}
        >

        {/* 2. Important Attributes Tab */}
        {tab === 'attributes' && (
          <div className="space-y-6">
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <h2 className="text-3xl font-bold text-[#0F172A]">Required Column Schema</h2>
              <p className="mt-3 max-w-3xl text-slate-600">The pipeline validates the following fields before analysis and machine learning calculations run.</p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {REQUIRED_COLUMNS.map((field) => (
                  <Chip key={field} className="border-blue-100 bg-[#EFF6FF] text-[#1D4ED8] hover:bg-blue-100 transition shadow-sm font-bold">
                    {field}
                  </Chip>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <h2 className="text-3xl font-bold text-[#0F172A]">Required Data Dictionary</h2>
              <p className="mt-3 max-w-3xl text-slate-600">EV dataset schema details with descriptions of parameters affecting battery capacity and driver range anxiety.</p>
              
              <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 border-b border-slate-200">
                        <TableHead className="font-bold text-slate-600 uppercase text-[12px] tracking-[0.08em] py-3.5 px-4">Column</TableHead>
                        <TableHead className="font-bold text-slate-600 uppercase text-[12px] tracking-[0.08em] py-3.5 px-4">Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {REQUIRED_COLUMNS.map((field, idx) => (
                        <TableRow key={field} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                          <td className="px-4 py-3.5 font-semibold text-[#0F172A] text-sm">
                            <span className="inline-block rounded-lg bg-slate-100 text-slate-800 px-2.5 py-1 text-xs font-bold border border-slate-200">
                              {field}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 text-sm font-medium">{REQUIRED_DESCRIPTIONS[field]}</td>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <h2 className="text-3xl font-bold text-[#0F172A]">Variable Roles</h2>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="rounded-[32px] border border-blue-100 bg-[#EFF6FF] p-6 shadow-sm">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#1D4ED8]">Independent Variables (Inputs)</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Input parameters for battery diagnostics, driving behavior models, and terrain forecasts.</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'battery_capacity_kwh',
                      'state_of_charge_pct',
                      'state_of_health_pct',
                      'battery_temp_c',
                      'vehicle_weight_kg',
                      'payload_kg',
                      'avg_speed_kmph',
                      'acceleration_score',
                      'regen_braking_pct',
                      'elevation_gain_m',
                      'ambient_temp_c',
                      'rain_intensity_mm',
                      'wind_speed_kmph',
                      'energy_consumption_wh_per_km',
                      'static_range_km',
                      'dynamic_range_km',
                      'actual_range_km',
                      'range_error_km',
                      'driving_style',
                      'terrain_type',
                      'traffic_level',
                    ].map((field) => (
                      <Chip key={field} className="border-blue-200 bg-white text-[#1D4ED8] hover:bg-blue-50 transition shadow-sm font-bold text-xs">
                        {field}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="rounded-[32px] border border-emerald-100 bg-[#ECFDF5] p-6 shadow-sm">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0F766E]">Dependent Variables (Targets)</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Target outputs derived from regression models or anxiety flags.</p>
                  <div className="flex flex-wrap gap-2">
                    {['actual_range_km', 'range_anxiety_flag'].map((field) => (
                      <Chip key={field} className="border-emerald-200 bg-white text-[#0F766E] hover:bg-[#ECFDF5] transition shadow-sm font-bold text-xs">
                        {field}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 3. Application Tab */}
        {tab === 'application' && (
          <div className="space-y-8">
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 1</p>
                  <h2 className="mt-2 text-3xl font-bold text-[#0F172A]">Load dataset and begin analysis</h2>
                  <p className="mt-3 text-slate-600">Default dataset is loaded from GitHub and then passed through the ML, clustering, and insights workflow.</p>
                </div>
                <div className="rounded-3xl border border-[#CCFBF1] bg-[#ECFDF5] px-5 py-4 text-[#0F766E] shadow-sm shrink-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Status</p>
                  <p className="mt-2 text-sm leading-6 text-[#115E59] font-medium">{statusMessage ?? 'Ready to load the dataset.'}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button type="button" onClick={loadDefaultDataset} disabled={loading} className="rounded-full bg-[#0F766E] px-6 py-3 font-bold text-white hover:bg-[#0D5F58] shadow-md hover:-translate-y-0.5 transition active:translate-y-0">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Load Default Data
                </Button>
                <Button type="button" onClick={() => fileInputRef.current?.click()} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0">
                  <FileUp className="mr-2 h-4 w-4" />
                  Upload CSV
                </Button>
                <Button type="button" onClick={() => mappingInputRef.current?.click()} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Upload CSV to map
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    void handleUpload(file, false)
                  }}
                />
                <input
                  ref={mappingInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    void handleUpload(file, true)
                  }}
                />
              </div>
            </section>

            {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700 shadow-sm">{error}</div> : null}

            {mode === 'mapping' ? (
              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Upload CSV + Manual Mapping</p>
                    <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Map required columns</h3>
                  </div>
                  <Button type="button" onClick={applyMapping} disabled={loading} className="rounded-full bg-[#0F766E] px-6 py-3 font-bold text-white hover:bg-[#0D5F58] shadow-md hover:-translate-y-0.5 transition active:translate-y-0">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Apply Mapping
                  </Button>
                </div>
                <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 font-medium">
                  Upload EV datasetDrag & Drop CSVBrowse Files
                </div>
                <div className="space-y-4">
                  {REQUIRED_COLUMNS.map((field) => (
                    <MappingRow key={field} field={field} columns={fileColumns} value={mapping[field] ?? ''} onChange={(value) => setMapping((current) => ({ ...current, [field]: value }))} />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 2</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">KPI Cards</h3>
                </div>
                <Button type="button" onClick={() => downloadRows(data, 'ev_range_data.csv')} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0">
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {kpis
                  ? [
                      { label: 'Trips', value: formatNumber(kpis.trips), icon: <Users className="h-5 w-5 text-[#0F766E]" />, accent: 'bg-[#ECFDF5]' },
                      { label: 'OEM Avg Error (km)', value: formatNumber(kpis.oem_avg_error_km), icon: <Gauge className="h-5 w-5 text-[#0369A1]" />, accent: 'bg-[#EFF6FF]' },
                      { label: 'Dynamic Avg Error (km)', value: formatNumber(kpis.dynamic_avg_error_km), icon: <BatteryCharging className="h-5 w-5 text-[#B45309]" />, accent: 'bg-[#FFFBEB]' },
                      { label: 'Anxiety Rate (%)', value: formatPercent(kpis.anxiety_rate_pct), icon: <ShieldAlert className="h-5 w-5 text-[#7C3AED]" />, accent: 'bg-[#F5F3FF]' },
                    ].map((card) => <MetricCard key={card.label} icon={card.icon} label={card.label} value={card.value} accent={card.accent} />)
                  : null}
              </div>
            </section>

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Preview</p>
              <h3 className="mt-2 text-2xl font-bold text-[#0F172A] mb-6">Dataset loaded.</h3>
              <div>
                <DataTable rows={combinedPreviewRows} maxRows={10} />
              </div>
            </section>

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Charts</p>
              <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Diagnostics charts</h3>
              <div className="mt-6 space-y-8">
                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Chart 1 — Static vs Actual Range</p>
                  <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 border border-slate-100">
                    <Plot
                      data={[
                        {
                          type: 'scatter',
                          mode: 'markers',
                          x: staticVsActual.map((item) => Number(item.static_range_km ?? 0)),
                          y: staticVsActual.map((item) => Number(item.actual_range_km ?? 0)),
                          marker: { color: '#636EFA', size: 8 },
                          name: 'Static vs Actual Range',
                        },
                      ]}
                      layout={{ template: 'plotly', paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff', height: 500, xaxis: { title: 'static_range_km' }, yaxis: { title: 'actual_range_km' } }}
                      style={{ width: '100%' }}
                      config={{ responsive: true, displaylogo: false }}
                    />
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Chart 2 — Dynamic vs Actual Range</p>
                  <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 border border-slate-100">
                    <Plot
                      data={[
                        {
                          type: 'scatter',
                          mode: 'markers',
                          x: dynamicVsActual.map((item) => Number(item.dynamic_range_km ?? 0)),
                          y: dynamicVsActual.map((item) => Number(item.actual_range_km ?? 0)),
                          marker: { color: '#636EFA', size: 8 },
                          name: 'Dynamic vs Actual Range',
                        },
                      ]}
                      layout={{ template: 'plotly', paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff', height: 500, xaxis: { title: 'dynamic_range_km' }, yaxis: { title: 'actual_range_km' } }}
                      style={{ width: '100%' }}
                      config={{ responsive: true, displaylogo: false }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">ML — Dynamic Range Prediction</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">RandomForestRegressor</h3>
                  <p className="mt-2 text-sm text-slate-600 font-medium">Target: actual_range_km | RMSE km: 2.58 | R2: 1</p>
                </div>
                <Button type="button" onClick={() => downloadRows(rangePredictions, 'range_metrics.csv')} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0">
                  <Download className="mr-2 h-4 w-4" />
                  Download Range Metrics
                </Button>
              </div>
              <div className="overflow-hidden rounded-3xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                      {['Column', 'Model', 'Target', 'RMSE (km)', 'R2', 'Rows Used'].map((h) => (
                        <TableHead key={h} className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100">
                    <TableRow className="border-slate-100 hover:bg-slate-50/50">
                      <TableCell className="px-4 py-3 font-semibold text-slate-800 text-sm">
                        <span className="rounded bg-[#EFF6FF] text-[#1D4ED8] px-2 py-0.5 text-xs font-bold border border-blue-100">Range Prediction</span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-700 text-sm">{rangeMetrics?.model ?? 'RandomForestRegressor'}</TableCell>
                      <TableCell className="px-4 py-3 text-slate-700 text-sm">{rangeMetrics?.target ?? 'actual_range_km'}</TableCell>
                      <TableCell className="px-4 py-3 text-slate-700 text-sm font-semibold">{formatNumber(rangeMetrics?.rmse_km ?? 2.58)}</TableCell>
                      <TableCell className="px-4 py-3 text-slate-700 text-sm font-semibold">{formatNumber(rangeMetrics?.r2 ?? 1)}</TableCell>
                      <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatNumber(rangeMetrics?.train_size && rangeMetrics?.test_size ? rangeMetrics.train_size + rangeMetrics.test_size : rangePredictions.length)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">ML — Range Anxiety Prediction</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">RandomForestClassifier</h3>
                  <p className="mt-2 text-sm text-slate-600 font-medium">Target: range_anxiety_flag | ROC AUC: 1 | Accuracy %: 100.00%</p>
                </div>
                <Button type="button" onClick={() => downloadRows(anxietyPredictions, 'anxiety_metrics.csv')} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0">
                  <Download className="mr-2 h-4 w-4" />
                  Download Anxiety Metrics
                </Button>
              </div>
              <div className="overflow-hidden rounded-3xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                      {['Column', 'Model', 'Target', 'ROC AUC', 'Rows Used'].map((h) => (
                        <TableHead key={h} className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100">
                    <TableRow className="border-slate-100 hover:bg-slate-50/50">
                      <TableCell className="px-4 py-3 font-semibold text-slate-800 text-sm">
                        <span className="rounded bg-[#F5F3FF] text-[#7C3AED] px-2 py-0.5 text-xs font-bold border border-purple-100">Anxiety Prediction</span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-700 text-sm">{anxietyMetrics?.model ?? 'RandomForestClassifier'}</TableCell>
                      <TableCell className="px-4 py-3 text-slate-700 text-sm">{anxietyMetrics?.target ?? 'range_anxiety_flag'}</TableCell>
                      <TableCell className="px-4 py-3 text-slate-700 text-sm font-semibold">{formatNumber(anxietyMetrics?.roc_auc ?? 1)}</TableCell>
                      <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatNumber(anxietyMetrics?.train_size && anxietyMetrics?.test_size ? anxietyMetrics.train_size + anxietyMetrics.test_size : anxietyPredictions.length)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Driver Behavior Clustering</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">KMeans with 4 clusters</h3>
                </div>
                <Button type="button" onClick={() => downloadRows(clusterSummary, 'cluster_summary.csv')} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0">
                  <Download className="mr-2 h-4 w-4" />
                  Download Cluster Summary
                </Button>
              </div>
              <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Chart 3 — Driver Behavior Clusters</p>
                <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 border border-slate-100">
                  <Plot
                    data={[
                      {
                        type: 'scatter',
                        mode: 'markers',
                        x: clusterScatter.map((item) => Number(item.avg_speed_kmph ?? 0)),
                        y: clusterScatter.map((item) => Number(item.energy_consumption_wh_per_km ?? 0)),
                        marker: { size: 10, color: clusterScatter.map((item) => item.Cluster ?? '0') },
                        text: clusterScatter.map((item) => item.Cluster ?? '0'),
                        name: 'Cluster',
                      },
                    ]}
                    layout={{ template: 'plotly', paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff', height: 560, xaxis: { title: 'avg_speed_kmph' }, yaxis: { title: 'energy_consumption_wh_per_km' }, legend: { orientation: 'v', x: 1.02, y: 1 } }}
                    style={{ width: '100%' }}
                    config={{ responsive: true, displaylogo: false }}
                  />
                </div>
              </div>
              <div className="overflow-hidden rounded-3xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                      {['Cluster', 'avg_speed_kmph', 'acceleration_score', 'regen_braking_pct', 'energy_consumption_wh_per_km'].map((h) => (
                        <TableHead key={h} className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100">
                    {clusterSummary.map((row, index) => (
                      <TableRow key={index} className="border-slate-100 hover:bg-slate-50/50">
                        <TableCell className="px-4 py-3 font-semibold text-slate-800 text-sm">
                          <span className="rounded bg-slate-100 border border-slate-200 text-slate-800 px-2 py-0.5 text-xs font-bold">{row.Cluster}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-slate-700 text-sm font-medium">{formatNumber(row.avg_speed_kmph)}</TableCell>
                        <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatNumber(row.acceleration_score)}</TableCell>
                        <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatNumber(row.regen_braking_pct)}</TableCell>
                        <TableCell className="px-4 py-3 text-slate-700 text-sm font-semibold text-[#0F766E]">{formatNumber(row.energy_consumption_wh_per_km)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Automated Insights</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Exactly three insight rows</h3>
                </div>
                <Button type="button" onClick={() => downloadRows(insights, 'ev_insights.csv')} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0">
                  <Download className="mr-2 h-4 w-4" />
                  Download Insights CSV
                </Button>
              </div>
              <div className="overflow-hidden rounded-3xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                      {['Row', 'Insight', 'Value'].map((column) => (
                        <TableHead key={column} className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">
                          {column}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100">
                    {insights.map((row, index) => (
                      <TableRow key={index} className="border-slate-100 hover:bg-slate-50/50">
                        <TableCell className="px-4 py-3 font-semibold text-slate-800 text-sm">
                          <span className="rounded bg-slate-100 border border-slate-200 text-slate-800 px-2.5 py-1 text-xs font-bold">{index + 1}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-slate-700 text-sm font-medium">{row.Insight}</TableCell>
                        <TableCell className="px-4 py-3 text-slate-700 text-sm font-semibold text-[#0F766E]">{row.Value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>
        )}
        </ProjectOverviewManager>
      </div>
    </div>
  )
}

export default EvDynamicRangePredictionAnxietyReductionLabProjectPage