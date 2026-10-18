import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Plot from 'react-plotly.js'
import { Activity, BarChart3, ChevronLeft, Download, FileUp, Gauge, Loader2, ShieldAlert, Sparkles, Thermometer, Zap } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'

import { InverterFailureService } from '@/services/inverterFailureService'

const REQUIRED_FIELDS = [
  'inverter_id',
  'timestamp',
  'temperature_c',
  'heatsink_temp_c',
  'voltage_v',
  'current_a',
  'vibration_mms',
  'dc_input_kw',
  'ac_output_kw',
  'pf_power_factor',
  'frequency_hz',
  'mppt_voltage_v',
  'mppt_current_a',
  'total_energy_generated_kwh',
  'lifetime_hours',
  'ambient_temperature_c',
  'fan_speed_rpm',
  'fault_code',
  'string_count_active',
  'grid_status',
  'failure_within_7_days',
]

const FIELD_LABELS: Record<string, string> = {
  inverter_id: 'Inverter identifier',
  timestamp: 'Telemetry timestamp',
  temperature_c: 'Internal temperature',
  heatsink_temp_c: 'Heatsink temperature',
  voltage_v: 'Voltage',
  current_a: 'Current',
  vibration_mms: 'Vibration',
  dc_input_kw: 'DC input power',
  ac_output_kw: 'AC output power',
  pf_power_factor: 'Power factor',
  frequency_hz: 'Grid frequency',
  mppt_voltage_v: 'MPPT voltage',
  mppt_current_a: 'MPPT current',
  total_energy_generated_kwh: 'Lifetime energy generated',
  lifetime_hours: 'Lifetime hours',
  ambient_temperature_c: 'Ambient temperature',
  fan_speed_rpm: 'Fan speed',
  fault_code: 'Fault code',
  string_count_active: 'Active string count',
  grid_status: 'Grid status',
  failure_within_7_days: 'Failure label',
}

const SAMPLE_ROWS = [
  {
    inverter_id: 'INV_001',
    timestamp: '2026-06-01 08:00:00',
    temperature_c: 54.2,
    heatsink_temp_c: 56.1,
    voltage_v: 620.4,
    current_a: 12.8,
    vibration_mms: 0.92,
    dc_input_kw: 7.8,
    ac_output_kw: 7.2,
    pf_power_factor: 0.98,
    frequency_hz: 49.98,
    mppt_voltage_v: 612.3,
    mppt_current_a: 11.9,
    total_energy_generated_kwh: 47750,
    lifetime_hours: 1840,
    ambient_temperature_c: 39.4,
    fan_speed_rpm: 2080,
    fault_code: 'NONE',
    string_count_active: 14,
    grid_status: 'Connected',
    failure_within_7_days: 0,
  },
  {
    inverter_id: 'INV_014',
    timestamp: '2026-06-01 08:15:00',
    temperature_c: 67.8,
    heatsink_temp_c: 71.5,
    voltage_v: 603.2,
    current_a: 11.6,
    vibration_mms: 1.48,
    dc_input_kw: 7.1,
    ac_output_kw: 6.2,
    pf_power_factor: 0.92,
    frequency_hz: 49.61,
    mppt_voltage_v: 590.8,
    mppt_current_a: 10.7,
    total_energy_generated_kwh: 49510,
    lifetime_hours: 2025,
    ambient_temperature_c: 41.8,
    fan_speed_rpm: 2340,
    fault_code: 'OVR_TEMP',
    string_count_active: 12,
    grid_status: 'Connected',
    failure_within_7_days: 1,
  },
]

type DatasetMode = 'default' | 'upload' | 'mapping'
type Row = Record<string, unknown>
type InsightRow = { Insight: string; Entity: string; Metric: string; Action: string }

type Kpis = {
  total_records: number
  failure_rate_pct: number | null
  avg_temperature_c: number | null
  avg_heatsink_temp_c: number | null
  avg_energy_kwh: number | null
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

function buildCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return ''
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const escapeCell = (value: unknown) => {
    if (value === null || value === undefined) return ''
    const text = String(value).replace(/"/g, '""')
    return /[",\n]/.test(text) ? `"${text}"` : text
  }
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(','))].join('\n')
}

