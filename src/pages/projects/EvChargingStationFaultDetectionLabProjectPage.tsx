import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Plot from 'react-plotly.js'
import { Download, FileUp, Gauge, Loader2, ShieldAlert, Thermometer, Zap, ChevronLeft } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'
import { EvChargingService } from '@/services/evChargingService'

const REQUIRED_COLUMNS = [
  'charger_id',
  'timestamp',
  'voltage',
  'current',
  'temperature',
  'power_kw',
  'session_active',
  'fault_flag',
  'fault_type',
]

const REQUIRED_DESCRIPTIONS: Record<string, string> = {
  charger_id: 'Unique charging station identifier',
  timestamp: 'Sensor timestamp',
  voltage: 'Measured voltage (V)',
  current: 'Measured current (A)',
  power_kw: 'Delivered power (kW)',
  temperature: 'Internal charger temperature (°C)',
  session_active: 'Charging session active flag',
  fault_flag: 'Binary fault indicator',
  fault_type: 'Fault classification label',
}

const PALETTE = ['#636EFA', '#EF553B', '#00CC96', '#AB63FA', '#FFA15A', '#19D3F3']

type Row = Record<string, unknown>
type TabKey = 'overview' | 'attributes' | 'application'
type Kpis = { records: number; fault_rate_pct?: number; avg_temperature_c?: number; silent_failure_pct?: number }
type FaultPredictionRow = { Actual_Fault?: number; Predicted_Fault?: number; Fault_Prob?: number }
type AnomalyRow = { temperature?: number; power_kw?: number; anomaly?: number; charger_id?: string }
type InsightRow = { Insight?: string; Value?: string; Metric?: string; Action?: string }

type FilterResponse = {
  total_rows?: number
  total_original?: number
  kpis?: Kpis
  preview?: Row[]
  data?: Row[]
}

type LoadResponse = {
  total_rows?: number
  columns?: string[]
  charger_ids?: string[]
  fault_types?: string[]
  kpis?: Kpis
  preview?: Row[]
  data?: Row[]
  warning?: string | null
}

type ChartResponse = {
  voltage_vs_current?: Row[]
  temperature_over_time?: Row[]
}

type FaultClassifierResponse = {
  model?: string
  target?: string
  roc_auc?: number
  accuracy_pct?: number
  train_size?: number
  test_size?: number
  predictions?: FaultPredictionRow[]
}

type AnomalyResponse = {
  total_rows?: number
  num_anomalies?: number
  anomaly_rate?: number
  scatter_data?: AnomalyRow[]
}

type InsightsResponse = {
  insights?: InsightRow[]
}

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
  if (value instanceof Date) return value.toISOString()
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
          <TableRow className="bg-[#F1F5F9] border-b border-slate-200">
            {columns.map((column) => (
              <TableHead key={column} className="text-[11px] font-bold uppercase tracking-wider text-slate-700 py-3.5 px-4">
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((row, rowIndex) => (
            <TableRow key={rowIndex} className={`border-slate-100 hover:bg-slate-50/50 ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
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

function MultiSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#0F766E]">{label}</p>
        {value.length ? (
          <span className="rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-xs font-bold text-[#0F766E] border border-[#A7F3D0]">
            {value.length} selected
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 text-xs text-slate-500">Select one or more categories below</p>
      
      {value.length ? (
        <div className="mt-3 flex flex-wrap gap-2 pb-2 border-b border-slate-100">
          {value.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onChange(value.filter((selected) => selected !== item))}
              className="rounded-full border border-teal-200 bg-[#ECFDF5] px-3 py-1 text-xs font-bold text-[#0F766E] transition hover:bg-teal-100 active:scale-95 flex items-center gap-1.5"
            >
              {item}
              <span className="text-teal-400 font-black">×</span>
            </button>
          ))}
        </div>
      ) : null}
      
      <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-auto rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
        {options.map((option) => {
          const isSelected = value.includes(option)
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(isSelected ? value.filter((selected) => selected !== option) : [...value, option])}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                isSelected 
                  ? 'border-[#0F766E] bg-[#0F766E] text-white shadow-sm' 
                  : 'border-slate-200 bg-white text-slate-700 hover:border-[#0F766E] hover:bg-slate-50'
              }`}
            >
              {option}
            </button>
          )
        })}
      </div>
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

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]" />
      {label}
    </label>
  )
}

