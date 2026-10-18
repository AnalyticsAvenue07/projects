import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Plot from 'react-plotly.js'
import {
  Download,
  FileText,
  UploadCloud,
  X,
  ChevronLeft,
  Loader2,
  Sparkles,
  SquareStack,
  Clock,
  Settings,
  TrendingUp,
  Cpu,
  Package,
  AlertCircle,
  Percent,
  CalendarRange,
  BarChart3,
  Lightbulb,
  PlaySquare,
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'
import { Slider } from '@/app/components/ui/slider'

import { OrderFulfillmentService } from '@/services/orderFulfillmentService'

const REQUIRED_FIELDS = [
  'Order_ID',
  'Customer_ID',
  'Order_Date',
  'Warehouse',
  'Region',
  'Product_Type',
  'Channel',
  'Processing_Delay_Hrs',
  'Picking_Delay_Hrs',
  'Packing_Delay_Hrs',
  'Dispatch_Delay_Hrs',
  'Transport_Delay_Hrs',
  'Total_Fulfillment_Hours',
  'SLA_Hours',
  'SLA_Breach_Flag',
  'Order_Qty',
  'Fulfilled_Qty',
  'Qty_Accuracy',
  'Short_Ship_Flag',
  'Root_Cause',
  'Priority',
  'Fulfillment_Completed_At',
  'Shipping_Cost',
  'Delay_Cost',
]

const REQUIRED_DESCRIPTIONS: Record<string, string> = {
  Order_ID: 'Unique identifier for each customer order',
  Customer_ID: 'Identifier of the customer placing the order',
  Order_Date: 'Date when the order was placed by the customer',
  Warehouse: 'The specific warehouse facility processing the order',
  Region: 'Geographic market area for the customer delivery',
  Product_Type: 'The category or classification of product being sold',
  Channel: 'Sales channel used to place the order (e.g. Retail, Online)',
  Processing_Delay_Hrs: 'Order processing delay at warehouse (hours)',
  Picking_Delay_Hrs: 'Warehouse order picking delay (hours)',
  Packing_Delay_Hrs: 'Warehouse order packing delay (hours)',
  Dispatch_Delay_Hrs: 'Delay between packing completion and shipment dispatch (hours)',
  Transport_Delay_Hrs: 'Transit and shipping transport duration (hours)',
  Total_Fulfillment_Hours: 'Total elapsed fulfillment duration from order to delivery (hours)',
  SLA_Hours: 'Committed delivery time limit contractually promised (hours)',
  SLA_Breach_Flag: 'Binary flag: 1 if total fulfillment hours exceeded SLA limit',
  Order_Qty: 'Ordered product quantity in units',
  Fulfilled_Qty: 'Actual shipped product quantity in units',
  Qty_Accuracy: 'Fulfillment accuracy ratio (fulfilled quantity / ordered quantity)',
  Short_Ship_Flag: 'Binary flag: 1 if fulfilled quantity is less than ordered quantity',
  Root_Cause: 'Attributed primary cause for any delay or fulfillment issue',
  Priority: 'Order priority tier (High, Medium, Low)',
  Fulfillment_Completed_At: 'Timestamp when delivery/fulfillment was completed',
  Shipping_Cost: 'Monetary transport shipping cost',
  Delay_Cost: 'Monetary penalty cost incurred due to fulfillment delays',
}

const OVERVIEW_FEATURES = [
  'SLA breach prediction and root-cause attribution',
  'Order-level and warehouse-level EDA & time-series trends',
  'Fulfillment accuracy and short-ship detection',
  'Clustering of order archetypes and exportable playbooks',
]

const BUSINESS_IMPACT = [
  'Improved on-time delivery and SLA compliance',
  'Reduced rush logistics and penalty costs',
  'Higher customer satisfaction and lower churn',
  'Better capacity planning and inventory alignment',
]

const commonLayout = {
  template: 'plotly' as const,
  paper_bgcolor: '#ffffff',
  plot_bgcolor: '#ffffff',
  margin: { l: 60, r: 20, t: 40, b: 60 },
  font: {
    family: 'Inter, sans-serif',
    size: 11,
    color: '#2e2e2e',
  },
  legend: {
    orientation: 'v' as const,
    x: 1.02,
    y: 1,
  },
}

type TabKey = 'overview' | 'attributes' | 'application' | 'insights'

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
          <p className="text-sm font-bold text-slate-800 tracking-tight uppercase">{label}</p>
          <p className="mt-1 text-2xl font-black text-[#0F172A]">{value}</p>
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

async function downloadRows(rows: any[], filename: string) {
  if (!rows || !rows.length) return
  const header = Object.keys(rows[0] ?? {}).join(',')
  const body = rows.map((r) => Object.values(r ?? {}).map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : String(v ?? '')).join(',')).join('\n')
  const blob = new Blob([[header, body].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') return Number.isInteger(value) ? value.toString() : value.toFixed(4)
  return String(value)
}

function formatMetric(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return value.toFixed(digits)
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toFixed(2)}%`
}

export function OrderFulfillmentSlaAnalyticsProjectPage() {
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
  const [defaultPreviewRows, setDefaultPreviewRows] = useState<any[]>([])
  const [filteredPreviewRows, setFilteredPreviewRows] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<string[]>([])
  const [productTypes, setProductTypes] = useState<string[]>([])
  const [priorities, setPriorities] = useState<string[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([])
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [dateStart, setDateStart] = useState('2023-01-01')
  const [dateEnd, setDateEnd] = useState('2023-12-31')

  const [kpis, setKpis] = useState<any>(null)
  const [charts, setCharts] = useState<any>({})
  const [clusterCount, setClusterCount] = useState(4)
  const [mlClassifier, setMlClassifier] = useState<any>(null)
  const [mlRegressor, setMlRegressor] = useState<any>(null)
  const [clustering, setClustering] = useState<any>(null)
  const [anomalies, setAnomalies] = useState<any>(null)
  const [insights, setInsights] = useState<any[]>([])
  const [playbooks, setPlaybooks] = useState<any>({})

  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [fileColumns, setFileColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})

  const defaultPreview = useMemo(() => defaultPreviewRows.slice(0, 10), [defaultPreviewRows])
  const filteredPreview = useMemo(() => filteredPreviewRows.slice(0, 10), [filteredPreviewRows])
  const uploadedPreview = useMemo(() => defaultPreviewRows.slice(0, 5), [defaultPreviewRows])

  const defaultTableColumns = useMemo(() => {
    const sample = defaultPreview[0] ?? data[0] ?? {}
    return Object.keys(sample)
  }, [defaultPreview, data])

  const filteredTableColumns = useMemo(() => {
    const sample = filteredPreview[0] ?? filtered[0] ?? data[0] ?? {}
    return Object.keys(sample)
  }, [filteredPreview, filtered, data])

  useEffect(() => {
    void loadDefault()
  }, [])

  useEffect(() => {
    if (!data.length) return
    void analyzeRows(data)
  }, [data])

  useEffect(() => {
    if (!data.length) return
    void analyzeRows(data)
  }, [selectedWarehouses, selectedProductTypes, selectedPriorities, selectedRegions, dateStart, dateEnd])

  useEffect(() => {
    if (!data.length) return
    void analyzeRows(data)
  }, [clusterCount])

  async function loadDefault() {
    setError(null)
    setLoading(true)
    setMode('default')
    try {
      const res = await OrderFulfillmentService.loadDefault()
      setData(res.data ?? [])
      setFiltered(res.data ?? [])
      setDefaultPreviewRows(res.preview ?? [])
      setFilteredPreviewRows(res.preview ?? [])
      setWarehouses((res.warehouses ?? []).map(String))
      setProductTypes((res.product_types ?? []).map(String))
      setPriorities((res.priorities ?? []).map(String))
      setRegions((res.regions ?? []).map(String))
      setStatusMessage('Default dataset loaded successfully.')
      await analyzeRows(res.data ?? [])
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load default dataset.')
    } finally {
      setLoading(false)
    }
  }

  async function analyzeRows(rows: any[]) {
    if (!rows.length) {
      setFiltered([])
      setFilteredPreviewRows([])
      setKpis(null)
      setCharts({})
      setMlClassifier(null)
      setMlRegressor(null)
      setClustering(null)
      setAnomalies(null)
      setInsights([])
      setPlaybooks({})
      return
    }

    try {
      const filterRes = await OrderFulfillmentService.filter({
        data: rows,
        warehouses: selectedWarehouses.length ? selectedWarehouses : undefined,
        product_types: selectedProductTypes.length ? selectedProductTypes : undefined,
        priorities: selectedPriorities.length ? selectedPriorities : undefined,
        regions: selectedRegions.length ? selectedRegions : undefined,
        date_start: dateStart || undefined,
        date_end: dateEnd || undefined,
      })

      const filteredRows = filterRes.data ?? rows
      setFiltered(filteredRows)
      setFilteredPreviewRows(filterRes.preview ?? filteredRows.slice(0, 10))
      setKpis(filterRes.kpis ?? null)
      rows = filteredRows
    } catch (err) {
      console.error(err)
    }

    try {
      const chartRes = await OrderFulfillmentService.getCharts(rows)
      setCharts(chartRes)
    } catch (err) {
      console.error(err)
      setCharts({})
    }

    try {
      const classifierRes = await OrderFulfillmentService.classifySla(rows)
      setMlClassifier(classifierRes)
    } catch (err) {
      console.error(err)
      setMlClassifier(null)
    }

    try {
      const regressorRes = await OrderFulfillmentService.regressFulfillment(rows)
      setMlRegressor(regressorRes)
    } catch (err) {
      console.error(err)
      setMlRegressor(null)
    }

    try {
      const clusteringRes = await OrderFulfillmentService.clusterOrders(rows, clusterCount)
      setClustering(clusteringRes)
    } catch (err) {
      console.error(err)
      setClustering(null)
    }

    try {
      const anomalyRes = await OrderFulfillmentService.detectAnomalies(rows)
      setAnomalies(anomalyRes)
    } catch (err) {
      console.error(err)
      setAnomalies(null)
    }

    try {
      const insightRes = await OrderFulfillmentService.getInsights(rows)
      setInsights(insightRes.insights ?? [])
    } catch (err) {
      console.error(err)
      setInsights([])
    }

    try {
      const playbookRes = await OrderFulfillmentService.getPlaybooks(rows)
      setPlaybooks(playbookRes)
    } catch (err) {
      console.error(err)
      setPlaybooks({})
    }
  }

  async function applyFilters() {
    setError(null)
    setLoading(true)
    try {
      await analyzeRows(data)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(file: File) {
    setUploadFile(file)
    setError(null)
    setLoading(true)
    try {
      const uploadRes = await OrderFulfillmentService.uploadCsv(file)
      setData(uploadRes.data ?? [])
      setFiltered(uploadRes.data ?? [])
      setDefaultPreviewRows(uploadRes.preview ?? [])
      setFilteredPreviewRows(uploadRes.preview ?? [])
      setWarehouses(((uploadRes as any).warehouses ?? []).map(String))
      setProductTypes(((uploadRes as any).product_types ?? []).map(String))
      setPriorities(((uploadRes as any).priorities ?? []).map(String))
      setRegions(((uploadRes as any).regions ?? []).map(String))
      setMode('upload')
      setStatusMessage('CSV uploaded successfully. Preview is ready and ML analyses can be re-run.')
      await analyzeRows(uploadRes.data ?? [])
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGetColumns(file: File) {
    const res = await OrderFulfillmentService.getCsvColumns(file)
    setFileColumns(res.columns ?? [])
    setMapping(Object.fromEntries(REQUIRED_FIELDS.map((field) => [field, ''])))
    setMode('mapping')
  }

  async function applyMapping() {
    if (!uploadFile) return
    setError(null)
    setLoading(true)
    try {
      const res = await OrderFulfillmentService.applyMapping(uploadFile, mapping)
      setData(res.data ?? [])
      setFiltered(res.data ?? [])
      setDefaultPreviewRows(res.preview ?? [])
      setFilteredPreviewRows(res.preview ?? [])
      setStatusMessage('Mapping applied successfully. The dataset is ready for analysis.')
      await analyzeRows(res.data ?? [])
    } catch (err: any) {
      setError(err?.message ?? 'Mapping failed.')
    } finally {
      setLoading(false)
    }
  }

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'attributes', label: 'Important Attributes' },
    { key: 'application', label: 'Application' },
    { key: 'insights', label: 'Automated Insights & Playbooks' },
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
            Manufacturing &nbsp;•&nbsp; Order Fulfillment &amp; SLA Analytics
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#0F172A] sm:text-5xl">
            Order Fulfillment &amp; SLA Analytics
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-600">
            Monitor fulfillment performance, predict SLA breaches, and generate action-ready playbooks to streamline logistics and warehousing operations.
          </p>
        </div>

        {/* Custom Pill Tabs */}
        <div className="mb-8 flex flex-wrap gap-2 rounded-full border border-slate-200 bg-white p-1.5 shadow-sm w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TabKey)}
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
              <h2 className="mt-3 text-3xl font-bold text-[#0F172A]">Fulfillment Optimization</h2>
              <p className="mt-4 max-w-3xl text-slate-600 leading-relaxed">
                Provide end-to-end order fulfillment visibility, predict SLA breaches, and optimize warehouse processes to meet delivery commitments consistently.
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

            {/* KPI Metrics Grid with Bold Labels */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                icon={<Package className="h-5 w-5 text-[#0F766E]" />}
                label="Orders Tracked"
                value={kpis?.orders_count != null ? String(kpis.orders_count) : '—'}
                accent="bg-[#ECFDF5]"
              />
              <MetricCard
                icon={<AlertCircle className="h-5 w-5 text-[#DC2626]" />}
                label="SLA Breach Rate"
                value={formatPercent(kpis?.sla_breach_rate)}
                accent="bg-[#FEF2F2]"
              />
              <MetricCard
                icon={<Clock className="h-5 w-5 text-[#2563EB]" />}
                label="Average Fulfillment Hours"
                value={formatMetric(kpis?.avg_fulfillment_hours) != '—' ? `${formatMetric(kpis?.avg_fulfillment_hours)} hrs` : '—'}
                accent="bg-[#EFF6FF]"
              />
              <MetricCard
                icon={<Percent className="h-5 w-5 text-[#7C3AED]" />}
                label="Quantity Accuracy"
                value={formatPercent(kpis?.qty_accuracy)}
                accent="bg-[#F5F3FF]"
              />
              <MetricCard
                icon={<Settings className="h-5 w-5 text-[#F59E0B]" />}
                label="Short-Ship Rate"
                value={formatPercent(kpis?.short_ship_rate)}
                accent="bg-[#FFFBEB]"
              />
            </div>
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
              <p className="mt-3 mb-6 text-slate-600">Business definitions for all 24 required fields.</p>
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
                        <TableCell className="px-4 py-3.5 text-slate-600 text-sm">{REQUIRED_DESCRIPTIONS[field] ?? 'No description available'}</TableCell>
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
                    {['Processing_Delay_Hrs','Picking_Delay_Hrs','Packing_Delay_Hrs','Dispatch_Delay_Hrs','Transport_Delay_Hrs','Order_Qty','Fulfilled_Qty','Qty_Accuracy','Shipping_Cost','Delay_Cost','Warehouse','Product_Type','Priority','Region','Channel'].map((item) => (
                      <Chip key={item} className="border-[#BFDBFE] bg-white text-[#1D4ED8]">{item}</Chip>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-[#A7F3D0] bg-[#ECFDF5] p-6">
                  <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[#0F766E]">Dependent Variables</p>
                  <div className="flex flex-wrap gap-2">
                    {['SLA_Breach_Flag','Total_Fulfillment_Hours','Short_Ship_Flag'].map((item) => (
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
              <p className="mt-2 text-slate-600">Choose how to load your fulfillment data.</p>

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
                  <UploadCloud className="mr-2 h-4 w-4" />
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
                {uploadFile && (
                  <div className="mb-6 flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-[#0F766E]" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{uploadFile.name}</p>
                        <p className="text-xs text-slate-500">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => { setUploadFile(null); setFileColumns([]); setMapping({}); setMode('mapping'); setStatusMessage(null); }} className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100" aria-label="Remove uploaded file">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
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
                {mode === 'default' && (
                  <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Preview</p>
                        <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Dataset Preview</h3>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          onClick={() => void loadDefault()}
                          disabled={loading}
                          className="rounded-full px-6 py-3 font-bold bg-[#0F766E] text-white hover:bg-[#0E6962] hover:-translate-y-0.5 transition active:translate-y-0"
                        >
                          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SquareStack className="mr-2 h-4 w-4" />}
                          Reload Default Data
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void downloadRows(data, 'order_fulfillment_default.csv')}
                          className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Default Data
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-3xl border border-slate-200">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50 border-b border-slate-200">
                              {defaultTableColumns.map((key) => (
                                <TableHead key={key} className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4 whitespace-nowrap">{key}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-slate-100">
                            {defaultPreview.map((row, index) => (
                              <TableRow key={index} className="border-slate-100 hover:bg-slate-50/50">
                                {defaultTableColumns.map((key) => (
                                  <TableCell key={`${index}-${key}`} className="px-4 py-3.5 text-slate-700 text-sm max-w-[160px] truncate">{formatCell(row[key])}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </section>
                )}

                {/* Step 2: Filters */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 2</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Filters &amp; Preview</h3>
                      <p className="mt-2 text-slate-600">Filter by Warehouse, Product, Priority, Region, and date range.</p>
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

                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    <SelectableFilter label="Warehouse" values={warehouses} selected={selectedWarehouses} onToggle={(val) => setSelectedWarehouses((prev) => prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val])} />
                    <SelectableFilter label="Product Type" values={productTypes} selected={selectedProductTypes} onToggle={(val) => setSelectedProductTypes((prev) => prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val])} />
                    <SelectableFilter label="Priority" values={priorities} selected={selectedPriorities} onToggle={(val) => setSelectedPriorities((prev) => prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val])} />
                    <SelectableFilter label="Region" values={regions} selected={selectedRegions} onToggle={(val) => setSelectedRegions((prev) => prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val])} />
                  </div>

                  {/* Date selection grid */}
                  <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-[#0F766E]/30 w-full lg:w-1/2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#0F766E]">Date Range</p>
                      <CalendarRange className="h-4 w-4 text-[#0F766E]" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm text-slate-600">
                        <span className="mb-1.5 block font-semibold text-slate-700">Start Date</span>
                        <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40" />
                      </label>
                      <label className="text-sm text-slate-600">
                        <span className="mb-1.5 block font-semibold text-slate-700">End Date</span>
                        <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40" />
                      </label>
                    </div>
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
                      onClick={() => void downloadRows(filtered.length ? filtered : data, 'filtered_preview_order_fulfillment.csv')}
                      className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Filtered Preview
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-3xl border border-slate-200">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 border-b border-slate-200">
                            {filteredTableColumns.map((key) => (
                              <TableHead key={key} className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4 whitespace-nowrap">{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100">
                          {filteredPreview.map((row, index) => (
                            <TableRow key={index} className="border-slate-100 hover:bg-slate-50/50">
                              {filteredTableColumns.map((key) => (
                                <TableCell key={`${index}-${key}`} className="px-4 py-3.5 text-slate-700 text-sm max-w-[160px] truncate">{formatCell(row[key])}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </section>

                {/* Dynamic Key Metrics with Bold Labels */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Metrics</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A] mb-6">Dynamic Key Metrics</h3>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <MetricCard
                      icon={<Package className="h-5 w-5 text-[#0F766E]" />}
                      label="Orders Tracked"
                      value={kpis?.orders_count != null ? String(kpis.orders_count) : '—'}
                      accent="bg-[#ECFDF5]"
                    />
                    <MetricCard
                      icon={<AlertCircle className="h-5 w-5 text-[#DC2626]" />}
                      label="SLA Breach Rate"
                      value={formatPercent(kpis?.sla_breach_rate)}
                      accent="bg-[#FEF2F2]"
                    />
                    <MetricCard
                      icon={<Clock className="h-5 w-5 text-[#2563EB]" />}
                      label="Average Fulfillment Hours"
                      value={formatMetric(kpis?.avg_fulfillment_hours) != '—' ? `${formatMetric(kpis?.avg_fulfillment_hours)} hrs` : '—'}
                      accent="bg-[#EFF6FF]"
                    />
                    <MetricCard
                      icon={<Percent className="h-5 w-5 text-[#7C3AED]" />}
                      label="Quantity Accuracy"
                      value={formatPercent(kpis?.qty_accuracy)}
                      accent="bg-[#F5F3FF]"
                    />
                    <MetricCard
                      icon={<Settings className="h-5 w-5 text-[#F59E0B]" />}
                      label="Short-Ship Rate"
                      value={formatPercent(kpis?.short_ship_rate)}
                      accent="bg-[#FFFBEB]"
                    />
                  </div>
                </section>

                {/* Exploratory Analysis Charts */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">EDA</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A] mb-6">Charts &amp; Visualisations</h3>
                  <div className="grid gap-6">

                    {/* Orders by Warehouse */}
                    {charts.orders_by_warehouse?.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">Orders by Warehouse</h4>
                        <div className="h-[400px]">
                          <Plot
                            data={[{ x: (charts.orders_by_warehouse ?? []).map((item: any) => item.Warehouse), y: (charts.orders_by_warehouse ?? []).map((item: any) => item.Count), type: 'bar', marker: { color: '#0F766E' } }]}
                            layout={{ ...commonLayout, xaxis: { title: 'Warehouse' }, yaxis: { title: 'Orders count' } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Daily Orders & SLA Breach Rate */}
                    {charts.daily_sla_trend?.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">Daily Orders &amp; SLA Breach Rate</h4>
                        <div className="h-[400px]">
                          <Plot
                            data={[
                              { x: (charts.daily_sla_trend ?? []).map((item: any) => item.Order_Date), y: (charts.daily_sla_trend ?? []).map((item: any) => item.Order_Count ?? 0), type: 'bar', name: 'Orders', marker: { color: '#0F766E' } },
                              { x: (charts.daily_sla_trend ?? []).map((item: any) => item.Order_Date), y: (charts.daily_sla_trend ?? []).map((item: any) => item.SLA_Breach_Flag ?? 0), type: 'scatter', mode: 'lines', name: 'SLA Breach Rate', yaxis: 'y2', line: { color: '#2563EB', width: 2.5 } },
                            ]}
                            layout={{
                              ...commonLayout,
                              yaxis: { title: 'Orders' },
                              yaxis2: { title: 'SLA Breach Rate', overlaying: 'y' as const, side: 'right' as const, showgrid: false },
                              legend: { orientation: 'h' as const, y: -0.15 }
                            }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Distribution of Fulfillment Hours */}
                    {charts.fulfillment_hours_histogram?.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">Distribution of Fulfillment Hours</h4>
                        <div className="h-[400px]">
                          <Plot
                            data={[{ x: (charts.fulfillment_hours_histogram ?? []).map((item: any) => (item.bin_start + item.bin_end) / 2), y: (charts.fulfillment_hours_histogram ?? []).map((item: any) => item.count), type: 'bar', marker: { color: '#2563EB' } }]}
                            layout={{ ...commonLayout, xaxis: { title: 'Fulfillment Hours' }, yaxis: { title: 'Frequency' } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Fulfillment Time by Product Type */}
                    {charts.fulfillment_by_product_type?.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">Fulfillment Time by Product Type</h4>
                        <div className="h-[400px]">
                          <Plot
                            data={[{ y: (charts.fulfillment_by_product_type ?? []).map((item: any) => item.Total_Fulfillment_Hours), x: (charts.fulfillment_by_product_type ?? []).map((item: any) => item.Product_Type), type: 'box', boxpoints: false, marker: { color: '#7C3AED' } }]}
                            layout={{ ...commonLayout, xaxis: { title: 'Product Type' }, yaxis: { title: 'Fulfillment Hours' } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Shipping Cost vs Delay Cost */}
                    {charts.shipping_vs_delay_cost?.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">Shipping Cost vs Delay Cost</h4>
                        <div className="h-[400px]">
                          <Plot
                            data={[{
                              x: (charts.shipping_vs_delay_cost ?? []).map((item: any) => item.Shipping_Cost),
                              y: (charts.shipping_vs_delay_cost ?? []).map((item: any) => item.Delay_Cost),
                              mode: 'markers',
                              type: 'scatter',
                              text: (charts.shipping_vs_delay_cost ?? []).map((item: any) => item.Priority ?? ''),
                              marker: {
                                size: 8,
                                color: (charts.shipping_vs_delay_cost ?? []).map((item: any) =>
                                  item.Priority === 'High' ? '#DC2626' : item.Priority === 'Medium' ? '#F59E0B' : '#0F766E'
                                )
                              }
                            }]}
                            layout={{ ...commonLayout, xaxis: { title: 'Shipping Cost ($)' }, yaxis: { title: 'Delay Cost ($)' } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Avg Fulfillment Hours: Warehouse vs Product Type Heatmap */}
                    {charts.warehouse_product_heatmap?.warehouses?.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">Avg Fulfillment Hours: Warehouse vs Product Type</h4>
                        <div className="h-[400px]">
                          <Plot
                            data={[{
                              z: charts.warehouse_product_heatmap.values,
                              x: charts.warehouse_product_heatmap.product_types,
                              y: charts.warehouse_product_heatmap.warehouses,
                              type: 'heatmap',
                              colorscale: 'Viridis'
                            }]}
                            layout={{ ...commonLayout, xaxis: { title: 'Product Type' }, yaxis: { title: 'Warehouse' } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Root Cause Frequency */}
                    {charts.root_cause_frequency?.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">Root Cause Frequency</h4>
                        <div className="h-[400px]">
                          <Plot
                            data={[{ x: (charts.root_cause_frequency ?? []).map((item: any) => item.Root_Cause), y: (charts.root_cause_frequency ?? []).map((item: any) => item.Count), type: 'bar', marker: { color: '#F59E0B' } }]}
                            layout={{ ...commonLayout, xaxis: { title: 'Root Cause' }, yaxis: { title: 'Count' } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Order Priority Mix */}
                    {charts.priority_mix?.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">Order Priority Mix</h4>
                        <div className="h-[400px]">
                          <Plot
                            data={[{ labels: (charts.priority_mix ?? []).map((item: any) => item.Priority), values: (charts.priority_mix ?? []).map((item: any) => item.Count), type: 'pie', hole: 0.35, marker: { colors: ['#0F766E', '#F59E0B', '#2563EB', '#DC2626'] } }]}
                            layout={commonLayout}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Cumulative Fulfillment Time (CDF) */}
                    {charts.fulfillment_cdf?.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">Cumulative Fulfillment Time (CDF)</h4>
                        <div className="h-[400px]">
                          <Plot
                            data={[{ x: (charts.fulfillment_cdf ?? []).map((item: any) => item.hours), y: (charts.fulfillment_cdf ?? []).map((item: any) => item.cdf), type: 'scatter', mode: 'lines', line: { color: '#2563EB', width: 3 } }]}
                            layout={{ ...commonLayout, xaxis: { title: 'Total Fulfillment Hours' }, yaxis: { title: 'Cumulative Probability' } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Qty Accuracy vs Fulfillment Time */}
                    {charts.qty_accuracy_vs_fulfillment?.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">Qty Accuracy vs Fulfillment Time</h4>
                        <div className="h-[400px]">
                          <Plot
                            data={[{
                              x: (charts.qty_accuracy_vs_fulfillment ?? []).map((item: any) => item.Total_Fulfillment_Hours),
                              y: (charts.qty_accuracy_vs_fulfillment ?? []).map((item: any) => item.Qty_Accuracy),
                              mode: 'markers',
                              type: 'scatter',
                              marker: {
                                size: 7,
                                color: (charts.qty_accuracy_vs_fulfillment ?? []).map((item: any) =>
                                  item.Short_Ship_Flag ? '#DC2626' : '#0F766E'
                                )
                              }
                            }]}
                            layout={{ ...commonLayout, xaxis: { title: 'Fulfillment Hours' }, yaxis: { title: 'Quantity Accuracy' } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Delay Type Distribution */}
                    {charts.delay_type_distributions?.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">Delay Type Distribution</h4>
                        <div className="h-[400px]">
                          <Plot
                            data={((charts.delay_type_distributions ?? []) as any[]).reduce((acc: any[], row: any) => {
                              acc.push({ x: [row.bin_start, row.bin_end], y: [row.count, row.count], type: 'bar', name: row.delay_type, marker: { color: '#0F766E' } })
                              return acc
                            }, [])}
                            layout={{ ...commonLayout, xaxis: { title: 'Delay hours' }, yaxis: { title: 'Frequency' } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Avg Fulfillment by Region */}
                    {charts.avg_fulfillment_by_region?.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">Avg Fulfillment by Region</h4>
                        <div className="h-[400px]">
                          <Plot
                            data={[{ x: (charts.avg_fulfillment_by_region ?? []).map((item: any) => item.Region), y: (charts.avg_fulfillment_by_region ?? []).map((item: any) => item.Total_Fulfillment_Hours), type: 'bar', marker: { color: '#2563EB' } }]}
                            layout={{ ...commonLayout, xaxis: { title: 'Region' }, yaxis: { title: 'Fulfillment Hours' } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Top 10 Orders by Delay Cost */}
                    {charts.top10_delay_cost?.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">Top 10 Orders by Delay Cost</h4>
                        <div className="h-[400px]">
                          <Plot
                            data={[{ x: (charts.top10_delay_cost ?? []).map((item: any) => item.Order_ID), y: (charts.top10_delay_cost ?? []).map((item: any) => item.Delay_Cost), type: 'bar', marker: { color: '#7C3AED' } }]}
                            layout={{ ...commonLayout, xaxis: { title: 'Order ID' }, yaxis: { title: 'Delay Cost ($)' } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                  </div>
                </section>

                {/* Machine Learning & Predictions */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Machine Learning</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A] mb-6">Model Predictions</h3>
                  <div className="space-y-8">

                    {/* Classifier */}
                    {mlClassifier ? (
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-bold text-[#0F172A]">1) Classification — Predict SLA Breach</h4>
                            <p className="text-sm text-slate-500 mt-1">RandomForestClassifier with StandardScaler + OneHotEncoder.</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void downloadRows(mlClassifier.predictions ?? [], 'sla_breach_predictions.csv')}
                            className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download Classification Results
                          </Button>
                        </div>
                        <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold text-[#0F766E]">
                          <span className="rounded-full bg-[#ECFDF5] px-3 py-1.5">Accuracy: {formatMetric(mlClassifier.accuracy, 3)}</span>
                          <span className="rounded-full bg-[#ECFDF5] px-3 py-1.5">ROC AUC: {formatMetric(mlClassifier.roc_auc, 3)}</span>
                          <span className="rounded-full bg-[#ECFDF5] px-3 py-1.5">Test rows: {mlClassifier.test_size ?? '—'}</span>
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-50 border-b border-slate-200">
                                  {['Processing Delay (Hrs)', 'Picking Delay (Hrs)', 'Packing Delay (Hrs)', 'Dispatch Delay (Hrs)', 'Order Qty', 'Shipping Cost ($)', 'Delay Cost ($)', 'Warehouse', 'Product Type', 'Actual SLA Breach', 'Predicted Prob', 'Predicted Label'].map((col) => (
                                    <TableHead key={col} className="font-bold text-slate-600 text-[11px] uppercase tracking-[0.08em] py-3.5 px-4 whitespace-nowrap">{col}</TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody className="divide-y divide-slate-100">
                                {(mlClassifier.predictions ?? []).slice(0, 8).map((row: any, index: number) => (
                                  <TableRow key={index} className="hover:bg-slate-50/50">
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMetric(row.Processing_Delay_Hrs, 2)}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMetric(row.Picking_Delay_Hrs, 2)}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMetric(row.Packing_Delay_Hrs, 2)}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMetric(row.Dispatch_Delay_Hrs, 2)}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">{row.Order_Qty ?? '—'}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">${formatMetric(row.Shipping_Cost, 2)}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">${formatMetric(row.Delay_Cost, 2)}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">{row.Warehouse ?? '—'}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">{row.Product_Type ?? '—'}</TableCell>
                                    <TableCell className={`px-4 py-3 text-sm font-bold ${row.Actual_SLA_Breach ? 'text-red-600' : 'text-slate-700'}`}>{row.Actual_SLA_Breach ?? '—'}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm font-semibold">{formatMetric(row.Predicted_Prob, 4)}</TableCell>
                                    <TableCell className={`px-4 py-3 text-sm font-bold ${row.Predicted_Label ? 'text-red-600' : 'text-[#0F766E]'}`}>{row.Predicted_Label ?? '—'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">Classification results will appear once the filtered dataset is analyzed.</div>
                    )}

                    {/* Regressor */}
                    {mlRegressor ? (
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-bold text-[#0F172A]">2) Regression — Predict Total Fulfillment Hours</h4>
                            <p className="text-sm text-slate-500 mt-1">RandomForestRegressor with RMSE and R² metrics.</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void downloadRows(mlRegressor.predictions ?? [], 'fulfillment_regression_predictions.csv')}
                            className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download Regression Results
                          </Button>
                        </div>
                        <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold text-[#0F766E]">
                          <span className="rounded-full bg-[#ECFDF5] px-3 py-1.5">RMSE: {formatMetric(mlRegressor.rmse, 3)}</span>
                          <span className="rounded-full bg-[#ECFDF5] px-3 py-1.5">R²: {formatMetric(mlRegressor.r2, 3)}</span>
                          <span className="rounded-full bg-[#ECFDF5] px-3 py-1.5">Test rows: {mlRegressor.test_size ?? '—'}</span>
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-50 border-b border-slate-200">
                                  {['Processing Delay (Hrs)', 'Picking Delay (Hrs)', 'Packing Delay (Hrs)', 'Dispatch Delay (Hrs)', 'Order Qty', 'Shipping Cost ($)', 'Delay Cost ($)', 'Warehouse', 'Product Type', 'Actual Fulfillment Hours', 'Predicted Fulfillment Hours'].map((col) => (
                                    <TableHead key={col} className="font-bold text-slate-600 text-[11px] uppercase tracking-[0.08em] py-3.5 px-4 whitespace-nowrap">{col}</TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody className="divide-y divide-slate-100">
                                {(mlRegressor.predictions ?? []).slice(0, 8).map((row: any, index: number) => (
                                  <TableRow key={index} className="hover:bg-slate-50/50">
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMetric(row.Processing_Delay_Hrs, 2)}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMetric(row.Picking_Delay_Hrs, 2)}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMetric(row.Packing_Delay_Hrs, 2)}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMetric(row.Dispatch_Delay_Hrs, 2)}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">{row.Order_Qty ?? '—'}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">${formatMetric(row.Shipping_Cost, 2)}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">${formatMetric(row.Delay_Cost, 2)}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">{row.Warehouse ?? '—'}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">{row.Product_Type ?? '—'}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm font-semibold">{formatMetric(row.Actual_Fulfillment_Hrs, 2)} hrs</TableCell>
                                    <TableCell className="px-4 py-3 text-[#0F766E] text-sm font-bold">{formatMetric(row.Pred_Fulfillment_Hrs, 2)} hrs</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">Regression results will appear once the filtered dataset is analyzed.</div>
                    )}

                    {/* Clustering */}
                    {clustering ? (
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-bold text-[#0F172A]">3) Clustering — Order Archetypes</h4>
                            <p className="text-sm text-slate-500 mt-1">Use the slider to refresh KMeans results on the current filtered data.</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void downloadRows((clustering.cluster_counts ?? []).concat(clustering.cluster_centers ?? []), 'clustering_results.csv')}
                            className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download Clustering Results
                          </Button>
                        </div>
                        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm border border-slate-100 flex items-center gap-4">
                          <label className="text-sm font-bold text-[#0F766E] shrink-0">K Clusters</label>
                          <Slider min={2} max={8} step={1} value={[clusterCount]} onValueChange={(val) => setClusterCount(val[0])} className="w-1/2" />
                          <span className="rounded-full bg-[#ECFDF5] px-3 py-1.5 text-sm font-bold text-[#0F766E]">{clusterCount}</span>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2">
                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-50">
                                  <TableHead className="font-bold py-3.5 px-4 text-xs uppercase tracking-wider">Cluster</TableHead>
                                  <TableHead className="font-bold py-3.5 px-4 text-xs uppercase tracking-wider">Count</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody className="divide-y divide-slate-100">
                                {(clustering.cluster_counts ?? []).map((row: any, idx: number) => (
                                  <TableRow key={idx}>
                                    <TableCell className="px-4 py-3 font-semibold text-slate-800 text-sm">Cluster {row.cluster}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm font-bold">{row.count} orders</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-slate-50">
                                    {['Cluster', 'Processing (Hrs)', 'Picking (Hrs)', 'Packing (Hrs)', 'Dispatch (Hrs)', 'Total Fulfillment (Hrs)', 'Qty Accuracy'].map((col) => (
                                      <TableHead key={col} className="font-bold py-3.5 px-4 text-xs uppercase tracking-wider whitespace-nowrap">{col}</TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100">
                                  {(clustering.cluster_centers ?? []).map((row: any, idx: number) => (
                                    <TableRow key={idx}>
                                      <TableCell className="px-4 py-3 font-semibold text-slate-800 text-sm">C {row.cluster}</TableCell>
                                      <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMetric(row.Processing_Delay_Hrs, 2)}</TableCell>
                                      <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMetric(row.Picking_Delay_Hrs, 2)}</TableCell>
                                      <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMetric(row.Packing_Delay_Hrs, 2)}</TableCell>
                                      <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMetric(row.Dispatch_Delay_Hrs, 2)}</TableCell>
                                      <TableCell className="px-4 py-3 text-[#0F766E] text-sm font-bold">{formatMetric(row.Total_Fulfillment_Hours, 2)}</TableCell>
                                      <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMetric(row.Qty_Accuracy, 2)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </div>

                        {clustering.scatter_data?.length ? (
                          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h4 className="text-base font-bold text-slate-800 mb-4">Clusters: Fulfillment vs Delay Cost</h4>
                            <div className="h-[400px]">
                              <Plot
                                data={[{
                                  x: (clustering.scatter_data ?? []).map((item: any) => item.Total_Fulfillment_Hours),
                                  y: (clustering.scatter_data ?? []).map((item: any) => item.Delay_Cost),
                                  mode: 'markers',
                                  type: 'scatter',
                                  text: (clustering.scatter_data ?? []).map((item: any) => `Cluster ${item._cluster ?? item.cluster}`),
                                  marker: { color: (clustering.scatter_data ?? []).map((item: any) => item._cluster ?? item.cluster), colorscale: 'Viridis', size: 10 }
                                }]}
                                layout={{ ...commonLayout, xaxis: { title: 'Fulfillment Hours' }, yaxis: { title: 'Delay Cost ($)' } }}
                                useResizeHandler
                                style={{ width: '100%', height: '100%' }}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">Clustering results will appear once the filtered dataset is analyzed.</div>
                    )}

                    {/* Anomalies */}
                    {anomalies ? (
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-bold text-[#0F172A]">4) Anomaly Detection — IsolationForest</h4>
                            <p className="text-sm text-slate-500 mt-1">IsolationForest flags approximately 2% of orders as anomalies.</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void downloadRows(anomalies.anomalies ?? [], 'anomaly_orders.csv')}
                            className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download Anomaly Results
                          </Button>
                        </div>
                        <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold text-[#0F766E]">
                          <span className="rounded-full bg-[#ECFDF5] px-3 py-1.5">Detected anomalies: {anomalies.num_anomalies ?? 0}</span>
                          <span className="rounded-full bg-[#ECFDF5] px-3 py-1.5">Anomaly rate: {formatMetric(anomalies.anomaly_rate, 2)}%</span>
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-50">
                                  {['Order ID', 'Processing Delay (Hrs)', 'Picking Delay (Hrs)', 'Packing Delay (Hrs)', 'Dispatch Delay (Hrs)', 'Delay Cost ($)', 'Is Anomaly?'].map((col) => (
                                    <TableHead key={col} className="font-bold py-3.5 px-4 text-xs uppercase tracking-wider">{col}</TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody className="divide-y divide-slate-100">
                                {(anomalies.anomalies ?? []).slice(0, 8).map((row: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell className="px-4 py-3 font-semibold text-slate-800 text-sm">{row.Order_ID ?? '—'}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMetric(row.Processing_Delay_Hrs, 2)}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMetric(row.Picking_Delay_Hrs, 2)}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMetric(row.Packing_Delay_Hrs, 2)}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMetric(row.Dispatch_Delay_Hrs, 2)}</TableCell>
                                    <TableCell className="px-4 py-3 text-slate-700 text-sm font-semibold">${formatMetric(row.Delay_Cost, 2)}</TableCell>
                                    <TableCell className="px-4 py-3 text-red-600 font-bold text-sm">{row._is_anomaly ?? '—'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">Anomaly detection results will appear once the filtered dataset is analyzed.</div>
                    )}

                  </div>
                </section>
              </>
            )}
          </div>
        )}

        {/* ── AUTOMATED INSIGHTS & PLAYBOOKS TAB ── */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Insights</p>
                  <h2 className="mt-2 text-2xl font-bold text-[#0F172A]">Automated Insights</h2>
                  <p className="mt-2 text-slate-600">The backend isolates risk factors based on SLA breaches and delay costs.</p>
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
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 border-b border-slate-200">
                        {['Insight Type', 'Entity', 'Metric Value', 'Action Required'].map((col) => (
                          <TableHead key={col} className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {insights.map((row, index) => (
                        <TableRow key={index} className="hover:bg-slate-50/50">
                          <TableCell className="px-4 py-3.5 font-bold text-slate-900 text-sm">{row.Insight_Type}</TableCell>
                          <TableCell className="px-4 py-3.5 text-slate-700 text-sm font-semibold">{row.Entity}</TableCell>
                          <TableCell className="px-4 py-3.5 text-slate-700 text-sm">{String(row.Value ?? '')}</TableCell>
                          <TableCell className="px-4 py-3.5 text-[#0F766E] text-sm font-bold">{row.Action}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-slate-500">Insights will appear once the filtered dataset is analyzed.</p>
              )}
            </section>

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-[#EFF6FF] p-3">
                  <PlaySquare className="h-5 w-5 text-[#2563EB]" />
                </div>
                <h3 className="text-2xl font-bold text-[#0F172A]">Action Playbooks</h3>
              </div>

              {Object.keys(playbooks).length ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {Object.entries(playbooks).map(([key, list]) => (
                    <article key={key} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 hover:shadow-md transition">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                        <h4 className="text-lg font-bold text-[#0F172A] capitalize">{key.replace(/_/g, ' ')}</h4>
                        <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-xs font-semibold text-[#0F766E]">
                          {Array.isArray(list) ? `${list.length} Playbook items` : 'Summary fields'}
                        </span>
                      </div>
                      {Array.isArray(list) ? (
                        <ul className="space-y-2">
                          {list.map((item: any, idx: number) => (
                            <li key={idx} className="text-sm text-slate-600 flex items-start gap-2 leading-relaxed">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0F766E]" />
                              <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <pre className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-100 overflow-x-auto">
                          {JSON.stringify(list, null, 2)}
                        </pre>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">Playbooks will be populated from the backend response once analysis is completed.</p>
              )}
            </section>
          </div>
        )}

      </div>
    </div>
  )
}
