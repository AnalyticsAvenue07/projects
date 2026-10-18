import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Plot from 'react-plotly.js'
import { Download, FileUp, Loader2, Sparkles, SunMedium, CloudSun, Zap, Gauge, ChevronLeft } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'
import { SolarForecastService } from '@/services/solarForecastService'
import { ProjectOverviewManager, EditableOverviewSection } from '@/components/project-content'

const REQUIRED_FIELDS = [
  'timestamp',
  'solar_radiation_wm2',
  'diffuse_radiation_wm2',
  'direct_normal_irradiance_wm2',
  'temperature_c',
  'humidity_pct',
  'wind_speed_mps',
  'wind_direction_deg',
  'cloud_cover_pct',
  'pressure_hpa',
  'dew_point_c',
  'forecast_generation_kwh',
  'actual_generation_kwh',
  'generation_error_kwh',
  'plant_id',
  'inverter_cluster_id',
  'weather_condition',
  'sunrise_time',
  'sunset_time',
  'day_of_year',
  'clearness_index',
  'panel_tilt_deg',
  'panel_azimuth_deg',
  'is_holiday_flag',
]

const FIELD_LABELS: Record<string, string> = {
  timestamp: 'Timestamp reading',
  solar_radiation_wm2: 'Global horizontal irradiance',
  diffuse_radiation_wm2: 'Diffuse irradiance',
  direct_normal_irradiance_wm2: 'DNI',
  temperature_c: 'Ambient temperature',
  humidity_pct: 'Humidity',
  wind_speed_mps: 'Wind speed',
  wind_direction_deg: 'Wind direction',
  cloud_cover_pct: 'Cloud cover',
  pressure_hpa: 'Atmospheric pressure',
  dew_point_c: 'Dew point',
  forecast_generation_kwh: 'Forecasted generation',
  actual_generation_kwh: 'Actual generation',
  generation_error_kwh: 'Forecast error',
  plant_id: 'Plant identifier',
  inverter_cluster_id: 'Cluster identifier',
  weather_condition: 'Weather category',
  sunrise_time: 'Sunrise',
  sunset_time: 'Sunset',
  day_of_year: 'Day index',
  clearness_index: 'Solar clarity index',
  panel_tilt_deg: 'Tilt angle',
  panel_azimuth_deg: 'Azimuth',
  is_holiday_flag: 'Holiday flag',
}

const DEFAULT_DATASET_COLUMNS = REQUIRED_FIELDS
const INSIGHT_COLUMNS = ['Insight', 'Entity', 'Metric', 'Action']

type DatasetMode = 'default' | 'upload' | 'mapping'
type Row = Record<string, unknown>
type Kpis = { total_actual_kwh: number; total_forecast_kwh: number; mae: number; rmse: number; mape_pct: number }
type InsightRow = { Insight: string; Entity: string; Metric: string; Action: string }

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

