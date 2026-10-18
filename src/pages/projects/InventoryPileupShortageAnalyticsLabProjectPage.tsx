import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Plot from 'react-plotly.js'
import {
  BarChart3,
  Clock,
  Download,
  FileUp,
  Loader2,
  Sparkles,
  SquareStack,
  ChevronLeft,
  Settings,
  Package,
  TrendingUp,
  AlertCircle,
  Percent,
  CalendarRange,
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'

import { InventoryPileupService } from '@/services/inventoryPileupService'

const REQUIRED_FIELDS = [
  'SKU',
  'Date',
  'Daily_Demand',
  'Predicted_Demand',
  'Forecast_Error',
  'Production_Qty',
  'Production_Delay_Hrs',
  'Procurement_Qty',
  'Procurement_Delay_Hrs',
  'Inventory_Level',
  'Safety_Stock',
  'Stock_Turnover',
  'Lead_Time_Days',
  'Backorder_Qty',
  'Wastage_Qty',
  'Shortage_Flag',
  'Pileup_Flag',
]

const QUERY_PARAM_MAP: Record<string, string> = {
  SKU: 'sku',
  Date: 'date',
  Daily_Demand: 'daily_demand',
  Predicted_Demand: 'predicted_demand',
  Forecast_Error: 'forecast_error',
  Production_Qty: 'production_qty',
  Production_Delay_Hrs: 'production_delay_hrs',
  Procurement_Qty: 'procurement_qty',
  Procurement_Delay_Hrs: 'procurement_delay_hrs',
  Inventory_Level: 'inventory_level',
  Safety_Stock: 'safety_stock',
  Stock_Turnover: 'stock_turnover',
  Lead_Time_Days: 'lead_time_days',
  Backorder_Qty: 'backorder_qty',
  Wastage_Qty: 'wastage_qty',
  Shortage_Flag: 'shortage_flag',
  Pileup_Flag: 'pileup_flag',
}

const REQUIRED_DESCRIPTIONS: Record<string, string> = {
  SKU: 'Unique Stock Keeping Unit identifier for each product',
  Date: 'Date of the inventory observation or transaction',
  Daily_Demand: 'Actual units demanded by customers on that day',
  Predicted_Demand: 'AI/ML model forecasted demand for the day',
  Forecast_Error: 'Absolute difference between actual and predicted demand',
  Production_Qty: 'Number of units produced during the observation period',
  Production_Delay_Hrs: 'Delay in production schedule in hours',
  Procurement_Qty: 'Units procured from suppliers during the period',
  Procurement_Delay_Hrs: 'Delay in procurement from suppliers in hours',
  Inventory_Level: 'Current stock units on hand at the observation date',
  Safety_Stock: 'Minimum buffer stock threshold to prevent stockouts',
  Stock_Turnover: 'Frequency at which inventory is sold and replaced',
  Lead_Time_Days: 'Total days from procurement order to stock receipt',
  Backorder_Qty: 'Units demanded but not available, placed on backorder',
  Wastage_Qty: 'Units lost due to expiry, damage, or write-offs',
  Shortage_Flag: 'Binary indicator: 1 if inventory fell below safety stock',
  Pileup_Flag: 'Binary indicator: 1 if inventory exceeded safe holding levels',
}

const OVERVIEW_FEATURES = [
  'Track daily demand vs production vs procurement by SKU',
  'Monitor inventory vs safety stock and breach patterns',
  'Analyze forecast error, lead time, and stock turnover',
  'Run AutoML to identify lead-time prediction drivers',
  'Simulate inventory strategies via parameter adjustments',
]

const BUSINESS_IMPACT = [
  'Reduce cash locked in slow-moving inventory',
  'Avoid production stoppages due to shortages',
  'Improve service levels and OTIF delivery rates',
  'Support S&OP, safety stock, and reorder planning',
]

const commonLayout = {
  template: 'plotly' as const,
  paper_bgcolor: '#ffffff',
  plot_bgcolor: '#ffffff',
  margin: { l: 60, r: 20, t: 20, b: 60 },
  font: {
    family: 'Inter, sans-serif',
    size: 12,
    color: '#2e2e2e',
  },
  legend: {
    orientation: 'v' as const,
    x: 1.02,
    y: 1,
  },
}

type TabKey = 'overview' | 'attributes' | 'application'

function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`rounded-full px-3 py-1.5 text-sm font-semibold border transition shadow-sm ${className || 'border-[#CBD5E1] bg-white text-[#334155]'}`}>
      {children}
    </span>
  )
}

function MetricCard({ icon, label, value, accent }: { icon: ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition hover:shadow-[0_24px_50px_rgba(15,23,42,0.12)]">
      <div className="flex items-center gap-4">
        <div className={`rounded-2xl p-4 shrink-0 ${accent}`}>{icon}</div>
        <div>
          <p className="text-base font-bold text-slate-500 tracking-tight">{label}</p>
          <p className="mt-1 text-2xl font-bold text-[#0F172A]">{value}</p>
        </div>
      </div>
    </div>
  )
}