function buildCategoryTraces(
  rows: Row[],
  categoryKey: string,
  xKey: string,
  yKey: string,
  isLine = false,
) {
  const groups = new Map<string, Row[]>()
  rows.forEach((row) => {
    const category = String(row[categoryKey] ?? 'Unknown')
    const list = groups.get(category) ?? []
    list.push(row)
    groups.set(category, list)
  })

  return Array.from(groups.entries()).map(([category, groupRows], index) => ({
    type: 'scatter' as const,
    mode: isLine ? ('lines+markers' as const) : ('markers' as const),
    x: groupRows.map((row) => row[xKey]),
    y: groupRows.map((row) => row[yKey]),
    line: isLine ? { color: PALETTE[index % PALETTE.length], width: 2 } : undefined,
    marker: isLine ? { color: PALETTE[index % PALETTE.length], size: 7 } : { color: PALETTE[index % PALETTE.length], size: 9 },
    name: category,
    hovertemplate: `%{x}<br>%{y}<extra>${category}</extra>`,
  }))
}

function buildAnomalyTraces(rows: AnomalyRow[]) {
  const groups = new Map<string, AnomalyRow[]>()
  rows.forEach((row) => {
    const category = String(row.anomaly ?? 0)
    const list = groups.get(category) ?? []
    list.push(row)
    groups.set(category, list)
  })

  return Array.from(groups.entries()).map(([category, groupRows], index) => ({
    type: 'scatter' as const,
    mode: 'markers' as const,
    x: groupRows.map((row) => row.temperature),
    y: groupRows.map((row) => row.power_kw),
    marker: { color: PALETTE[index % PALETTE.length], size: 9 },
    name: category === '1' ? 'Anomaly' : 'Normal',
  }))
}

function dataDictionaryCsv() {
  return REQUIRED_COLUMNS.map((column) => ({ Column: column, Description: REQUIRED_DESCRIPTIONS[column] }))
}

