import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Plot from 'react-plotly.js'
import { Slider } from '@/app/components/ui/slider'
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
  Cpu,
  Package,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'

import { OrderToDeliveryService } from '@/services/orderToDeliveryService'

const REQUIRED_FIELDS = [
  'Order_ID',
  'Order_Date',
  'Product_Type',
  'Machine_Type',
  'Scheduling_Delay_Hrs',
  'Production_Time_Hrs',
  'Machine_Delay_Hrs',
  'Dispatch_Delay_Hrs',
  'Total_Lead_Time_Hrs',
  'Estimated_Delivery_Date',
  'Predicted_Lead_Time_Hrs',
  'Customer_Satisfaction_Score',
]

const QUERY_PARAM_MAP: Record<string, string> = {
  Order_ID: 'order_id',
  Order_Date: 'order_date',
  Product_Type: 'product_type',
  Machine_Type: 'machine_type',
  Scheduling_Delay_Hrs: 'scheduling_delay_hrs',
  Production_Time_Hrs: 'production_time_hrs',
  Machine_Delay_Hrs: 'machine_delay_hrs',
  Dispatch_Delay_Hrs: 'dispatch_delay_hrs',
  Total_Lead_Time_Hrs: 'total_lead_time_hrs',
  Estimated_Delivery_Date: 'estimated_delivery_date',
  Predicted_Lead_Time_Hrs: 'predicted_lead_time_hrs',
  Customer_Satisfaction_Score: 'customer_satisfaction_score',
}

const REQUIRED_DESCRIPTIONS: Record<string, string> = {
  Order_ID: 'Unique identifier for each customer order',
  Order_Date: 'Date when the order was placed by the customer',
  Product_Type: 'The type or category of product being manufactured',
  Machine_Type: 'The specific machinery utilized in production',
  Scheduling_Delay_Hrs: 'Delay between order placement and scheduling start (hours)',
  Production_Time_Hrs: 'Time spent in the active manufacturing process (hours)',
  Machine_Delay_Hrs: 'Production delays due to machine downtime or issues (hours)',
  Dispatch_Delay_Hrs: 'Delay between completion and final shipping dispatch (hours)',
  Total_Lead_Time_Hrs: 'Total elapsed time from order creation to final delivery (hours)',
  Estimated_Delivery_Date: 'The target delivery date estimated at checkout',
  Predicted_Lead_Time_Hrs: 'AI/ML predicted lead time for delivery (hours)',
  Customer_Satisfaction_Score: 'Post-delivery customer satisfaction feedback rating (1-5)',
}

const OVERVIEW_FEATURES = [
  'End-to-end order-to-dispatch analytics',
  'Lead-time breakdown and bottleneck diagnosis',
  'ML & AutoML for delivery-time prediction',
  'Scenario-based scheduling simulator',
]

const BUSINESS_IMPACT = [
  'Faster and predictable delivery',
  'Reduced production and dispatch delays',
  'Better machine capacity planning',
  'Improved customer satisfaction',
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
  return value.toFixed(2)
}

function getLineChartData(records: any[]) {
  const groups = new Map<string, Array<{ x: string; y: number }>>()

  for (const record of records) {
    const product = String(record.Product_Type ?? 'Unknown')
    const x = String(record.Order_Date ?? '')
    const y = Number(record.Total_Lead_Time_Hrs ?? 0)

    if (!groups.has(product)) {
      groups.set(product, [])
    }

    groups.get(product)?.push({ x, y })
  }

  return Array.from(groups.entries()).map(([name, values]) => ({
    type: 'scatter',
    mode: 'lines+markers',
    name,
    x: values.map((item) => item.x),
    y: values.map((item) => item.y),
  }))
}

function getBoxChartData(records: any[]) {
  const groups = new Map<string, number[]>()

  for (const record of records) {
    const machine = String(record.Machine_Type ?? 'Unknown')
    const value = Number(record.Total_Lead_Time_Hrs ?? 0)

    if (!groups.has(machine)) {
      groups.set(machine, [])
    }

    groups.get(machine)?.push(value)
  }

  return Array.from(groups.entries()).map(([name, values]) => ({
    type: 'box',
    name,
    y: values,
    boxpoints: false,
  }))
}

export function OrderToDeliveryAnalyticsLabProjectPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const mappingFileRef = useRef<HTMLInputElement | null>(null)
  const [tab, setTab] = useState<TabKey>('overview')
  const [mode, setMode] = useState<'default' | 'upload' | 'mapping'>('default')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const [data, setData] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [productTypes, setProductTypes] = useState<string[]>([])
  const [machineTypes, setMachineTypes] = useState<string[]>([])
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>([])
  const [selectedMachineTypes, setSelectedMachineTypes] = useState<string[]>([])

  const [kpis, setKpis] = useState<any>(null)
  const [charts, setCharts] = useState<any>({})
  const [mlResult, setMlResult] = useState<any>(null)
  const [simulator, setSimulator] = useState<any>(null)
  const [insights, setInsights] = useState<any[]>([])

  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [fileColumns, setFileColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [simulatorParams, setSimulatorParams] = useState<Record<string, number>>({
    schedPct: 0,
    prodPct: 0,
    machPct: 0,
    dispPct: 0,
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

  useEffect(() => {
    void loadDefault()
  }, [])

  useEffect(() => {
    if (!data.length) return
    void analyzeRows(data)
  }, [data, selectedProductTypes, selectedMachineTypes])

  async function loadDefault() {
    setError(null)
    setLoading(true)
    setMode('default')
    setSelectedProductTypes([])
    setSelectedMachineTypes([])

    try {
      const res = await OrderToDeliveryService.loadDefault()
      setData(res.data ?? [])
      setFiltered(res.data ?? [])
      setPreviewRows(res.preview ?? [])
      setProductTypes((res.product_types ?? []).map(String))
      setMachineTypes((res.machine_types ?? []).map(String))
      setStatusMessage('Default dataset loaded.')
      await analyzeRows(res.data ?? [])
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load default dataset.')
    } finally {
      setLoading(false)
    }
  }

  async function updateSimulator(rows: any[], params: Record<string, number> = simulatorParams) {
    if (!rows.length) {
      setSimulator(null)
      return
    }

    try {
      const simRes = await OrderToDeliveryService.simulate({
        data: rows,
        sched_pct: params.schedPct ?? 0,
        prod_pct: params.prodPct ?? 0,
        mach_pct: params.machPct ?? 0,
        disp_pct: params.dispPct ?? 0,
      })
      setSimulator(simRes)
    } catch (err) {
      console.error(err)
      setSimulator(null)
    }
  }

  async function analyzeRows(rows: any[], productTypesToUse = selectedProductTypes, machineTypesToUse = selectedMachineTypes, paramsToUse = simulatorParams) {
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
      const filterRes = await OrderToDeliveryService.filter({
        data: rows,
        product_types: productTypesToUse.length ? productTypesToUse : undefined,
        machine_types: machineTypesToUse.length ? machineTypesToUse : undefined,
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
      const chartRes = await OrderToDeliveryService.getCharts(rows)
      setCharts(chartRes)
    } catch (err) {
      console.error(err)
      setCharts({})
    }

    try {
      const mlRes = await OrderToDeliveryService.automl(rows)
      setMlResult(mlRes)
    } catch (err) {
      console.error(err)
      setMlResult(null)
    }

    await updateSimulator(rows, paramsToUse)

    try {
      const insightRes = await OrderToDeliveryService.getInsights(rows)
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
      await analyzeRows(data, selectedProductTypes, selectedMachineTypes)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(file: File) {
    setUploadFile(file)
    setError(null)
    setLoading(true)

    try {
      const uploadRes = await OrderToDeliveryService.uploadCsv(file)
      setData(uploadRes.data ?? [])
      setFiltered(uploadRes.data ?? [])
      setPreviewRows(uploadRes.preview ?? [])
      setProductTypes(((uploadRes as any).product_types ?? []).map(String))
      setMachineTypes(((uploadRes as any).machine_types ?? []).map(String))
      setSelectedProductTypes([])
      setSelectedMachineTypes([])
      setMode('upload')
      setStatusMessage('CSV uploaded successfully. Review the preview and apply mapping if needed.')
      await analyzeRows(uploadRes.data ?? [])
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGetColumns(file: File) {
    const res = await OrderToDeliveryService.getCsvColumns(file)
    setFileColumns(res.columns ?? [])
    setMapping(Object.fromEntries(REQUIRED_FIELDS.map((field) => [field, ''])))
    setMode('mapping')
  }

  async function applyMapping() {
    if (!uploadFile) return

    setError(null)
    setLoading(true)
    try {
      const res = await OrderToDeliveryService.applyMapping(uploadFile, mapping)
      setData(res.data ?? [])
      setFiltered(res.data ?? [])
      setPreviewRows(res.preview ?? [])
      setStatusMessage('Mapping applied successfully.')
      await analyzeRows(res.data ?? [])
    } catch (err: any) {
      setError(err?.message ?? 'Mapping failed.')
    } finally {
      setLoading(false)
    }
  }

  function downloadRows(rows: any[], filename: string) {
    OrderToDeliveryService.downloadCsv(rows, filename)
  }

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
              <span>Manufacturing</span>
              <span className="text-slate-300">•</span>
              <span>Order-to-Delivery Analytics Lab</span>
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">Order-to-Delivery Analytics Lab</h1>
            <p className="mt-4 max-w-4xl text-[16px] leading-7 text-[#334155]">Analyze the full order lifecycle from order creation to delivery, isolate lead-time bottlenecks, and predict delivery outcomes with AutoML.</p>
          </div>
        </div>

        {/* ── Custom Pill Tabs Container ── */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] mb-6">
          <div className="inline-flex overflow-hidden rounded-3xl border border-[#CBD5E1] bg-[#F8FAFC] p-1 shadow-sm">
            {(
              [
                { key: 'overview', label: 'Overview' },
                { key: 'attributes', label: 'Important Attributes' },
                { key: 'application', label: 'Application' },
              ] as const
            ).map(({ key, label }) => (
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

        {/* 1. Overview Tab */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Overview</p>
                  <h2 className="mt-2 text-3xl font-bold text-[#0F172A]">End-to-end visibility across order fulfillment lifecycle</h2>
                  <p className="mt-4 text-base leading-7 text-slate-600">
                    This lab provides full visibility into customer orders, production flow, machine delays, and dispatch performance so teams can identify where lead time is being lost.
                  </p>
                </div>
                <div className="rounded-3xl border border-[#CCFBF1] bg-[#ECFDF5] px-5 py-4 text-[#0F766E] shadow-sm shrink-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Live analytics theme</p>
                  <p className="mt-2 text-sm leading-6 text-[#115E59] font-semibold">Designed for manufacturing transparency and lead-time optimization.</p>
                </div>
              </div>
            </section>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
              {[
                { label: 'Orders Tracked', value: kpis?.orders !== undefined && kpis?.orders !== null ? String(kpis.orders) : '—', icon: <Package className="h-5 w-5 text-[#0F766E]" />, accent: 'bg-[#ECFDF5]' },
                { label: 'Avg Lead Time', value: kpis ? `${formatMetric(kpis.avg_lead_time)} hrs` : '—', icon: <Clock className="h-5 w-5 text-[#0369A1]" />, accent: 'bg-[#EFF6FF]' },
                { label: 'Avg Production Time', value: kpis ? `${formatMetric(kpis.avg_production)} hrs` : '—', icon: <Cpu className="h-5 w-5 text-[#B45309]" />, accent: 'bg-[#FFFBEB]' },
                { label: 'Avg Machine Delay', value: kpis ? `${formatMetric(kpis.avg_machine_delay)} hrs` : '—', icon: <Settings className="h-5 w-5 text-[#7C3AED]" />, accent: 'bg-[#F5F3FF]' },
                { label: 'Avg Dispatch Delay', value: kpis ? `${formatMetric(kpis.avg_dispatch_delay)} hrs` : '—', icon: <TrendingUp className="h-5 w-5 text-[#E11D48]" />, accent: 'bg-[#FFF1F2]' },
              ].map((card) => (
                <MetricCard key={card.label} icon={card.icon} label={card.label} value={card.value} accent={card.accent} />
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-[32px] border border-[#CCFBF1] bg-[#F0FDFA]/50 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-2 mb-6">
                  <div className="rounded-xl bg-[#CCFBF1] p-2 text-[#0F766E]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-[#0F172A]">Capabilities</h3>
                </div>
                <div className="space-y-4">
                  {OVERVIEW_FEATURES.map((item) => (
                    <div key={item} className="flex items-start gap-3 bg-white hover:bg-slate-50/50 rounded-2xl p-4 border border-[#CCFBF1]/30 transition shadow-sm">
                      <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]" />
                      <span className="text-sm font-semibold text-slate-700 leading-6">{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-blue-100 bg-[#EFF6FF]/50 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-2 mb-6">
                  <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-[#0F172A]">Business Impact</h3>
                </div>
                <div className="space-y-4">
                  {BUSINESS_IMPACT.map((item) => (
                    <div key={item} className="flex items-start gap-3 bg-white hover:bg-slate-50/50 rounded-2xl p-4 border border-blue-100/30 transition shadow-sm">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" />
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
              <h2 className="text-3xl font-bold text-[#0F172A]">Required Columns</h2>
              <p className="mt-3 max-w-3xl text-slate-600">The backend validates this schema before analytics and predictions run.</p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {REQUIRED_FIELDS.map((field) => (
                  <Chip key={field} className="border-blue-100 bg-[#EFF6FF] text-[#1D4ED8] hover:bg-blue-100 transition shadow-sm font-bold">
                    {field}
                  </Chip>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <h2 className="text-3xl font-bold text-[#0F172A]">Data Dictionary</h2>
              <p className="mt-3 max-w-3xl text-slate-600">These are the business-critical fields the analyzer expects to calculate lead-time relationships and ML predictions.</p>
              
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
                      {REQUIRED_FIELDS.map((field, idx) => (
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
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#1D4ED8]">Independent Variables</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Input attributes used for analytics, filters, and AutoML lead-time prediction.</p>
                  <div className="flex flex-wrap gap-2">
                    {['Product_Type', 'Machine_Type', 'Scheduling_Delay_Hrs', 'Production_Time_Hrs', 'Machine_Delay_Hrs', 'Dispatch_Delay_Hrs'].map((field) => (
                      <Chip key={field} className="border-blue-200 bg-white text-[#1D4ED8] hover:bg-blue-50 transition shadow-sm font-bold">
                        {field}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="rounded-[32px] border border-emerald-100 bg-[#ECFDF5] p-6 shadow-sm">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0F766E]">Dependent Variable</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">The target label which our AutoML regression models predict.</p>
                  <div className="flex flex-wrap gap-2">
                    <Chip className="border-emerald-200 bg-white text-[#0F766E] hover:bg-[#ECFDF5] transition shadow-sm font-bold">Total_Lead_Time_Hrs</Chip>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 3. Application Tab */}
        {tab === 'application' && (
          <div className="space-y-6">
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 1</p>
                  <h2 className="mt-2 text-3xl font-bold text-[#0F172A]">Load dataset and begin analysis</h2>
                  <p className="mt-3 text-slate-600">The default backend dataset is loaded automatically and then filtered through the application workflow.</p>
                </div>
                <div className="rounded-3xl border border-[#CCFBF1] bg-[#ECFDF5] px-5 py-4 text-[#0F766E] shadow-sm shrink-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Status</p>
                  <p className="mt-2 text-sm leading-6 text-[#115E59] font-medium">{statusMessage ?? 'Ready to load the dataset.'}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button type="button" onClick={() => void loadDefault()} disabled={loading} className="rounded-full bg-[#0F766E] px-6 py-3 font-bold text-white hover:bg-[#0D5F58] shadow-md hover:-translate-y-0.5 transition active:translate-y-0">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Load Default Data
                </Button>
                <Button type="button" onClick={() => fileInputRef.current?.click()} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0">
                  <FileUp className="mr-2 h-4 w-4" />
                  Upload CSV File
                </Button>
                <Button type="button" onClick={() => mappingFileRef.current?.click()} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0">
                  <SquareStack className="mr-2 h-4 w-4" />
                  Upload CSV for Mapping
                </Button>
              </div>
              <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f) }} accept=".csv" className="hidden" />
              <input type="file" ref={mappingFileRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) { setUploadFile(f); void handleGetColumns(f); } }} accept=".csv" className="hidden" />
            </section>

            {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700 shadow-sm">{error}</div> : null}

            {mode === 'mapping' && fileColumns.length > 0 ? (
              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Upload CSV + Manual Mapping</p>
                    <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Map required columns</h3>
                  </div>
                  <Button type="button" onClick={() => void applyMapping()} disabled={loading} className="rounded-full bg-[#0F766E] px-6 py-3 font-bold text-white hover:bg-[#0D5F58] shadow-md hover:-translate-y-0.5 transition active:translate-y-0">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Apply Mapping
                  </Button>
                </div>
                <div className="space-y-4">
                  {REQUIRED_FIELDS.map((field) => (
                    <MappingRow
                      key={field}
                      field={field}
                      columns={fileColumns}
                      value={mapping[field] ?? ''}
                      onChange={(value) => setMapping((current) => ({ ...current, [field]: value }))}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {mode !== 'mapping' && (
              <>
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-slate-100">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 2</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Filters</h3>
                      <p className="mt-2 text-slate-600">Filter by product type and machine type to update the KPI cards and downstream analytics.</p>
                    </div>
                    <Button type="button" onClick={() => void applyFilters()} className="rounded-full bg-[#0F766E] px-6 py-3 font-bold text-white hover:bg-[#0D5F58] shadow-md hover:-translate-y-0.5 transition active:translate-y-0">
                      Apply Filters
                    </Button>
                  </div>

                  <div className="mt-8 grid gap-6 lg:grid-cols-2">
                    <SelectableFilter
                      label="Product Type"
                      values={productTypes}
                      selected={selectedProductTypes}
                      onToggle={(product) => setSelectedProductTypes((current) => current.includes(product) ? current.filter((item) => item !== product) : [...current, product])}
                    />
                    <SelectableFilter
                      label="Machine Type"
                      values={machineTypes}
                      selected={selectedMachineTypes}
                      onToggle={(machine) => setSelectedMachineTypes((current) => current.includes(machine) ? current.filter((item) => item !== machine) : [...current, machine])}
                    />
                  </div>

                  <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#475569]">Filter Summary</p>
                    <p className="mt-1 text-2xl font-bold text-[#0F172A]">Filtered rows: {filtered.length}</p>
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Data Preview</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Filtered Preview (first 10 rows)</h3>
                      <p className="mt-2 text-slate-600">Horizontal scroll is enabled for the preview dataset.</p>
                    </div>
                    <Button type="button" onClick={() => void downloadRows(filtered.length ? filtered : data, 'filtered_preview.csv')} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0">
                      <Download className="mr-2 h-4 w-4" />
                      Download filtered preview (first 500 rows)
                    </Button>
                  </div>
                  <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 border-b border-slate-200">
                          {tableColumns.map((key) => (
                            <TableHead key={key} className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100">
                        {dataPreview.map((row, index) => (
                          <TableRow key={index} className="border-slate-100 hover:bg-slate-50/50">
                            {tableColumns.map((key) => (
                              <TableCell key={`${index}-${key}`} className="max-w-[180px] whitespace-normal px-4 py-3 text-slate-700 text-sm">
                                {formatCell(row[key])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
                  {[
                    { label: 'Orders Tracked', value: kpis?.orders !== undefined && kpis?.orders !== null ? String(kpis.orders) : '—', icon: <Package className="h-5 w-5 text-[#0F766E]" />, accent: 'bg-[#ECFDF5]' },
                    { label: 'Avg Lead Time', value: kpis ? `${formatMetric(kpis.avg_lead_time)} hrs` : '—', icon: <Clock className="h-5 w-5 text-[#0369A1]" />, accent: 'bg-[#EFF6FF]' },
                    { label: 'Avg Production Time', value: kpis ? `${formatMetric(kpis.avg_production)} hrs` : '—', icon: <Cpu className="h-5 w-5 text-[#B45309]" />, accent: 'bg-[#FFFBEB]' },
                    { label: 'Avg Machine Delay', value: kpis ? `${formatMetric(kpis.avg_machine_delay)} hrs` : '—', icon: <Settings className="h-5 w-5 text-[#7C3AED]" />, accent: 'bg-[#F5F3FF]' },
                    { label: 'Avg Dispatch Delay', value: kpis ? `${formatMetric(kpis.avg_dispatch_delay)} hrs` : '—', icon: <TrendingUp className="h-5 w-5 text-[#E11D48]" />, accent: 'bg-[#FFF1F2]' },
                  ].map((card) => (
                    <MetricCard key={card.label} icon={card.icon} label={card.label} value={card.value} accent={card.accent} />
                  ))}
                </div>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Charts</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Fulfillment charts</h3>

                  <div className="mt-6 space-y-8">
                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Lead Time Trend by Product Type</p>
                      <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 border border-slate-100">
                        <Plot
                          data={getLineChartData(charts.lead_time_trend ?? [])}
                          layout={{
                            ...commonLayout,
                            height: 400,
                            xaxis: { title: 'Order Date', gridcolor: '#F1F5F9' },
                            yaxis: { title: 'Total Lead Time (hrs)', gridcolor: '#F1F5F9' },
                          }}
                          config={{ responsive: true, displaylogo: false, displayModeBar: false }}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Lead Time Distribution by Machine Type</p>
                      <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 border border-slate-100">
                        <Plot
                          data={getBoxChartData(charts.lead_time_by_machine ?? [])}
                          layout={{
                            ...commonLayout,
                            height: 400,
                            yaxis: { title: 'Total Lead Time (hrs)', gridcolor: '#F1F5F9' },
                          }}
                          config={{ responsive: true, displaylogo: false, displayModeBar: false }}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">AutoML</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">AutoML: Lead Time Prediction</h3>
                      <p className="mt-2 text-slate-600">The backend compares RandomForest, GradientBoosting, and LinearRegression and reports the best model.</p>
                    </div>
                    <Button type="button" onClick={() => void downloadRows(mlResult?.predictions ?? [], 'automl_predictions.csv')} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0">
                      <Download className="mr-2 h-4 w-4" />
                      Download AutoML predictions CSV
                    </Button>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-slate-200 mb-6">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 border-b border-slate-200">
                          <TableHead className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">Model</TableHead>
                          <TableHead className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">RMSE</TableHead>
                          <TableHead className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">R2</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100">
                        {(mlResult?.model_comparison ?? []).map((row: any, idx: number) => (
                          <TableRow key={`${row.Model}-${idx}`} className={`border-slate-100 hover:bg-slate-50/50 ${row.Model === mlResult?.best_model ? 'bg-emerald-50/70 hover:bg-emerald-50' : ''}`}>
                            <TableCell className="px-4 py-3.5 font-semibold text-slate-800 text-sm">
                              {row.Model}
                            </TableCell>
                            <TableCell className="px-4 py-3.5 text-slate-700 text-sm">{formatMetric(row.RMSE)}</TableCell>
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

                  <div className="overflow-hidden rounded-3xl border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 border-b border-slate-200">
                          <TableHead className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">Actual Lead Time</TableHead>
                          <TableHead className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">Predicted Lead Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100">
                        {(mlResult?.predictions ?? []).slice(0, 10).map((row: any, idx: number) => (
                          <TableRow key={idx} className="border-slate-100 hover:bg-slate-50/50">
                            <TableCell className="px-4 py-3.5 text-slate-700 text-sm font-semibold">{formatMetric(row.Actual_Lead_Time_Hrs)} hrs</TableCell>
                            <TableCell className="px-4 py-3.5 text-[#0F766E] text-sm font-bold">{formatMetric(row.Predicted_Lead_Time_Hrs)} hrs</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Simulation</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Scheduling Simulator</h3>
                      <p className="mt-2 text-slate-600">Adjust the delay and time percentages to see the simulated lead-time impact instantly.</p>
                    </div>
                    <Button type="button" onClick={() => void downloadRows(simulator?.top10_orders ?? [], 'simulator_results.csv')} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0">
                      <Download className="mr-2 h-4 w-4" />
                      Download simulator result
                    </Button>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      ['Change in Scheduling Delay (%)', 'schedPct', -80, 80],
                      ['Change in Production Time (%)', 'prodPct', -80, 80],
                      ['Change in Machine Delay (%)', 'machPct', -80, 80],
                      ['Change in Dispatch Delay (%)', 'dispPct', -80, 80],
                    ].map(([label, key, min, max]) => {
                      const value = simulatorParams[key as keyof typeof simulatorParams] ?? 0
                      return (
                        <div key={key as string} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-[#0F766E]/30 transition">
                          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 mb-3">
                            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#0F766E]">{label}</span>
                            <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-xs font-semibold text-[#0F766E]">{value}%</span>
                          </div>
                          <div className="mt-4 px-1 py-2">
                            <Slider
                              value={[value]}
                              min={Number(min)}
                              max={Number(max)}
                              step={1}
                              onValueChange={(sliderValue) => {
                                const nextParams = {
                                  ...simulatorParams,
                                  [key as string]: sliderValue[0],
                                }
                                setSimulatorParams(nextParams)
                                void updateSimulator(filtered.length ? filtered : data, nextParams)
                              }}
                              className="h-4"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-8 grid gap-6 md:grid-cols-3">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.18em]">Baseline Avg Lead Time</p>
                      <p className="mt-2 text-3xl font-bold text-[#0F172A]">{formatMetric(simulator?.baseline_avg_hrs)} hrs</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.18em]">Simulated Avg Lead Time</p>
                      <p className="mt-2 text-3xl font-bold text-[#0F172A]">{formatMetric(simulator?.simulated_avg_hrs)} hrs</p>
                    </div>
                    <div className="rounded-3xl border border-emerald-100 bg-[#ECFDF5] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                      <p className="text-sm font-bold text-[#0F766E] uppercase tracking-[0.18em]">Improvement</p>
                      <p className="mt-2 text-3xl font-bold text-[#0F766E]">
                        {formatMetric(simulator?.improvement_hrs)} hrs
                      </p>
                      <p className="text-sm font-semibold text-[#115E59] mt-1">({formatMetric(simulator?.improvement_pct)}%)</p>
                    </div>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 border-b border-slate-200">
                          {['Order ID', 'Product Type', 'Machine Type', 'Total Lead Time', 'Sim Total Lead Time', 'Reduction'].map((column) => (
                            <TableHead key={column} className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">{column}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100">
                        {(simulator?.top10_orders ?? []).map((row: any, idx: number) => (
                          <TableRow key={idx} className="border-slate-100 hover:bg-slate-50/50">
                            <TableCell className="px-4 py-3 text-slate-700 text-sm font-semibold">{formatCell(row.Order_ID)}</TableCell>
                            <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatCell(row.Product_Type)}</TableCell>
                            <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatCell(row.Machine_Type)}</TableCell>
                            <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMetric(row.Total_Lead_Time_Hrs)} hrs</TableCell>
                            <TableCell className="px-4 py-3 text-[#0F766E] text-sm font-bold">{formatMetric(row.Sim_Total_Lead_Time_Hrs)} hrs</TableCell>
                            <TableCell className="px-4 py-3 text-emerald-700 text-sm font-bold">-{formatMetric(row.LeadTime_Reduction_Hrs)} hrs</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Insights</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Automated Insights</h3>
                    </div>
                    <Button type="button" onClick={() => void downloadRows(filtered.length ? filtered : data, 'insights.csv')} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0">
                      <Download className="mr-2 h-4 w-4" />
                      Download insights
                    </Button>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 border-b border-slate-200">
                          {['Insight', 'Detail', 'Action'].map((column) => (
                            <TableHead key={column} className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">{column}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100">
                        {insights.map((row, idx) => (
                          <TableRow key={idx} className="border-slate-100 hover:bg-slate-50/50">
                            <TableCell className="px-4 py-3.5 font-bold text-slate-900 text-sm">{row.Insight}</TableCell>
                            <TableCell className="px-4 py-3.5 text-slate-700 text-sm">{row.Detail}</TableCell>
                            <TableCell className="px-4 py-3.5 text-[#0F766E] text-sm font-semibold">{row.Action}</TableCell>
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
