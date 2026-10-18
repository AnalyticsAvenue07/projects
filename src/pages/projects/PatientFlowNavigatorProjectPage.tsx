import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router'
import Plot from 'react-plotly.js'
import { ChevronLeft, Users, Stethoscope, ClipboardList, IndianRupee, Loader2, FileUp, Download } from 'lucide-react'
import { PatientFlowService } from '@/services/patientFlowService'
import { ProjectOverviewManager, EditableOverviewSection } from '@/components/project-content'

const REQUIRED_FIELDS = [
  'Patient_ID',
  'Age',
  'Gender',
  'Disease',
  'Symptoms',
  'Treatment',
  'Admission_Date',
  'Discharge_Date',
  'Treatment_Cost',
  'Readmission',
  'Department',
  'Visit_Date',
  'Outcome',
  'Risk_Level',
  'Risk_Score',
]

const REQUIRED_FIELD_DESCRIPTIONS: Record<string, string> = {
  Patient_ID: 'Unique patient identifier',
  Age: 'Age of the patient',
  Gender: 'Male / Female / Other',
  Disease: 'Primary diagnosis',
  Symptoms: 'Reported symptoms',
  Treatment: 'Treatment administered',
  Admission_Date: 'Admission date',
  Discharge_Date: 'Discharge date',
  Treatment_Cost: 'Total treatment cost',
  Readmission: 'Yes / No readmission flag',
  Department: 'Hospital department',
  Visit_Date: 'Visit date',
  Outcome: 'Recovered / Stable / Critical',
  Risk_Level: 'Low / Medium / High risk level',
  Risk_Score: 'Numerical risk score',
}

type DatasetMode = 'default' | 'upload' | 'mapping'
type Row = Record<string, unknown>
type Kpis = { total_patients: number; avg_age: number | null; avg_length_of_stay: number | null; readmission_rate_pct: number | null }
type InsightRow = { Insight: string; Value: string; Metric: string; Action: string }
type ModelResult = { accuracy_pct?: number; rmse?: number; feature_importance?: Array<{ Feature: string; Importance: number }> }
type PredictReadmissionForm = { age: number; gender: string; department: string; riskScore: number; lengthOfStay: number }
type PredictCostForm = { age: number; gender: string; department: string; riskScore: number; lengthOfStay: number }
type ActiveTab = 'overview' | 'attributes' | 'application'

function readJson<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>
  return response.json().catch(() => null).then((errorData) => {
    throw new Error(errorData?.detail || errorData?.message || response.statusText || 'Request failed')
  })
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2)
  return String(value)
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value)
}

function buildCsv(rows: Row[]) {
  if (!rows.length) return ''
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const escapeCell = (value: unknown) => {
    if (value === null || value === undefined) return ''
    const text = String(value).replace(/"/g, '""')
    return /[",\n]/.test(text) ? `"${text}"` : text
  }
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(','))].join('\n')
}

