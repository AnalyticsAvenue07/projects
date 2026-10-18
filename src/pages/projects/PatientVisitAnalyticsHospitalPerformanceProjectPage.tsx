import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Plot from 'react-plotly.js'
import { Download, FileUp, Loader2, Sparkles, Stethoscope, Users, IndianRupee, ClipboardList, ChevronLeft, X } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'
import { PatientVisitService } from '@/services/patientVisitService'

const REQUIRED_FIELDS = ['Date', 'Department', 'Doctor', 'Patient_ID', 'Age', 'Gender', 'Visit_Type', 'Revenue', 'Admission']

const REQUIRED_FIELD_DESCRIPTIONS: Record<string, string> = {
  Date: 'Recorded date of patient visit or admission',
  Department: 'Hospital department handling patient',
  Doctor: 'Consulting or attending doctor',
  Patient_ID: 'Unique patient identifier',
  Age: 'Patient age',
  Gender: 'Male / Female / Others',
  Visit_Type: 'OP / IP / Follow-up / Emergency',
  Revenue: 'Revenue generated',
  Admission: 'Admission flag (1 or 0)',
}

const DEFAULT_DATASET_COLUMNS = ['Date', 'Department', 'Doctor', 'Patient_ID', 'Age', 'Gender', 'Visit_Type', 'Revenue', 'Admission']
const INSIGHT_COLUMNS = ['Insight', 'Value', 'Metric', 'Action']