function DataTable({ rows, maxRows = 10 }: { rows: Row[]; maxRows?: number }) {
  const displayRows = rows.slice(0, maxRows)
  const columns = Object.keys(displayRows[0] ?? {})

  if (!displayRows.length) {
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
          {displayRows.map((row, rowIndex) => (
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
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#0F766E]">{label}</p>
        {selected.length ? (
          <span className="rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-xs font-bold text-[#0F766E] border border-[#A7F3D0]">
            {selected.length} selected
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 text-xs text-slate-500">Select one or more categories below</p>
      
      {selected.length ? (
        <div className="mt-3 flex flex-wrap gap-2 pb-2 border-b border-slate-100">
          {selected.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
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
          const isSelected = selected.includes(option)
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
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

type TabKey = 'overview' | 'attributes' | 'application'

export function SolarPowerGenerationForecastingLabProjectPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [tab, setTab] = useState<TabKey>('overview')
  const [mode, setMode] = useState<DatasetMode>('default')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [data, setData] = useState<Row[]>([])
  const [filteredData, setFilteredData] = useState<Row[]>([])
  const [defaultPreviewRows, setDefaultPreviewRows] = useState<Row[]>([])
  const [filteredPreviewRows, setFilteredPreviewRows] = useState<Row[]>([])
  const [plants, setPlants] = useState<string[]>([])
  const [clusters, setClusters] = useState<string[]>([])
  const [weatherConditions, setWeatherConditions] = useState<string[]>([])
  const [selectedPlants, setSelectedPlants] = useState<string[]>([])
  const [selectedClusters, setSelectedClusters] = useState<string[]>([])
  const [selectedWeatherConditions, setSelectedWeatherConditions] = useState<string[]>([])
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [dateMin, setDateMin] = useState('')
  const [dateMax, setDateMax] = useState('')
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [charts, setCharts] = useState<any>({})
  const [mlResult, setMlResult] = useState<any>(null)
  const [insights, setInsights] = useState<InsightRow[]>([])
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [fileColumns, setFileColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})

  const defaultTableColumns = useMemo(() => Object.keys(defaultPreviewRows[0] ?? data[0] ?? {}), [defaultPreviewRows, data])
  const filteredTableColumns = useMemo(() => Object.keys(filteredPreviewRows[0] ?? filteredData[0] ?? data[0] ?? {}), [filteredPreviewRows, filteredData, data])
  const dataForTopTable = defaultPreviewRows.length ? defaultPreviewRows : data.slice(0, 10)

  const timeseries = charts.actual_vs_forecast_timeseries ?? []
  const scatter = charts.actual_vs_forecast_scatter ?? []
  const scatterRange = charts.scatter_axis_range ?? null
  const errorByWeather = charts.error_by_weather ?? []
  const clearness = charts.clearness_vs_generation ?? []

  useEffect(() => {
    void loadDefault()
  }, [])

  useEffect(() => {
    if (!data.length) return
    void analyzeRows(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlants, selectedClusters, selectedWeatherConditions, dateStart, dateEnd])

  async function loadDefault() {
    setError(null)
    setLoading(true)
    setMode('default')
    setSelectedPlants([])
    setSelectedClusters([])
    setSelectedWeatherConditions([])
    setDateStart('')
    setDateEnd('')
    setUploadFile(null)
    setFileColumns([])
    setMapping({})

    try {
      const response = await SolarForecastService.loadDefault()
      const rows = response.data ?? []
      setData(rows as any)
      setFilteredData(rows as any)
      setDefaultPreviewRows(response.preview ?? rows.slice(0, 10))
      setFilteredPreviewRows(response.preview ?? rows.slice(0, 15))
      setPlants((response.plants ?? []).map(String))
      setClusters((response.clusters ?? []).map(String))
      setWeatherConditions((response.weather_conditions ?? []).map(String))
      setDateMin('')
      setDateMax('')
      setStatusMessage('Default dataset loaded.')
      await analyzeRows(rows as any)
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
      setInsights([])
      return
    }

    try {
      const filterResponse = await SolarForecastService.filter({
        data: rows as any,
        plants: selectedPlants.length ? selectedPlants : undefined,
        clusters: selectedClusters.length ? selectedClusters : undefined,
      })

      const filteredRows = (filterResponse.data ?? rows) as any[]
      setFilteredData(filteredRows)
      setFilteredPreviewRows(filterResponse.preview ?? filteredRows.slice(0, 15))
      setKpis(filterResponse.kpis ?? null)
      rows = filteredRows
    } catch (err) {
      console.error(err)
    }

    try {
      const chartResponse = await SolarForecastService.getCharts(rows as any)
      setCharts(chartResponse)
    } catch (err) {
      console.error(err)
      setCharts({})
    }

    try {
      const mlResponse = await SolarForecastService.predictGeneration(rows as any)
      setMlResult(mlResponse)
    } catch (err) {
      console.error(err)
      setMlResult(null)
    }

    try {
      const insightResponse = await SolarForecastService.getInsights(rows as any)
      setInsights(insightResponse.insights ?? [])
    } catch (err) {
      console.error(err)
      setInsights([])
    }
  }

  async function downloadRows(rows: Row[], filename: string) {
    SolarForecastService.downloadCsv(rows as any, filename)
  }

  async function handleUpload(file: File) {
    setUploadFile(file)
    setError(null)
    setLoading(true)
    setStatusMessage(null)

    try {
      const uploadResponse = await SolarForecastService.uploadCsv(file)
      const rows = uploadResponse.data ?? []

      if (mode === 'mapping') {
        const columnsResponse = await SolarForecastService.getCsvColumns(file)
        const uploadedColumns = (columnsResponse.columns ?? []).map(String)
        setFileColumns(uploadedColumns)
        setDefaultPreviewRows(uploadResponse.preview ?? rows.slice(0, 10))
        setFilteredPreviewRows(uploadResponse.preview ?? rows.slice(0, 15))
        setData(rows as any)
        setFilteredData(rows as any)
        setPlants((uploadResponse.plants ?? []).map(String))
        setClusters((uploadResponse.clusters ?? []).map(String))
        setWeatherConditions((uploadResponse.weather_conditions ?? []).map(String))
        setMapping(Object.fromEntries(REQUIRED_FIELDS.map((field) => [field, uploadedColumns.includes(field) ? field : ''])))
        setStatusMessage('CSV uploaded. Map the columns, then apply the mapping to unlock the analytics.')
        return
      }

      setMode('upload')
      setData(rows as any)
      setFilteredData(rows as any)
      setDefaultPreviewRows(uploadResponse.preview ?? rows.slice(0, 10))
      setFilteredPreviewRows(uploadResponse.preview ?? rows.slice(0, 15))
      setPlants((uploadResponse.plants ?? []).map(String))
      setClusters((uploadResponse.clusters ?? []).map(String))
      setWeatherConditions((uploadResponse.weather_conditions ?? []).map(String))
      setDateMin('')
      setDateMax('')
      setSelectedPlants([])
      setSelectedClusters([])
      setSelectedWeatherConditions([])
      setStatusMessage('CSV uploaded successfully.')
      await analyzeRows(rows as any)
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
      const response = await SolarForecastService.applyMapping(uploadFile, mapping)
      const rows = response.data ?? []
      setData(rows as any)
      setFilteredData(rows as any)
      setDefaultPreviewRows(response.preview ?? rows.slice(0, 10))
      setFilteredPreviewRows(response.preview ?? rows.slice(0, 15))
      setPlants((response.plants ?? []).map(String))
      setClusters((response.clusters ?? []).map(String))
      setWeatherConditions((response.weather_conditions ?? []).map(String))
      setSelectedPlants([])
      setSelectedClusters([])
      setSelectedWeatherConditions([])
      setStatusMessage('Manual mapping applied successfully.')
      await analyzeRows(rows as any)
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

  const filteredCountText = `${filteredData.length} of ${data.length || filteredData.length}`
  const actualVsForecastSeries = (timeseries as Row[]).map((row) => ({
    x: row.timestamp,
    actual: Number(row.actual_generation_kwh ?? 0),
    forecast: Number(row.forecast_generation_kwh ?? 0),
  }))

  const chartX = actualVsForecastSeries.map((item) => item.x)
  const actualY = actualVsForecastSeries.map((item) => item.actual)
  const forecastY = actualVsForecastSeries.map((item) => item.forecast)
  const scatterX = (scatter as Row[]).map((row) => Number(row.forecast_generation_kwh ?? 0))
  const scatterY = (scatter as Row[]).map((row) => Number(row.actual_generation_kwh ?? 0))
  const diagonalMin = scatterRange?.min ?? Math.min(...scatterX, ...scatterY, 0)
  const diagonalMax = scatterRange?.max ?? Math.max(...scatterX, ...scatterY, 1)
  const weatherLabels = (errorByWeather as Row[]).map((row) => row.weather_condition ?? row.weather_condition ?? '')
  const weatherErrors = (errorByWeather as Row[]).map((row) => Number(row.abs_error ?? 0))
  const clearnessX = (clearness as Row[]).map((row) => Number(row.clearness_index ?? 0))
  const clearnessY = (clearness as Row[]).map((row) => Number(row.actual_generation_kwh ?? 0))

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
              <span>Solar Analytics</span>
              <span className="text-slate-300">•</span>
              <span>Solar Power Generation Forecasting Lab</span>
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">Solar Power Generation Forecasting Lab</h1>
            <p className="mt-4 max-w-4xl text-[16px] leading-7 text-[#334155]">
              Forecast solar generation, compare actual versus planned output, analyze weather-driven losses, and evaluate plant-level forecasting accuracy with an interactive React dashboard.
            </p>
          </div>
        </div>

        <ProjectOverviewManager
          projectSlug="solar-power-generation-forecasting-lab"
          projectTitle="Solar Power Generation Forecasting Lab"
          systemTabs={[
            { key: 'overview', label: 'Overview' },
            { key: 'attributes', label: 'Important Attributes' },
            { key: 'application', label: 'Application' },
          ]}
          activeTab={tab}
          onTabChange={(t) => setTab(t as TabKey)}
          renderOverviewContent={(sections, onEdit, onDelete) => {
            const purposeSec = sections.find((s) => s.id === 'purpose') || {
              id: 'purpose',
              projectSlug: 'solar-power-generation-forecasting-lab',
              title: 'Solar telemetry and forecast intelligence in one lab',
              eyebrow: 'Purpose',
              content:
                'SCADA plant data and weather conditions are combined to forecast generation, compare actual against forecast output, and uncover the weather patterns that drive the largest prediction errors.',
            }
            const capabilitiesSec = sections.find((s) => s.id === 'capabilities')
            const businessImpactSec = sections.find((s) => s.id === 'business-impact')
            const customSections = sections.filter((s) => s.isCustom)

            return (
              <div className="space-y-6">
                <EditableOverviewSection section={purposeSec} onEdit={onEdit} accentColor="#0F766E">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <p className="mt-2 text-base leading-7 text-slate-600">
                        {purposeSec.content}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-[#CCFBF1] bg-[#ECFDF5] px-5 py-4 text-[#0F766E] shadow-sm shrink-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]">Who should use this</p>
                      <p className="mt-2 text-sm leading-6 text-[#115E59] font-semibold">Energy analysts, plant managers, forecasting teams, and operations leaders.</p>
                    </div>
                  </div>
                </EditableOverviewSection>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard icon={<SunMedium className="h-5 w-5 text-[#0F766E]" />} label="Total Actual Generation (kWh)" value={kpis ? formatMetric(kpis.total_actual_kwh) : '—'} accent="bg-[#ECFDF5]" />
                  <MetricCard icon={<Gauge className="h-5 w-5 text-[#0369A1]" />} label="RMSE / MAE vs Forecast" value={kpis ? `${formatMetric(kpis.rmse)} / ${formatMetric(kpis.mae)}` : '—'} accent="bg-[#EFF6FF]" />
                  <MetricCard icon={<CloudSun className="h-5 w-5 text-[#0F766E]" />} label="MAPE (%)" value={kpis ? formatPercent(kpis.mape_pct) : '—'} accent="bg-[#ECFDF5]" />
                  <MetricCard icon={<Zap className="h-5 w-5 text-[#0369A1]" />} label="Total Forecast Generation (kWh)" value={kpis ? formatMetric(kpis.total_forecast_kwh) : '—'} accent="bg-[#EFF6FF]" />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {capabilitiesSec && (
                    <EditableOverviewSection section={capabilitiesSec} onEdit={onEdit} accentColor="#0F766E" />
                  )}
                  {businessImpactSec && (
                    <EditableOverviewSection section={businessImpactSec} onEdit={onEdit} accentColor="#0F766E" />
                  )}
                </div>

                {customSections.map((sec) => (
                  <EditableOverviewSection key={sec.id} section={sec} onEdit={onEdit} onDelete={onDelete} accentColor="#0F766E" />
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
                {REQUIRED_FIELDS.map((field) => (
                  <Chip key={field} className="border-blue-100 bg-[#EFF6FF] text-[#1D4ED8] hover:bg-blue-100 transition shadow-sm font-bold">
                    {field}
                  </Chip>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <h2 className="text-3xl font-bold text-[#0F172A]">Required Data Dictionary</h2>
              <p className="mt-3 max-w-3xl text-slate-600">Uploaded files are validated against the 24 required solar telemetry and weather columns before analytics runs.</p>
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
              <section className="rounded-[32px] border border-blue-100 bg-[#EFF6FF] p-8 shadow-sm">
                <h3 className="text-2xl font-bold text-[#1D4ED8]">Independent Variables (Inputs)</h3>
                <p className="mt-2 text-sm text-slate-500 mb-5">18 features feed the RandomForestRegressor.</p>
                <div className="flex flex-wrap gap-2">
                  {['solar_radiation_wm2', 'diffuse_radiation_wm2', 'direct_normal_irradiance_wm2', 'temperature_c', 'humidity_pct', 'wind_speed_mps', 'cloud_cover_pct', 'pressure_hpa', 'dew_point_c', 'day_of_year', 'clearness_index', 'panel_tilt_deg', 'panel_azimuth_deg', 'weather_condition', 'plant_id', 'inverter_cluster_id', 'is_holiday_flag', 'timestamp'].map((item) => (
                    <Chip key={item} className="border-blue-200 bg-white text-[#1D4ED8] hover:bg-blue-50 transition shadow-sm font-bold text-xs">
                      {item}
                    </Chip>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-emerald-100 bg-[#ECFDF5] p-8 shadow-sm">
                <h3 className="text-2xl font-bold text-[#0F766E]">Dependent Variables (Targets)</h3>
                <p className="mt-2 text-sm text-slate-500 mb-5">Forecast and error outputs used for analytics and model evaluation.</p>
                <div className="flex flex-wrap gap-2">
                  {['forecast_generation_kwh', 'actual_generation_kwh', 'generation_error_kwh'].map((item) => (
                    <Chip key={item} className="border-emerald-200 bg-white text-[#0F766E] hover:bg-[#ECFDF5] transition shadow-sm font-bold text-xs">
                      {item}
                    </Chip>
                  ))}
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
                  { value: 'default', title: 'Default Dataset', description: 'Automatically load the GitHub solar forecasting dataset.' },
                  { value: 'upload', title: 'Upload CSV', description: 'Upload your own CSV and analyze it immediately.' },
                  { value: 'mapping', title: 'Upload CSV + Column Mapping', description: 'Upload a file and manually map the 24 required columns.' },
                ].map((option) => (
                  <label key={option.value} className={`cursor-pointer rounded-3xl border p-5 transition ${mode === option.value ? 'border-[#0F766E] bg-[#ECFDF5] border-teal-200 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
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

            {error && <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700 shadow-sm">{error}</div>}
            {statusMessage && <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-800 shadow-sm">{statusMessage}</div>}

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Step 1</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">{mode === 'mapping' ? 'Upload CSV for Mapping' : mode === 'upload' ? 'Upload CSV file' : 'Load Default Dataset'}</h3>
                  <p className="mt-2 text-slate-600">{mode === 'default' ? 'Dataset loads automatically from GitHub RAW.' : 'Drag and drop file here or use the browse button. Limit 200MB per file • CSV'}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-full bg-[#0F766E] px-6 py-3 font-bold text-white hover:bg-[#0D5F58] shadow-md hover:-translate-y-0.5 transition active:translate-y-0">
                    <FileUp className="h-4 w-4 mr-2" />
                    Browse CSV
                  </Button>
                  <Button type="button" onClick={() => void loadDefault()} variant="secondary" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0 shadow-sm">
                    Reload Default Data
                  </Button>
                </div>
              </div>

              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileInputChange} />

              {mode === 'default' && !loading && data.length > 0 && (
                <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/60 mb-5">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Default dataset loaded from GitHub</p>
                      <p className="text-xs text-slate-500 mt-0.5">Columns: {DEFAULT_DATASET_COLUMNS.join(' • ')}</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => void downloadRows(data, 'solar_default_dataset.csv')} className="rounded-full py-2.5 px-4 font-bold transition flex items-center gap-1.5 shadow-sm">
                      <Download className="h-4 w-4" />
                      Download Default Data
                    </Button>
                  </div>
                  <div>
                    <DataTable rows={dataForTopTable} />
                  </div>
                </div>
              )}

              {(mode === 'upload' || mode === 'mapping') && !uploadFile && (
                <div onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className="mt-6 cursor-pointer rounded-[28px] border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center transition hover:border-[#0F766E] hover:bg-[#F8FBFF]">
                  <div className="mx-auto flex max-w-md flex-col items-center">
                    <div className="rounded-full bg-[#ECFDF5] p-4 text-[#0F766E]">
                      <FileUp className="h-8 w-8" />
                    </div>
                    <h4 className="mt-4 text-xl font-bold text-[#0F172A]">Drag and drop file here</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Limit 200MB per file • CSV</p>
                  </div>
                </div>
              )}

              {loading && <div className="mt-6 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-slate-600 font-semibold"><Loader2 className="h-4 w-4 animate-spin text-[#0F766E]" />Processing data...</div>}
            </section>

            {mode === 'mapping' && uploadFile && fileColumns.length > 0 && (
              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Step 2</p>
                <h3 className="mt-2 text-2xl font-bold text-[#0F172A] mb-6">Preview and map columns</h3>
                
                <div className="mb-6">
                  <DataTable rows={defaultPreviewRows} maxRows={5} />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {REQUIRED_FIELDS.map((field) => (
                    <label key={field} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm flex flex-col justify-between">
                      <span className="mb-2 block font-semibold text-slate-700">Map → {field}</span>
                      <Select value={mapping[field] ?? ''} onValueChange={(value) => setMapping((prev) => ({ ...prev, [field]: value }))}>
                        <SelectTrigger className="w-full bg-white rounded-xl border-slate-200">
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
                  <Button type="button" onClick={() => void applyMapping()} className="rounded-full bg-[#0F766E] px-6 py-3 font-bold text-white hover:bg-[#0D5F58] shadow-md hover:-translate-y-0.5 transition active:translate-y-0">
                    Apply Mapping
                  </Button>
                  <p className="text-sm text-slate-500 font-medium">This validates the uploaded file against the required solar schema.</p>
                </div>
              </section>
            )}

            {data.length > 0 && (
              <>
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="mb-6 flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">STEP 2 — FILTERS & PREVIEW</h3>
                      <p className="mt-1 text-sm text-slate-500">Use the filters below to narrow the solar dataset and preview the result.</p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => void analyzeRows(data)}
                      className="rounded-full bg-[#0F766E] px-6 py-3 font-bold text-white hover:bg-[#0D5F58] shadow-md hover:-translate-y-0.5 transition active:translate-y-0"
                    >
                      Apply Filters
                    </Button>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                    <FilterSelector label="Plant Filter" options={plants} selected={selectedPlants} onToggle={(value) => setSelectedPlants((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} />
                    <FilterSelector label="Inverter Cluster" options={clusters} selected={selectedClusters} onToggle={(value) => setSelectedClusters((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} />
                    <FilterSelector label="Weather Condition" options={weatherConditions} selected={selectedWeatherConditions} onToggle={(value) => setSelectedWeatherConditions((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} />
                    
                    {/* ── Fixed Date Range Layout (Vertical Column to Prevent Clipping) ── */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
                      <div>
                        <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#0F766E]">Date Range</p>
                        <p className="mt-1 text-xs text-slate-500">Narrows forecasting timestamps.</p>
                      </div>
                      
                      <div className="mt-4 flex flex-col gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 mb-1 block uppercase tracking-wider">Start Date</label>
                          <Input 
                            type="date" 
                            className="w-full bg-slate-50 border-slate-200 rounded-xl focus:ring-[#0F766E] py-5" 
                            value={dateStart} 
                            min={dateMin || undefined} 
                            max={dateMax || undefined} 
                            onChange={(e) => setDateStart(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 mb-1 block uppercase tracking-wider">End Date</label>
                          <Input 
                            type="date" 
                            className="w-full bg-slate-50 border-slate-200 rounded-xl focus:ring-[#0F766E] py-5" 
                            value={dateEnd} 
                            min={dateMin || undefined} 
                            max={dateMax || undefined} 
                            onChange={(e) => setDateEnd(e.target.value)} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Filtered Rows: {filteredCountText}</h3>
                      <p className="mt-1 text-sm text-slate-500">Preview of the filtered result set, limited to the first 15 rows.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => void downloadRows(filteredData.slice(0, 500), 'solar_filtered_preview.csv')} className="rounded-full py-2.5 px-4 font-bold transition flex items-center gap-1.5 shadow-sm">
                      <Download className="h-4 w-4" />
                      Download Filtered Preview
                    </Button>
                  </div>

                  <div className="mt-6">
                    <DataTable rows={filteredPreviewRows} maxRows={15} />
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <h3 className="text-2xl font-bold text-[#0F172A] mb-6">KPI Section</h3>
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard icon={<SunMedium className="h-5 w-5 text-[#0F766E]" />} label="Total Actual Generation (kWh)" value={kpis ? formatMetric(kpis.total_actual_kwh) : '—'} accent="bg-[#ECFDF5]" />
                    <MetricCard icon={<Gauge className="h-5 w-5 text-[#0369A1]" />} label="Total Forecast Generation (kWh)" value={kpis ? formatMetric(kpis.total_forecast_kwh) : '—'} accent="bg-[#EFF6FF]" />
                    <MetricCard icon={<Sparkles className="h-5 w-5 text-[#0369A1]" />} label="MAE / RMSE (kWh)" value={kpis ? `${formatMetric(kpis.mae)} / ${formatMetric(kpis.rmse)}` : '—'} accent="bg-[#EFF6FF]" />
                    <MetricCard icon={<CloudSun className="h-5 w-5 text-[#0F766E]" />} label="MAPE (%)" value={kpis ? formatPercent(kpis.mape_pct) : '—'} accent="bg-[#ECFDF5]" />
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Charts & Diagnostics</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A] mb-6">Plotly charts for forecast quality</h3>

                  <div className="grid gap-6">
                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
                      <h4 className="mb-3 text-lg font-bold text-[#0F172A]">Actual vs Forecast Generation (kWh)</h4>
                      <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 border border-slate-100">
                        <Plot
                          data={[
                            {
                              x: chartX,
                              y: actualY,
                              type: 'scatter',
                              mode: 'lines',
                              name: 'Actual',
                              line: { color: '#DC2626', width: 3 },
                            },
                            {
                              x: chartX,
                              y: forecastY,
                              type: 'scatter',
                              mode: 'lines',
                              name: 'Forecast',
                              line: { color: '#2563EB', width: 3, dash: 'dash' },
                            },
                          ]}
                          layout={{
                            title: 'Actual vs Forecast Generation',
                            autosize: true,
                            height: 520,
                            margin: { l: 50, r: 24, t: 50, b: 50 },
                            paper_bgcolor: 'rgba(0,0,0,0)',
                            plot_bgcolor: 'rgba(0,0,0,0)',
                            xaxis: { title: 'timestamp', gridcolor: '#E2E8F0' },
                            yaxis: { title: 'generation kWh', gridcolor: '#E2E8F0' },
                            legend: { orientation: 'h' },
                          }}
                          style={{ width: '100%' }}
                          config={{ displayModeBar: false, responsive: true }}
                        />
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
                      <h4 className="mb-3 text-lg font-bold text-[#0F172A]">Actual vs Forecast Scatter</h4>
                      <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 border border-slate-100">
                        <Plot
                          data={[
                            {
                              x: scatterX,
                              y: scatterY,
                              type: 'scatter',
                              mode: 'markers',
                              name: 'Generation',
                              marker: { color: '#0369A1', size: 8 },
                            },
                            {
                              x: [diagonalMin, diagonalMax],
                              y: [diagonalMin, diagonalMax],
                              type: 'scatter',
                              mode: 'lines',
                              name: 'Ideal fit',
                              line: { color: 'red', dash: 'dash', width: 2 },
                            },
                          ]}
                          layout={{
                            title: 'Actual vs Forecast Generation Scatter',
                            autosize: true,
                            height: 520,
                            margin: { l: 50, r: 24, t: 50, b: 50 },
                            paper_bgcolor: 'rgba(0,0,0,0)',
                            plot_bgcolor: 'rgba(0,0,0,0)',
                            xaxis: { title: 'forecast_generation_kwh', gridcolor: '#E2E8F0' },
                            yaxis: { title: 'actual_generation_kwh', gridcolor: '#E2E8F0' },
                            legend: { orientation: 'h' },
                          }}
                          style={{ width: '100%' }}
                          config={{ displayModeBar: false, responsive: true }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-6">
                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
                      <h4 className="mb-3 text-lg font-bold text-[#0F172A]">Average Absolute Error by Weather Condition</h4>
                      <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 border border-slate-100">
                        <Plot
                          data={[
                            {
                              x: weatherLabels,
                              y: weatherErrors,
                              type: 'bar',
                              name: 'abs_error',
                              marker: { color: '#0F766E' },
                              text: weatherErrors,
                              textposition: 'auto',
                            },
                          ]}
                          layout={{
                            title: 'Average Absolute Error by Weather Condition',
                            autosize: true,
                            height: 520,
                            margin: { l: 50, r: 24, t: 50, b: 110 },
                            paper_bgcolor: 'rgba(0,0,0,0)',
                            plot_bgcolor: 'rgba(0,0,0,0)',
                            xaxis: { title: 'weather_condition', tickangle: -25, gridcolor: '#E2E8F0' },
                            yaxis: { title: 'abs_error', gridcolor: '#E2E8F0' },
                          }}
                          style={{ width: '100%' }}
                          config={{ displayModeBar: false, responsive: true }}
                        />
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
                      <h4 className="mb-3 text-lg font-bold text-[#0F172A]">Clearness Index vs Actual Generation</h4>
                      <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 border border-slate-100">
                        <Plot
                          data={[
                            {
                              x: clearnessX,
                              y: clearnessY,
                              type: 'scatter',
                              mode: 'markers',
                              name: 'Generation',
                              marker: { color: '#0F766E', size: 8 },
                            },
                          ]}
                          layout={{
                            title: 'Clearness Index vs Actual Generation',
                            autosize: true,
                            height: 520,
                            margin: { l: 50, r: 24, t: 50, b: 50 },
                            paper_bgcolor: 'rgba(0,0,0,0)',
                            plot_bgcolor: 'rgba(0,0,0,0)',
                            xaxis: { title: 'clearness_index', gridcolor: '#E2E8F0' },
                            yaxis: { title: 'actual_generation_kwh', gridcolor: '#E2E8F0' },
                          }}
                          style={{ width: '100%' }}
                          config={{ displayModeBar: false, responsive: true }}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Machine Learning</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">RandomForestRegressor</h3>
                      <p className="mt-1 text-sm text-slate-500 font-medium">The backend trains a RandomForestRegressor on the active solar dataset and reports RMSE and R².</p>
                    </div>
                    <Button type="button" onClick={() => void downloadRows(mlResult?.predictions ?? [], 'solar_generation_predictions.csv')} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0 shadow-sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download Predictions CSV
                    </Button>
                  </div>
                  
                  <div className="mt-6 rounded-[28px] border border-slate-200 bg-gradient-to-br from-[#ECFDF5] to-white p-6 shadow-sm">
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-500">Rows</p><p className="mt-2 text-xl font-bold text-[#0F172A]">{mlResult?.train_size && mlResult?.test_size ? mlResult.train_size + mlResult.test_size : data.length}</p></div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-500">RMSE</p><p className="mt-2 text-xl font-bold text-[#0F172A]">{mlResult?.rmse ?? '—'}</p></div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-500">R² Score</p><p className="mt-2 text-xl font-bold text-[#0F172A]">{mlResult?.r2 ?? '—'}</p></div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-500">Test Size</p><p className="mt-2 text-xl font-bold text-[#0F172A]">{mlResult?.test_size ?? '—'}</p></div>
                    </div>

                    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-[#F1F5F9] border-b border-slate-200">
                              <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider py-3.5 px-4">Actual_kWh</TableHead>
                              <TableHead className="font-bold text-slate-700 text-[11px] uppercase tracking-wider py-3.5 px-4">Predicted_kWh</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-slate-100">
                            {(mlResult?.predictions ?? []).length ? (
                              mlResult.predictions.map((row: Row, index: number) => (
                                <TableRow key={index} className={`border-slate-100 hover:bg-slate-50/50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                  <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatCell(row.Actual_kWh)}</TableCell>
                                  <TableCell className="px-4 py-3 text-slate-700 text-sm font-semibold text-[#0F766E]">{formatCell(row.Predicted_kWh)}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={2} className="py-8 text-center text-slate-500 text-sm font-medium">Prediction table will appear after analysis.</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Automated Insights</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Backend-generated observations</h3>
                    </div>
                    <Button type="button" onClick={() => void downloadRows(insights, 'solar_forecasting_insights.csv')} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0 shadow-sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download Insights
                    </Button>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#F1F5F9] border-b border-slate-200">
                            {INSIGHT_COLUMNS.map((column) => (
                              <TableHead key={column} className="font-bold text-slate-700 text-[11px] uppercase tracking-wider py-3.5 px-4">
                                {column}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100">
                          {insights.length ? insights.map((row, index) => (
                            <TableRow key={`${row.Insight}-${index}`} className={`border-slate-100 hover:bg-slate-50/50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                              {INSIGHT_COLUMNS.map((column) => (
                                <TableCell key={column} className="px-4 py-3.5 text-slate-700 text-sm font-medium">
                                  {column === 'Insight' ? (
                                    <span className="font-semibold text-slate-900">{row[column as keyof InsightRow]}</span>
                                  ) : column === 'Metric' ? (
                                    <span className="font-bold text-[#0F766E]">{row[column as keyof InsightRow]}</span>
                                  ) : (
                                    row[column as keyof InsightRow] ?? '—'
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={4} className="py-8 text-center text-slate-500 text-sm font-medium">Insights will appear after analysis.</TableCell>
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

export default SolarPowerGenerationForecastingLabProjectPage