function downloadRows(rows: Record<string, unknown>[], filename: string) {
  const blob = new Blob([buildCsv(rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function DataTable({ rows, maxRows = 10 }: { rows: Row[]; maxRows?: number }) {
  const displayRows = rows.slice(0, maxRows)
  const columns = Object.keys(displayRows[0] ?? {})

  if (!displayRows.length) {
    return <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">No rows to display.</div>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column} className="bg-slate-50 text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-600">
              {column}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {displayRows.map((row, index) => (
          <TableRow key={index}>
            {columns.map((column) => (
              <TableCell key={column} className="whitespace-nowrap text-slate-700">
                {formatCell(row[column])}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function MetricCard({ icon, label, value, accent }: { icon: ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${accent}`}>{icon}</div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#0F172A]">{value}</p>
    </div>
  )
}

function FilterSelector({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
      <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0F766E]">{label}</p>
      <div className="mb-4 mt-3 min-h-[56px] rounded-[16px] border border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {selected.length ? (
            selected.map((item) => (
              <span key={item} className="rounded-full bg-[#ECFDF5] px-3 py-1 text-sm font-semibold text-[#0F766E]">
                {item}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-400">All values</span>
          )}
        </div>
      </div>
      <div className="max-h-48 overflow-auto space-y-2 pr-1">
        {options.length ? (
          options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`w-full rounded-2xl px-3 py-2 text-left text-sm transition ${selected.includes(option) ? 'bg-[#0F766E] text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
            >
              {option}
            </button>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-400">No options yet</div>
        )}
      </div>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8">
      <h4 className="mb-3 text-lg font-semibold text-[#0F172A]">{title}</h4>
      {children}
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

export function InverterFailurePredictionLabProjectPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'overview' | 'attributes' | 'application'>('overview')
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'attributes', label: 'Important Attributes' },
    { key: 'application', label: 'Application' },
  ] as const

  const [mode, setMode] = useState<DatasetMode>('default')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [mlMessage, setMlMessage] = useState<string | null>(null)

  const [data, setData] = useState<Row[]>([])
  const [filteredData, setFilteredData] = useState<Row[]>([])
  const [defaultPreviewRows, setDefaultPreviewRows] = useState<Row[]>([])
  const [filteredPreviewRows, setFilteredPreviewRows] = useState<Row[]>([])
  const [inverterIds, setInverterIds] = useState<string[]>([])
  const [gridStatuses, setGridStatuses] = useState<string[]>([])
  const [faultCodes, setFaultCodes] = useState<string[]>([])
  const [selectedInverterIds, setSelectedInverterIds] = useState<string[]>([])
  const [selectedGridStatuses, setSelectedGridStatuses] = useState<string[]>([])
  const [selectedFaultCodes, setSelectedFaultCodes] = useState<string[]>([])
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [charts, setCharts] = useState<any>({})
  const [mlResult, setMlResult] = useState<any>(null)
  const [insights, setInsights] = useState<InsightRow[]>([])

  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [fileColumns, setFileColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const filteredCountText = `${filteredData.length} of ${data.length || filteredData.length}`

  const inverterFailureRows = (charts.inverter_failure_rate ?? []) as Row[]
  const tempVibrationRows = (charts.temp_vs_vibration ?? []) as Row[]
  const lifetimeEnergyRows = (charts.lifetime_vs_energy ?? []) as Row[]

  const tempFailureRows = useMemo(
    () => tempVibrationRows.map((row) => ({
      temperature_c: Number(row.temperature_c ?? 0),
      vibration_mms: Number(row.vibration_mms ?? 0),
      failure_label: String(row.failure_label ?? 'No failure'),
    })),
    [tempVibrationRows],
  )

  useEffect(() => {
    void loadDefault()
  }, [])

  async function loadDefault() {
    setError(null)
    setLoading(true)
    setMode('default')
    setUploadFile(null)
    setStatusMessage(null)
    setMlMessage(null)
    setSelectedInverterIds([])
    setSelectedGridStatuses([])
    setSelectedFaultCodes([])

    try {
      const res = await InverterFailureService.loadDefault()
      const rows = res.data ?? []
      setData(rows)
      setFilteredData(rows)
      setDefaultPreviewRows(res.preview ?? rows.slice(0, 10))
      setFilteredPreviewRows(res.preview ?? rows.slice(0, 15))
      setInverterIds((res.inverter_ids ?? []).map(String))
      setGridStatuses((res.grid_statuses ?? []).map(String))
      setFaultCodes((res.fault_codes ?? []).map(String))
      setStatusMessage(res.warning ? String(res.warning) : 'Default dataset loaded.')
      await analyzeRows(rows)
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load default dataset.')
    } finally {
      setLoading(false)
    }
  }

  async function analyzeRows(rows: Row[]) {
    if (!rows.length) {
      setKpis(null)
      setFilteredData([])
      setFilteredPreviewRows([])
      setCharts({})
      setMlResult(null)
      setMlMessage(null)
      setInsights([])
      return
    }

    try {
      const filterResponse = await InverterFailureService.filter({
        data: rows as any,
        inverter_ids: selectedInverterIds.length ? selectedInverterIds : undefined,
        grid_statuses: selectedGridStatuses.length ? selectedGridStatuses : undefined,
        fault_codes: selectedFaultCodes.length ? selectedFaultCodes : undefined,
      })

      const filteredRows = filterResponse.data ?? rows
      setFilteredData(filteredRows)
      setFilteredPreviewRows(filterResponse.preview ?? filteredRows.slice(0, 15))
      setKpis(filterResponse.kpis as any ?? null)
      rows = filteredRows
    } catch (err) {
      console.error(err)
    }

    try {
      const chartResponse = await InverterFailureService.getCharts(rows as any)
      setCharts(chartResponse)
    } catch (err) {
      console.error(err)
      setCharts({})
    }

    const labelSet = new Set(
      rows
        .map((row) => Number(row.failure_within_7_days))
        .filter((value) => Number.isFinite(value)),
    )

    if (rows.length < 80 || labelSet.size < 2) {
      setMlResult(null)
      setMlMessage('Not enough rows or label diversity')
    } else {
      try {
        const mlResponse = await InverterFailureService.predictFailure(rows as any)
        setMlResult(mlResponse)
        setMlMessage(null)
      } catch (err: any) {
        console.error(err)
        setMlResult(null)
        setMlMessage(err?.message ?? 'ML training failed.')
      }
    }

    try {
      const insightResponse = await InverterFailureService.getInsights(rows as any)
      setInsights(insightResponse.insights as any ?? [])
    } catch (err) {
      console.error(err)
      setInsights([])
    }
  }

  async function handleUpload(file: File) {
    setUploadFile(file)
    setError(null)
    setLoading(true)

    try {
      const uploadResponse = await InverterFailureService.uploadCsv(file)
      const rows = uploadResponse.data ?? []
      setData(rows)
      setFilteredData(rows)
      setDefaultPreviewRows(uploadResponse.preview ?? rows.slice(0, 10))
      setFilteredPreviewRows(uploadResponse.preview ?? rows.slice(0, 15))
      setInverterIds(((uploadResponse as any).inverter_ids ?? []).map(String))
      setGridStatuses(((uploadResponse as any).grid_statuses ?? []).map(String))
      setFaultCodes(((uploadResponse as any).fault_codes ?? []).map(String))
      setFileColumns(((uploadResponse as any).columns ?? []).map(String))
      setSelectedInverterIds([])
      setSelectedGridStatuses([])
      setSelectedFaultCodes([])

      if (mode === 'upload') {
        setStatusMessage((uploadResponse as any).warning ? String((uploadResponse as any).warning) : 'CSV uploaded successfully.')
        await analyzeRows(rows)
      } else {
        setStatusMessage((uploadResponse as any).warning ? String((uploadResponse as any).warning) : 'CSV uploaded. Map columns to continue.')
        setKpis(null)
        setCharts({})
        setMlResult(null)
        setMlMessage(null)
        setInsights([])
      }
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed.')
    } finally {
      setLoading(false)
    }
  }

  async function applyMapping() {
    if (!uploadFile) return

    setError(null)
    setLoading(true)

    try {
      const response = await InverterFailureService.applyMapping(uploadFile, mapping)
      const rows = response.data ?? []
      setData(rows)
      setFilteredData(rows)
      setDefaultPreviewRows(response.preview ?? rows.slice(0, 10))
      setFilteredPreviewRows(response.preview ?? rows.slice(0, 15))
      setInverterIds(((response as any).inverter_ids ?? []).map(String))
      setGridStatuses(((response as any).grid_statuses ?? []).map(String))
      setFaultCodes(((response as any).fault_codes ?? []).map(String))
      setSelectedInverterIds([])
      setSelectedGridStatuses([])
      setSelectedFaultCodes([])
      setStatusMessage('Manual mapping applied successfully.')
      await analyzeRows(rows)
    } catch (err: any) {
      setError(err?.message ?? 'Mapping failed.')
    } finally {
      setLoading(false)
    }
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    void handleUpload(file)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (!file) return
    void handleUpload(file)
  }

  const dataForTopTable = filteredPreviewRows.length ? filteredPreviewRows : defaultPreviewRows.length ? defaultPreviewRows : data.slice(0, 10)

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
              <span>Solar Power</span>
              <span className="text-slate-300">•</span>
              <span>Inverter Failure Prediction Lab</span>
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">Inverter Failure Prediction Lab</h1>
            <p className="mt-4 max-w-4xl text-[16px] leading-7 text-[#334155]">
              Monitor inverter telemetry, predict failures within the next 7 days, detect thermal stress and electrical anomalies, and prioritize preventive maintenance with an interactive React dashboard.
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Purpose</p>
                  <h2 className="mt-2 text-3xl font-bold text-[#0F172A]">Telemetry monitoring for inverter failure prediction</h2>
                  <p className="mt-4 text-base leading-7 text-slate-600">
                    This lab consolidates inverter temperature, voltage, current, vibration, grid status, and fault patterns to highlight units at risk of failure within the next 7 days.
                  </p>
                </div>
                <div className="rounded-3xl border border-[#CCFBF1] bg-[#ECFDF5] px-5 py-4 text-[#0F766E] shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Who should use this</p>
                  <p className="mt-2 text-sm leading-6">Solar operations teams, maintenance planners, reliability engineers, and plant managers.</p>
                </div>
              </div>
            </section>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={<ShieldAlert className="h-5 w-5 text-[#0F766E]" />} label="Failure Rate (7 Days)" value="Display only" accent="bg-[#ECFDF5]" />
              <MetricCard icon={<Activity className="h-5 w-5 text-[#0369A1]" />} label="High-Risk Inverters" value="Display only" accent="bg-[#EFF6FF]" />
              <MetricCard icon={<Thermometer className="h-5 w-5 text-[#DC2626]" />} label="Avg Temperature & Thermal Stress" value="Display only" accent="bg-[#FEF2F2]" />
              <MetricCard icon={<Zap className="h-5 w-5 text-[#7C3AED]" />} label="Energy Lost Risk (kWh)" value="Display only" accent="bg-[#F5F3FF]" />
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
                {REQUIRED_FIELDS.map((field) => (
                  <Chip key={field} className="border-blue-100 bg-[#EFF6FF] text-[#1D4ED8] hover:bg-blue-100 transition shadow-sm font-bold">
                    {field}
                  </Chip>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <h2 className="text-3xl font-bold text-[#0F172A]">Required Column Data Dictionary</h2>
              <p className="mt-3 max-w-3xl text-slate-600">Uploaded files are validated against the 21 required inverter telemetry columns before analytics runs.</p>
              
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
                      {REQUIRED_FIELDS.map((field, idx) => (
                        <TableRow key={field} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                          <td className="px-4 py-3.5 font-semibold text-[#0F172A] text-sm">
                            <span className="inline-block rounded-lg bg-slate-100 text-slate-800 px-2.5 py-1 text-xs font-bold border border-slate-200">
                              {field}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 text-sm font-medium">{FIELD_LABELS[field]}</td>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </section>

            <div className="grid gap-6 md:grid-cols-2">
              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <h3 className="text-2xl font-bold text-[#0F172A]">Independent Variables</h3>
                <p className="mt-2 text-sm text-slate-500">Features used by the failure classifier.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {['temperature_c', 'heatsink_temp_c', 'voltage_v', 'current_a', 'vibration_mms', 'dc_input_kw', 'ac_output_kw', 'pf_power_factor', 'frequency_hz', 'mppt_voltage_v', 'mppt_current_a', 'total_energy_generated_kwh', 'lifetime_hours', 'ambient_temperature_c', 'fan_speed_rpm', 'fault_code', 'string_count_active', 'grid_status', 'inverter_id'].map((item) => (
                    <Chip key={item} className="border-blue-200 bg-white text-[#1D4ED8] hover:bg-blue-50 transition shadow-sm font-bold text-xs">
                      {item}
                    </Chip>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <h3 className="text-2xl font-bold text-[#0F172A]">Dependent Variable</h3>
                <p className="mt-2 text-sm text-slate-500">Binary prediction target for inverter failure within the next 7 days.</p>
                <div className="mt-5 rounded-[24px] border border-[#ECFDF5] bg-slate-50 p-6">
                  <span className="inline-block rounded-lg bg-[#ECFDF5] text-[#0F766E] px-2.5 py-1 text-xs font-bold border border-emerald-200">
                    failure_within_7_days
                  </span>
                  <p className="mt-4 text-sm leading-6 text-slate-600">0 = No Failure, 1 = Failure within next 7 days</p>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* 3. Application Tab */}
        {tab === 'application' && (
          <div className="space-y-8">
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Dataset Options</p>
              <RadioGroup value={mode} onValueChange={(value) => setMode(value as DatasetMode)} className="mt-5 grid gap-4 md:grid-cols-3">
                {[
                  { value: 'default', title: 'Default Dataset', description: 'Automatically load the GitHub inverter failure dataset.' },
                  { value: 'upload', title: 'Upload CSV', description: 'Upload your own CSV and analyze it immediately.' },
                  { value: 'mapping', title: 'Upload CSV + Column Mapping', description: 'Upload a file and manually map the 21 required columns.' },
                ].map((option) => (
                  <label key={option.value} className={`cursor-pointer rounded-3xl border p-5 transition ${mode === option.value ? 'border-[#0F766E] bg-[#ECFDF5]' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value={option.value} className="mt-1 border-[#0F766E]" />
                      <div>
                        <p className="text-lg font-semibold text-[#0F172A]">{option.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{option.description}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </section>

            {error && <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-sm">{error}</div>}
            {statusMessage && <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800 shadow-sm">{statusMessage}</div>}

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Step 1</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">{mode === 'mapping' ? 'Upload CSV to map' : mode === 'upload' ? 'Upload CSV file' : 'Load Default Dataset'}</h3>
                  <p className="mt-2 text-slate-600">{mode === 'default' ? 'Dataset loads automatically from GitHub RAW.' : 'Drag and drop file here or use the browse button. Limit 200MB per file • CSV'}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant={mode === 'default' ? 'default' : 'outline'} onClick={() => fileInputRef.current?.click()}>
                    <FileUp className="h-4 w-4" />
                    Browse CSV
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void loadDefault()}>
                    Reload Default Data
                  </Button>
                </div>
              </div>

              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileInputChange} />

              {mode === 'upload' && !uploadFile && (
                <div className="mt-6 space-y-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Sample Structure</p>
                      <h4 className="mt-2 text-xl font-bold text-[#0F172A]">Required telemetry schema</h4>
                      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50">
                                <TableHead className="font-semibold text-slate-700">Column</TableHead>
                                <TableHead className="font-semibold text-slate-700">Type</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {REQUIRED_FIELDS.map((field) => (
                                <TableRow key={field}>
                                  <TableCell className="font-semibold text-[#0F172A]">{field}</TableCell>
                                  <TableCell className="text-slate-600">{field === 'failure_within_7_days' ? 'Label' : field === 'timestamp' || field === 'inverter_id' || field === 'fault_code' || field === 'grid_status' ? 'Text' : 'Numeric'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Sample Dataset</p>
                      <h4 className="mt-2 text-xl font-bold text-[#0F172A]">Preview rows you can download</h4>
                      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                        <div className="overflow-x-auto">
                          <DataTable rows={SAMPLE_ROWS} maxRows={2} />
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button type="button" variant="outline" onClick={() => downloadRows(SAMPLE_ROWS, 'inverter_failure_sample.csv')}>
                          <Download className="h-4 w-4" />
                          Download Sample CSV
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer rounded-[28px] border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center transition hover:border-[#0F766E] hover:bg-[#F8FBFF]"
                  >
                    <div className="mx-auto flex max-w-md flex-col items-center">
                      <div className="rounded-full bg-[#ECFDF5] p-4 text-[#0F766E]">
                        <FileUp className="h-8 w-8" />
                      </div>
                      <h4 className="mt-4 text-xl font-bold text-[#0F172A]">Drag and drop file here</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-500">Limit 200MB per file • CSV</p>
                    </div>
                  </div>
                </div>
              )}

              {mode === 'mapping' && !uploadFile && (
                <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-10 text-center">
                  <h4 className="text-xl font-bold text-[#0F172A]">Upload CSV to map</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Drop your file here or browse from your device to start column mapping.</p>
                  <div className="mt-5 flex justify-center gap-3">
                    <Button type="button" onClick={() => fileInputRef.current?.click()}>
                      <FileUp className="h-4 w-4" />
                      Browse CSV
                    </Button>
                  </div>
                </div>
              )}

              {mode === 'default' && !loading && data.length > 0 && (
                <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Default dataset loaded from GitHub</p>
                      <p className="text-sm text-slate-500">Columns: {REQUIRED_FIELDS.join(' • ')}</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => downloadRows(data, 'inverter_failure_default_dataset.csv')}>
                      <Download className="h-4 w-4" />
                      Download Default Data
                    </Button>
                  </div>
                  <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                      <DataTable rows={dataForTopTable} />
                    </div>
                  </div>
                </div>
              )}

              {(mode === 'upload' || mode === 'mapping') && uploadFile && (
                <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Uploaded file</p>
                      <p className="text-sm text-slate-500">{uploadFile.name}</p>
                    </div>
                    {mode === 'upload' ? (
                      <Button type="button" variant="outline" onClick={() => void downloadRows(data, 'inverter_uploaded_preview.csv')}>
                        <Download className="h-4 w-4" />
                        Download Preview
                      </Button>
                    ) : null}
                  </div>

                  <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                      <DataTable rows={dataForTopTable} />
                    </div>
                  </div>
                </div>
              )}

              {loading && <div className="mt-6 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Processing data...</div>}
            </section>

            {mode === 'mapping' && uploadFile && fileColumns.length > 0 && (
              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Step 2</p>
                <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Preview and map columns</h3>
                <p className="mt-2 text-slate-600">Map the uploaded CSV headers to the required inverter telemetry fields.</p>

                <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                  <div className="overflow-x-auto">
                    <DataTable rows={defaultPreviewRows} maxRows={5} />
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {REQUIRED_FIELDS.map((field) => (
                    <label key={field} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm">
                      <span className="mb-2 block font-semibold text-slate-700">Map → {field}</span>
                      <Select value={mapping[field] ?? ''} onValueChange={(value) => setMapping((prev) => ({ ...prev, [field]: value }))}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="-- Select --" />
                        </SelectTrigger>
                        <SelectContent>
                          {fileColumns.map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button type="button" onClick={() => void applyMapping()} variant="default">
                    Apply Mapping
                  </Button>
                  <p className="text-sm text-slate-500">This validates the uploaded file against the required inverter schema.</p>
                </div>
              </section>
            )}

            {data.length > 0 && (
              <>
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">STEP 2 — FILTERS & PREVIEW</h3>
                      <p className="mt-1 text-sm text-slate-500">Use the filters below to narrow the inverter dataset and preview the result.</p>
                    </div>
                    <Button type="button" variant="default" onClick={() => void analyzeRows(data)}>
                      Apply filters
                    </Button>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                    <FilterSelector label="Inverter ID" options={inverterIds} selected={selectedInverterIds} onToggle={(value) => setSelectedInverterIds((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} />
                    <FilterSelector label="Grid Status" options={gridStatuses} selected={selectedGridStatuses} onToggle={(value) => setSelectedGridStatuses((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} />
                    <FilterSelector label="Fault Code" options={faultCodes} selected={selectedFaultCodes} onToggle={(value) => setSelectedFaultCodes((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} />
                    <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0F766E]">Scope</p>
                      <div className="mt-3 rounded-[16px] border border-slate-200 bg-white px-4 py-3">
                        <p className="text-sm font-semibold text-slate-700">Filtered Rows: {filteredCountText}</p>
                        <p className="mt-1 text-sm text-slate-500">Preview of the filtered result set, limited to the first 15 rows.</p>
                      </div>
                      <div className="mt-3 flex gap-3">
                        <Button type="button" variant="outline" onClick={() => downloadRows(filteredData.slice(0, 500), 'inverter_filtered_preview.csv')}>
                          <Download className="h-4 w-4" />
                          Download filtered preview
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-[22px] border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                      <DataTable rows={filteredPreviewRows} maxRows={15} />
                    </div>
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <h3 className="text-xl font-semibold text-slate-900">KPI Section</h3>
                  <div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard icon={<BarChart3 className="h-5 w-5 text-[#0F766E]" />} label="Records in Scope" value={kpis ? formatMetric(kpis.total_records, 0) : '—'} accent="bg-[#ECFDF5]" />
                    <MetricCard icon={<ShieldAlert className="h-5 w-5 text-[#DC2626]" />} label="7-Day Failure Rate" value={kpis ? formatPercent(kpis.failure_rate_pct) : '—'} accent="bg-[#FEF2F2]" />
                    <MetricCard icon={<Thermometer className="h-5 w-5 text-[#0369A1]" />} label="Avg Temp / Heatsink (°C)" value={kpis ? `${formatMetric(kpis.avg_temperature_c)} / ${formatMetric(kpis.avg_heatsink_temp_c)}` : '—'} accent="bg-[#EFF6FF]" />
                    <MetricCard icon={<Zap className="h-5 w-5 text-[#7C3AED]" />} label="Avg Lifetime Energy (kWh)" value={kpis ? formatMetric(kpis.avg_energy_kwh, 0) : '—'} accent="bg-[#F5F3FF]" />
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Charts & Diagnostics</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Plotly charts for inverter health</h3>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-6">
                    <ChartCard title="Inverter-wise 7-Day Failure Rate (Top 20)">
                      <Plot
                        data={[
                          {
                            x: inverterFailureRows.map((row) => String(row.inverter_id ?? '')),
                            y: inverterFailureRows.map((row) => Number(row.failure_rate_pct ?? 0)),
                            type: 'bar',
                            text: inverterFailureRows.map((row) => `${Number(row.failure_rate_pct ?? 0).toFixed(2)}%`),
                            textposition: 'outside',
                            marker: { color: '#0F766E' },
                            name: 'Failure Rate',
                          },
                        ]}
                        layout={{
                          title: 'Inverter-wise 7-Day Failure Rate (Top 20)',
                          autosize: true,
                          height: 520,
                          margin: { l: 60, r: 24, t: 50, b: 120 },
                          paper_bgcolor: 'rgba(0,0,0,0)',
                          plot_bgcolor: 'rgba(0,0,0,0)',
                          xaxis: { title: 'inverter_id', tickangle: -25, gridcolor: '#E2E8F0' },
                          yaxis: { title: 'failure_rate_pct', gridcolor: '#E2E8F0' },
                        }}
                        style={{ width: '100%' }}
                        config={{ displayModeBar: false, responsive: true }}
                      />
                    </ChartCard>

                    <ChartCard title="Temperature vs Vibration by Failure Outcome">
                      <Plot
                        data={[
                          {
                            x: tempFailureRows.filter((row) => row.failure_label === 'Failure').map((row) => row.temperature_c),
                            y: tempFailureRows.filter((row) => row.failure_label === 'Failure').map((row) => row.vibration_mms),
                            type: 'scatter',
                            mode: 'markers',
                            name: 'Failure',
                            marker: { color: '#DC2626', size: 9 },
                          },
                          {
                            x: tempFailureRows.filter((row) => row.failure_label !== 'Failure').map((row) => row.temperature_c),
                            y: tempFailureRows.filter((row) => row.failure_label !== 'Failure').map((row) => row.vibration_mms),
                            type: 'scatter',
                            mode: 'markers',
                            name: 'No Failure',
                            marker: { color: '#2563EB', size: 9 },
                          },
                        ]}
                        layout={{
                          title: 'Temperature vs Vibration by Failure Outcome',
                          autosize: true,
                          height: 520,
                          margin: { l: 60, r: 24, t: 50, b: 50 },
                          paper_bgcolor: 'rgba(0,0,0,0)',
                          plot_bgcolor: 'rgba(0,0,0,0)',
                          xaxis: { title: 'temperature_c', gridcolor: '#E2E8F0' },
                          yaxis: { title: 'vibration_mms', gridcolor: '#E2E8F0' },
                          legend: { orientation: 'h' },
                        }}
                        style={{ width: '100%' }}
                        config={{ displayModeBar: false, responsive: true }}
                      />
                    </ChartCard>

                    <ChartCard title="Lifetime Hours vs Total Energy Generated">
                      <Plot
                        data={[
                          {
                            x: lifetimeEnergyRows.map((row) => Number(row.lifetime_hours ?? 0)),
                            y: lifetimeEnergyRows.map((row) => Number(row.total_energy_generated_kwh ?? 0)),
                            type: 'scatter',
                            mode: 'markers',
                            name: 'Inverters',
                            marker: { color: '#0F766E', size: 9 },
                          },
                        ]}
                        layout={{
                          title: 'Lifetime Hours vs Total Energy Generated',
                          autosize: true,
                          height: 520,
                          margin: { l: 60, r: 24, t: 50, b: 50 },
                          paper_bgcolor: 'rgba(0,0,0,0)',
                          plot_bgcolor: 'rgba(0,0,0,0)',
                          xaxis: { title: 'lifetime_hours', gridcolor: '#E2E8F0' },
                          yaxis: { title: 'total_energy_generated_kwh', gridcolor: '#E2E8F0' },
                        }}
                        style={{ width: '100%' }}
                        config={{ displayModeBar: false, responsive: true }}
                      />
                    </ChartCard>
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Machine Learning</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">RandomForestClassifier</h3>
                    </div>
                  </div>

                  <div className="mt-6 rounded-[28px] border border-slate-200 bg-gradient-to-br from-[#ECFDF5] to-white p-6">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="rounded-full bg-[#0F766E] p-4 text-white shadow-lg shadow-teal-100">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0F766E]">Failure model diagnostics</p>
                        <p className="mt-1 text-base text-slate-600">The backend trains a RandomForestClassifier to predict failure_within_7_days and reports accuracy and ROC-AUC.</p>
                      </div>
                    </div>

                    {mlMessage && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 shadow-sm">{mlMessage}</div>}

                    <div className="mt-6 grid gap-4 md:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Rows</p><p className="mt-2 text-xl font-bold text-[#0F172A]">{mlResult?.train_size && mlResult?.test_size ? mlResult.train_size + mlResult.test_size : filteredData.length}</p></div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Accuracy</p><p className="mt-2 text-xl font-bold text-[#0F172A]">{mlResult?.accuracy ?? '—'}</p></div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">ROC-AUC</p><p className="mt-2 text-xl font-bold text-[#0F172A]">{mlResult?.roc_auc ?? '—'}</p></div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Test Size</p><p className="mt-2 text-xl font-bold text-[#0F172A]">{mlResult?.test_size ?? '—'}</p></div>
                    </div>

                    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="bg-slate-50">Actual_failure_within_7_days</TableHead>
                              <TableHead className="bg-slate-50">Predicted_failure_flag</TableHead>
                              <TableHead className="bg-slate-50">Predicted_failure_probability</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(mlResult?.predictions ?? []).length ? (
                              mlResult.predictions.map((row: Row, index: number) => (
                                <TableRow key={index}>
                                  <TableCell>{formatCell(row.Actual_failure)}</TableCell>
                                  <TableCell>{formatCell(row.Predicted_failure_flag)}</TableCell>
                                  <TableCell>{formatCell(row.Predicted_failure_prob)}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={3} className="py-8 text-center text-slate-500">Prediction table will appear after analysis.</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button type="button" variant="outline" onClick={() => downloadRows(mlResult?.predictions ?? [], 'inverter_failure_predictions.csv')}>
                        <Download className="h-4 w-4" />
                        Download Predictions CSV
                      </Button>
                    </div>
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Automated Insights</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Backend-generated observations</h3>
                    </div>
                    <Button type="button" variant="outline" onClick={() => downloadRows(insights, 'inverter_failure_insights.csv')}>
                      <Download className="h-4 w-4" />
                      Download Insights
                    </Button>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>{['Insight', 'Entity', 'Metric', 'Action'].map((column) => <TableHead key={column} className="bg-slate-100 font-semibold text-slate-700">{column}</TableHead>)}</TableRow>
                        </TableHeader>
                        <TableBody>
                          {insights.length ? insights.map((row, index) => (
                            <TableRow key={`${row.Insight}-${index}`}>
                              <TableCell className="whitespace-normal text-slate-700">{row.Insight}</TableCell>
                              <TableCell className="whitespace-normal text-slate-700">{row.Entity}</TableCell>
                              <TableCell className="whitespace-normal text-slate-700">{row.Metric}</TableCell>
                              <TableCell className="whitespace-normal text-slate-700">{row.Action}</TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={4} className="py-8 text-center text-slate-500">Insights will appear after analysis.</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
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