type DatasetMode = 'default' | 'upload' | 'mapping'
type PatientRow = Record<string, unknown>
type Kpis = { total_patients: number; total_revenue: number; admission_rate_pct: number; revenue_per_patient: number }
type ChartRow = { Date?: string; Department?: string; Doctor?: string; Patient_ID?: number; MA7?: number; Revenue?: number; Admission_Rate?: number }
type InsightRow = { Insight: string; Value: string; Metric: string; Action: string }
type ActiveTab = 'overview' | 'attributes' | 'application'

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

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toFixed(2)}%`
}

function createTableColumns(rows: PatientRow[]) {
  return Object.keys(rows[0] ?? {})
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

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

/* ─── Shared Premium Style Tokens ────────────────────────────── */
const selectCls =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#0F766E] transition cursor-pointer'
const cardCls =
  'rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]'
const btnPrimaryCls =
  'inline-flex items-center gap-2 rounded-full bg-[#0F766E] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,118,110,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,118,110,0.26)] active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed'
const btnSecondaryCls =
  'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed'

/* ─── Redesigned ProjectMetricCard with larger fonts ─── */
function ProjectMetricCard({ icon, label, value, accent }: { icon: ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition hover:shadow-[0_24px_50px_rgba(15,23,42,0.12)]">
      <div className="flex items-center gap-4">
        <div className={`rounded-2xl p-4 shrink-0 ${accent}`}>{icon}</div>
        <div>
          {/* Increased text size and weight for labels and values */}
          <p className="text-base font-bold text-slate-500 tracking-tight">{label}</p>
          <p className="mt-1 text-2xl font-bold text-[#0F172A]">{value}</p>
        </div>
      </div>
    </div>
  )
}

function DataTable({ rows, maxRows = 10 }: { rows: PatientRow[]; maxRows?: number }) {
  const displayRows = rows.slice(0, maxRows)
  const columns = useMemo(() => createTableColumns(displayRows), [displayRows])

  if (!displayRows.length) {
    return <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">No rows to display.</div>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column} className="bg-slate-50 text-[12px] font-bold uppercase tracking-[0.08em] text-slate-600 py-3.5">
              {column}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {displayRows.map((row, rowIndex) => (
          <TableRow key={rowIndex} className="border-slate-200 hover:bg-slate-50/50">
            {columns.map((column) => (
              <TableCell key={`${rowIndex}-${column}`} className="max-w-[220px] whitespace-normal px-3 py-3 text-slate-700 text-sm">
                {formatCell(row[column])}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function SelectableChips({ label, values, selected, onToggle }: { label: string; values: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
      <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0F766E]">{label}</p>
      <div className="mb-4 mt-3 min-h-[56px] rounded-[16px] border border-slate-200 bg-white px-4 py-3 flex items-center">
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selected.map((option) => (
              <span
                key={option}
                className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-3 py-1 text-sm font-semibold text-[#0F766E]"
              >
                {option}
                <button type="button" onClick={() => onToggle(option)} className="hover:text-red-500 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400">Choose one or more {label.toLowerCase()}</div>
        )}
      </div>
      <div className="grid max-h-56 gap-2 overflow-y-auto pr-1">
        {values.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`w-full rounded-2xl px-3 py-2 text-left text-sm transition ${selected.includes(option) ? 'bg-[#0F766E] text-white shadow-sm font-bold' : 'bg-white border border-slate-100 text-slate-700 hover:bg-slate-100'}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function MappingRow({ field, columns, value, onChange }: { field: string; columns: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[220px_1fr] md:items-center">
      <div>
        <p className="text-sm font-semibold text-slate-800">{field}</p>
        <p className="mt-1 text-xs text-slate-500">{REQUIRED_FIELD_DESCRIPTIONS[field]}</p>
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

export function PatientVisitAnalyticsHospitalPerformanceProjectPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [mode, setMode] = useState<DatasetMode>('default')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [data, setData] = useState<PatientRow[]>([])
  const [filteredData, setFilteredData] = useState<PatientRow[]>([])
  const [defaultPreviewRows, setDefaultPreviewRows] = useState<PatientRow[]>([])
  const [previewRows, setPreviewRows] = useState<PatientRow[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [doctors, setDoctors] = useState<string[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([])
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [dateMin, setDateMin] = useState('')
  const [dateMax, setDateMax] = useState('')
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [visitsOverTime, setVisitsOverTime] = useState<ChartRow[]>([])
  const [revenueByDepartment, setRevenueByDepartment] = useState<ChartRow[]>([])
  const [admissionRateByDoctor, setAdmissionRateByDoctor] = useState<ChartRow[]>([])
  const [mlResult, setMlResult] = useState<{ accuracy_pct?: number; model?: string; target?: string } | null>(null)
  const [insights, setInsights] = useState<InsightRow[]>([])
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [fileColumns, setFileColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})

  const activeRows = filteredData.length ? filteredData : data
  const isUploadPending = mode === 'upload' && !data.length
  const isMappingPending = mode === 'mapping' && !uploadFile
  const patientVisitDates = visitsOverTime.map((item) => item.Date ?? '')
  const patientVisitCounts = visitsOverTime.map((item) => item.Patient_ID ?? 0)
  const patientVisitMa7 = visitsOverTime.map((item) => item.MA7 ?? 0)
  const departmentLabels = revenueByDepartment.map((item) => item.Department ?? '')
  const departmentRevenue = revenueByDepartment.map((item) => item.Revenue ?? 0)
  const doctorLabels = admissionRateByDoctor.map((item) => item.Doctor ?? '')
  const doctorAdmissionRates = admissionRateByDoctor.map((item) => item.Admission_Rate ?? 0)

  useEffect(() => {
    void loadDefaultDataset()
  }, [])

  useEffect(() => {
    if (!activeRows.length) return
    void runAnalysis(activeRows)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartments, selectedDoctors, dateStart, dateEnd])

  async function loadDefaultDataset() {
    setError(null)
    setLoading(true)
    setMode('default')
    setSelectedDepartments([])
    setSelectedDoctors([])
    setDateStart('')
    setDateEnd('')
    setUploadFile(null)
    setFileColumns([])
    setMapping({})

    try {
      const response = await PatientVisitService.loadDefault()
      const rows = response.data ?? []
      setData(rows as any)
      setFilteredData(rows as any)
      setDefaultPreviewRows(response.preview ?? rows.slice(0, 10))
      setPreviewRows(response.preview ?? rows.slice(0, 10))
      setDepartments((response.departments ?? []).map(String))
      setDoctors((response.doctors ?? []).map(String))
      setDateMin('')
      setDateMax('')
      setStatusMessage('Default patient visit dataset loaded.')
      await runAnalysis(rows as any)
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load default dataset.')
    } finally {
      setLoading(false)
    }
  }

  async function runAnalysis(rows: PatientRow[]) {
    if (!rows.length) {
      setKpis(null)
      setVisitsOverTime([])
      setRevenueByDepartment([])
      setAdmissionRateByDoctor([])
      setMlResult(null)
      setInsights([])
      return
    }

    try {
      const filterResponse = await PatientVisitService.filter({
        data: rows as any,
        departments: selectedDepartments.length ? selectedDepartments : undefined,
        doctors: selectedDoctors.length ? selectedDoctors : undefined,
      })

      const filteredRows = (filterResponse.data ?? rows) as any[]
      setFilteredData(filteredRows)
      setPreviewRows(filterResponse.preview ?? filteredRows.slice(0, 10))
      setKpis(filterResponse.kpis ?? null)
      rows = filteredRows
    } catch (err) {
      console.error(err)
    }

    try {
      const chartResponse = await PatientVisitService.getCharts(rows as any)
      setVisitsOverTime((chartResponse.visits_by_date ?? []).map(v => ({ ...v, Patient_ID: v.Visits })))
      setRevenueByDepartment(chartResponse.revenue_by_department ?? [])
      setAdmissionRateByDoctor((chartResponse.admission_rates ?? []).map(a => ({ Doctor: a.Department, Admission_Rate: a.Admission_Rate })))
    } catch (err) {
      console.error(err)
      setVisitsOverTime([])
      setRevenueByDepartment([])
      setAdmissionRateByDoctor([])
    }

    try {
      const mlResponse = await PatientVisitService.predictAdmission(rows as any)
      setMlResult(mlResponse)
    } catch (err) {
      console.error(err)
      setMlResult(null)
    }

    try {
      const insightResponse = await PatientVisitService.getInsights(rows as any)
      setInsights(insightResponse.insights ?? [])
    } catch (err) {
      console.error(err)
      setInsights([])
    }
  }

  async function downloadRows(rows: PatientRow[], filename: string) {
    PatientVisitService.downloadCsv(rows as any, filename)
  }

  async function handleUpload(file: File) {
    setUploadFile(file)
    setError(null)
    setLoading(true)
    setStatusMessage(null)

    try {
      const uploadResponse = await PatientVisitService.uploadCsv(file)
      const rows = uploadResponse.data ?? []

      if (mode === 'mapping') {
        const columnsResponse = await PatientVisitService.getCsvColumns(file)
        const uploadedColumns = (columnsResponse.columns ?? []).map(String)
        setFileColumns(uploadedColumns)
        setDefaultPreviewRows(uploadResponse.preview ?? rows.slice(0, 10))
        setPreviewRows(uploadResponse.preview ?? rows.slice(0, 10))
        setData(rows as any)
        setFilteredData(rows as any)
        setDepartments((uploadResponse.departments ?? []).map(String))
        setDoctors((uploadResponse.doctors ?? []).map(String))
        setMapping(Object.fromEntries(REQUIRED_FIELDS.map((field) => [field, uploadedColumns.includes(field) ? field : ''])))
        setStatusMessage('CSV uploaded. Map the columns, then apply the mapping to unlock the analytics.')
        return
      }

      setMode('upload')
      setData(rows as any)
      setFilteredData(rows as any)
      setDefaultPreviewRows(uploadResponse.preview ?? rows.slice(0, 10))
      setPreviewRows(uploadResponse.preview ?? rows.slice(0, 10))
      setDepartments((uploadResponse.departments ?? []).map(String))
      setDoctors((uploadResponse.doctors ?? []).map(String))
      setDateMin('')
      setDateMax('')
      setSelectedDepartments([])
      setSelectedDoctors([])
      setStatusMessage('CSV uploaded successfully.')
      await runAnalysis(rows as any)
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
      const response = await PatientVisitService.applyMapping(uploadFile, mapping)
      const rows = response.data ?? []
      setData(rows as any)
      setFilteredData(rows as any)
      setDefaultPreviewRows(response.preview ?? rows.slice(0, 10))
      setPreviewRows(response.preview ?? rows.slice(0, 10))
      setDepartments((response.departments ?? []).map(String))
      setDoctors((response.doctors ?? []).map(String))
      setSelectedDepartments([])
      setSelectedDoctors([])
      setStatusMessage('Manual mapping applied successfully.')
      await runAnalysis(rows as any)
    } catch (err: any) {
      setError(err?.message ?? 'Mapping failed.')
    } finally {
      setLoading(false)
    }
  }

  function exportInsights() {
    const csv = buildCsv(insights)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'automated_insights.csv'
    link.click()
    URL.revokeObjectURL(url)
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

  const defaultDatasetRows = defaultPreviewRows.length ? defaultPreviewRows.slice(0, 10) : data.slice(0, 10)
  const filteredPreviewRows = previewRows.length ? previewRows.slice(0, 10) : filteredData.slice(0, 10)

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
              <span>Healthcare</span>
              <span className="text-slate-300">•</span>
              <span>Patient Visit Analytics & Hospital Performance</span>
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">Patient Visit Analytics & Hospital Performance</h1>
            <p className="mt-4 max-w-4xl text-[16px] leading-7 text-[#334155]">Analyze hospital visits, doctor performance, admission rates, revenue trends, and patient load. AI-powered forecasting helps hospitals optimize staffing, scheduling, and resources.</p>
          </div>
        </div>

        {/* ── Custom Pill Tabs Container ── */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] mb-6">
          <div className="inline-flex overflow-hidden rounded-3xl border border-[#CBD5E1] bg-[#F8FAFC] p-1 shadow-sm">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`rounded-3xl px-5 py-3 text-sm font-semibold transition ${
                  activeTab === key
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
        {activeTab === 'overview' && (
          <div className="space-y-6 pt-4">
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Overview</p>
                  <h2 className="mt-2 text-3xl font-bold text-[#0F172A]">Healthcare operations insight in one workspace</h2>
                  <p className="mt-4 text-base leading-7 text-[#475569]">This project tracks patient flow across departments, revenue generation, admission behavior, and doctor performance so hospital teams can spot pressure points and plan resources with confidence.</p>
                </div>
                <div className="rounded-3xl border border-[#CCFBF1] bg-[#ECFDF5] px-5 py-4 text-[#0F766E] shadow-sm shrink-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Live analytics theme</p>
                  <p className="mt-2 text-sm leading-6 text-[#115E59]">Built for patient volume monitoring, revenue visibility, and admission forecasting.</p>
                </div>
              </div>
            </section>

            {/* Redesigned metrics row with active KPI data */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <ProjectMetricCard icon={<Users className="h-6 w-6 text-[#0F766E]" />} label="Total Patients" value={kpis ? formatCell(kpis.total_patients) : '—'} accent="bg-[#ECFDF5]" />
              <ProjectMetricCard icon={<IndianRupee className="h-6 w-6 text-[#0369A1]" />} label="Total Revenue" value={kpis ? `₹${formatMoney(kpis.total_revenue)}` : '—'} accent="bg-[#EFF6FF]" />
              <ProjectMetricCard icon={<ClipboardList className="h-6 w-6 text-[#B45309]" />} label="Admission Rate" value={kpis ? formatPercent(kpis.admission_rate_pct) : '—'} accent="bg-[#FFFBEB]" />
              <ProjectMetricCard icon={<Stethoscope className="h-6 w-6 text-[#7C3AED]" />} label="Revenue per Patient" value={kpis ? `₹${formatMoney(kpis.revenue_per_patient)}` : '—'} accent="bg-[#F5F3FF]" />
            </div>
          </div>
        )}

        {/* 2. Important Attributes Tab */}
        {activeTab === 'attributes' && (
          <div className="space-y-6 pt-4">
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <h2 className="text-3xl font-bold text-[#0F172A]">Required Column Data Dictionary</h2>
              <p className="mt-3 max-w-3xl text-[#475569]">The table below captures the hospital data needed for loading, filtering, charting, and prediction.</p>
              
              <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 border-b border-slate-200">
                        <TableHead className="font-bold text-slate-600 uppercase text-[12px] tracking-[0.08em] py-3.5">Column</TableHead>
                        <TableHead className="font-bold text-slate-600 uppercase text-[12px] tracking-[0.08em] py-3.5">Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {REQUIRED_FIELDS.map((field, idx) => (
                        <TableRow key={field} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                          <td className="px-4 py-3.5 font-semibold text-[#0F172A] text-sm">{field}</td>
                          <td className="px-4 py-3.5 text-slate-600 text-sm">{REQUIRED_FIELD_DESCRIPTIONS[field]}</td>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </section>

            {/* Variables split section with professional fill colors */}
            <div className="grid gap-6 md:grid-cols-2">
              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <h3 className="text-2xl font-bold text-[#0F172A]">Independent Variables</h3>
                <p className="text-sm text-slate-500 mt-1">Variables used as inputs to forecast model and data filter parameters.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {['Department', 'Doctor', 'Age', 'Gender', 'Visit_Type'].map((item) => (
                    <div key={item} className="rounded-2xl border border-blue-100 bg-[#EFF6FF] text-[#1D4ED8] px-4 py-3.5 text-sm font-bold shadow-sm">{item}</div>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <h3 className="text-2xl font-bold text-[#0F172A]">Dependent Variables</h3>
                <p className="text-sm text-slate-500 mt-1">Target fields computed or predicted by classifier model logic.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {['Revenue', 'Admission'].map((item) => (
                    <div key={item} className="rounded-2xl border border-emerald-100 bg-[#ECFDF5] text-[#0F766E] px-4 py-3.5 text-sm font-bold shadow-sm">{item}</div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* 3. Application Tab */}
        {activeTab === 'application' && (
          <div className="space-y-8 pt-4">
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Dataset Options</p>
              <RadioGroup value={mode} onValueChange={(value) => setMode(value as DatasetMode)} className="mt-5 grid gap-4 md:grid-cols-3">
                {[
                  { value: 'default', title: 'Default Dataset', description: 'Automatically load the curated healthcare dataset.' },
                  { value: 'upload', title: 'Upload CSV', description: 'Upload your own dataset and analyze it immediately.' },
                  { value: 'mapping', title: 'Upload CSV + Manual Mapping', description: 'Upload a file and map the columns before analysis.' },
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

            {error && <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-sm font-semibold">{error}</div>}
            {statusMessage && <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800 shadow-sm font-semibold">{statusMessage}</div>}

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Step 1</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">{mode === 'mapping' ? 'Upload CSV for Mapping' : mode === 'upload' ? 'Upload CSV file' : 'Load Default Dataset'}</h3>
                  <p className="mt-2 text-slate-600">{mode === 'default' ? 'The dataset loads automatically when the page opens.' : 'Drag and drop file here or use the browse button. Limit 200MB per file • CSV'}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-full">
                    <FileUp className="h-4 w-4" />
                    Browse CSV
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void loadDefaultDataset()} className="rounded-full">
                    Reload Default Data
                  </Button>
                </div>
              </div>

              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileInputChange} />

              {mode === 'default' && !loading && data.length > 0 && (
                <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Default dataset loaded</p>
                      <p className="text-sm text-slate-500 mt-1">Columns: {DEFAULT_DATASET_COLUMNS.join(' • ')}</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => void downloadRows(data, 'default_patient_visit_data.csv')} className="rounded-full">
                      <Download className="h-4 w-4" />
                      Download Default Data
                    </Button>
                  </div>
                  <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                      <DataTable rows={defaultDatasetRows} />
                    </div>
                  </div>
                </div>
              )}

              {(isUploadPending || isMappingPending) && (
                <div onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className="mt-6 cursor-pointer rounded-[28px] border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center transition hover:border-[#0F766E] hover:bg-[#F8FBFF]">
                  <div className="mx-auto flex max-w-md flex-col items-center">
                    <div className="rounded-full bg-[#ECFDF5] p-4 text-[#0F766E]"><FileUp className="h-8 w-8" /></div>
                    <h4 className="mt-4 text-xl font-bold text-[#0F172A]">Drag and drop file here</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Limit 200MB per file • CSV</p>
                  </div>
                </div>
              )}

              {loading && <div className="mt-6 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Processing data...</div>}
            </section>

            {mode === 'mapping' && uploadFile && fileColumns.length > 0 && (
              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Step 2</p>
                <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Preview and map columns</h3>
                <p className="mt-2 text-slate-600">Map the uploaded CSV headers to the required hospital dataset fields.</p>

                <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                  <div className="overflow-x-auto">
                    <DataTable rows={previewRows} maxRows={5} />
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {REQUIRED_FIELDS.map((field) => (
                    <MappingRow key={field} field={field} columns={fileColumns} value={mapping[field] ?? ''} onChange={(value) => setMapping((current) => ({ ...current, [field]: value }))} />
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button type="button" onClick={() => void applyMapping()} className="rounded-full">Apply Mapping</Button>
                </div>
              </section>
            )}

            {data.length > 0 && (
              <>
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">STEP 2 — FILTERS & PREVIEW</h3>
                      <p className="mt-1 text-sm text-slate-500">Use the filters below to narrow the hospital dataset and preview the results.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void runAnalysis(data)}
                      className="inline-flex items-center gap-2 rounded-full bg-[#0F766E] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#115E59]"
                    >
                      Apply filters
                    </button>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    <SelectableChips label="Department Filter" values={departments} selected={selectedDepartments} onToggle={(value) => setSelectedDepartments((current) => toggleValue(current, value))} />
                    <SelectableChips label="Doctor Filter" values={doctors} selected={selectedDoctors} onToggle={(value) => setSelectedDoctors((current) => toggleValue(current, value))} />
                    <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 xl:col-span-1">
                      <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0F766E]">Date Range</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <input
                          type="date"
                          value={dateStart}
                          min={dateMin || undefined}
                          max={dateMax || undefined}
                          onChange={(event) => setDateStart(event.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                        />
                        <input
                          type="date"
                          value={dateEnd}
                          min={dateMin || undefined}
                          max={dateMax || undefined}
                          onChange={(event) => setDateEnd(event.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-slate-900">Filtered Data Preview (first 10 rows)</h3>
                    <button
                      type="button"
                      onClick={() => void downloadRows(filteredData.length ? filteredData : data, 'filtered_patient_visit_data.csv')}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                    >
                      <Download className="h-4 w-4" />
                      Download filtered preview
                    </button>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                      <DataTable rows={filteredPreviewRows} />
                    </div>
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Dynamic KPI Section</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">KPIs updated from filters</h3>
                    </div>
                  </div>
                  {/* Metric Cards in Application Tab also with larger font sizes */}
                  <div className="mt-6 grid gap-5 xl:grid-cols-4">
                    <ProjectMetricCard icon={<Users className="h-6 w-6 text-[#0F766E]" />} label="Total Patients" value={kpis ? formatCell(kpis.total_patients) : '—'} accent="bg-[#ECFDF5]" />
                    <ProjectMetricCard icon={<IndianRupee className="h-6 w-6 text-[#0369A1]" />} label="Total Revenue" value={kpis ? `₹${formatMoney(kpis.total_revenue)}` : '—'} accent="bg-[#EFF6FF]" />
                    <ProjectMetricCard icon={<ClipboardList className="h-6 w-6 text-[#B45309]" />} label="Admission Rate" value={kpis ? formatPercent(kpis.admission_rate_pct) : '—'} accent="bg-[#FFFBEB]" />
                    <ProjectMetricCard icon={<Stethoscope className="h-6 w-6 text-[#7C3AED]" />} label="Revenue Per Patient" value={kpis ? `₹${formatMoney(kpis.revenue_per_patient)}` : '—'} accent="bg-[#F5F3FF]" />
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Charts Section</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Performance visualization</h3>
                    </div>
                  </div>

                  <div className="mt-6 space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                      <h4 className="mb-3 text-lg font-semibold text-[#0F172A]">Patient Visits Over Time</h4>
                      <Plot
                        data={[
                          {
                            x: patientVisitDates,
                            y: patientVisitCounts,
                            type: 'scatter',
                            mode: 'lines',
                            name: 'Patient_ID',
                            line: { color: '#0F766E', width: 3 },
                          },
                          {
                            x: patientVisitDates,
                            y: patientVisitMa7,
                            type: 'scatter',
                            mode: 'lines',
                            name: 'MA7',
                            line: { color: '#F97316', width: 3, dash: 'dot' },
                          },
                        ]}
                        layout={{
                          title: 'Patient Visits Over Time',
                          autosize: true,
                          height: 480,
                          margin: { l: 50, r: 24, t: 50, b: 50 },
                          paper_bgcolor: 'rgba(0,0,0,0)',
                          plot_bgcolor: 'rgba(0,0,0,0)',
                          xaxis: { title: 'Date', gridcolor: '#E2E8F0' },
                          yaxis: { title: 'Visits', gridcolor: '#E2E8F0' },
                          legend: { orientation: 'h' },
                        }}
                        style={{ width: '100%' }}
                        config={{ displayModeBar: false, responsive: true }}
                      />
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                      <h4 className="mb-3 text-lg font-semibold text-[#0F172A]">Revenue by Department</h4>
                      <Plot
                        data={[
                          {
                            x: departmentLabels,
                            y: departmentRevenue,
                            type: 'bar',
                            name: 'Revenue',
                            marker: { color: '#0F766E' },
                            text: departmentRevenue,
                            textposition: 'auto',
                          },
                        ]}
                        layout={{
                          title: 'Revenue by Department',
                          autosize: true,
                          height: 480,
                          margin: { l: 50, r: 24, t: 50, b: 110 },
                          paper_bgcolor: 'rgba(0,0,0,0)',
                          plot_bgcolor: 'rgba(0,0,0,0)',
                          xaxis: { title: 'Department', tickangle: -25, gridcolor: '#E2E8F0' },
                          yaxis: { title: 'Revenue', gridcolor: '#E2E8F0' },
                        }}
                        style={{ width: '100%' }}
                        config={{ displayModeBar: false, responsive: true }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <h4 className="mb-3 text-lg font-semibold text-[#0F172A]">Admission Rate by Doctor</h4>
                    <Plot
                      data={[
                        {
                          x: doctorLabels,
                          y: doctorAdmissionRates,
                          type: 'bar',
                          name: 'Admission Rate',
                          marker: { color: '#2563EB' },
                          text: doctorAdmissionRates,
                          textposition: 'auto',
                        },
                      ]}
                      layout={{
                        title: 'Admission Rate by Doctor',
                        autosize: true,
                        height: 360,
                        margin: { l: 40, r: 20, t: 40, b: 90 },
                        paper_bgcolor: 'rgba(0,0,0,0)',
                        plot_bgcolor: 'rgba(0,0,0,0)',
                        xaxis: { title: 'Doctor', tickangle: -25, gridcolor: '#E2E8F0' },
                        yaxis: { title: 'Admission Rate', gridcolor: '#E2E8F0' },
                      }}
                      style={{ width: '100%' }}
                      config={{ displayModeBar: false, responsive: true }}
                    />
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Machine Learning</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Predict Admission</h3>
                    </div>
                  </div>
                  <div className="mt-6 rounded-[28px] border border-slate-200 bg-gradient-to-br from-[#ECFDF5] to-white p-6">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="rounded-full bg-[#0F766E] p-4 text-white shadow-lg shadow-emerald-100"><Sparkles className="h-6 w-6" /></div>
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0F766E]">RandomForestClassifier</p>
                        <p className="mt-1 text-base text-slate-600">Uses Department, Doctor, Gender, and Age to predict admission likelihood.</p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Model</p><p className="mt-2 text-xl font-bold text-[#0F172A]">{mlResult?.model ?? 'RandomForestClassifier'}</p></div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Target</p><p className="mt-2 text-xl font-bold text-[#0F172A]">{mlResult?.target ?? 'Admission_Rate'}</p></div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Prediction Accuracy</p><p className="mt-2 text-xl font-bold text-[#0F172A]">{mlResult?.accuracy_pct ? `${mlResult.accuracy_pct.toFixed(2)}%` : '—'}</p></div>
                    </div>

                    {mlResult?.accuracy_pct ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">Prediction Accuracy: {mlResult.accuracy_pct.toFixed(2)}%</div> : <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-600">Prediction accuracy will appear after the backend trains on the active dataset.</div>}
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Automated Insights</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Backend-generated observations</h3>
                    </div>
                    <Button type="button" variant="outline" onClick={exportInsights} className="rounded-full">
                      <Download className="h-4 w-4" />
                      Download Insights
                    </Button>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>{INSIGHT_COLUMNS.map((column) => <TableHead key={column} className="bg-slate-100 font-semibold text-slate-700">{column}</TableHead>)}</TableRow>
                        </TableHeader>
                        <TableBody>
                          {insights.length ? insights.map((row, index) => (
                            <TableRow key={`${row.Insight}-${index}`}>
                              {INSIGHT_COLUMNS.map((column) => (
                                <TableCell key={column} className="whitespace-normal text-slate-700 text-sm">{row[column as keyof InsightRow] ?? '—'}</TableCell>
                              ))}
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