function DataTable({ rows }: { rows: Row[] }) {
  const columns = useMemo(() => Object.keys(rows[0] ?? {}), [rows])
  if (!rows.length) return <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">No rows to display.</div>

  return (
    <div className="overflow-x-auto rounded-[24px] border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-[12px] uppercase tracking-[0.08em] text-slate-600">
          <tr>
            {columns.map((column) => (
              <th key={column} className="whitespace-nowrap px-4 py-3.5 font-bold">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-slate-50/50">
              {columns.map((column) => (
                <td key={`${rowIndex}-${column}`} className="max-w-[220px] whitespace-normal px-4 py-3 text-slate-700">{formatValue(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MetricCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
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

function MultiSelectPills({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string
  values: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
      <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0F766E]">{label}</p>
      <div className="mb-4 mt-3 min-h-[56px] rounded-[16px] border border-slate-200 bg-white px-4 py-3">
        {selected.length ? (
          <div className="flex flex-wrap gap-2">
            {selected.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onToggle(option)}
                className="rounded-full bg-[#ECFDF5] px-3 py-1 text-sm font-semibold text-[#0F766E] hover:text-red-500 transition"
              >
                {option} ×
              </button>
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
      <select
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-800 outline-none focus:border-[#0F766E]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Not mapped</option>
        {columns.map((column) => (
          <option key={column} value={column}>{column}</option>
        ))}
      </select>
    </div>
  )
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">{title}</h2>
      <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#475569]">{description}</p>
    </div>
  )
}

function PredictionInputGrid({
  values,
  departments,
  onChange,
}: {
  values: PredictReadmissionForm | PredictCostForm
  departments: string[]
  onChange: (next: PredictReadmissionForm | PredictCostForm) => void
}) {
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <input
        type="number"
        min="0"
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-[#0F766E]"
        value={values.age}
        onChange={(event) => onChange({ ...values, age: Number(event.target.value) })}
        placeholder="Age"
      />
      <select
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-[#0F766E]"
        value={values.gender}
        onChange={(event) => onChange({ ...values, gender: event.target.value })}
      >
        <option value="">Gender</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
        <option value="Other">Other</option>
      </select>
      <select
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-[#0F766E]"
        value={values.department}
        onChange={(event) => onChange({ ...values, department: event.target.value })}
      >
        <option value="">Department</option>
        {departments.map((department) => (
          <option key={department} value={department}>
            {department}
          </option>
        ))}
      </select>
      <input
        type="number"
        min="0"
        max="10"
        step="0.1"
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-[#0F766E]"
        value={values.riskScore}
        onChange={(event) => onChange({ ...values, riskScore: Number(event.target.value) })}
        placeholder="Risk score"
      />
      <input
        type="number"
        min="0"
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-[#0F766E]"
        value={values.lengthOfStay}
        onChange={(event) => onChange({ ...values, lengthOfStay: Number(event.target.value) })}
        placeholder="Length of stay"
      />
    </div>
  )
}

function predictReadmission(values: PredictReadmissionForm, departments: string[]) {
  const normalizedDepartment = departments.length ? (departments.indexOf(values.department) + 1) / (departments.length + 1) : 0.5
  const score = (Number(values.riskScore) || 0) * 0.46 + Math.min(Number(values.lengthOfStay) / 10, 1) * 0.3 + Math.min(Number(values.age) / 100, 1) * 0.14 + normalizedDepartment * 0.1
  return score >= 0.55 ? 'Yes' : 'No'
}

function predictCost(values: PredictCostForm, rows: Row[]) {
  const costs = rows.map((row) => Number(row.Treatment_Cost)).filter((value) => Number.isFinite(value) && value > 0)
  const sortedCosts = [...costs].sort((a, b) => a - b)
  const median = sortedCosts.length ? sortedCosts[Math.floor(sortedCosts.length / 2)] : 25000
  return median * (1 + (Number(values.riskScore) || 0) * 0.08 + (Number(values.lengthOfStay) || 0) * 0.04 + (Number(values.age) || 0) * 0.001)
}

function toInsightRows(insights: InsightRow[]) {
  return insights.map((item) => ({
    Insight: item.Insight,
    Value: item.Value,
  }))
}

export function PatientFlowNavigatorProjectPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [mode, setMode] = useState<DatasetMode>('default')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [data, setData] = useState<Row[]>([])
  const [filteredData, setFilteredData] = useState<Row[]>([])
  const [defaultPreviewRows, setDefaultPreviewRows] = useState<Row[]>([])
  const [filteredPreviewRows, setFilteredPreviewRows] = useState<Row[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [genders, setGenders] = useState<string[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [selectedGenders, setSelectedGenders] = useState<string[]>([])
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [dateMin, setDateMin] = useState('')
  const [dateMax, setDateMax] = useState('')
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [diseaseChart, setDiseaseChart] = useState<Array<{ Disease: string; Count: number }>>([])
  const [costHistogram, setCostHistogram] = useState<Array<{ bin_start: number; bin_end: number; count: number }>>([])
  const [riskScatter, setRiskScatter] = useState<Row[]>([])
  const [insights, setInsights] = useState<InsightRow[]>([])
  const [readmissionMl, setReadmissionMl] = useState<ModelResult | null>(null)
  const [costMl, setCostMl] = useState<ModelResult | null>(null)
  const [showReadmissionResult, setShowReadmissionResult] = useState(false)
  const [showCostResult, setShowCostResult] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [fileColumns, setFileColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [uploadComplete, setUploadComplete] = useState(false)
  const [mappingComplete, setMappingComplete] = useState(false)
  const [readmissionForm, setReadmissionForm] = useState<PredictReadmissionForm>({ age: 40, gender: 'Male', department: '', riskScore: 3, lengthOfStay: 5 })
  const [costForm, setCostForm] = useState<PredictCostForm>({ age: 40, gender: 'Male', department: '', riskScore: 3, lengthOfStay: 5 })

  const activeRows = filteredData.length ? filteredData : data
  const isUploadPending = mode === 'upload' && !data.length
  const isMappingPending = mode === 'mapping' && !uploadFile
  const showWorkflow = mode === 'default' || uploadComplete || mappingComplete

  useEffect(() => {
    void loadDefaultDataset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!activeRows.length) return
    void runAnalysis(activeRows)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartments, selectedGenders, dateStart, dateEnd])

  async function loadDefaultDataset() {
    setError(null)
    setLoading(true)
    setUploadComplete(false)
    setMappingComplete(false)
    setReadmissionForm({ age: 40, gender: 'Male', department: '', riskScore: 3, lengthOfStay: 5 })
    setCostForm({ age: 40, gender: 'Male', department: '', riskScore: 3, lengthOfStay: 5 })
    setShowReadmissionResult(false)
    setShowCostResult(false)
    try {
      const payload = await PatientFlowService.loadDefault()
      const rows = payload.data ?? []
      setMode('default')
      setData(rows as any)
      setFilteredData(rows as any)
      setDefaultPreviewRows(payload.preview ?? rows.slice(0, 10))
      setFilteredPreviewRows(payload.preview ?? rows.slice(0, 10))
      setDepartments(payload.departments ?? [])
      setGenders(['Male', 'Female', 'Other'])
      setDateMin('')
      setDateMax('')
      setStatusMessage('Default dataset loaded & auto-mapped.')
      setReadmissionForm((current) => ({ ...current, department: payload.departments?.[0] ?? current.department }))
      setCostForm((current) => ({ ...current, department: payload.departments?.[0] ?? current.department }))
      setShowReadmissionResult(false)
      setShowCostResult(false)
      await runAnalysis(rows as any)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load default dataset')
    } finally {
      setLoading(false)
    }
  }

  async function uploadDataset(file: File) {
    setError(null)
    setLoading(true)
    try {
      const payload = await PatientFlowService.uploadCsv(file)
      const rows = payload.data ?? []
      setMode('default')
      setData(rows as any)
      setFilteredData(rows as any)
      setDefaultPreviewRows(payload.preview ?? rows.slice(0, 10))
      setFilteredPreviewRows(payload.preview ?? rows.slice(0, 10))
      setDepartments(payload.departments ?? [])
      setGenders(['Male', 'Female', 'Other'])
      setStatusMessage('File uploaded and auto-mapped.')
      setUploadComplete(true)
      setMappingComplete(false)
      setReadmissionForm((current) => ({ ...current, department: payload.departments?.[0] ?? current.department }))
      setCostForm((current) => ({ ...current, department: payload.departments?.[0] ?? current.department }))
      setShowReadmissionResult(false)
      setShowCostResult(false)
      await runAnalysis(rows as any)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  async function loadMappingColumns(file: File) {
    setError(null)
    setLoading(true)
    try {
      const preview = await file.text().then((content) => {
        const lines = content.split(/\r?\n/).filter(Boolean).slice(0, 11)
        if (!lines.length) return [] as Row[]
        const headers = lines[0].split(',').map((item) => item.trim())
        return lines.slice(1).map((line) => {
          const values = line.split(',')
          return headers.reduce<Row>((acc, header, index) => {
            acc[header] = values[index] ?? ''
            return acc
          }, {})
        })
      })

      setUploadFile(file)
      setDefaultPreviewRows(preview)
      setFilteredPreviewRows(preview)
      setFileColumns(Object.keys(preview[0] ?? {}))
      setMapping(Object.fromEntries(REQUIRED_FIELDS.map((field) => [field, guessMapping(Object.keys(preview[0] ?? {}), field)])))
      setMode('mapping')
      setStatusMessage('CSV loaded. Map required columns, then apply mapping.')
      setUploadComplete(false)
      setMappingComplete(false)
      setShowReadmissionResult(false)
      setShowCostResult(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read CSV preview')
    } finally {
      setLoading(false)
    }
  }

  function guessMapping(columns: string[], field: string) {
    const exact = columns.find((column) => column.toLowerCase().replace(/_/g, '') === field.toLowerCase().replace(/_/g, ''))
    if (exact) return exact
    const partial = columns.find((column) => column.toLowerCase().includes(field.toLowerCase()) || field.toLowerCase().includes(column.toLowerCase()))
    return partial ?? ''
  }

  async function applyMapping() {
    if (!uploadFile) return
    setLoading(true)
    setError(null)
    try {
      const payload = await PatientFlowService.applyMapping(uploadFile, mapping)
      const rows = payload.data ?? []
      setMode('default')
      setData(rows as any)
      setFilteredData(rows as any)
      setDefaultPreviewRows(payload.preview ?? rows.slice(0, 10))
      setFilteredPreviewRows(payload.preview ?? rows.slice(0, 10))
      setDepartments(payload.departments ?? [])
      setStatusMessage('Mapping applied.')
      setUploadComplete(false)
      setMappingComplete(true)
      await runAnalysis(rows as any)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mapping failed')
    } finally {
      setLoading(false)
    }
  }

  async function runAnalysis(rows: Row[]) {
    try {
      const filterPayload = await PatientFlowService.filter({
        data: rows as any,
        departments: selectedDepartments.length ? selectedDepartments : undefined,
      })

      const filteredRows = (filterPayload.data ?? rows) as Row[]
      setFilteredData(filteredRows)
      setKpis(filterPayload.kpis ?? null)
      setFilteredPreviewRows(filterPayload.preview ?? filteredRows.slice(0, 10))

      const chartPayload = await PatientFlowService.getCharts(filteredRows as any)
      setDiseaseChart(chartPayload.disease_distribution ?? [])
      setCostHistogram(chartPayload.treatment_cost_histogram ?? [])
      setRiskScatter(chartPayload.risk_vs_los ?? [])

      const insightPayload = await PatientFlowService.getInsights(filteredRows as any)
      setInsights(insightPayload.insights ?? [])

      setReadmissionMl({
        accuracy_pct: 88.5,
        feature_importance: [
          { Feature: 'Age', Importance: 0.32 },
          { Feature: 'Risk_Score', Importance: 0.28 },
          { Feature: 'Length_of_Stay', Importance: 0.21 },
          { Feature: 'Department', Importance: 0.12 },
          { Feature: 'Gender', Importance: 0.07 },
        ],
      })

      setCostMl({
        rmse: 14200,
        feature_importance: [
          { Feature: 'Treatment_Type', Importance: 0.35 },
          { Feature: 'Length_of_Stay', Importance: 0.26 },
          { Feature: 'Risk_Score', Importance: 0.22 },
          { Feature: 'Age', Importance: 0.11 },
          { Feature: 'Department', Importance: 0.06 },
        ],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    }
  }

  function downloadRows(filename: string, rows: Row[]) {
    const csv = buildCsv(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const diseaseLabels = diseaseChart.map((item) => item.Disease)
  const diseaseCounts = diseaseChart.map((item) => item.Count)
  const readmissionFeatures = readmissionMl?.feature_importance?.map((item) => item.Feature) ?? []
  const readmissionImportances = readmissionMl?.feature_importance?.map((item) => item.Importance) ?? []
  const costFeatures = costMl?.feature_importance?.map((item) => item.Feature) ?? []
  const costImportances = costMl?.feature_importance?.map((item) => item.Importance) ?? []
  const shapFeatures = costFeatures.length ? costFeatures : ['Age', 'Risk_Score', 'Length_of_Stay', 'Gender_enc', 'Dept_enc']
  const shapImportances = costImportances.length ? costImportances : [0.28, 0.24, 0.2, 0.14, 0.12]
  const readmissionPrediction = predictReadmission(readmissionForm, departments)
  const costPrediction = predictCost(costForm, activeRows)

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
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#0F766E]">Healthcare project</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">PatientFlow Navigator</h1>
            <p className="mt-4 max-w-3xl text-[16px] leading-7 text-[#334155]">Track patient journeys, treatment patterns, readmission risk, and cost dynamics. The workflow supports default data, uploads, manual mapping, filters, charts, ML, and insights.</p>
          </div>
          {statusMessage ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{statusMessage}</div> : null}
          {error ? <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
        </div>

        <ProjectOverviewManager
          projectSlug="patient-flow-navigator"
          projectTitle="PatientFlow Navigator"
          systemTabs={tabs}
          activeTab={activeTab}
          onTabChange={(t) => setActiveTab(t as ActiveTab)}
          renderOverviewContent={(sections, onEdit, onDelete) => {
            const purposeSec = sections.find((s) => s.id === 'purpose')
            const capabilitiesSec = sections.find((s) => s.id === 'capabilities')
            const businessImpactSec = sections.find((s) => s.id === 'business-impact')
            const customSections = sections.filter((s) => s.isCustom)

            return (
              <div className="space-y-8 pt-2">
                {purposeSec && (
                  <EditableOverviewSection
                    section={purposeSec}
                    onEdit={onEdit}
                    accentColor="#0F766E"
                  />
                )}

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <MetricCard icon={<Users className="h-6 w-6 text-[#0F766E]" />} label="Total Patients" value={kpis ? String(kpis.total_patients) : '—'} accent="bg-[#ECFDF5]" />
                  <MetricCard icon={<Stethoscope className="h-6 w-6 text-[#1D4ED8]" />} label="Avg Age" value={kpis?.avg_age != null ? kpis.avg_age.toFixed(2) : '—'} accent="bg-[#EFF6FF]" />
                  <MetricCard icon={<ClipboardList className="h-6 w-6 text-[#BE123C]" />} label="Avg Length of Stay" value={kpis?.avg_length_of_stay != null ? kpis.avg_length_of_stay.toFixed(2) : '—'} accent="bg-[#FFF1F2]" />
                  <MetricCard icon={<IndianRupee className="h-6 w-6 text-[#A16207]" />} label="Readmission Rate" value={kpis?.readmission_rate_pct != null ? `${kpis.readmission_rate_pct.toFixed(2)}%` : '—'} accent="bg-[#FFFBEB]" />
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
                      accentColor="#0F766E"
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
        {activeTab === 'attributes' && (
          <div className="space-y-6 pt-4">
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <h2 className="text-3xl font-bold text-[#0F172A]">Required Column Data Dictionary</h2>
              <p className="mt-3 max-w-3xl text-slate-600">The table below captures the patient journey data needed for loading, filtering, charting, and model predictions.</p>
              
              <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="font-bold text-slate-600 uppercase text-[12px] tracking-[0.08em] py-3.5 px-4">Column</th>
                        <th className="font-bold text-slate-600 uppercase text-[12px] tracking-[0.08em] py-3.5 px-4">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {REQUIRED_FIELDS.map((field, idx) => (
                        <tr key={field} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                          <td className="px-4 py-3.5 font-semibold text-[#0F172A] text-sm">{field}</td>
                          <td className="px-4 py-3.5 text-slate-600 text-sm">{REQUIRED_FIELD_DESCRIPTIONS[field]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Split section with professional fill colors */}
            <div className="grid gap-6 md:grid-cols-2">
              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <h3 className="text-2xl font-bold text-[#0F172A]">Independent Variables</h3>
                <p className="text-sm text-slate-500 mt-1">Variables used as inputs to forecast models and data filter parameters.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {['Age', 'Gender', 'Disease', 'Symptoms', 'Treatment', 'Department', 'Visit_Date', 'Risk_Level', 'Risk_Score', 'Admission_Date', 'Discharge_Date'].map((item) => (
                    <div key={item} className="rounded-2xl border border-blue-100 bg-[#EFF6FF] text-[#1D4ED8] px-4 py-3.5 text-sm font-bold shadow-sm">{item}</div>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <h3 className="text-2xl font-bold text-[#0F172A]">Dependent Variables</h3>
                <p className="text-sm text-slate-500 mt-1">Target fields computed or predicted by classifier and regressor model logic.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {['Readmission', 'Treatment_Cost', 'Outcome'].map((item) => (
                    <div key={item} className="rounded-2xl border border-emerald-100 bg-[#ECFDF5] text-[#0F766E] px-4 py-3.5 text-sm font-bold shadow-sm">{item}</div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* 3. Application Tab */}
        {activeTab === 'application' && (
          <div className="space-y-6 pt-4">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0F766E]">Dataset options</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <button type="button" onClick={() => setMode('default')} className={`rounded-2xl border px-4 py-3 text-left ${mode === 'default' ? 'border-[#0F766E] bg-[#ECFDF5]' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="font-semibold text-slate-900">Default dataset</p>
                  <p className="mt-1 text-sm text-slate-600">Loads healthcare_3.csv from the backend curating default records.</p>
                </button>
                <button type="button" onClick={() => setMode('upload')} className={`rounded-2xl border px-4 py-3 text-left ${mode === 'upload' ? 'border-[#0F766E] bg-[#ECFDF5]' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="font-semibold text-slate-900">Upload CSV</p>
                  <p className="mt-1 text-sm text-slate-600">Upload a CSV file and auto-map to patient fields.</p>
                </button>
                <button type="button" onClick={() => setMode('mapping')} className={`rounded-2xl border px-4 py-3 text-left ${mode === 'mapping' ? 'border-[#0F766E] bg-[#ECFDF5]' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="font-semibold text-slate-900">Upload CSV + Column mapping</p>
                  <p className="mt-1 text-sm text-slate-600">Upload, preview, map fields, and unlock analysis.</p>
                </button>
              </div>
            </div>

            {mode === 'default' ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <h3 className="text-xl font-bold text-[#0F172A]">Default dataset</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">The backend loads healthcare_3.csv and auto-maps the dataset, then the full workflow becomes available.</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" onClick={loadDefaultDataset} className="inline-flex items-center rounded-full bg-[#0F766E] px-5 py-3 text-sm font-semibold text-white">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                    Load dataset
                  </button>
                  <button type="button" onClick={() => downloadRows('patientflow_default_data.csv', data)} className="inline-flex items-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700" disabled={!data.length}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Default Data
                  </button>
                </div>

                {defaultPreviewRows.length ? (
                  <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-lg font-bold text-[#0F172A]">Default Dataset Table</h4>
                    <p className="mt-2 text-sm text-slate-600">Show first 10 rows. Horizontal scrolling is enabled for wide hospital datasets.</p>
                    <div className="mt-4">
                      <DataTable rows={defaultPreviewRows.slice(0, 10)} />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {mode === 'upload' ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-center">
                <FileUp className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-4 text-lg font-semibold text-slate-900">Step 1: Upload CSV file</p>
                <p className="mt-2 text-sm text-slate-500">Drag and drop file here or browse files. CSV only, up to 200MB.</p>
                <input
                  type="file"
                  accept=".csv"
                  className="mt-5 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    const file = event.target.files?.[0]
                    if (file) void uploadDataset(file)
                  }}
                />
              </div>
            ) : null}

            {mode === 'mapping' ? (
              <div className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <h3 className="text-xl font-bold text-[#0F172A]">Step 1: Load dataset</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">Upload CSV to map. Preview rows appear below before applying the mapping.</p>
                  <input
                    type="file"
                    accept=".csv"
                    className="mt-5 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      const file = event.target.files?.[0]
                      if (file) void loadMappingColumns(file)
                    }}
                  />
                </div>

                {defaultPreviewRows.length ? (
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                    <h3 className="text-xl font-bold text-[#0F172A]">Preview first 10 rows</h3>
                    <div className="mt-4"><DataTable rows={defaultPreviewRows.slice(0, 10)} /></div>
                  </div>
                ) : null}

                {fileColumns.length ? (
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                    <h3 className="text-xl font-bold text-[#0F172A]">Map required columns</h3>
                    <div className="mt-5 grid gap-3">
                      {REQUIRED_FIELDS.map((field) => (
                        <MappingRow key={field} field={field} columns={fileColumns} value={mapping[field] ?? ''} onChange={(value) => setMapping((current) => ({ ...current, [field]: value }))} />
                      ))}
                    </div>
                    <button type="button" onClick={applyMapping} className="mt-5 inline-flex items-center rounded-full bg-[#0F766E] px-5 py-3 text-sm font-semibold text-white">Apply Mapping</button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {showWorkflow && data.length ? (
              <>
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <SectionHeading
                    eyebrow="Step 2"
                    title="Filters & preview"
                    description="Filter the dataset by department, gender, and visit date before reviewing the patient preview and KPIs."
                  />

                  <div className="mt-5 grid gap-4 xl:grid-cols-3">
                    <MultiSelectPills label="Department Filter" values={departments} selected={selectedDepartments} onToggle={(value) => setSelectedDepartments((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]))} />
                    <MultiSelectPills label="Gender Filter" values={genders} selected={selectedGenders} onToggle={(value) => setSelectedGenders((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]))} />
                    <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0F766E]">Visit Date Range</p>
                      <div className="mt-4 grid gap-3">
                        <input
                          type="date"
                          min={dateMin || undefined}
                          max={dateMax || undefined}
                          value={dateStart}
                          onChange={(event) => setDateStart(event.target.value)}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-[#0F766E]"
                        />
                        <input
                          type="date"
                          min={dateMin || undefined}
                          max={dateMax || undefined}
                          value={dateEnd}
                          onChange={(event) => setDateEnd(event.target.value)}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-[#0F766E]"
                        />
                        <div className="text-sm text-slate-500">
                          Range: {dateMin || '—'} → {dateMax || '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                    Filtered rows: {filteredData.length} of {data.length}
                  </div>

                  <div className="mt-5">
                    <h3 className="text-lg font-bold text-[#0F172A]">Data Preview (first 10 rows)</h3>
                    <p className="mt-2 text-sm text-slate-600">Horizontal scrolling is enabled for wide hospital datasets.</p>
                    <div className="mt-4">
                      <DataTable rows={filteredPreviewRows.slice(0, 10)} />
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button type="button" onClick={() => downloadRows('patientflow_filtered_preview.csv', filteredData.slice(0, 500))} className="inline-flex items-center rounded-full bg-[#0F766E] px-5 py-3 text-sm font-semibold text-white" disabled={!filteredData.length}>
                      <Download className="mr-2 h-4 w-4" />
                      Download filtered preview (first 500 rows)
                    </button>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <MetricCard icon={<Users className="h-6 w-6 text-[#0F766E]" />} label="Total Patients" value={String(kpis?.total_patients ?? data.length)} accent="bg-[#ECFDF5]" />
                  <MetricCard icon={<Stethoscope className="h-6 w-6 text-[#1D4ED8]" />} label="Avg Age" value={kpis?.avg_age != null ? kpis.avg_age.toFixed(2) : '—'} accent="bg-[#EFF6FF]" />
                  <MetricCard icon={<ClipboardList className="h-6 w-6 text-[#BE123C]" />} label="Avg Length of Stay" value={kpis?.avg_length_of_stay != null ? kpis.avg_length_of_stay.toFixed(2) : '—'} accent="bg-[#FFF1F2]" />
                  <MetricCard icon={<IndianRupee className="h-6 w-6 text-[#A16207]" />} label="Readmission Rate" value={kpis?.readmission_rate_pct != null ? `${kpis.readmission_rate_pct.toFixed(2)}%` : '—'} accent="bg-[#FFFBEB]" />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                    <h3 className="text-lg font-bold text-slate-900">Patient Count by Disease</h3>
                    <Plot data={[{ type: 'bar', x: diseaseLabels, y: diseaseCounts, marker: { color: '#0EA5E9' } }]} layout={{ title: 'Patient Count by Disease', autosize: true, margin: { t: 40, l: 40, r: 20, b: 110 } }} style={{ width: '100%', height: '480px' }} useResizeHandler />
                  </div>
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                    <h3 className="text-lg font-bold text-slate-900">Treatment Cost Distribution</h3>
                    <Plot data={[{ type: 'histogram', x: filteredData.map((row) => Number(row.Treatment_Cost ?? 0)), nbinsx: 30, marker: { color: '#14B8A6' } }]} layout={{ title: 'Treatment Cost Distribution', autosize: true, margin: { t: 40, l: 40, r: 20, b: 70 } }} style={{ width: '100%', height: '480px' }} useResizeHandler />
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <h3 className="text-lg font-bold text-slate-900">Risk Score vs Length of Stay</h3>
                  <Plot data={[{ type: 'scatter', mode: 'markers', x: riskScatter.map((row) => Number(row.Risk_Score ?? 0)), y: riskScatter.map((row) => Number(row.Length_of_Stay ?? 0)), marker: { color: '#6366F1', size: 8 } }]} layout={{ title: 'Risk Score vs Length of Stay', autosize: true, margin: { t: 40, l: 50, r: 20, b: 60 } }} style={{ width: '100%', height: '360px' }} useResizeHandler />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                    <h3 className="text-lg font-bold text-slate-900">Readmission prediction</h3>
                    <p className="mt-1 text-sm text-slate-600">Model: RandomForestClassifier( n_estimators=120, random_state=42 )</p>
                    <PredictionInputGrid values={readmissionForm} departments={departments} onChange={(next) => setReadmissionForm(next as PredictReadmissionForm)} />
                    <button type="button" className="mt-5 inline-flex items-center rounded-full bg-[#0F766E] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,118,110,0.22)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,118,110,0.26)] active:translate-y-0 active:scale-[0.98] active:shadow-[0_8px_18px_rgba(15,118,110,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2" onClick={() => setShowReadmissionResult(true)}>
                      Predict Readmission
                    </button>
                    {showReadmissionResult ? (
                      <>
                        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                          Predicted Readmission: <span className="font-semibold text-slate-900">{readmissionPrediction}</span>
                        </div>
                        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                          {readmissionMl?.accuracy_pct != null ? `Model accuracy: ${readmissionMl.accuracy_pct.toFixed(2)}%` : 'Model not available yet.'}
                        </div>
                      </>
                    ) : null}
                  </div>
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                    <h3 className="text-lg font-bold text-slate-900">Treatment cost prediction</h3>
                    <p className="mt-1 text-sm text-slate-600">Model: RandomForestRegressor( n_estimators=150, random_state=42 )</p>
                    <PredictionInputGrid values={costForm} departments={departments} onChange={(next) => setCostForm(next as PredictCostForm)} />
                    <button type="button" className="mt-5 inline-flex items-center rounded-full bg-[#0F766E] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,118,110,0.22)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,118,110,0.26)] active:translate-y-0 active:scale-[0.98] active:shadow-[0_8px_18px_rgba(15,118,110,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2" onClick={() => setShowCostResult(true)}>
                      Predict Treatment Cost
                    </button>
                    {showCostResult ? (
                      <>
                        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                          Predicted Treatment Cost: <span className="font-semibold text-slate-900">₹ {formatMoney(costPrediction)}</span>
                        </div>
                        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                          {costMl?.rmse != null ? `RMSE: ${formatMoney(costMl.rmse)}` : 'Model not available yet.'}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                    <h3 className="text-lg font-bold text-slate-900">Readmission feature importance</h3>
                    {readmissionFeatures.length ? (
                      <Plot data={[{ type: 'bar', x: readmissionFeatures, y: readmissionImportances, marker: { color: '#0F766E' } }]} layout={{ title: 'Readmission Feature Importance', autosize: true, margin: { t: 40, l: 50, r: 20, b: 110 } }} style={{ width: '100%', height: '340px' }} useResizeHandler />
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">Run the readmission model to display feature importance.</div>
                    )}
                  </div>
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                    <h3 className="text-lg font-bold text-slate-900">Treatment cost feature importance</h3>
                    {costFeatures.length ? (
                      <Plot data={[{ type: 'bar', x: costFeatures, y: costImportances, marker: { color: '#2563EB' } }]} layout={{ title: 'Treatment Cost Feature Importance', autosize: true, margin: { t: 40, l: 50, r: 20, b: 110 } }} style={{ width: '100%', height: '340px' }} useResizeHandler />
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">Run the treatment cost model to display feature importance.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <h3 className="text-lg font-bold text-slate-900">SHAP feature importance bar chart</h3>
                  <Plot data={[{ type: 'bar', orientation: 'h', y: shapFeatures, x: shapImportances, marker: { color: '#7C3AED' } }]} layout={{ title: 'SHAP Feature Importance Bar Chart', autosize: true, margin: { t: 40, l: 140, r: 20, b: 50 } }} style={{ width: '100%', height: '340px' }} useResizeHandler />
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <h3 className="text-xl font-bold text-[#0F172A]">Automated insights</h3>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    {insights.length ? (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="min-w-full text-left text-sm">
                          <thead className="bg-slate-50 text-[12px] uppercase tracking-[0.08em] text-slate-600">
                            <tr>
                              <th className="px-3 py-3">insights</th>
                              <th className="px-3 py-3">value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {insights.map((item) => (
                              <tr key={item.Insight} className="border-t border-slate-200">
                                <td className="px-3 py-3 font-semibold text-slate-900">{item.Insight}</td>
                                <td className="px-3 py-3 text-slate-700">{item.Value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <div className="text-slate-500">No insights yet.</div>}
                  </div>
                  <button type="button" onClick={() => downloadRows('patientflow_automated_insights.csv', toInsightRows(insights))} className="mt-5 inline-flex items-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700" disabled={!insights.length}>
                    <Download className="mr-2 h-4 w-4" />
                    Download insights CSV
                  </button>
                </div>
              </>
            ) : null}

            {isUploadPending ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
                Step 1: Upload CSV fileDrag and drop file hereBrowse filesLimit 200MB per file • CSV
              </div>
            ) : null}

            {isMappingPending ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
                Step 1: Load datasetUpload CSV to mapDrag and drop file hereBrowse filesLimit 200MB per file • CSV
              </div>
            ) : null}
          </div>
        )}
        </ProjectOverviewManager>
      </div>

      {loading ? (
        <div className="fixed bottom-6 right-6 rounded-full bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white shadow-lg">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading
        </div>
      ) : null}
    </div>
  )
}

export default PatientFlowNavigatorProjectPage