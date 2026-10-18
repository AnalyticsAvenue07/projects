import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router'
import Plot from 'react-plotly.js'
import { ProjectDetailCardSkeleton } from '@/components/projects/ProjectDetailCard'
import { HealthscopeService } from '@/services/healthscopeService'
import { ProjectOverviewManager, EditableOverviewSection } from '@/components/project-content'
import {
  ChevronLeft,
  ChevronRight,
  Target,
  TrendingUp,
  X,
  Download,
  Stethoscope,
  Activity,
  HeartPulse,
  Users,
  FileUp,
  Check,
} from 'lucide-react'

const MAPPING_FIELDS = [
  { label: 'Date', param: 'date' },
  { label: 'Hospital', param: 'hospital' },
  { label: 'Department', param: 'department' },
  { label: 'Doctor', param: 'doctor' },
  { label: 'Patient', param: 'patient' },
  { label: 'AgeGroup', param: 'age_group' },
  { label: 'Gender', param: 'gender' },
  { label: 'Visits', param: 'visits' },
  { label: 'TreatmentCost', param: 'treatment_cost' },
  { label: 'Revenue', param: 'revenue' },
  { label: 'RecoveryRate', param: 'recovery_rate' },
  { label: 'SatisfactionScore', param: 'satisfaction_score' },
]

const getDefaultMapping = (columns: string[]) => {
  return MAPPING_FIELDS.reduce((acc, field) => {
    acc[field.label] = columns.includes(field.label) ? field.label : ''
    return acc
  }, {} as Record<string, string>)
}

type Kpis = {
  total_visits: number
  total_revenue: number
  avg_recovery_rate: number
  avg_satisfaction: number
}

type MlMetrics = {
  rmse: number
  r2_score: number
}

type InsightItem = {
  Insight: string
  Value: string
}

type HospitalPerformanceItem = {
  Hospital: string
  Visits: number
  Revenue: number
}

type VisitTrendItem = {
  Date: string
  Visits: number
}

type DatasetMode = 'default' | 'upload' | 'mapping'
type ActiveTab = 'overview' | 'attributes' | 'application'

async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const message = errorData?.detail || errorData?.message || response.statusText || 'Request failed'
    throw new Error(message)
  }
  return response.json()
}

/* ─── Shared Premium Style Tokens ────────────────────────────── */
const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0F766E] transition'
const selectCls =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#0F766E] transition cursor-pointer'
const cardCls =
  'rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]'
const btnPrimaryCls =
  'inline-flex items-center gap-2 rounded-full bg-[#0F766E] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,118,110,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,118,110,0.26)] active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none'
const btnSecondaryCls =
  'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed'

/* ─── SectionHeading (matches PatientFlow/AI Prescription patterns) ─── */
function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">{title}</h2>
      {description && <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#475569]">{description}</p>}
    </div>
  )
}

/* ─── MetricCard ────────────────────────────────────────────── */
function MetricCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition hover:shadow-[0_24px_50px_rgba(15,23,42,0.12)]">
      <div className="flex items-center gap-3">
        <div className={`rounded-2xl p-3 ${accent}`}>{icon}</div>
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-[#0F172A]">{value}</p>
        </div>
      </div>
    </div>
  )
}