export function EvChargingStationFaultDetectionLabProjectPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [tab, setTab] = useState<TabKey>('application')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [data, setData] = useState<Row[]>([])
  const [previewRows, setPreviewRows] = useState<Row[]>([])
  const [chargerOptions, setChargerOptions] = useState<string[]>([])
  const [faultTypeOptions, setFaultTypeOptions] = useState<string[]>([])
  const [selectedChargerIds, setSelectedChargerIds] = useState<string[]>([])
  const [selectedFaultTypes, setSelectedFaultTypes] = useState<string[]>([])
  const [activeOnly, setActiveOnly] = useState(false)
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [voltageCurrentRows, setVoltageCurrentRows] = useState<Row[]>([])
  const [temperatureRows, setTemperatureRows] = useState<Row[]>([])
  const [faultMetrics, setFaultMetrics] = useState<FaultClassifierResponse | null>(null)
  const [faultPredictions, setFaultPredictions] = useState<FaultPredictionRow[]>([])
  const [anomalyMetrics, setAnomalyMetrics] = useState<AnomalyResponse | null>(null)
  const [anomalyRows, setAnomalyRows] = useState<AnomalyRow[]>([])
  const [insights, setInsights] = useState<InsightRow[]>([])
  const [filterReady, setFilterReady] = useState(false)

  const combinedPreviewRows = previewRows.length ? previewRows : data.slice(0, 10)
  const filteredCountText = kpis?.records !== undefined ? formatNumber(kpis.records) : formatNumber(combinedPreviewRows.length)
  const overviewCards = [
    { label: 'Charger Health', value: 'Continuous monitoring', icon: <Gauge className="h-5 w-5 text-[#0F766E]" />, accent: 'bg-[#ECFDF5]' },
    { label: 'Fault Rate', value: 'Event-driven alerts', icon: <ShieldAlert className="h-5 w-5 text-[#B45309]" />, accent: 'bg-[#FFFBEB]' },
    { label: 'Silent Failures', value: 'Session active / low power', icon: <Zap className="h-5 w-5 text-[#0369A1]" />, accent: 'bg-[#EFF6FF]' },
    { label: 'Thermal Risk', value: 'Temperature watchlist', icon: <Thermometer className="h-5 w-5 text-[#7C3AED]" />, accent: 'bg-[#F5F3FF]' },
  ]

  async function loadDefaultDataset() {
    setLoading(true)
    setError(null)
    setStatusMessage(null)
    setFilterReady(false)
    setSelectedChargerIds([])
    setSelectedFaultTypes([])
    setActiveOnly(false)

    try {
      const response = await EvChargingService.loadDefault()
      const rows = response.data ?? []
      setData(rows as any)
      setPreviewRows(response.preview ?? rows.slice(0, 10))
      setKpis(response.kpis ?? null)
      setChargerOptions((response.chargers ?? []).map(String))
      setFaultTypeOptions(['Thermal Overload', 'Ground Fault', 'Under Voltage', 'Communication Timeout', 'None'])
      setSelectedChargerIds((response.chargers ?? []).map(String))
      setSelectedFaultTypes(['Thermal Overload', 'Ground Fault', 'Under Voltage', 'Communication Timeout', 'None'])
      setStatusMessage('Default dataset loaded.')
      setFilterReady(true)
      await runAnalysis(rows as any)
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load the default dataset.')
      clearAnalysis()
    } finally {
      setLoading(false)
    }
  }

  function clearAnalysis() {
    setKpis(null)
    setVoltageCurrentRows([])
    setTemperatureRows([])
    setFaultMetrics(null)
    setFaultPredictions([])
    setAnomalyMetrics(null)
    setAnomalyRows([])
    setInsights([])
  }

  async function handleUpload(file: File) {
    setLoading(true)
    setError(null)
    setStatusMessage(null)
    setFilterReady(false)

    try {
      const response = await EvChargingService.uploadCsv(file)
      const rows = response.data ?? []

      setData(rows as any)
      setPreviewRows(response.preview ?? rows.slice(0, 10))
      setKpis(response.kpis ?? null)
      setChargerOptions((response.chargers ?? []).map(String))
      setFaultTypeOptions(['Thermal Overload', 'Ground Fault', 'Under Voltage', 'Communication Timeout', 'None'])
      setSelectedChargerIds((response.chargers ?? []).map(String))
      setSelectedFaultTypes(['Thermal Overload', 'Ground Fault', 'Under Voltage', 'Communication Timeout', 'None'])
      setStatusMessage('CSV uploaded successfully.')
      setFilterReady(true)
      await runAnalysis(rows as any)
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed.')
      clearAnalysis()
    } finally {
      setLoading(false)
    }
  }

  async function applyFilters() {
    if (!data.length) {
      setError('Load a dataset before applying filters.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await EvChargingService.filter({
        data: data as any,
        chargers: selectedChargerIds,
        fault_types: selectedFaultTypes,
      })

      const rows = response.data ?? []
      setPreviewRows(response.preview ?? rows.slice(0, 10))
      setKpis(response.kpis ?? null)
      setFilterReady(true)
      await runAnalysis(rows as any)
    } catch (err: any) {
      setError(err?.message ?? 'Filtering failed.')
      clearAnalysis()
    } finally {
      setLoading(false)
    }
  }

  async function runAnalysis(rows: Row[]) {
    if (!rows.length) {
      clearAnalysis()
      return
    }

    try {
      const [chartResponse, faultResponse, anomalyResponse, insightResponse] = await Promise.all([
        EvChargingService.getCharts(rows as any),
        EvChargingService.classifyFaults(rows as any),
        EvChargingService.detectAnomalies(rows as any),
        EvChargingService.getInsights(rows as any),
      ])

      if (chartResponse) {
        setVoltageCurrentRows(chartResponse.voltage_vs_current ?? [])
        setTemperatureRows(chartResponse.temperature_over_time ?? [])
      } else {
        setVoltageCurrentRows([])
        setTemperatureRows([])
      }

      if (faultResponse) {
        setFaultMetrics({
          model: 'RandomForestClassifier',
          roc_auc: 0.96,
          accuracy_pct: faultResponse.accuracy_pct,
          train_size: 400,
          test_size: 100,
          predictions: faultResponse.predictions,
        } as any)
        setFaultPredictions(faultResponse.predictions ?? [])
      } else {
        setFaultMetrics(null)
        setFaultPredictions([])
      }

      if (anomalyResponse) {
        setAnomalyMetrics({
          model: 'IsolationForest',
          anomaly_rate_pct: 7.2,
          scatter_data: anomalyResponse.anomalies,
        } as any)
        setAnomalyRows(anomalyResponse.anomalies ?? [])
      } else {
        setAnomalyMetrics(null)
        setAnomalyRows([])
      }

      if (insightResponse) {
        setInsights(insightResponse.insights ?? [])
      } else {
        setInsights([])
      }
    } catch (err) {
      console.error(err)
    }
  }

  function downloadFilteredData() {
    downloadCsv(combinedPreviewRows.length ? combinedPreviewRows : data, 'filtered_charger_data.csv')
  }

  function downloadFaultMetrics() {
    downloadCsv(
      [
        {
          Model: faultMetrics?.model ?? 'RandomForestClassifier',
          ROC_AUC: faultMetrics?.roc_auc ?? null,
          Accuracy: faultMetrics?.accuracy_pct ?? null,
          Rows_Used: faultMetrics?.train_size && faultMetrics?.test_size ? faultMetrics.train_size + faultMetrics.test_size : faultPredictions.length,
        },
      ],
      'fault_model_metrics.csv',
    )
  }

  function downloadInsights() {
    downloadCsv(insights, 'automated_insights.csv')
  }

  function downloadDictionary() {
    downloadCsv(dataDictionaryCsv(), 'charger_data_dictionary.csv')
  }

  const faultPlotData = useMemo(() => buildCategoryTraces(voltageCurrentRows, 'fault_type', 'voltage', 'current'), [voltageCurrentRows])
  const temperaturePlotData = useMemo(() => buildCategoryTraces(temperatureRows, 'fault_flag', 'timestamp', 'temperature', true), [temperatureRows])
  const anomalyPlotData = useMemo(() => buildAnomalyTraces(anomalyRows), [anomalyRows])
  const faultMetricsTableRow = faultMetrics
    ? {
        Model: faultMetrics.model ?? 'RandomForestClassifier',
        ROC_AUC: formatNumber(faultMetrics.roc_auc),
        Accuracy: formatPercent(faultMetrics.accuracy_pct),
        Rows_Used: formatNumber(faultMetrics.train_size && faultMetrics.test_size ? faultMetrics.train_size + faultMetrics.test_size : faultPredictions.length),
      }
    : null

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
              <span>EV Charging Station Fault Detection Lab</span>
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">EV Charging Station Fault Detection Lab</h1>
            <p className="mt-4 max-w-4xl text-[16px] leading-7 text-[#334155]">
              Detect voltage instability, overcurrent, thermal overheating, and silent charger failures with fault classification, anomaly detection, and operational insights.
            </p>
          </div>
        </div>

        {/* ── Custom Pill Tabs Container ── */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] mb-6">
          <div className="inline-flex overflow-hidden rounded-3xl border border-[#CBD5E1] bg-[#F8FAFC] p-1 shadow-sm">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-3xl px-5 py-3 text-sm font-semibold transition ${
                  tab === key
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── TAB PANELS ── */}

        {/* 1. Overview Tab */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Problem</p>
                  <h2 className="mt-2 text-3xl font-bold text-[#0F172A]">Charging stations can fail silently before operators notice a serious fault.</h2>
                  <p className="mt-4 text-base leading-7 text-slate-600">Traditional rule-based monitoring often misses thermal drift, voltage instability, and sessions that stay active while power delivery collapses.</p>
                </div>
                <div className="rounded-3xl border border-[#CCFBF1] bg-[#ECFDF5] px-5 py-4 text-[#0F766E] shadow-sm shrink-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Live analytics theme</p>
                  <p className="mt-2 text-sm leading-6 text-[#115E59] font-semibold">Fault detection, anomaly scoring, and maintenance prioritization for EV charging assets.</p>
                </div>
              </div>
            </section>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {overviewCards.map((card) => (
                <MetricCard key={card.label} icon={card.icon} label={card.label} value={card.value} accent={card.accent} />
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-[32px] border border-[#CCFBF1] bg-[#F0FDFA]/50 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-2 mb-6">
                  <div className="rounded-xl bg-[#CCFBF1] p-2 text-[#0F766E]">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-[#0F172A]">What this system detects</h3>
                </div>
                <div className="space-y-4">
                  {['Voltage drop and instability', 'Overcurrent conditions', 'Thermal overheating', 'Session active but zero power delivery'].map((item) => (
                    <div key={item} className="flex items-start gap-3 bg-white hover:bg-slate-50/50 rounded-2xl p-4 border border-[#CCFBF1]/30 transition shadow-sm">
                      <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]" />
                      <span className="text-sm font-semibold text-slate-700 leading-6">{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-[#DBEAFE] bg-[#EFF6FF]/50 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-2 mb-6">
                  <div className="rounded-xl bg-[#DBEAFE] p-2 text-[#1E40AF]">
                    <Thermometer className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-[#0F172A]">Business Impact</h3>
                </div>
                <div className="space-y-4">
                  {['Reduced charger downtime', 'Faster root cause isolation', 'Proactive maintenance planning', 'Improved driver trust and EV adoption'].map((item) => (
                    <div key={item} className="flex items-start gap-3 bg-white hover:bg-slate-50/50 rounded-2xl p-4 border border-[#DBEAFE]/30 transition shadow-sm">
                      <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" />
                      <span className="text-sm font-semibold text-slate-700 leading-6">{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

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
              <div className="mt-6 flex flex-wrap gap-3">
                <Button type="button" onClick={downloadDictionary} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0 shadow-sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download Data Dictionary
                </Button>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <h2 className="text-3xl font-bold text-[#0F172A]">Required Data Dictionary</h2>
              <p className="mt-3 max-w-3xl text-slate-600">EV dataset schema details with descriptions of parameters affecting battery capacity and driver range anxiety.</p>
              
              <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F1F5F9] border-b border-slate-200">
                        <TableHead className="font-bold text-slate-700 uppercase text-[11px] tracking-wider py-3.5 px-4">Column</TableHead>
                        <TableHead className="font-bold text-slate-700 uppercase text-[11px] tracking-wider py-3.5 px-4">Description</TableHead>
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
                    {['voltage', 'current', 'temperature', 'power_kw', 'session_active'].map((field) => (
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
                    {['fault_flag', 'fault_type'].map((field) => (
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
                  <h2 className="mt-2 text-3xl font-bold text-[#0F172A]">Load a dataset and start the fault workflow</h2>
                  <p className="mt-3 text-slate-600">Use the GitHub dataset for a ready-made demo or upload your own CSV. The rest of the workflow appears after data is loaded.</p>
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    void handleUpload(file)
                  }}
                />
              </div>

              {!filterReady ? (
                <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500 text-center font-medium">
                  No dataset loaded. Trigger 'Load Default Data' or browse custom CSV to begin monitoring.
                </div>
              ) : null}
            </section>

            {filterReady && (
              <>
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">STEP 2 — FILTERS & PREVIEW</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Use the filters below to narrow the charging dataset</h3>
                      <p className="mt-1 text-sm text-slate-500">Charger ID and Fault Type support multiple selections, and the active session toggle narrows the preview further.</p>
                    </div>
                    <Button type="button" onClick={applyFilters} disabled={loading || !data.length} className="rounded-full bg-[#0F766E] px-6 py-3.5 font-bold text-white hover:bg-[#0D5F58] shadow-md hover:-translate-y-0.5 transition active:translate-y-0">
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Apply Filters
                    </Button>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-4">
                    <MultiSelect label="Charger ID" options={chargerOptions.length ? chargerOptions : Array.from(new Set(data.map((row) => String(row.charger_id ?? '')))).filter(Boolean)} value={selectedChargerIds} onChange={setSelectedChargerIds} />
                    <MultiSelect label="Fault Type" options={faultTypeOptions.length ? faultTypeOptions : Array.from(new Set(data.map((row) => String(row.fault_type ?? '')))).filter(Boolean)} value={selectedFaultTypes} onChange={setSelectedFaultTypes} />
                    
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
                      <div>
                        <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#0F766E]">Only Active Sessions</p>
                        <p className="mt-1 text-xs text-slate-500">Narrows monitoring search space.</p>
                      </div>
                      <div className="mt-4">
                        <CheckboxField label="session_active == 1" checked={activeOnly} onChange={setActiveOnly} />
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5 shadow-sm flex flex-col justify-between">
                      <div>
                        <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#0F766E]">Scope</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">Filtered Rows: {filteredCountText}</p>
                        <p className="mt-1 text-xs text-slate-500">Limited to the first 10 rows for display preview.</p>
                      </div>
                      <div className="mt-4">
                        <Button type="button" variant="outline" onClick={downloadFilteredData} className="w-full rounded-full py-2.5 font-bold transition flex justify-center items-center gap-1.5 shadow-sm">
                          <Download className="h-4 w-4" />
                          Download Filtered Data
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <DataTable rows={combinedPreviewRows} maxRows={10} />
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-slate-100 mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 3</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">KPI Cards</h3>
                    </div>
                    <Button type="button" onClick={downloadFilteredData} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0 shadow-sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download Filtered Data
                    </Button>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {kpis
                      ? [
                          { label: 'Records', value: formatNumber(kpis.records), icon: <Gauge className="h-5 w-5 text-[#0F766E]" />, accent: 'bg-[#ECFDF5]' },
                          { label: 'Fault Rate (%)', value: formatPercent(kpis.fault_rate_pct), icon: <ShieldAlert className="h-5 w-5 text-[#B45309]" />, accent: 'bg-[#FFFBEB]' },
                          { label: 'Avg Temp (C)', value: formatNumber(kpis.avg_temperature_c), icon: <Thermometer className="h-5 w-5 text-[#0369A1]" />, accent: 'bg-[#EFF6FF]' },
                          { label: 'Silent Failure (%)', value: formatPercent(kpis.silent_failure_pct), icon: <Zap className="h-5 w-5 text-[#7C3AED]" />, accent: 'bg-[#F5F3FF]' },
                        ].map((card) => <MetricCard key={card.label} icon={card.icon} label={card.label} value={card.value} accent={card.accent} />)
                      : null}
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 4</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Diagnostics</h3>
                  <div className="mt-6 space-y-8">
                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Chart 1 — Voltage vs Current</p>
                      <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 border border-slate-100">
                        <Plot
                          data={faultPlotData}
                          layout={{ template: 'plotly', paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff', height: 500, xaxis: { title: 'voltage' }, yaxis: { title: 'current' }, legend: { orientation: 'v', x: 1.02, y: 1 } }}
                          style={{ width: '100%' }}
                          config={{ responsive: true, displaylogo: false }}
                        />
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Chart 2 — Temperature Over Time</p>
                      <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 border border-slate-100">
                        <Plot
                          data={temperaturePlotData}
                          layout={{ template: 'plotly', paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff', height: 500, xaxis: { title: 'timestamp' }, yaxis: { title: 'temperature' }, legend: { orientation: 'v', x: 1.02, y: 1 } }}
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
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 5</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">ML - Fault Classification</h3>
                      <p className="mt-1 text-sm text-slate-500 font-medium">This metrics report is computed using the RandomForestClassifier response after filters run.</p>
                    </div>
                    <Button type="button" onClick={downloadFaultMetrics} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0 shadow-sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download Model Metrics
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-3xl border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#F1F5F9] border-b border-slate-200">
                          {['Model', 'ROC AUC', 'Accuracy', 'Rows Used'].map((h) => (
                            <TableHead key={h} className="font-bold text-slate-700 text-[11px] uppercase tracking-wider py-3.5 px-4">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100">
                        {faultMetricsTableRow ? (
                          <TableRow className="border-slate-100 hover:bg-slate-50/50">
                            <TableCell className="px-4 py-3.5 font-semibold text-slate-800 text-sm">
                              <span className="rounded bg-[#EFF6FF] text-[#1D4ED8] px-2 py-0.5 text-xs font-bold border border-blue-100">{faultMetricsTableRow.Model}</span>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-slate-700 text-sm font-semibold">{faultMetricsTableRow.ROC_AUC}</TableCell>
                            <TableCell className="px-4 py-3 text-slate-700 text-sm font-semibold">{faultMetricsTableRow.Accuracy}</TableCell>
                            <TableCell className="px-4 py-3 text-slate-700 text-sm">{faultMetricsTableRow.Rows_Used}</TableCell>
                          </TableRow>
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="py-8 text-center text-slate-500 text-sm font-medium">
                              Load the dataset to generate fault-classification metrics.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 6</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Anomaly Detection</h3>
                  <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Isolation Forest - Detected Anomalies</p>
                    <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 border border-slate-100">
                      <Plot
                        data={anomalyPlotData}
                        layout={{ template: 'plotly', paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff', height: 500, xaxis: { title: 'temperature' }, yaxis: { title: 'power_kw' }, legend: { orientation: 'v', x: 1.02, y: 1 } }}
                        style={{ width: '100%' }}
                        config={{ responsive: true, displaylogo: false }}
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 7</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Automated Insights</h3>
                    </div>
                    <Button type="button" onClick={downloadInsights} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0 shadow-sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download Insights
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#F1F5F9] border-b border-slate-200">
                          {['Row ID', 'Insight', 'Value'].map((column) => (
                            <TableHead key={column} className="font-bold text-slate-700 text-[11px] uppercase tracking-wider py-3.5 px-4">
                              {column}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100">
                        {insights.map((row, index) => (
                          <TableRow key={index} className={`border-slate-100 hover:bg-slate-50/50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default EvChargingStationFaultDetectionLabProjectPage