function SelectableFilter({ label, values, selected, onToggle }: { label: string; values: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-[#0F766E]/30">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#0F766E]">{label}</p>
        <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-xs font-semibold text-[#0F766E]">{selected.length} selected</span>
      </div>
      <div className="mb-3 min-h-[56px] rounded-2xl border border-slate-100 bg-[#F8FAFC] px-3.5 py-2.5 flex items-center">
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((option) => (
              <span key={option} className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-1 text-xs font-bold text-[#0F766E]">
                {option}
                <button type="button" onClick={() => onToggle(option)} className="hover:text-red-500 font-bold ml-0.5">×</button>
              </span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-medium">Filter by {label.toLowerCase()}...</div>
        )}
      </div>
      <div className="grid max-h-48 gap-1.5 overflow-y-auto pr-1">
        {values.map((option) => {
          const isSelected = selected.includes(option)
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`w-full rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                isSelected
                  ? 'bg-[#0F766E] text-white shadow-sm font-bold'
                  : 'bg-[#F8FAFC] text-slate-700 hover:bg-slate-100 border border-slate-100'
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

function MappingRow({ field, columns, value, onChange }: { field: string; columns: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[220px_1fr] md:items-center">
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

async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const message = errorData?.detail || errorData?.message || response.statusText || 'Request failed'
    throw new Error(message)
  }
  return response.json()
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') return Number.isInteger(value) ? value.toString() : value.toFixed(4)
  return String(value)
}

function formatMetric(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toFixed(2)}`
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toFixed(2)}%`
}

export function InventoryPileupShortageAnalyticsLabProjectPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mappingInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [mode, setMode] = useState<'default' | 'upload' | 'mapping'>('default')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const [data, setData] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [datasetPreviewRows, setDatasetPreviewRows] = useState<any[]>([])
  const [skus, setSkus] = useState<string[]>([])
  const [selectedSkus, setSelectedSkus] = useState<string[]>([])
  const [dateStart, setDateStart] = useState<string>('')
  const [dateEnd, setDateEnd] = useState<string>('')

  const [kpis, setKpis] = useState<any>(null)
  const [charts, setCharts] = useState<any>({})
  const [mlResult, setMlResult] = useState<any>(null)
  const [simulator, setSimulator] = useState<any>(null)
  const [insights, setInsights] = useState<any[]>([])

  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [fileColumns, setFileColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [simulatorParams, setSimulatorParams] = useState<Record<string, number>>({
    demPct: 0,
    prodPct: 0,
    procPct: 0,
    ssPct: 0,
    ltPct: 0,
  })

  const dataPreview = useMemo(() => {
    if (filtered.length) return filtered.slice(0, 10)
    if (previewRows.length) return previewRows.slice(0, 10)
    return data.slice(0, 10)
  }, [filtered, previewRows, data])

  const tableColumns = useMemo(() => {
    const sample = dataPreview[0] ?? previewRows[0] ?? data[0] ?? {}
    return Object.keys(sample)
  }, [dataPreview, previewRows, data])

  const datasetPreviewColumns = useMemo(() => {
    const sample = datasetPreviewRows[0] ?? data[0] ?? {}
    return Object.keys(sample)
  }, [datasetPreviewRows, data])

  const predictionRows = useMemo(() => {
    const sourceRows = mlResult?.predictions ?? []
    const baseRows = filtered.length ? filtered : data

    return sourceRows.slice(0, 15).map((row: any, index: number) => {
      const source = baseRows[index] ?? {}

      return {
        sku: source.SKU ?? source.sku ?? '',
        date: source.Date ?? source.date ?? '',
        lead_time_days: row.Actual_Lead_Time_Days ?? row.lead_time_days ?? row.Lead_Time_Days ?? row.actual_lead_time_days ?? null,
        predicted_lead_time_days: row.Predicted_Lead_Time_Days ?? row.predicted_lead_time_days ?? row.predicted_lead_time ?? null,
      }
    })
  }, [mlResult, filtered, data])

  useEffect(() => {
    void loadDefault()
  }, [])

  useEffect(() => {
    if (!data.length) return
    void analyzeRows(data, selectedSkus, dateStart, dateEnd)
  }, [data, selectedSkus, dateStart, dateEnd])

  async function loadDefault() {
    setError(null)
    setLoading(true)
    setMode('default')
    setSelectedSkus([])
    setDateStart('')
    setDateEnd('')

    try {
      const res = await InventoryPileupService.loadDefault()
      setData(res.data ?? [])
      setFiltered(res.data ?? [])
      setPreviewRows(res.preview ?? [])
      setDatasetPreviewRows(res.preview ?? [])
      setSkus((res.skus ?? []).map(String))
      setStatusMessage('Default dataset loaded successfully.')
      await analyzeRows(res.data ?? [], [], '', '')
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load default dataset.')
    } finally {
      setLoading(false)
    }
  }

  async function analyzeRows(rows: any[], skusToUse = selectedSkus, start = dateStart, end = dateEnd) {
    if (!rows.length) {
      setFiltered([])
      setPreviewRows([])
      setKpis(null)
      setCharts({})
      setMlResult(null)
      setSimulator(null)
      setInsights([])
      return
    }

    try {
      const filterRes = await InventoryPileupService.filter({
        data: rows,
        skus: skusToUse.length ? skusToUse : undefined,
      })

      const filteredRows = filterRes.data ?? rows
      setFiltered(filteredRows)
      setPreviewRows(filterRes.preview ?? [])
      setKpis(filterRes.kpis ?? null)
      rows = filteredRows
    } catch (err) {
      console.error(err)
    }

    try {
      const chartRes = await InventoryPileupService.getCharts(rows)
      setCharts(chartRes)
    } catch (err) {
      console.error(err)
      setCharts({})
    }

    try {
      const mlRes = await InventoryPileupService.automl(rows)
      setMlResult(mlRes)
    } catch (err) {
      console.error(err)
      setMlResult(null)
    }

    try {
      const simRes = await InventoryPileupService.simulate({
        data: rows,
        dem_pct: simulatorParams.demPct,
        prod_pct: simulatorParams.prodPct,
        proc_pct: simulatorParams.procPct,
        ss_pct: simulatorParams.ssPct,
        lt_pct: simulatorParams.ltPct,
      })
      setSimulator(simRes)
    } catch (err) {
      console.error(err)
      setSimulator(null)
    }

    try {
      const insightRes = await InventoryPileupService.getInsights(rows)
      setInsights(insightRes.insights ?? [])
    } catch (err) {
      console.error(err)
      setInsights([])
    }
  }

  async function applyFilters() {
    setError(null)
    setLoading(true)
    try {
      await analyzeRows(data, selectedSkus, dateStart, dateEnd)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(file: File) {
    setUploadFile(file)
    setError(null)
    setLoading(true)

    try {
      const uploadRes = await InventoryPileupService.uploadCsv(file)
      setData(uploadRes.data ?? [])
      setFiltered(uploadRes.data ?? [])
      setPreviewRows(uploadRes.preview ?? [])
      setDatasetPreviewRows(uploadRes.preview ?? [])
      setSkus(((uploadRes as any).skus ?? []).map(String))
      setSelectedSkus([])
      setDateStart('')
      setDateEnd('')
      setMode('upload')
      setStatusMessage('CSV uploaded successfully. Review the preview and map columns if needed.')
      await analyzeRows(uploadRes.data ?? [], [], '', '')
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGetColumns(file: File) {
    const res = await InventoryPileupService.getCsvColumns(file)
    setFileColumns(res.columns ?? [])
    setMapping(Object.fromEntries(((res as any).required_cols ?? REQUIRED_FIELDS).map((field: string) => [field, ''])))
    setMode('mapping')
  }

  async function applyMapping() {
    if (!uploadFile) return

    setError(null)
    setLoading(true)
    try {
      const res = await InventoryPileupService.applyMapping(uploadFile, mapping)
      setData(res.data ?? [])
      setFiltered(res.data ?? [])
      setPreviewRows(res.preview ?? [])
      setDatasetPreviewRows(res.preview ?? [])
      setStatusMessage('Mapping applied successfully. Review the transformed dataset below.')
      await analyzeRows(res.data ?? [], [], '', '')
    } catch (err: any) {
      setError(err?.message ?? 'Mapping failed.')
    } finally {
      setLoading(false)
    }
  }

  function downloadRows(rows: any[], filename: string) {
    InventoryPileupService.downloadCsv(rows, filename)
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'attributes', label: 'Important Attributes' },
    { key: 'application', label: 'Application' },
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F8FBFF_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Back button */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-slate-700 border-slate-200 bg-white hover:bg-slate-50 hover:-translate-y-0.5 transition active:translate-y-0 shadow-sm"
          >
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Hero Banner */}
        <div className="mb-10 rounded-[32px] border border-[#E2E8F0] bg-white px-10 py-12 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#0F766E]">
            Manufacturing &nbsp;•&nbsp; Inventory Pileup &amp; Shortage Analytics Lab
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#0F172A] sm:text-5xl">
            Inventory Pileup &amp; Shortage Analytics Lab
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-600">
            Track demand vs supply, predict stock risks, and simulate inventory strategies to balance working capital with service levels across all SKUs.
          </p>
        </div>

        {/* Custom Pill Tabs */}
        <div className="mb-8 flex flex-wrap gap-2 rounded-full border border-slate-200 bg-white p-1.5 shadow-sm w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-[#0F766E] text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Intro Card */}
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Overview</p>
              <h2 className="mt-3 text-3xl font-bold text-[#0F172A]">What This Lab Does</h2>
              <p className="mt-4 max-w-3xl text-slate-600 leading-relaxed">
                This lab monitors SKU-level demand, production, procurement, and inventory to prevent stockouts and excess pileups — giving supply chain teams a single decision workspace driven by data and ML.
              </p>
            </section>

            {/* Capabilities & Business Impact */}
            <div className="grid gap-6 md:grid-cols-2">
              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-[#ECFDF5] p-3">
                    <Sparkles className="h-5 w-5 text-[#0F766E]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#0F172A]">Capabilities</h3>
                </div>
                <ul className="space-y-3">
                  {OVERVIEW_FEATURES.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0F766E]" />
                      <span className="text-slate-600 text-sm leading-relaxed">{feat}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-[#EFF6FF] p-3">
                    <TrendingUp className="h-5 w-5 text-[#2563EB]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#0F172A]">Business Impact</h3>
                </div>
                <ul className="space-y-3">
                  {BUSINESS_IMPACT.map((impact) => (
                    <li key={impact} className="flex items-start gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2563EB]" />
                      <span className="text-slate-600 text-sm leading-relaxed">{impact}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* KPI Metrics Grid */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                icon={<Package className="h-5 w-5 text-[#0F766E]" />}
                label="Active SKUs"
                value={kpis?.active_skus != null ? String(kpis.active_skus) : '—'}
                accent="bg-[#ECFDF5]"
              />
              <MetricCard
                icon={<BarChart3 className="h-5 w-5 text-[#2563EB]" />}
                label="Avg Inventory Level"
                value={formatMetric(kpis?.avg_inventory)}
                accent="bg-[#EFF6FF]"
              />
              <MetricCard
                icon={<AlertCircle className="h-5 w-5 text-[#DC2626]" />}
                label="Shortage Incidents"
                value={kpis?.shortage_events != null ? String(kpis.shortage_events) : '—'}
                accent="bg-[#FEF2F2]"
              />
              <MetricCard
                icon={<Settings className="h-5 w-5 text-[#F59E0B]" />}
                label="Pileup Incidents"
                value={kpis?.pileup_events != null ? String(kpis.pileup_events) : '—'}
                accent="bg-[#FFFBEB]"
              />
              <MetricCard
                icon={<Percent className="h-5 w-5 text-[#7C3AED]" />}
                label="Service Level"
                value={formatPercent(kpis?.service_level_pct)}
                accent="bg-[#F5F3FF]"
              />
            </div>

            {/* Who Should Use This */}
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Target Users</p>
              <h3 className="mt-3 text-2xl font-bold text-[#0F172A]">Who Should Use This</h3>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Supply chain managers, production planners, inventory controllers, plant heads, and finance teams requiring SKU-level inventory visibility to prevent stockouts and reduce working capital tied up in excess stock.
              </p>
            </section>
          </div>
        )}

        {/* ── IMPORTANT ATTRIBUTES TAB ── */}
        {activeTab === 'attributes' && (
          <div className="space-y-6">
            {/* Required Columns Chips */}
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Schema</p>
              <h2 className="mt-3 text-2xl font-bold text-[#0F172A]">Required Columns</h2>
              <p className="mt-3 text-slate-600">These columns are validated against the backend required columns list and are required for the full workflow.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {REQUIRED_FIELDS.map((field) => (
                  <Chip key={field} className="border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]">{field}</Chip>
                ))}
              </div>
            </section>

            {/* Data Dictionary Table */}
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Reference</p>
              <h2 className="mt-3 text-2xl font-bold text-[#0F172A]">Data Dictionary</h2>
              <p className="mt-3 mb-6 text-slate-600">Business definitions for all 17 required fields.</p>
              <div className="overflow-hidden rounded-3xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                      <TableHead className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">Field</TableHead>
                      <TableHead className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100">
                    {REQUIRED_FIELDS.map((field) => (
                      <TableRow key={field} className="hover:bg-slate-50/50">
                        <TableCell className="px-4 py-3.5 font-semibold text-slate-800 text-sm whitespace-nowrap">{field}</TableCell>
                        <TableCell className="px-4 py-3.5 text-slate-600 text-sm">{REQUIRED_DESCRIPTIONS[field]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            {/* Variable Roles */}
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Model Variables</p>
              <h2 className="mt-3 text-2xl font-bold text-[#0F172A]">Variable Roles</h2>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-[#BFDBFE] bg-[#EFF6FF] p-6">
                  <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[#1D4ED8]">Independent Variables</p>
                  <div className="flex flex-wrap gap-2">
                    {['Daily_Demand', 'Predicted_Demand', 'Forecast_Error', 'Production_Qty', 'Production_Delay_Hrs', 'Procurement_Qty', 'Procurement_Delay_Hrs', 'Inventory_Level', 'Safety_Stock', 'Stock_Turnover', 'Backorder_Qty', 'Wastage_Qty'].map((item) => (
                      <Chip key={item} className="border-[#BFDBFE] bg-white text-[#1D4ED8]">{item}</Chip>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-[#A7F3D0] bg-[#ECFDF5] p-6">
                  <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[#0F766E]">Dependent Variables</p>
                  <div className="flex flex-wrap gap-2">
                    {['Lead_Time_Days', 'Shortage_Flag', 'Pileup_Flag'].map((item) => (
                      <Chip key={item} className="border-[#A7F3D0] bg-white text-[#0F766E]">{item}</Chip>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ── APPLICATION TAB ── */}
        {activeTab === 'application' && (
          <div className="space-y-6">

            {/* Step 1: Dataset Options */}
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 1</p>
              <h2 className="mt-2 text-2xl font-bold text-[#0F172A]">Dataset Options</h2>
              <p className="mt-2 text-slate-600">Choose how to load your inventory data.</p>

              <div className="mt-6 flex flex-wrap gap-3">
                {/* Load Default */}
                <Button
                  type="button"
                  onClick={() => { void loadDefault() }}
                  disabled={loading}
                  className={`rounded-full px-6 py-3 font-semibold transition hover:-translate-y-0.5 active:translate-y-0 ${
                    mode === 'default'
                      ? 'bg-[#0F766E] text-white shadow-md hover:bg-[#0E6962]'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {loading && mode === 'default' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <SquareStack className="mr-2 h-4 w-4" />
                  )}
                  Load Default Data
                </Button>

                {/* Upload CSV */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className={`rounded-full px-6 py-3 font-semibold transition hover:-translate-y-0.5 active:translate-y-0 ${
                    mode === 'upload'
                      ? 'border-[#0F766E] bg-[#ECFDF5] text-[#0F766E]'
                      : ''
                  }`}
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  Upload CSV
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleUpload(file)
                  }}
                />

                {/* Upload CSV + Manual Mapping */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => mappingInputRef.current?.click()}
                  disabled={loading}
                  className={`rounded-full px-6 py-3 font-semibold transition hover:-translate-y-0.5 active:translate-y-0 ${
                    mode === 'mapping'
                      ? 'border-[#0F766E] bg-[#ECFDF5] text-[#0F766E]'
                      : ''
                  }`}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Upload CSV + Manual Mapping
                </Button>
                <input
                  ref={mappingInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleGetColumns(file)
                  }}
                />
              </div>

              {/* Status / Error messages */}
              {statusMessage && (
                <div className="mt-5 rounded-2xl border border-emerald-100 bg-[#ECFDF5] p-4 text-sm font-medium text-[#0F766E]">
                  {statusMessage}
                </div>
              )}
              {error && (
                <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                  {error}
                </div>
              )}
            </section>

            {/* Manual Column Mapping */}
            {mode === 'mapping' && fileColumns.length > 0 && (
              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Mapping</p>
                <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Column Mapping</h3>
                <p className="mt-2 mb-6 text-slate-600">Map your CSV columns to the required fields for the analysis.</p>
                <div className="space-y-3">
                  {REQUIRED_FIELDS.map((field) => (
                    <MappingRow
                      key={field}
                      field={field}
                      columns={fileColumns}
                      value={mapping[field] ?? ''}
                      onChange={(val) => setMapping((prev) => ({ ...prev, [field]: val }))}
                    />
                  ))}
                </div>
                <div className="mt-6">
                  <Button
                    type="button"
                    onClick={() => void applyMapping()}
                    disabled={loading}
                    className="rounded-full px-8 py-3 font-bold bg-[#0F766E] text-white hover:bg-[#0E6962] hover:-translate-y-0.5 transition active:translate-y-0"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Apply Mapping
                  </Button>
                </div>
              </section>
            )}

            {data.length > 0 && (
              <>
                {/* Default Dataset Preview */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Preview</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Dataset Preview</h3>
                      <p className="mt-2 text-slate-600">Review the loaded dataset before applying filters.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        onClick={() => void loadDefault()}
                        disabled={loading}
                        className="rounded-full px-6 py-3 font-bold bg-[#0F766E] text-white hover:bg-[#0E6962] hover:-translate-y-0.5 transition active:translate-y-0"
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SquareStack className="mr-2 h-4 w-4" />}
                        Load Default Dataset
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void downloadRows(data.length ? data : datasetPreviewRows, 'default_dataset.csv')}
                        className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Sample Data
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-3xl border border-slate-200">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 border-b border-slate-200">
                            {datasetPreviewColumns.map((key) => (
                              <TableHead key={key} className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4 whitespace-nowrap">{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100">
                          {(datasetPreviewRows.length ? datasetPreviewRows : data.slice(0, 10)).map((row, index) => (
                            <TableRow key={index} className="border-slate-100 hover:bg-slate-50/50">
                              {datasetPreviewColumns.map((key) => (
                                <TableCell key={`${index}-${key}`} className="px-4 py-3.5 text-slate-700 text-sm max-w-[160px] truncate">{formatCell(row[key])}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </section>

                {/* Step 2: Filters */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 2</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Filters &amp; Preview</h3>
                      <p className="mt-2 text-slate-600">Filter by SKU and date range to update metrics and downstream analytics.</p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => void applyFilters()}
                      disabled={loading}
                      className="rounded-full px-8 py-3 font-bold bg-[#0F766E] text-white hover:bg-[#0E6962] hover:-translate-y-0.5 transition active:translate-y-0"
                    >
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Apply Filters
                    </Button>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* SKU Filter */}
                    <SelectableFilter
                      label="SKU"
                      values={skus}
                      selected={selectedSkus}
                      onToggle={(sku) =>
                        setSelectedSkus((prev) =>
                          prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku]
                        )
                      }
                    />

                    {/* Date Range */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-[#0F766E]/30">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                        <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#0F766E]">Date Range</p>
                        <CalendarRange className="h-4 w-4 text-[#0F766E]" />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm text-slate-600">
                          <span className="mb-1.5 block font-semibold text-slate-700">Start Date</span>
                          <input
                            type="date"
                            value={dateStart}
                            onChange={(e) => setDateStart(e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40"
                          />
                        </label>
                        <label className="text-sm text-slate-600">
                          <span className="mb-1.5 block font-semibold text-slate-700">End Date</span>
                          <input
                            type="date"
                            value={dateEnd}
                            onChange={(e) => setDateEnd(e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Filter Summary */}
                  <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Filter Summary</p>
                    <p className="mt-1 text-2xl font-bold text-[#0F172A]">
                      {filtered.length} <span className="text-base font-semibold text-slate-400">filtered rows</span>
                    </p>
                  </div>
                </section>

                {/* Filtered Preview Table */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Preview</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Filtered Data Preview</h3>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void downloadRows(filtered.length ? filtered : data, 'filtered_inventory_data.csv')}
                      className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Filtered Data
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-3xl border border-slate-200">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 border-b border-slate-200">
                            {tableColumns.map((key) => (
                              <TableHead key={key} className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4 whitespace-nowrap">{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100">
                          {dataPreview.map((row, index) => (
                            <TableRow key={index} className="border-slate-100 hover:bg-slate-50/50">
                              {tableColumns.map((key) => (
                                <TableCell key={`${index}-${key}`} className="px-4 py-3.5 text-slate-700 text-sm max-w-[160px] truncate">{formatCell(row[key])}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </section>

                {/* Dynamic Key Metrics */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Metrics</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A] mb-6">Dynamic Key Metrics</h3>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <MetricCard
                      icon={<Package className="h-5 w-5 text-[#0F766E]" />}
                      label="Active SKUs"
                      value={kpis?.active_skus != null ? String(kpis.active_skus) : '—'}
                      accent="bg-[#ECFDF5]"
                    />
                    <MetricCard
                      icon={<BarChart3 className="h-5 w-5 text-[#2563EB]" />}
                      label="Avg Inventory"
                      value={formatMetric(kpis?.avg_inventory)}
                      accent="bg-[#EFF6FF]"
                    />
                    <MetricCard
                      icon={<AlertCircle className="h-5 w-5 text-[#DC2626]" />}
                      label="Shortage Events"
                      value={kpis?.shortage_events != null ? String(kpis.shortage_events) : '—'}
                      accent="bg-[#FEF2F2]"
                    />
                    <MetricCard
                      icon={<Settings className="h-5 w-5 text-[#F59E0B]" />}
                      label="Pileup Events"
                      value={kpis?.pileup_events != null ? String(kpis.pileup_events) : '—'}
                      accent="bg-[#FFFBEB]"
                    />
                    <MetricCard
                      icon={<Percent className="h-5 w-5 text-[#7C3AED]" />}
                      label="Service Level"
                      value={formatPercent(kpis?.service_level_pct)}
                      accent="bg-[#F5F3FF]"
                    />
                  </div>
                </section>

                {/* Exploratory Charts */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Exploratory Analysis</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A] mb-6">Charts &amp; Visualisations</h3>
                  <div className="grid gap-6">

                    {/* Inventory Level Over Time */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h4 className="text-lg font-bold text-[#0F172A] mb-4">Inventory Level Over Time</h4>
                      <div className="h-[400px]">
                        {charts.inventory_over_time?.length ? (
                          <Plot
                            data={(() => {
                              const records = charts.inventory_over_time ?? []
                              const grouped = new Map<string, Array<{ x: string; y: number }>>()
                              for (const record of records) {
                                const sku = String(record.SKU ?? 'Unknown')
                                const entry = { x: String(record.Date ?? ''), y: Number(record.Inventory_Level ?? 0) }
                                const existing = grouped.get(sku) ?? []
                                existing.push(entry)
                                grouped.set(sku, existing)
                              }
                              return Array.from(grouped.entries()).map(([name, values], index) => ({
                                x: values.map((item) => item.x),
                                y: values.map((item) => item.y),
                                type: 'scatter' as const,
                                mode: 'lines+markers' as const,
                                name,
                                line: { color: ['#0F766E', '#2563EB', '#F59E0B', '#DC2626', '#7C3AED'][index % 5] },
                              }))
                            })()}
                            layout={{ ...commonLayout, xaxis: { title: 'Date' }, yaxis: { title: 'Inventory Level' } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-slate-400">No inventory trend data yet.</div>
                        )}
                      </div>
                    </div>

                    {/* Demand vs Production */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h4 className="text-lg font-bold text-[#0F172A] mb-4">Demand vs Production</h4>
                      <div className="h-[400px]">
                        {charts.demand_vs_production?.length ? (
                          <Plot
                            data={[
                              {
                                x: (charts.demand_vs_production ?? []).map((item: any) => item.Date),
                                y: (charts.demand_vs_production ?? []).map((item: any) => item.Total_Demand ?? 0),
                                type: 'scatter',
                                mode: 'lines+markers',
                                name: 'Total Demand',
                                line: { color: '#0F766E' },
                              },
                              {
                                x: (charts.demand_vs_production ?? []).map((item: any) => item.Date),
                                y: (charts.demand_vs_production ?? []).map((item: any) => item.Total_Production ?? 0),
                                type: 'scatter',
                                mode: 'lines+markers',
                                name: 'Total Production',
                                line: { color: '#2563EB' },
                              },
                            ]}
                            layout={{ ...commonLayout, xaxis: { title: 'Date' }, yaxis: { title: 'Quantity' } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-slate-400">No demand and production trend data yet.</div>
                        )}
                      </div>
                    </div>

                    {/* Safety Stock Breach Heatmap */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h4 className="text-lg font-bold text-[#0F172A] mb-4">Safety Stock Breach Heatmap</h4>
                      <div className="h-[400px]">
                        {charts.safety_stock_breach?.length ? (() => {
                          const records = charts.safety_stock_breach ?? []
                          const skuList = Array.from(new Set(records.map((item: any) => String(item.SKU ?? 'Unknown'))))
                          const dates = Array.from(new Set(records.map((item: any) => String(item.Date_only ?? ''))))
                          const z = skuList.map((sku) => dates.map((date) => {
                            const match = records.find((item: any) => String(item.SKU ?? 'Unknown') === sku && String(item.Date_only ?? '') === date)
                            return match ? Number(match.Breach ?? 0) : 0
                          }))
                          return (
                            <Plot
                              data={[{ z, x: dates, y: skuList, type: 'heatmap', colorscale: [[0, '#FDE68A'], [1, '#DC2626']], hovertemplate: 'SKU: %{y}<br>Date: %{x}<br>Breach: %{z}<extra></extra>' }]}
                              layout={{ ...commonLayout, margin: { l: 80, r: 20, t: 20, b: 60 }, xaxis: { title: 'Date' }, yaxis: { title: 'SKU' } }}
                              useResizeHandler
                              style={{ width: '100%', height: '100%' }}
                            />
                          )
                        })() : (
                          <div className="flex h-full items-center justify-center text-sm text-slate-400">No breach data available yet.</div>
                        )}
                      </div>
                    </div>

                    {/* Shortage vs Pileup Events */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h4 className="text-lg font-bold text-[#0F172A] mb-4">Shortage vs Pileup Events</h4>
                      <div className="h-[400px]">
                        {charts.shortage_vs_pileup?.length ? (
                          <Plot
                            data={[{
                              x: (charts.shortage_vs_pileup ?? []).map((item: any) => item.Type),
                              y: (charts.shortage_vs_pileup ?? []).map((item: any) => item.Events),
                              type: 'bar',
                              marker: { color: ['#F59E0B', '#0F766E'] },
                            }]}
                            layout={{ ...commonLayout, xaxis: { title: 'Event' }, yaxis: { title: 'Count' } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-slate-400">No event summary data yet.</div>
                        )}
                      </div>
                    </div>

                    {/* Lead Time Distribution */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h4 className="text-lg font-bold text-[#0F172A] mb-4">Lead Time Distribution</h4>
                      <div className="h-[400px]">
                        {charts.lead_time_distribution?.length ? (
                          <Plot
                            data={[{
                              x: (charts.lead_time_distribution ?? []).map((item: any) => (Number(item.bin_start) + Number(item.bin_end)) / 2),
                              y: (charts.lead_time_distribution ?? []).map((item: any) => item.count),
                              type: 'bar',
                              marker: { color: '#2563EB' },
                            }]}
                            layout={{ ...commonLayout, xaxis: { title: 'Lead Time (Days)' }, yaxis: { title: 'Frequency' } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-slate-400">No lead-time distribution data yet.</div>
                        )}
                      </div>
                    </div>

                    {/* Inventory Forecast */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h4 className="text-lg font-bold text-[#0F172A] mb-4">Inventory Forecast</h4>
                      <div className="h-[400px]">
                        {charts.inventory_forecast?.length ? (
                          <Plot
                            data={[
                              {
                                x: (charts.inventory_forecast ?? []).map((item: any) => item.Date),
                                y: (charts.inventory_forecast ?? []).map((item: any) => item.Inventory_Level ?? null),
                                type: 'scatter', mode: 'lines+markers', name: 'Actual', line: { color: '#0F766E' },
                              },
                              {
                                x: (charts.inventory_forecast ?? []).map((item: any) => item.Date),
                                y: (charts.inventory_forecast ?? []).map((item: any) => item.MA_7 ?? null),
                                type: 'scatter', mode: 'lines+markers', name: '7-day MA', line: { color: '#2563EB' },
                              },
                              {
                                x: (charts.inventory_forecast ?? []).map((item: any) => item.Date),
                                y: (charts.inventory_forecast ?? []).map((item: any) => item.MA_30 ?? null),
                                type: 'scatter', mode: 'lines+markers', name: '30-day MA', line: { color: '#F59E0B' },
                              },
                              {
                                x: (charts.inventory_forecast ?? []).map((item: any) => item.Date),
                                y: (charts.inventory_forecast ?? []).map((item: any) => item.Naive_Forecast ?? null),
                                type: 'scatter', mode: 'lines+markers', name: 'Naive Forecast', line: { color: '#DC2626' },
                              },
                            ]}
                            layout={{ ...commonLayout, xaxis: { title: 'Date' }, yaxis: { title: 'Inventory Level' } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-slate-400">No inventory forecast data yet.</div>
                        )}
                      </div>
                    </div>

                  </div>
                </section>

                {/* AutoML Section */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">AutoML</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">AutoML: Lead Time Prediction</h3>
                      <p className="mt-2 text-slate-600">The backend trains Linear Regression, RandomForest, and Gradient Boosting models and compares RMSE, MAE, and R².</p>
                    </div>
                    {predictionRows.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void downloadRows(predictionRows, 'ml_predictions.csv')}
                        className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download ML Predictions
                      </Button>
                    )}
                  </div>

                  {mlResult?.model_comparison?.length ? (
                    <>
                      {/* Model comparison table */}
                      <div className="overflow-hidden rounded-3xl border border-slate-200 mb-6">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50 border-b border-slate-200">
                              <TableHead className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">Model</TableHead>
                              <TableHead className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">RMSE</TableHead>
                              <TableHead className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">MAE</TableHead>
                              <TableHead className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">R²</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-slate-100">
                            {mlResult.model_comparison.map((row: any, index: number) => (
                              <TableRow
                                key={`${row.Model}-${index}`}
                                className={`border-slate-100 hover:bg-slate-50/50 ${row.Model === mlResult?.best_model ? 'bg-emerald-50/70 hover:bg-emerald-50' : ''}`}
                              >
                                <TableCell className="px-4 py-3.5 font-semibold text-slate-800 text-sm">{row.Model}</TableCell>
                                <TableCell className="px-4 py-3.5 text-slate-700 text-sm">{formatMetric(row.RMSE)}</TableCell>
                                <TableCell className="px-4 py-3.5 text-slate-700 text-sm">{formatMetric(row.MAE)}</TableCell>
                                <TableCell className="px-4 py-3.5 text-slate-700 text-sm font-semibold">{formatMetric(row.R2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {mlResult?.best_model && (
                        <div className="mb-6 rounded-2xl border border-emerald-100 bg-[#ECFDF5] p-4 text-sm font-bold text-[#0F766E] shadow-sm">
                          Selected Best Model: {mlResult.best_model} (highest R²)
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-500 mb-6">AutoML results will appear once the backend has enough rows to train the models.</p>
                  )}

                  {/* Predictions table */}
                  {predictionRows.length > 0 && (
                    <div className="overflow-hidden rounded-3xl border border-slate-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 border-b border-slate-200">
                            <TableHead className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">SKU</TableHead>
                            <TableHead className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">Date</TableHead>
                            <TableHead className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">Actual Lead Time (Days)</TableHead>
                            <TableHead className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">Predicted Lead Time (Days)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100">
                          {predictionRows.map((row: any, index: number) => (
                            <TableRow key={`${row.sku}-${row.date}-${index}`} className="border-slate-100 hover:bg-slate-50/50">
                              <TableCell className="px-4 py-3.5 font-semibold text-slate-800 text-sm">{formatCell(row.sku)}</TableCell>
                              <TableCell className="px-4 py-3.5 text-slate-700 text-sm">{formatCell(row.date)}</TableCell>
                              <TableCell className="px-4 py-3.5 text-slate-700 text-sm">{formatMetric(row.lead_time_days == null ? null : Number(row.lead_time_days))}</TableCell>
                              <TableCell className="px-4 py-3.5 text-[#0F766E] text-sm font-bold">{formatMetric(row.predicted_lead_time_days == null ? null : Number(row.predicted_lead_time_days))}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </section>

                {/* Inventory Strategy Simulator */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Simulation</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Inventory Strategy Simulator</h3>
                      <p className="mt-2 text-slate-600">Adjust demand, production, procurement, and safety stock assumptions to compare simulated inventory outcomes.</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 mb-6">
                    {[
                      { key: 'demPct', label: 'Demand Change (%)', min: -50, max: 50 },
                      { key: 'prodPct', label: 'Production Change (%)', min: -50, max: 50 },
                      { key: 'procPct', label: 'Procurement Change (%)', min: -50, max: 50 },
                      { key: 'ssPct', label: 'Safety Stock Change (%)', min: -50, max: 50 },
                      { key: 'ltPct', label: 'Lead Time Change (%)', min: -50, max: 50 },
                    ].map((slider) => {
                      const value = simulatorParams[slider.key as keyof typeof simulatorParams] ?? 0
                      return (
                        <div key={slider.key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-[#0F766E]/30 transition">
                          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 mb-3">
                            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#0F766E]">{slider.label}</span>
                            <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-xs font-semibold text-[#0F766E]">{value}%</span>
                          </div>
                          <div className="px-1 py-2">
                            <input
                              type="range"
                              min={slider.min}
                              max={slider.max}
                              step={1}
                              value={value}
                              onChange={(e) => setSimulatorParams((prev) => ({ ...prev, [slider.key]: Number(e.target.value) }))}
                              className="w-full accent-[#0F766E]"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mb-6">
                    <Button
                      type="button"
                      onClick={() => void analyzeRows(filtered.length ? filtered : data, selectedSkus, dateStart, dateEnd)}
                      disabled={loading}
                      className="rounded-full px-8 py-3 font-bold bg-[#0F766E] text-white hover:bg-[#0E6962] hover:-translate-y-0.5 transition active:translate-y-0"
                    >
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Run Simulation
                    </Button>
                  </div>

                  {simulator && (
                    <div className="mt-2 grid gap-4 md:grid-cols-3 mb-6">
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.18em]">Shortage Rate (New)</p>
                        <p className="mt-2 text-3xl font-bold text-[#0F172A]">{formatPercent(simulator.shortage_rate_new)}</p>
                      </div>
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.18em]">Pileup Rate (New)</p>
                        <p className="mt-2 text-3xl font-bold text-[#0F172A]">{formatPercent(simulator.pileup_rate_new)}</p>
                      </div>
                      <div className="rounded-3xl border border-emerald-100 bg-[#ECFDF5] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                        <p className="text-sm font-bold text-[#0F766E] uppercase tracking-[0.18em]">Avg Inventory (New)</p>
                        <p className="mt-2 text-3xl font-bold text-[#0F766E]">{formatMetric(simulator.avg_inventory_new)}</p>
                      </div>
                    </div>
                  )}

                  {simulator?.sku_simulation?.length ? (
                    <div className="overflow-hidden rounded-3xl border border-slate-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 border-b border-slate-200">
                            {['SKU', 'Sim Inventory', 'Sim Shortage Rate', 'Sim Pileup Rate'].map((col) => (
                              <TableHead key={col} className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">{col}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100">
                          {simulator.sku_simulation.slice(0, 15).map((row: any, index: number) => (
                            <TableRow key={`${row.SKU}-${index}`} className="border-slate-100 hover:bg-slate-50/50">
                              <TableCell className="px-4 py-3.5 font-semibold text-slate-800 text-sm">{row.SKU}</TableCell>
                              <TableCell className="px-4 py-3.5 text-slate-700 text-sm">{formatMetric(row.Sim_Inventory)}</TableCell>
                              <TableCell className="px-4 py-3.5 text-slate-700 text-sm">{formatPercent(row.Sim_Shortage_Rate ? row.Sim_Shortage_Rate * 100 : null)}</TableCell>
                              <TableCell className="px-4 py-3.5 text-[#0F766E] text-sm font-bold">{formatPercent(row.Sim_Pileup_Rate ? row.Sim_Pileup_Rate * 100 : null)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : null}
                </section>

                {/* Automated Insights */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Insights</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Automated Insights</h3>
                      <p className="mt-2 text-slate-600">The backend generates high-risk SKU insights from the current filtered dataset.</p>
                    </div>
                    {insights.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void downloadRows(insights, 'automated_insights.csv')}
                        className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Insights
                      </Button>
                    )}
                  </div>

                  {insights.length ? (
                    <div className="overflow-hidden rounded-3xl border border-slate-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 border-b border-slate-200">
                            {['Insight Type', 'SKU', 'Metric', 'Value'].map((col) => (
                              <TableHead key={col} className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">{col}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100">
                          {insights.map((row: any, index: number) => (
                            <TableRow key={`${row.Insight_Type}-${row.SKU}-${index}`} className="border-slate-100 hover:bg-slate-50/50">
                              <TableCell className="px-4 py-3.5 font-bold text-slate-900 text-sm">{row.Insight_Type}</TableCell>
                              <TableCell className="px-4 py-3.5 text-slate-700 text-sm">{row.SKU}</TableCell>
                              <TableCell className="px-4 py-3.5 text-slate-700 text-sm">{row.Metric}</TableCell>
                              <TableCell className="px-4 py-3.5 text-[#0F766E] text-sm font-semibold">{formatCell(row.Value)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-slate-500">Insights will appear after the backend processes the filtered dataset.</p>
                  )}
                </section>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
