import { useEffect, useMemo, useState, useRef, type ChangeEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Plot from 'react-plotly.js'
import {
  Activity,
  BarChart3,
  Building2,
  ChevronLeft,
  Download,
  FileUp,
  Loader2,
  ShieldAlert,
  Sparkles,
  Thermometer,
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'
import { ProjectDetailCardSkeleton } from '@/components/projects/ProjectDetailCard'

import { MachineFailureService } from '@/services/machineFailureService'
import { ProjectOverviewManager, EditableOverviewSection } from '@/components/project-content'

const REQUIRED_FIELDS = [
  'Timestamp',
  'Machine_ID',
  'Machine_Type',
  'Temperature',
  'Vibration',
  'RPM',
  'Load',
  'Run_Hours',
  'Temp_Anomaly',
  'Vib_Anomaly',
  'Load_Anomaly',
  'RPM_Anomaly',
  'Failure_Flag',
]

const QUERY_PARAM_MAP: Record<string, string> = {
  Timestamp: 'timestamp',
  Machine_ID: 'machine_id',
  Machine_Type: 'machine_type',
  Temperature: 'temperature',
  Vibration: 'vibration',
  RPM: 'rpm',
  Load: 'load',
  Run_Hours: 'run_hours',
  Temp_Anomaly: 'temp_anomaly',
  Vib_Anomaly: 'vib_anomaly',
  Load_Anomaly: 'load_anomaly',
  RPM_Anomaly: 'rpm_anomaly',
  Failure_Flag: 'failure_flag',
}

const FIELD_LABELS: Record<string, string> = {
  Timestamp: 'Datetime of sensor telemetry reading',
  Machine_ID: 'Unique identifier for each machine',
  Machine_Type: 'Model or specification category of the machine',
  Temperature: 'Operating temperature in Celsius',
  Vibration: 'Vibration amplitude in mm/s',
  RPM: 'Revolutions per minute of the machine shaft',
  Load: 'Applied mechanical load percentage',
  Run_Hours: 'Total cumulative operational hours',
  Temp_Anomaly: 'Binary flag for temperature anomaly (0/1)',
  Vib_Anomaly: 'Binary flag for vibration anomaly (0/1)',
  Load_Anomaly: 'Binary flag for load anomaly (0/1)',
  RPM_Anomaly: 'Binary flag for RPM anomaly (0/1)',
  Failure_Flag: 'Binary target flag indicating machine failure (0/1)',
}

function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`rounded-full px-3 py-1.5 text-sm font-semibold border transition shadow-sm ${className || 'border-[#CBD5E1] bg-white text-[#334155]'}`}>
      {children}
    </span>
  )
}