export function HealthscopeInsightsProjectPage() {
  const navigate = useNavigate()
  const BRAND_TEAL = '#0F766E'
  const CHART_BLUE = '#2563EB'

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [mode, setMode] = useState<DatasetMode>('default')
  const [data, setData] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [hospitals, setHospitals] = useState<string[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [selectedHospitals, setSelectedHospitals] = useState<string[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [dateStart, setDateStart] = useState<string>('')
  const [dateEnd, setDateEnd] = useState<string>('')
  const [kpis, setKpis] = useState<Kpis | null>(null)

  const toggleHospital = (hospital: string) => {
    setSelectedHospitals((current) =>
      current.includes(hospital) ? current.filter((value) => value !== hospital) : [...current, hospital]
    )
  }

  const toggleDepartment = (department: string) => {
    setSelectedDepartments((current) =>
      current.includes(department) ? current.filter((value) => value !== department) : [...current, department]
    )
  }

  const [hospitalPerformance, setHospitalPerformance] = useState<HospitalPerformanceItem[]>([])
  const [visitTrend, setVisitTrend] = useState<VisitTrendItem[]>([])
  const [mlMetrics, setMlMetrics] = useState<MlMetrics | null>(null)
  const [insights, setInsights] = useState<InsightItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [fileColumns, setFileColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>(getDefaultMapping([]))

  const dataPreview = useMemo(() => {
    if (filtered.length) return filtered.slice(0, 8)
    if (previewRows.length) return previewRows.slice(0, 8)
    return data.slice(0, 8)
  }, [filtered, previewRows, data])

  useEffect(() => {
    loadDefault()
  }, [])

  async function loadDefault() {
    setError(null)
    setLoading(true)
    setMode('default')
    setSelectedHospitals([])
    setSelectedDepartments([])
    setDateStart('')
    setDateEnd('')

    try {
      const res = await HealthscopeService.loadDefault()
      const rows = res.data ?? []
      setData(rows)
      setFiltered(rows)
      setPreviewRows(res.preview ?? [])
      setHospitals(res.hospitals ?? [])
      setDepartments(res.departments ?? [])
      await analyzeData(rows)
      setKpis(res.kpis ?? null)
    } catch (err: any) {
      console.error(err)
      setError(err?.message ?? 'Unable to load default dataset.')
      setData([])
      setFiltered([])
      setPreviewRows([])
      setHospitals([])
      setDepartments([])
      setKpis(null)
      setHospitalPerformance([])
      setVisitTrend([])
      setMlMetrics(null)
      setInsights([])
    } finally {
      setLoading(false)
    }
  }

  async function loadAnalytics(rows: any[]) {
    if (!rows.length) {
      setKpis(null)
      setFiltered([])
      setHospitalPerformance([])
      setVisitTrend([])
      setMlMetrics(null)
      setInsights([])
      return
    }

    try {
      const res = await HealthscopeService.filter({
        data: rows,
        hospitals: selectedHospitals,
        departments: selectedDepartments,
        date_start: dateStart || undefined,
        date_end: dateEnd || undefined,
      })
      const filteredRows = res.data ?? rows
      setFiltered(filteredRows)
      setKpis(res.kpis ?? null)
      await analyzeData(filteredRows)
    } catch (err: any) {
      console.error('Filter error', err)
      setError(err?.message ?? 'Unable to apply filters.')
      setFiltered(rows)
      await analyzeData(rows)
    }
  }

  async function analyzeData(rows: any[]) {
    if (!rows.length) {
      setHospitalPerformance([])
      setVisitTrend([])
      setMlMetrics(null)
      setInsights([])
      return
    }

    try {
      const chartRes = await HealthscopeService.getCharts(rows)
      setHospitalPerformance(chartRes.hospital_performance ?? [])
      setVisitTrend(chartRes.visits_over_time ?? [])
    } catch (err) {
      console.error('Chart analysis failed', err)
      setHospitalPerformance([])
      setVisitTrend([])
    }

    try {
      const mlRes = await HealthscopeService.predictRevenue(rows)
      setMlMetrics({ rmse: mlRes.rmse, r2_score: mlRes.r2 })
    } catch (err) {
      console.error('ML prediction failed', err)
      setMlMetrics(null)
    }

    try {
      const insightsRes = await HealthscopeService.getInsights(rows)
      setInsights(insightsRes.insights ?? [])
    } catch (err) {
      console.error('Insights analysis failed', err)
      setInsights([])
    }
  }

  async function applyFilters() {
    setError(null)
    setLoading(true)

    try {
      const res = await HealthscopeService.filter({
        data,
        hospitals: selectedHospitals,
        departments: selectedDepartments,
        date_start: dateStart || undefined,
        date_end: dateEnd || undefined,
      })

      const filteredRows = res.data ?? []
      setFiltered(filteredRows)
      setKpis(res.kpis ?? null)
      await analyzeData(filteredRows)
    } catch (err: any) {
      console.error(err)
      setError(err?.message ?? 'Filter request failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadFile(file)
    setError(null)
    setLoading(true)
    setPreviewRows([])
    setFileColumns([])

    try {
      const uploadRes = await HealthscopeService.uploadCsv(file)

      const rows = uploadRes.data ?? []
      setData(rows)
      setPreviewRows(uploadRes.preview ?? [])
      setHospitals(uploadRes.hospitals ?? [])
      setDepartments(uploadRes.departments ?? [])
      setSelectedHospitals([])
      setSelectedDepartments([])
      setDateStart('')
      setDateEnd('')
      await analyzeData(rows)
      setKpis(uploadRes.kpis ?? null)

      if (mode === 'mapping') {
        const columnsRes = await HealthscopeService.getCsvColumns(file)
        setFileColumns(columnsRes.columns ?? [])
        setMapping(getDefaultMapping(columnsRes.columns ?? []))
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.message ?? 'Upload failed. Please try again.')
      setData([])
      setFiltered([])
      setPreviewRows([])
      setFileColumns([])
      setKpis(null)
      setHospitalPerformance([])
      setVisitTrend([])
      setMlMetrics(null)
      setInsights([])
    } finally {
      setLoading(false)
    }
  }

  async function applyMapping() {
    if (!uploadFile) {
      setError('Please upload a CSV file first.')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const res = await HealthscopeService.applyMapping(uploadFile, mapping)

      const rows = res.data ?? []
      setData(rows)
      setPreviewRows(res.preview ?? [])
      setHospitals(res.hospitals ?? [])
      setDepartments(res.departments ?? [])
      setSelectedHospitals([])
      setSelectedDepartments([])
      setDateStart('')
      setDateEnd('')
      await analyzeData(rows)
      setKpis(res.kpis ?? null)
    } catch (err: any) {
      console.error(err)
      setError(err?.message ?? 'Mapping failed. Please check your selections.')
    } finally {
      setLoading(false)
    }
  }

  async function downloadCsv() {
    HealthscopeService.downloadCsv(filtered.length ? filtered : data, 'healthscope_data.csv')
  }

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'attributes', label: 'Important Attributes' },
    { key: 'application', label: 'Application' },
  ]

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* ── Redesigned Standalone Back Button ── */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#475569] shadow-sm transition hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:text-[#0F172A] hover:shadow-md active:translate-y-0"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      {/* ── Premium Hero Banner (PatientFlow / AI Prescription theme) ── */}
      <div className="mb-8 rounded-[32px] bg-[linear-gradient(135deg,#F0FDFA_0%,#FFFFFF_40%,#EFF6FF_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#0F766E]">Healthcare project</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">Healthscope Insights</h1>
          <p className="mt-4 max-w-3xl text-[16px] leading-7 text-[#334155]">
            Enterprise healthcare analytics: patient trends, hospital performance, cost, and automated ML insights.
          </p>
        </div>
      </div>

      <ProjectOverviewManager
        projectSlug="healthscope-insights"
        projectTitle="Healthscope Insights"
        systemTabs={tabs}
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t as ActiveTab)}
        renderOverviewContent={(sections, onEdit, onDelete) => {
          const purposeSec = sections.find((s) => s.id === 'purpose')
          const businessImpactSec = sections.find((s) => s.id === 'business-impact')
          const customSections = sections.filter((s) => s.isCustom)

          return (
            <div className="space-y-8 pt-2">
              <SectionHeading
                eyebrow="Overview"
                title="Healthcare Enterprise Dashboard"
                description="Healthscope Insights provides a unified analytics experience for healthcare leaders, combining patient visit trends, hospital performance, departmental revenue, and ML-powered predictions for business-critical decisions."
              />

              {/* Metric Cards Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  icon={<Users className="h-5 w-5 text-[#0F766E]" />}
                  label="Total Visits"
                  value={kpis?.total_visits != null ? kpis.total_visits.toLocaleString('en-IN') : '—'}
                  accent="bg-[#ECFDF5]"
                />
                <MetricCard
                  icon={<Activity className="h-5 w-5 text-[#1D4ED8]" />}
                  label="Total Revenue"
                  value={kpis?.total_revenue != null ? `₹${Math.round(kpis.total_revenue).toLocaleString('en-IN')}` : '—'}
                  accent="bg-[#EFF6FF]"
                />
                <MetricCard
                  icon={<HeartPulse className="h-5 w-5 text-[#A16207]" />}
                  label="Avg Recovery Rate"
                  value={kpis?.avg_recovery_rate != null ? `${kpis.avg_recovery_rate}%` : '—'}
                  accent="bg-[#FFFBEB]"
                />
                <MetricCard
                  icon={<Stethoscope className="h-5 w-5 text-[#BE123C]" />}
                  label="Avg Satisfaction"
                  value={kpis?.avg_satisfaction != null ? String(kpis.avg_satisfaction) : '—'}
                  accent="bg-[#FFF1F2]"
                />
              </div>

              {/* Purpose & Business Impact Columns */}
              <div className="grid gap-6 lg:grid-cols-2">
                {purposeSec && (
                  <EditableOverviewSection
                    section={purposeSec}
                    onEdit={onEdit}
                    accentColor="#0F766E"
                  />
                )}
                {businessImpactSec && (
                  <EditableOverviewSection
                    section={businessImpactSec}
                    onEdit={onEdit}
                    accentColor="#0F766E"
                  />
                )}
              </div>

              {/* Custom Sections */}
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
      {activeTab === 'attributes' && (
        <div className="space-y-8 pt-6">
          <SectionHeading
            eyebrow="Data Schema"
            title="Required Column Dictionary"
            description="Ensure that your uploaded dataset matches the clinical variables and naming formats specified in the schema registry."
          />

          {/* Dictionary Table Card */}
          <div className={cardCls}>
            <div className="overflow-x-auto rounded-[24px] border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[12px] uppercase tracking-[0.08em] text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Column Name</th>
                    <th className="px-4 py-3 font-semibold">Data Type</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-white">
                    <td className="px-4 py-3.5 font-semibold text-slate-800">Date</td>
                    <td className="px-4 py-3.5 text-slate-600">Date</td>
                    <td className="px-4 py-3.5 text-slate-600">Appointment / visit date</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="px-4 py-3.5 font-semibold text-slate-800">Hospital</td>
                    <td className="px-4 py-3.5 text-slate-600">String</td>
                    <td className="px-4 py-3.5 text-slate-600">Hospital name</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="px-4 py-3.5 font-semibold text-slate-800">Department</td>
                    <td className="px-4 py-3.5 text-slate-600">String</td>
                    <td className="px-4 py-3.5 text-slate-600">Department of treatment</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="px-4 py-3.5 font-semibold text-slate-800">Revenue</td>
                    <td className="px-4 py-3.5 text-slate-600">Float</td>
                    <td className="px-4 py-3.5 text-slate-600">Revenue generated</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Variables Split Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className={cardCls}>
              <h3 className="text-lg font-bold text-[#0F172A] mb-4">Independent Variables</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  'Hospital',
                  'Department',
                  'Doctor',
                  'AgeGroup',
                  'Gender',
                  'Visits',
                  'TreatmentCost',
                ].map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center rounded-full bg-[#EFF6FF] px-3.5 py-1.5 text-sm font-semibold text-[#1D4ED8]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className={cardCls}>
              <h3 className="text-lg font-bold text-[#0F172A] mb-4">Dependent Variables</h3>
              <div className="flex flex-wrap gap-2">
                {['Revenue', 'RecoveryRate', 'SatisfactionScore'].map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center rounded-full bg-[#ECFDF5] px-3.5 py-1.5 text-sm font-semibold text-[#0F766E]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Application Tab */}
      {activeTab === 'application' && (
        <div className="space-y-6 pt-6">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* ── Step 1: Load Dataset ── */}
          <div className={cardCls}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0F766E] mb-1">Step 1</p>
                <h3 className="text-xl font-bold text-[#0F172A]">Load Dataset</h3>
              </div>
              {data.length > 0 && (
                <span className="self-start md:self-auto rounded-full bg-[#ECFDF5] px-4 py-1.5 text-sm font-semibold text-[#166534]">
                  {data.length.toLocaleString()} rows loaded
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { key: 'default', label: 'Default Dataset' },
                { key: 'upload', label: 'Upload CSV' },
                { key: 'mapping', label: 'Upload CSV + Mapping' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setMode(key as DatasetMode)
                    if (key === 'default') {
                      loadDefault()
                    } else {
                      setPreviewRows([])
                      setFileColumns([])
                    }
                  }}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold border transition ${
                    mode === key
                      ? 'border-[#0F766E] bg-[#ECFDF5] text-[#0F766E]'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Inner Views */}
            {mode === 'default' && (
              <div className="mt-5 space-y-4">
                <p className="text-sm text-slate-500">Using the default sample dataset loaded dynamically from the API.</p>
                {dataPreview.length > 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-sm font-semibold text-slate-800 mb-3">Dataset preview</p>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          <tr>
                            {Object.keys(dataPreview[0] || {}).map((column) => (
                              <th key={column} className="px-3 py-2 font-semibold whitespace-nowrap">{column}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {dataPreview.map((row, rowIndex) => (
                            <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              {Object.values(row).map((value, cellIndex) => (
                                <td key={cellIndex} className="px-3 py-2 truncate max-w-[150px]">{String(value)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(mode === 'upload' || mode === 'mapping') && (
              <div className="mt-5 space-y-5">
                <label className="flex cursor-pointer flex-col gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition">
                  <FileUp className="mx-auto h-10 w-10 text-slate-400" />
                  <span className="text-base font-semibold text-slate-800">
                    {uploadFile ? uploadFile.name : 'Upload your dataset'}
                  </span>
                  <span className="text-sm text-slate-500">Drag and drop file here or click to browse</span>
                  <span className="text-xs text-slate-400">Limit 200MB per file • CSV</span>
                  <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                </label>

                {mode === 'mapping' && fileColumns.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 p-5 bg-white space-y-4">
                    <h4 className="text-base font-bold text-slate-900">Map Columns</h4>
                    <p className="text-xs text-slate-500">Align variables in your CSV to Healthscope application fields.</p>
                    <div className="grid gap-4 md:grid-cols-2">
                      {MAPPING_FIELDS.map((field) => (
                        <div key={field.label}>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            {field.label} Column
                          </label>
                          <div className="relative">
                            <select
                              value={mapping[field.label] || ''}
                              onChange={(e) =>
                                setMapping((current) => ({ ...current, [field.label]: e.target.value }))
                              }
                              className={selectCls}
                            >
                              <option value="">-- Select Column --</option>
                              {fileColumns.map((col) => (
                                <option key={col} value={col}>{col}</option>
                              ))}
                            </select>
                            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={applyMapping} className={btnPrimaryCls}>
                      Apply Column Mapping
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Step 2: Filters ── */}
          {data.length > 0 && (
            <div className={cardCls}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0F766E] mb-1">Step 2</p>
              <h3 className="text-xl font-bold text-[#0F172A] mb-5">Apply Filters</h3>

              <div className="grid gap-6 md:grid-cols-3">
                {/* Hospital selection list */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-700">Hospital</label>
                    <button
                      type="button"
                      onClick={() => setSelectedHospitals([])}
                      className="text-xs font-semibold text-[#0F766E] hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div className="min-h-[46px] max-h-[100px] overflow-y-auto flex flex-wrap gap-1.5">
                      {selectedHospitals.length > 0 ? (
                        selectedHospitals.map((hosp) => (
                          <span
                            key={hosp}
                            className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-xs font-semibold text-[#0F766E]"
                          >
                            {hosp}
                            <button
                              type="button"
                              onClick={() => setSelectedHospitals((curr) => curr.filter((x) => x !== hosp))}
                            >
                              <X className="w-3 h-3 hover:text-red-500" />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">None selected</span>
                      )}
                    </div>
                    <div className="border-t border-slate-200/60 pt-3 max-h-[140px] overflow-y-auto space-y-1">
                      {hospitals.map((hosp) => {
                        const active = selectedHospitals.includes(hosp)
                        return (
                          <button
                            key={hosp}
                            type="button"
                            onClick={() => toggleHospital(hosp)}
                            className={`w-full text-left rounded-xl px-3 py-2 text-xs font-semibold transition ${
                              active ? 'bg-[#0F766E] text-white shadow-sm' : 'bg-white border border-slate-100 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            {hosp}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Department selection list */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-700">Department</label>
                    <button
                      type="button"
                      onClick={() => setSelectedDepartments([])}
                      className="text-xs font-semibold text-[#0F766E] hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div className="min-h-[46px] max-h-[100px] overflow-y-auto flex flex-wrap gap-1.5">
                      {selectedDepartments.length > 0 ? (
                        selectedDepartments.map((dept) => (
                          <span
                            key={dept}
                            className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-xs font-semibold text-[#0F766E]"
                          >
                            {dept}
                            <button
                              type="button"
                              onClick={() => setSelectedDepartments((curr) => curr.filter((x) => x !== dept))}
                            >
                              <X className="w-3 h-3 hover:text-red-500" />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">None selected</span>
                      )}
                    </div>
                    <div className="border-t border-slate-200/60 pt-3 max-h-[140px] overflow-y-auto space-y-1">
                      {departments.map((dept) => {
                        const active = selectedDepartments.includes(dept)
                        return (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => toggleDepartment(dept)}
                            className={`w-full text-left rounded-xl px-3 py-2 text-xs font-semibold transition ${
                              active ? 'bg-[#0F766E] text-white shadow-sm' : 'bg-white border border-slate-100 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            {dept}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Date range filters */}
                <div className="flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={dateStart}
                        onChange={(e) => setDateStart(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">End Date</label>
                      <input
                        type="date"
                        value={dateEnd}
                        onChange={(e) => setDateEnd(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <button type="button" onClick={applyFilters} className={`${btnPrimaryCls} mt-4 self-start`}>
                    <Activity className="w-4 h-4" />
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && <ProjectDetailCardSkeleton />}

          {/* ── Table & Graphs Content ── */}
          {filtered.length > 0 && (
            <div className="space-y-6">
              {/* Filtered Data Preview Table */}
              <div className={cardCls}>
                <h3 className="text-lg font-bold text-[#0F172A] mb-4">Filtered Dataset Preview (Top Rows)</h3>
                <div className="overflow-x-auto rounded-[24px] border border-slate-200">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        {Object.keys(filtered[0] || {}).map((column) => (
                          <th key={column} className="px-3 py-3 font-semibold whitespace-nowrap">{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filtered.slice(0, 8).map((row, rIndex) => (
                        <tr key={rIndex} className={rIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          {Object.values(row).map((val, cIndex) => (
                            <td key={cIndex} className="px-3 py-2.5 truncate max-w-[150px]">{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dynamic KPI Cards */}
              <div className={cardCls}>
                <h3 className="text-lg font-bold text-[#0F172A] mb-5">Filtered Key Performance Indicators</h3>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-3xl bg-slate-50 border border-slate-200/60 p-6 text-center shadow-sm">
                    <div className="text-3xl font-black text-[#0F766E]">{kpis?.total_visits ?? '—'}</div>
                    <div className="mt-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Visits</div>
                  </div>
                  <div className="rounded-3xl bg-slate-50 border border-slate-200/60 p-6 text-center shadow-sm">
                    <div className="text-3xl font-black text-[#0F766E]">
                      ₹ {kpis?.total_revenue != null ? Math.round(kpis.total_revenue).toLocaleString('en-IN') : '—'}
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Revenue</div>
                  </div>
                  <div className="rounded-3xl bg-slate-50 border border-slate-200/60 p-6 text-center shadow-sm">
                    <div className="text-3xl font-black text-[#0F766E]">{kpis?.avg_recovery_rate ?? '—'}%</div>
                    <div className="mt-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg Recovery Rate</div>
                  </div>
                  <div className="rounded-3xl bg-slate-50 border border-slate-200/60 p-6 text-center shadow-sm">
                    <div className="text-3xl font-black text-[#0F766E]">{kpis?.avg_satisfaction ?? '—'}</div>
                    <div className="mt-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg Satisfaction</div>
                  </div>
                </div>
              </div>

              {/* Graphical Performance Plots */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className={cardCls}>
                  <h3 className="text-lg font-bold text-[#0F172A] mb-4">Hospital Performance</h3>
                  <div className="overflow-hidden rounded-2xl bg-slate-50 p-2">
                    <Plot
                      data={[
                        {
                          x: hospitalPerformance.map((item) => item.Hospital),
                          y: hospitalPerformance.map((item) => item.Visits),
                          type: 'bar',
                          name: 'Visits',
                          marker: { color: BRAND_TEAL },
                        },
                        {
                          x: hospitalPerformance.map((item) => item.Hospital),
                          y: hospitalPerformance.map((item) => item.Revenue),
                          type: 'bar',
                          name: 'Revenue',
                          marker: { color: CHART_BLUE },
                        },
                      ]}
                      layout={{
                        barmode: 'group',
                        autosize: true,
                        height: 380,
                        margin: { t: 25, l: 45, r: 15, b: 35 },
                        plot_bgcolor: 'rgba(0,0,0,0)',
                        paper_bgcolor: 'rgba(0,0,0,0)',
                      }}
                      style={{ width: '100%' }}
                      useResizeHandler
                    />
                  </div>
                </div>

                <div className={cardCls}>
                  <h3 className="text-lg font-bold text-[#0F172A] mb-4">Visits Over Time</h3>
                  <div className="overflow-hidden rounded-2xl bg-slate-50 p-2">
                    <Plot
                      data={[
                        {
                          x: visitTrend.map((item) => item.Date),
                          y: visitTrend.map((item) => item.Visits),
                          type: 'scatter',
                          mode: 'lines+markers',
                          marker: { color: BRAND_TEAL },
                          line: { color: BRAND_TEAL, width: 2 },
                        },
                      ]}
                      layout={{
                        autosize: true,
                        height: 380,
                        margin: { t: 25, l: 45, r: 15, b: 35 },
                        plot_bgcolor: 'rgba(0,0,0,0)',
                        paper_bgcolor: 'rgba(0,0,0,0)',
                      }}
                      style={{ width: '100%' }}
                      useResizeHandler
                    />
                  </div>
                </div>
              </div>

              {/* Machine Learning Output */}
              <div className={cardCls}>
                <h3 className="text-lg font-bold text-[#0F172A] mb-4">ML: Revenue Prediction Model Metrics</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200/60 text-center">
                    <div className="text-2xl font-black text-[#0F766E]">{mlMetrics?.rmse ?? '—'}</div>
                    <div className="mt-1 text-sm text-slate-500 font-semibold">Root Mean Squared Error (RMSE)</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200/60 text-center">
                    <div className="text-2xl font-black text-[#0F766E]">{mlMetrics?.r2_score ?? '—'}</div>
                    <div className="mt-1 text-sm text-slate-500 font-semibold">Coefficient of Determination (R²)</div>
                  </div>
                </div>
              </div>

              {/* Automated Insights Table */}
              <div className={cardCls}>
                <h3 className="text-lg font-bold text-[#0F172A] mb-4">Automated Data Insights</h3>
                <div className="overflow-x-auto rounded-[24px] border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[12px] uppercase tracking-[0.08em] text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Insight Statement</th>
                        <th className="px-4 py-3 font-semibold">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {insights.length > 0 ? (
                        insights.map((item, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="px-4 py-3.5 font-medium">{item.Insight}</td>
                            <td className="px-4 py-3.5 font-bold text-[#0F766E]">{item.Value}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                            No insights computed yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Download CSV Action Bar */}
              <div className="flex justify-end pt-2">
                <button type="button" onClick={downloadCsv} className={btnPrimaryCls}>
                  <Download className="w-4 h-4" />
                  Download Filtered CSV
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </ProjectOverviewManager>
    </div>
  )
}