function SelectableFilter({
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
                <button type="button" onClick={() => onToggle(option)} className="hover:text-red-500 font-bold ml-0.5">Ã—</button>
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
        <p className="mt-1 text-xs text-slate-500">{FIELD_LABELS[field]}</p>
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

function applySelectedFilter(
  setter: React.Dispatch<React.SetStateAction<string[]>>,
  selectedList: string[],
  value: string
) {
  setter(
    selectedList.includes(value)
      ? selectedList.filter((item) => item !== value)
      : [...selectedList, value]
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

type TabKey = 'overview' | 'attributes' | 'application'

export function MachineFailurePredictiveMaintenanceProjectPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [tab, setTab] = useState<TabKey>('overview')
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'attributes', label: 'Important Attributes' },
    { key: 'application', label: 'Application' },
  ] as const

  const [mode, setMode] = useState<'default' | 'upload' | 'mapping'>('default')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [data, setData] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [machineIds, setMachineIds] = useState<string[]>([])
  const [machineTypes, setMachineTypes] = useState<string[]>([])
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([])
  const [selectedMachineTypes, setSelectedMachineTypes] = useState<string[]>([])

  const [kpis, setKpis] = useState<any>(null)
  const [charts, setCharts] = useState<any>({})
  const [mlResult, setMlResult] = useState<any>(null)
  const [insights, setInsights] = useState<any[]>([])

  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [fileColumns, setFileColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})

  const dataPreview = useMemo(() => {
    if (filtered.length) return filtered.slice(0, 10)
    if (previewRows.length) return previewRows.slice(0, 10)
    return data.slice(0, 10)
  }, [filtered, previewRows, data])

  const tableColumns = useMemo(() => {
    const sample = dataPreview[0] ?? previewRows[0] ?? data[0] ?? {}
    return Object.keys(sample)
  }, [dataPreview, previewRows, data])

  const formatCell = (value: unknown) => {
    if (value === null || value === undefined) return 'â€”'
    if (typeof value === 'number') return Number.isInteger(value) ? value.toString() : value.toFixed(4)
    return String(value)
  }

  // Auto-load on mount only
  useEffect(() => {
    void loadDefault()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-analyze whenever filters or data change
  useEffect(() => {
    if (!data.length || mode === 'mapping') return
    void analyzeRows(data, selectedMachineIds, selectedMachineTypes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, selectedMachineIds, selectedMachineTypes])

  async function loadDefault() {
    setError(null)
    setLoading(true)
    setMode('default')
    setSelectedMachineIds([])
    setSelectedMachineTypes([])

    try {
      const res = await MachineFailureService.loadDefault()
      setData(res.data ?? [])
      setFiltered(res.data ?? [])
      setPreviewRows(res.preview ?? [])
      setMachineIds((res.machine_ids ?? []).map(String))
      setMachineTypes((res.machine_types ?? []).map(String))
      setKpis(res.kpis ?? null)
      await analyzeRows(res.data ?? [], [], [])
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load default dataset.')
    } finally {
      setLoading(false)
    }
  }

  async function analyzeRows(
    rows: any[],
    machineIdsToUse = selectedMachineIds,
    machineTypesToUse = selectedMachineTypes,
  ) {
    if (!rows.length) {
      setKpis(null)
      setCharts({})
      setMlResult(null)
      setInsights([])
      return
    }

    try {
      const filterRes = await MachineFailureService.filter({
        data: rows,
        machine_ids: machineIdsToUse.length ? machineIdsToUse : undefined,
        machine_types: machineTypesToUse.length ? machineTypesToUse : undefined,
      })
      const filteredRows = filterRes.data ?? rows
      setFiltered(filteredRows)
      setKpis(filterRes.kpis ?? null)
      setPreviewRows(filterRes.preview ?? [])
      rows = filteredRows
    } catch (err) {
      console.error(err)
    }

    try {
      const chartRes = await MachineFailureService.getCharts(rows)
      setCharts(chartRes)
    } catch (err) {
      console.error(err)
      setCharts({})
    }

    try {
      const mlRes = await MachineFailureService.predictFailure(rows)
      setMlResult(mlRes)
    } catch (err) {
      console.error(err)
      setMlResult(null)
    }

    try {
      const insightRes = await MachineFailureService.getInsights(rows)
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
      await analyzeRows(data)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadFile(file)
    setError(null)
    setLoading(true)

    try {
      const uploadRes = await MachineFailureService.uploadCsv(file)
      setData(uploadRes.data ?? [])
      setFiltered(uploadRes.data ?? [])
      setPreviewRows(uploadRes.preview ?? [])
      setMachineIds(((uploadRes as any).machine_ids ?? []).map(String))
      setMachineTypes(((uploadRes as any).machine_types ?? []).map(String))
      setSelectedMachineIds([])
      setSelectedMachineTypes([])
      setMode('upload')
      await analyzeRows(uploadRes.data ?? [])
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGetColumns(file: File) {
    const res = await MachineFailureService.getCsvColumns(file)
    setFileColumns(res.columns ?? [])
    setMapping(Object.fromEntries(((res as any).required_cols ?? REQUIRED_FIELDS).map((field: string) => [field, ''])))
    setMode('mapping')
  }

  async function applyMapping() {
    if (!uploadFile) return

    setError(null)
    setLoading(true)
    try {
      const res = await MachineFailureService.applyMapping(uploadFile, mapping)
      setData(res.data ?? [])
      setFiltered(res.data ?? [])
      setPreviewRows(res.preview ?? [])
      setMode('mapping')
      await analyzeRows(res.data ?? [])
    } catch (err: any) {
      setError(err?.message ?? 'Mapping failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F8FBFF_100%)] p-6">
      <div className="mx-auto max-w-7xl">

        {/* â”€â”€ Back Button â”€â”€ */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#475569] shadow-sm transition hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:text-[#0F172A] hover:shadow-md active:translate-y-0"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {/* â”€â”€ Premium Hero Banner â”€â”€ */}
        <div className="mb-8 rounded-[32px] bg-[linear-gradient(135deg,#F0FDFA_0%,#FFFFFF_40%,#EFF6FF_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-8">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#0F766E]">
            <span>Manufacturing</span>
            <span>Machine Failure & Predictive Maintenance Lab</span>
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">Machine Failure & Predictive Maintenance Lab</h1>
          <p className="mt-4 max-w-4xl text-[16px] leading-7 text-[#334155]">Track machine telemetry, predict breakdown risk, and surface maintenance actions from the manufacturing analytics backend.</p>
        </div>

        <ProjectOverviewManager
          projectSlug="machine-failure-predictive-maintenance"
          projectTitle="Machine Failure & Predictive Maintenance Lab"
          systemTabs={tabs}
          activeTab={tab}
          onTabChange={(t) => setTab(t as TabKey)}
          renderOverviewContent={(sections, onEdit, onDelete) => {
            const purposeSec = sections.find((s) => s.id === 'purpose')
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
                  {[
                    { icon: <BarChart3 className="h-5 w-5 text-[#0F766E]" />, label: 'Machines Tracked', value: kpis?.machines_tracked ?? '—', accent: 'bg-[#ECFDF5]' },
                    { icon: <Thermometer className="h-5 w-5 text-[#0369A1]" />, label: 'Avg Temperature', value: kpis?.avg_temperature ?? '—', accent: 'bg-[#EFF6FF]' },
                    { icon: <Activity className="h-5 w-5 text-[#7C3AED]" />, label: 'Avg Vibration', value: kpis?.avg_vibration ?? '—', accent: 'bg-[#F5F3FF]' },
                    { icon: <ShieldAlert className="h-5 w-5 text-[#DC2626]" />, label: 'Failure Events', value: kpis?.failure_events ?? '—', accent: 'bg-[#FEF2F2]' },
                  ].map((card) => (
                    <article key={card.label} className="rounded-[32px] border border-[#E2E8F0] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                      <div className={`inline-flex rounded-2xl p-3 ${card.accent}`}>{card.icon}</div>
                      <p className="mt-4 text-2xl font-bold text-[#0F172A]">{card.value}</p>
                      <p className="mt-1 text-sm text-slate-500">{card.label}</p>
                    </article>
                  ))}
                </div>

                <div className="grid gap-6">
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

        {/* â•â• 2. IMPORTANT ATTRIBUTES TAB â•â• */}
        {tab === 'attributes' && (
          <div className="space-y-6">
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <h2 className="text-3xl font-bold text-[#0F172A]">Required Column Schema</h2>
              <p className="mt-3 max-w-3xl text-slate-600">The pipeline validates the following fields before analysis and ML calculations run.</p>
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
              <p className="mt-3 max-w-3xl text-slate-600">Uploaded files are validated against these 13 required machine telemetry columns before analytics runs.</p>
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
                            <span className="inline-block rounded-lg bg-slate-100 text-slate-800 px-2.5 py-1 text-xs font-bold border border-slate-200">{field}</span>
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
              <div className="rounded-[32px] border border-blue-100 bg-[#EFF6FF] p-6 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#1D4ED8]">Independent Variables</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">Input attributes used for analytics, filters, and RandomForest prediction model.</p>
                <div className="flex flex-wrap gap-2">
                  {['Machine_ID','Machine_Type','Temperature','Vibration','RPM','Load','Run_Hours','Temp_Anomaly','Vib_Anomaly','Load_Anomaly','RPM_Anomaly'].map((field) => (
                    <Chip key={field} className="border-blue-200 bg-white text-[#1D4ED8] hover:bg-blue-50 transition shadow-sm font-bold">{field}</Chip>
                  ))}
                </div>
              </div>
              <div className="rounded-[32px] border border-emerald-100 bg-[#ECFDF5] p-6 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0F766E]">Dependent Variable</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">The target label which our machine learning classifier predicts.</p>
                <div className="flex flex-wrap gap-2">
                  <Chip className="border-emerald-200 bg-white text-[#0F766E] hover:bg-[#ECFDF5] transition shadow-sm font-bold">Failure_Flag</Chip>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* â•â• 3. APPLICATION TAB â•â• */}
        {tab === 'application' && (
          <div className="space-y-8">

            {/* Dataset Source */}
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 1</p>
                  <h2 className="mt-2 text-3xl font-bold text-[#0F172A]">Load dataset and begin analysis</h2>
                  <p className="mt-3 text-slate-600">Choose a data source below. The default dataset loads automatically from GitHub.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  { value: 'default', title: 'Default Dataset (GitHub)', description: 'Load the manufacturing machine failure dataset directly from GitHub.' },
                  { value: 'upload', title: 'Upload CSV', description: 'Upload your own CSV file for immediate analysis.' },
                  { value: 'mapping', title: 'Upload CSV + Manual Mapping', description: 'Upload and manually map columns to the required schema.' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value as any)}
                    className={`cursor-pointer rounded-3xl border p-5 text-left transition w-full ${mode === option.value ? 'border-[#0F766E] bg-[#ECFDF5]' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition ${mode === option.value ? 'border-[#0F766E]' : 'border-slate-300'}`}>
                        {mode === option.value && <span className="h-2 w-2 rounded-full bg-[#0F766E]" />}
                      </span>
                      <div>
                        <p className="text-base font-semibold text-[#0F172A]">{option.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{option.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button type="button" onClick={() => void loadDefault()} disabled={loading} className="rounded-full bg-[#0F766E] px-6 py-3 font-bold text-white hover:bg-[#0D5F58] shadow-md hover:-translate-y-0.5 transition active:translate-y-0">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Reload Default Data
                </Button>
                <Button type="button" onClick={() => fileInputRef.current?.click()} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0">
                  <FileUp className="mr-2 h-4 w-4" />
                  Upload CSV
                </Button>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  void handleUpload({ target: { files: event.target.files } } as ChangeEvent<HTMLInputElement>)
                  void handleGetColumns(file)
                }} />
              </div>
            </section>

            {error && <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-sm">{error}</div>}

            {/* CSV Mapping */}
            {mode === 'mapping' && fileColumns.length > 0 && (
              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Column Mapping</p>
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
            )}

            {/* Filters & Preview */}
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-slate-100">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 2</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Filters</h3>
                  <p className="mt-2 text-slate-600">Selecting filters automatically updates the live preview, KPIs, and all charts below.</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-[#F8FAFC] px-6 py-4 text-center shadow-sm min-w-[180px]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0F766E]">Live Scope</p>
                  <p className="mt-1 text-2xl font-black text-[#0F172A]">{filtered.length} <span className="text-base font-medium text-slate-500">/ {data.length}</span></p>
                  <p className="text-xs text-slate-400 mt-0.5">rows shown</p>
                </div>
              </div>
              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <SelectableFilter
                  label="Machine ID"
                  values={machineIds}
                  selected={selectedMachineIds}
                  onToggle={(value) => applySelectedFilter(setSelectedMachineIds, selectedMachineIds, value)}
                />
                <SelectableFilter
                  label="Machine Type"
                  values={machineTypes}
                  selected={selectedMachineTypes}
                  onToggle={(value) => applySelectedFilter(setSelectedMachineTypes, selectedMachineTypes, value)}
                />
              </div>
            </section>

            {/* Data Preview */}
            {data.length > 0 && (
              <>
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Data Preview</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Live dataset preview</h3>
                      <p className="mt-2 text-slate-600">Showing first {dataPreview.length} of {filtered.length || data.length} rows.</p>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#F1F5F9] border-b border-slate-200">
                            {tableColumns.map((key) => (
                              <TableHead key={key} className="font-bold text-slate-700 uppercase text-[11px] tracking-wider py-3.5 px-4 whitespace-nowrap">{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100">
                          {dataPreview.map((row, index) => (
                            <TableRow key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                              {tableColumns.map((key) => (
                                <TableCell key={`${index}-${key}`} className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{formatCell(row[key])}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </section>

                {/* KPIs */}
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    { key: 'machines_tracked', label: 'Machines Tracked', icon: <BarChart3 className="h-5 w-5 text-[#0F766E]" />, accent: 'bg-[#ECFDF5]' },
                    { key: 'avg_temperature', label: 'Avg Temperature', icon: <Thermometer className="h-5 w-5 text-[#0369A1]" />, accent: 'bg-[#EFF6FF]' },
                    { key: 'avg_vibration', label: 'Avg Vibration', icon: <Activity className="h-5 w-5 text-[#7C3AED]" />, accent: 'bg-[#F5F3FF]' },
                    { key: 'failure_events', label: 'Failure Events', icon: <ShieldAlert className="h-5 w-5 text-[#DC2626]" />, accent: 'bg-[#FEF2F2]' },
                  ].map((card) => (
                    <article key={card.key} className="rounded-[32px] border border-[#E2E8F0] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                      <div className={`inline-flex rounded-2xl p-3 ${card.accent}`}>{card.icon}</div>
                     
                      <p className="mt-1 text-sm text-slate-500">{card.label}</p>
                    </article>
                  ))}
                </div>

                {/* Charts */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Charts & Diagnostics</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Plotly charts for machine health</h3>
                  <div className="mt-6 space-y-6">
                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Chart 1 Temperature Trend</p>
                      <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 border border-slate-100">
                        <Plot
                          data={[(charts.temperature_trend ?? []).length ? { x: (charts.temperature_trend ?? []).map((row: any) => row.Timestamp), y: (charts.temperature_trend ?? []).map((row: any) => row.Temperature), type: 'scatter', mode: 'lines', name: 'Temperature', line: { color: '#0F766E' } } : { x: [], y: [], type: 'scatter', mode: 'lines' }]}
                          layout={{ margin: { t: 24, l: 40, r: 20, b: 32 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', xaxis: { gridcolor: '#E2E8F0' }, yaxis: { gridcolor: '#E2E8F0' } }}
                          style={{ width: '100%', height: 320 }}
                          config={{ displayModeBar: false, responsive: true }}
                        />
                      </div>
                    </div>
                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Chart 2 Vibration by Machine Type</p>
                      <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 border border-slate-100">
                        <Plot
                          data={[(charts.vibration_by_type ?? []).length ? { x: (charts.vibration_by_type ?? []).map((row: any) => row.Machine_Type), y: (charts.vibration_by_type ?? []).map((row: any) => row.Vibration), type: 'box', name: 'Vibration', marker: { color: '#2563EB' } } : { x: [], y: [], type: 'box' }]}
                          layout={{ margin: { t: 24, l: 40, r: 20, b: 32 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', xaxis: { gridcolor: '#E2E8F0' }, yaxis: { gridcolor: '#E2E8F0' } }}
                          style={{ width: '100%', height: 320 }}
                          config={{ displayModeBar: false, responsive: true }}
                        />
                      </div>
                    </div>
                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Chart 3 Temperature vs Load (colored by Failure)</p>
                      <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 border border-slate-100">
                        <Plot
                          data={[(charts.temp_vs_load ?? []).length ? { x: (charts.temp_vs_load ?? []).map((row: any) => row.Load), y: (charts.temp_vs_load ?? []).map((row: any) => row.Temperature), mode: 'markers', type: 'scatter', marker: { color: (charts.temp_vs_load ?? []).map((row: any) => row.Failure_Flag ?? 0), colorscale: [[0, '#2563EB'], [1, '#DC2626']], showscale: true } } : { x: [], y: [], mode: 'markers', type: 'scatter' }]}
                          layout={{ margin: { t: 24, l: 40, r: 20, b: 32 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', xaxis: { title: 'Load', gridcolor: '#E2E8F0' }, yaxis: { title: 'Temperature', gridcolor: '#E2E8F0' } }}
                          style={{ width: '100%', height: 360 }}
                          config={{ displayModeBar: false, responsive: true }}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* ML Results */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="rounded-full bg-[#0F766E] p-4 text-white shadow-lg shadow-teal-100"><Sparkles className="h-6 w-6" /></div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0F766E]">Machine Learning</p>
                      <h3 className="mt-1 text-2xl font-bold text-[#0F172A]">Failure Prediction RandomForestClassifier</h3>
                    </div>
                  </div>
                  {mlResult ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-4 mb-6">
                        {[
                          { label: 'Model', value: mlResult.model },
                          { label: 'Accuracy', value: `${mlResult.accuracy_pct}%` },
                          { label: 'Target', value: mlResult.target },
                          { label: 'Test Size', value: mlResult.test_size },
                        ].map((item) => (
                          <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <p className="text-sm text-slate-500">{item.label}</p>
                            <p className="mt-2 text-xl font-bold text-[#0F172A]">{item.value}</p>
                          </div>
                        ))}
                      </div>
                      {mlResult?.predictions?.length ? (
                        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white mb-6">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-[#F1F5F9] border-b border-slate-200">
                                  <TableHead className="font-bold text-slate-700 uppercase text-[11px] tracking-wider py-3.5 px-4">Actual Failure</TableHead>
                                  <TableHead className="font-bold text-slate-700 uppercase text-[11px] tracking-wider py-3.5 px-4">Predicted Probability</TableHead>
                                  <TableHead className="font-bold text-slate-700 uppercase text-[11px] tracking-wider py-3.5 px-4">Predicted Class</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody className="divide-y divide-slate-100">
                                {mlResult.predictions.map((row: any, index: number) => (
                                  <TableRow key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                                    <TableCell className="px-4 py-3 text-sm text-slate-700">{formatCell(row.Actual_Failure)}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-slate-700">{formatCell(row.Predicted_Prob)}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-slate-700">{formatCell(row.Predicted_Class)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ) : null}
                      {mlResult?.feature_importance?.length ? (
                        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Feature Importance</p>
                          <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 border border-slate-100">
                            <Plot
                              data={[{ x: mlResult.feature_importance.map((item: any) => item.Feature), y: mlResult.feature_importance.map((item: any) => item.Importance), type: 'bar', marker: { color: '#0F766E' } }]}
                              layout={{ margin: { t: 24, l: 40, r: 20, b: 60 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', xaxis: { gridcolor: '#E2E8F0', tickangle: -25 }, yaxis: { gridcolor: '#E2E8F0' } }}
                              style={{ width: '100%', height: 300 }}
                              config={{ displayModeBar: false, responsive: true }}
                            />
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-slate-500">ML results will appear once data is loaded.</p>
                  )}
                </section>

                {/* Insights */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Automated Insights</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Backend-generated observations</h3>
                  <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#F1F5F9] border-b border-slate-200">
                            {['Insight', 'Entity', 'Metric', 'Action'].map((col) => (
                              <TableHead key={col} className="font-bold text-slate-700 uppercase text-[11px] tracking-wider py-3.5 px-4">{col}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100">
                          {insights.length ? insights.map((item, index) => (
                            <TableRow key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                              <TableCell className="px-4 py-3 text-sm font-medium text-slate-800 whitespace-normal">{item.Insight}</TableCell>
                              <TableCell className="px-4 py-3 text-sm text-slate-600 whitespace-normal">{item.Entity}</TableCell>
                              <TableCell className="px-4 py-3 text-sm text-slate-600 whitespace-normal">{item.Metric}</TableCell>
                              <TableCell className="px-4 py-3 text-sm text-slate-600 whitespace-normal">{item.Action}</TableCell>
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
        </ProjectOverviewManager>
      </div>
    </div>
  )
}
