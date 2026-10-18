import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Plot from 'react-plotly.js'
import {
  BarChart3,
  Building2,
  Download,
  FileUp,
  Loader2,
  MapPinned,
  Sparkles,
  SquareStack,
  UserRound,
  Ruler,
  Bath,
  CarFront,
  CalendarRange,
  IndianRupee,
  ChevronLeft,
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'
import { RealEstatePriceVsFeaturesService } from '@/services/realEstatePriceVsFeaturesService'
import { ProjectOverviewManager, EditableOverviewSection } from '@/components/project-content'

const REQUIRED_COLUMNS = ['City', 'Property_Type', 'BHK', 'Bathroom_Count', 'Area_sqft', 'Price', 'Parking', 'Age_Years']
const DISPLAY_COLUMNS = [
  'Property_ID',
  'City',
  'Locality',
  'Country',
  'Region',
  'Property_Type',
  'BHK',
  'Bathroom_Count',
  'Area_sqft',
  'Price',
  'Price_per_sqft',
  'Floor_Number',
  'Total_Floors',
  'Age_Years',
  'Facing',
  'Furnishing',
  'Parking',
  'Amenities',
  'Maintenance_Fees',
  'Registration_Cost',
  'Tax_Percent',
  'Currency',
  'Latitude',
  'Longitude',
  'Zone',
  'Agent_Name',
  'Agent_ID',
  'Listing_Date',
  'Listing_Channel',
  'Lead_Score',
  'Days_On_Market',
  'Status',
  'Views_Count',
  'Inquiries_Count',
  'Site_Visits_Count',
  'Conversion_Probability',
  'Description',
  'Highlights',
  'Nearby_Landmarks',
]

const OVERVIEW_FEATURES = [
  'Feature-level pricing analysis',
  'Interactive dashboards',
  'City & property-type comparisons',
  'ML-driven price estimation',
  'Visual insights on area, BHK, bathrooms & age impact',
]

const BUSINESS_IMPACT = [
  'Better pricing transparency',
  'Improved negotiation leverage',
  'Accurate investment planning',
  'Faster decision-making using data-driven valuation',
  'Enhanced buyer & investor confidence',
]

const REQUIRED_DESCRIPTIONS: Record<string, string> = {
  City: 'City where the property is located',
  Property_Type: 'Apartment, Villa, Plot, etc.',
  BHK: 'Number of bedrooms',
  Bathroom_Count: 'Number of bathrooms',
  Area_sqft: 'Built-up area',
  Price: 'Property price',
  Parking: 'Parking availability',
  Age_Years: 'Property age',
}

const BLUE_SCALE = ['#DCEAF7', '#9CC9EB', '#5FA7E3', '#1F77D0', '#0A4C8A']
const PROPERTY_TYPE_COLORS: Record<string, string> = {
  Apartment: '#636EFA',
  Villa: '#EF553B',
  'Independent House': '#00CC96',
  'Row House': '#AB63FA',
  Studio: '#19D3F3',
}

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
type AppMode = 'default' | 'upload' | 'mapping'
type Row = Record<string, unknown>
type Kpis = { avg_price: number; avg_price_per_sqft: number; top_property_type: string; top_city: string; total_properties: number }
type ChartItem = { BHK?: number; Bathroom_Count?: number; Price?: number; Area_sqft?: number; Property_Type?: string; City?: string }
type InsightRow = { City: string; Property_Type: string; Avg_Price: number; Max_Price: number; Min_Price: number; Count?: number }
type PredictionRow = {
  City: string
  Property_Type: string
  BHK: number
  Bathroom_Count: number
  Area_sqft: number
  Actual_Price: number
  Predicted_Price: number
  Difference?: number
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const message = errorData?.detail || errorData?.message || response.statusText || 'Request failed'
    throw new Error(message)
  }
  return response.json()
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `₹ ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`
}

function createCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return ''
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return ''
    const text = String(value).replace(/"/g, '""')
    return /[",\n]/.test(text) ? `"${text}"` : text
  }
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n')
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

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
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

function DataTable({ rows, maxRows = 8 }: { rows: Row[]; maxRows?: number }) {
  const visibleRows = rows.slice(0, maxRows)
  const columns = useMemo(() => Array.from(new Set(visibleRows.flatMap((row) => Object.keys(row)))), [visibleRows])

  if (!visibleRows.length) {
    return <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">No rows to display.</div>
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50">
            {columns.map((column) => (
              <TableHead key={column} className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate-600 py-3.5 px-4">
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((row, rowIndex) => (
            <TableRow key={rowIndex} className="border-slate-100 hover:bg-slate-50/50">
              {columns.map((column) => (
                <TableCell key={`${rowIndex}-${column}`} className="max-w-[220px] whitespace-normal px-4 py-3 text-slate-700 text-sm">
                  {row[column] === null || row[column] === undefined || row[column] === '' ? '—' : String(row[column])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
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

function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`rounded-full px-3 py-1.5 text-sm font-semibold border transition shadow-sm ${className || 'border-[#CBD5E1] bg-white text-[#334155]'}`}>
      {children}
    </span>
  )
}

export function RealEstatePriceVsPropertyFeaturesAnalyzerProjectPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const mappingFileRef = useRef<HTMLInputElement | null>(null)
  const [tab, setTab] = useState<TabKey>('overview')
  const [mode, setMode] = useState<AppMode>('default')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [data, setData] = useState<Row[]>([])
  const [filteredData, setFilteredData] = useState<Row[]>([])
  const [previewRows, setPreviewRows] = useState<Row[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [propertyTypes, setPropertyTypes] = useState<string[]>([])
  const [bhkValues, setBhkValues] = useState<string[]>([])
  const [bathroomValues, setBathroomValues] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([])
  const [selectedBhk, setSelectedBhk] = useState<string[]>([])
  const [selectedBathrooms, setSelectedBathrooms] = useState<string[]>([])
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [charts, setCharts] = useState<{ price_vs_bhk: ChartItem[]; price_vs_bathrooms: ChartItem[]; price_vs_area: ChartItem[] }>({ price_vs_bhk: [], price_vs_bathrooms: [], price_vs_area: [] })
  const [predictions, setPredictions] = useState<PredictionRow[]>([])
  const [insights, setInsights] = useState<InsightRow[]>([])
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [fileColumns, setFileColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})

  const activeRows = filteredData.length ? filteredData : data
  const hiddenDataMessage = mode === 'upload' && !data.length
  const isMappingMode = mode === 'mapping'

  useEffect(() => {
    void loadDefaultDataset()
  }, [])

  useEffect(() => {
    if (!activeRows.length || mode === 'mapping') return
    void refreshAnalysis(activeRows)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCities, selectedPropertyTypes, selectedBhk, selectedBathrooms])

  async function loadDefaultDataset() {
    setLoading(true)
    setError(null)
    setStatusMessage(null)
    setMode('default')
    setSelectedCities([])
    setSelectedPropertyTypes([])
    setSelectedBhk([])
    setSelectedBathrooms([])
    setUploadFile(null)
    setFileColumns([])
    setMapping({})

    try {
      const response = await RealEstatePriceVsFeaturesService.loadDefaultDataset()
      const rows = response.data ?? []
      setData(rows as any)
      setFilteredData(rows as any)
      setPreviewRows(response.preview ?? rows.slice(0, 10))
      setCities((response.cities ?? []).map(String))
      setPropertyTypes((response.property_types ?? []).map(String))
      setBhkValues((response.bhk_values ?? []).map(String))
      setBathroomValues((response.bathroom_values ?? []).map(String))
      setKpis(null)
      setStatusMessage('Dataset loaded.')
      await refreshAnalysis(rows as any)
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load the default dataset.')
    } finally {
      setLoading(false)
    }
  }

  async function refreshAnalysis(rows: Row[]) {
    if (!rows.length) {
      setKpis(null)
      setCharts({ price_vs_bhk: [], price_vs_bathrooms: [], price_vs_area: [] })
      setPredictions([])
      setInsights([])
      return
    }

    try {
      const filterResponse = await RealEstatePriceVsFeaturesService.filterDataset({
        data: rows as any,
        cities: selectedCities.length ? selectedCities : undefined,
        property_types: selectedPropertyTypes.length ? selectedPropertyTypes : undefined,
        bhk_values: selectedBhk.length ? selectedBhk.map((value) => Number(value)) : undefined,
        bathroom_values: selectedBathrooms.length ? selectedBathrooms.map((value) => Number(value)) : undefined,
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
      const chartResponse = await RealEstatePriceVsFeaturesService.getCharts(rows as any)
      setCharts(chartResponse)
    } catch (err) {
      console.error(err)
      setCharts({ price_vs_bhk: [], price_vs_bathrooms: [], price_vs_area: [] })
    }

    try {
      const mlResponse = await RealEstatePriceVsFeaturesService.predictMl(rows as any)
      setPredictions(mlResponse.predictions ?? [])
    } catch (err) {
      console.error(err)
      setPredictions([])
    }

    try {
      const insightsResponse = await RealEstatePriceVsFeaturesService.getInsights(rows as any)
      setInsights(insightsResponse.insights ?? [])
    } catch (err) {
      console.error(err)
      setInsights([])
    }
  }

  function applySelectedFilter(setter: (next: string[]) => void, current: string[], value: string) {
    setter(toggleValue(current, value))
  }

  async function handleUpload(file: File, mappingMode = false) {
    setUploadFile(file)
    setLoading(true)
    setError(null)
    setStatusMessage(null)

    try {
      if (mappingMode) {
        const columnsResponse = await RealEstatePriceVsFeaturesService.getCsvColumns(file)
        setMode('mapping')
        setFileColumns((columnsResponse.columns ?? []).map(String))
        setMapping(Object.fromEntries(REQUIRED_COLUMNS.map((field) => [field, ''])))
        setStatusMessage('CSV uploaded. Map the required columns to continue.')
        return
      }

      const response = await RealEstatePriceVsFeaturesService.uploadCsv(file)
      const rows = response.data ?? []
      setMode('upload')
      setData(rows as any)
      setFilteredData(rows as any)
      setPreviewRows(response.preview ?? rows.slice(0, 10))
      setCities((response.cities ?? []).map(String))
      setPropertyTypes((response.property_types ?? []).map(String))
      setBhkValues((response.bhk_values ?? []).map(String))
      setBathroomValues((response.bathroom_values ?? []).map(String))
      setSelectedCities([])
      setSelectedPropertyTypes([])
      setSelectedBhk([])
      setSelectedBathrooms([])
      setStatusMessage('CSV uploaded successfully.')
      await refreshAnalysis(rows as any)
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed.')
    } finally {
      setLoading(false)
    }
  }

  async function applyMapping() {
    if (!uploadFile) {
      setError('Please upload a CSV before applying mapping.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await RealEstatePriceVsFeaturesService.applyMapping(uploadFile, mapping)
      const rows = response.data ?? []
      setMode('upload')
      setData(rows as any)
      setFilteredData(rows as any)
      setPreviewRows(response.preview ?? rows.slice(0, 10))
      setCities((response.cities ?? []).map(String))
      setPropertyTypes((response.property_types ?? []).map(String))
      setBhkValues((response.bhk_values ?? []).map(String))
      setBathroomValues((response.bathroom_values ?? []).map(String))
      setSelectedCities([])
      setSelectedPropertyTypes([])
      setSelectedBhk([])
      setSelectedBathrooms([])
      setStatusMessage('Manual mapping applied successfully.')
      await refreshAnalysis(rows as any)
    } catch (err: any) {
      setError(err?.message ?? 'Mapping failed.')
    } finally {
      setLoading(false)
    }
  }

  function downloadFilteredData() {
    downloadCsv(filteredData.length ? filteredData : data, 'real_estate_filtered.csv')
  }

  function downloadPredictions() {
    downloadCsv(predictions, 'ml_predictions.csv')
  }

  function downloadInsights() {
    downloadCsv(insights, 'automated_insights.csv')
  }

  const overviewKpis = [
    { label: 'Avg Price', value: kpis ? formatMoney(kpis.avg_price) : 'Static label', icon: <IndianRupee className="h-5 w-5 text-[#0F766E]" />, accent: 'bg-[#ECFDF5]' },
    { label: 'Price per SqFt', value: kpis ? formatMoney(kpis.avg_price_per_sqft) : 'Static label', icon: <Ruler className="h-5 w-5 text-[#0369A1]" />, accent: 'bg-[#EFF6FF]' },
    { label: 'Top Property Type', value: kpis?.top_property_type ?? 'Static label', icon: <SquareStack className="h-5 w-5 text-[#B45309]" />, accent: 'bg-[#FFFBEB]' },
    { label: 'Top City', value: kpis?.top_city ?? 'Static label', icon: <MapPinned className="h-5 w-5 text-[#7C3AED]" />, accent: 'bg-[#F5F3FF]' },
  ]

  const defaultTableRows = previewRows.length ? previewRows : data.slice(0, 10)
  const filteredPreviewRows = filteredData.length ? filteredData.slice(0, 10) : defaultTableRows

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
              <span>Real Estate</span>
              <span className="text-slate-300">•</span>
              <span>Real Estate Price vs Property Features Analyzer</span>
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">Real Estate Price vs Property Features Analyzer</h1>
            <p className="mt-4 max-w-4xl text-[16px] leading-7 text-[#334155]">Explore valuation dynamics across area, BHK count, bathrooms, amenities, property age, and city-level factors with filters, Plotly charts, ML price estimation, and downloadable insights.</p>
          </div>
        </div>

        <ProjectOverviewManager
          projectSlug="real-estate-price-vs-property-features-analyzer"
          projectTitle="Real Estate Price vs Property Features Analyzer"
          systemTabs={tabs}
          activeTab={tab}
          onTabChange={(t) => setTab(t as TabKey)}
          renderOverviewContent={(sections, onEdit, onDelete) => {
            const purposeSec = sections.find((s) => s.id === 'purpose')
            const capabilitiesSec = sections.find((s) => s.id === 'capabilities')
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
                  {overviewKpis.map((card) => (
                    <MetricCard key={card.label} icon={card.icon} label={card.label} value={card.value} accent={card.accent} />
                  ))}
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

        {/* 2. Important Attributes Tab */}
        {tab === 'attributes' && (
          <div className="space-y-6">
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <h2 className="text-3xl font-bold text-[#0F172A]">Required Columns</h2>
              <p className="mt-3 max-w-3xl text-slate-600">The backend validates this schema before analytics and predictions run.</p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {REQUIRED_COLUMNS.map((field) => (
                  <Chip key={field} className="border-blue-100 bg-[#EFF6FF] text-[#1D4ED8] hover:bg-blue-100 transition shadow-sm font-bold">
                    {field}
                  </Chip>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <h2 className="text-3xl font-bold text-[#0F172A]">Data Dictionary</h2>
              <p className="mt-3 max-w-3xl text-slate-600">These are the business-critical fields the analyzer expects to calculate price relationships and ML predictions.</p>
              
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
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#1D4ED8]">Independent Variables</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Input attributes used for analytics, filters, and RandomForest prediction model.</p>
                  <div className="flex flex-wrap gap-2">
                    {['City', 'Property_Type', 'BHK', 'Bathroom_Count', 'Area_sqft', 'Parking', 'Age_Years'].map((field) => (
                      <Chip key={field} className="border-blue-200 bg-white text-[#1D4ED8] hover:bg-blue-50 transition shadow-sm font-bold">
                        {field}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="rounded-[32px] border border-emerald-100 bg-[#ECFDF5] p-6 shadow-sm">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0F766E]">Dependent Variable</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">The target label which our machine learning regression model predicts.</p>
                  <div className="flex flex-wrap gap-2">
                    <Chip className="border-emerald-200 bg-white text-[#0F766E] hover:bg-[#ECFDF5] transition shadow-sm font-bold">Price</Chip>
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
                  <h2 className="mt-2 text-3xl font-bold text-[#0F172A]">Load dataset and begin analysis</h2>
                  <p className="mt-3 text-slate-600">The default backend dataset is loaded automatically and then filtered through the application workflow.</p>
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
                  Upload CSV File
                </Button>
                <Button type="button" onClick={() => mappingFileRef.current?.click()} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0">
                  <SquareStack className="mr-2 h-4 w-4" />
                  Upload CSV for Mapping
                </Button>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  void handleUpload(file, false)
                }} />
                <input ref={mappingFileRef} type="file" accept=".csv" className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  void handleUpload(file, true)
                }} />
              </div>
            </section>

            {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700 shadow-sm">{error}</div> : null}

            {mode === 'mapping' ? (
              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Upload CSV + Manual Mapping</p>
                    <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Map required columns</h3>
                  </div>
                  <Button type="button" onClick={applyMapping} disabled={loading} className="rounded-full bg-[#0F766E] px-6 py-3 font-bold text-white hover:bg-[#0D5F58] shadow-md hover:-translate-y-0.5 transition active:translate-y-0">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Apply Mapping
                  </Button>
                </div>
                <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 font-medium">
                  Step 1: Upload CSV for Mapping Drag and Drop Area Browse Files. Nothing else is shown until upload succeeds.
                </div>
                <div className="space-y-4">
                  {REQUIRED_COLUMNS.map((field) => (
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

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-slate-100">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 2</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Filters</h3>
                  <p className="mt-2 text-slate-600">Backend filters dynamically by city, property type, BHK, and bathrooms.</p>
                </div>
                <Button type="button" onClick={() => void refreshAnalysis(data)} className="rounded-full bg-[#0F766E] px-6 py-3 font-bold text-white hover:bg-[#0D5F58] shadow-md hover:-translate-y-0.5 transition active:translate-y-0">
                  Apply Filters
                </Button>
              </div>

              {/* Highlight these filter fields with consistent brand color styling */}
              <div className="mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
                <SelectableFilter label="City" values={cities} selected={selectedCities} onToggle={(value) => applySelectedFilter(setSelectedCities, selectedCities, value)} />
                <SelectableFilter label="Property Type" values={propertyTypes} selected={selectedPropertyTypes} onToggle={(value) => applySelectedFilter(setSelectedPropertyTypes, selectedPropertyTypes, value)} />
                <SelectableFilter label="BHK" values={bhkValues} selected={selectedBhk} onToggle={(value) => applySelectedFilter(setSelectedBhk, selectedBhk, value)} />
                <SelectableFilter label="Bathrooms (Similar Property Parameters)" values={bathroomValues} selected={selectedBathrooms} onToggle={(value) => applySelectedFilter(setSelectedBathrooms, selectedBathrooms, value)} />
              </div>
            </section>

            {!hiddenDataMessage ? (
              <>
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Data Preview</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Dataset loaded.</h3>
                      <p className="mt-2 text-slate-600">Horizontal scroll is enabled for the full property dataset.</p>
                    </div>
                    <Button type="button" onClick={downloadFilteredData} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0">
                      <Download className="mr-2 h-4 w-4" />
                      Download Filtered Data
                    </Button>
                  </div>
                  <div>
                    <DataTable rows={filteredPreviewRows} maxRows={10} />
                  </div>
                </section>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                  {kpis
                    ? [
                        { label: 'Avg Price', value: formatMoney(kpis.avg_price), icon: <IndianRupee className="h-5 w-5 text-[#0F766E]" />, accent: 'bg-[#ECFDF5]' },
                        { label: 'Avg Price/SqFt', value: formatMoney(kpis.avg_price_per_sqft), icon: <Ruler className="h-5 w-5 text-[#0369A1]" />, accent: 'bg-[#EFF6FF]' },
                        { label: 'Top Property Type', value: kpis.top_property_type, icon: <SquareStack className="h-5 w-5 text-[#B45309]" />, accent: 'bg-[#FFFBEB]' },
                        { label: 'Top City', value: kpis.top_city, icon: <MapPinned className="h-5 w-5 text-[#7C3AED]" />, accent: 'bg-[#F5F3FF]' },
                      ].map((card) => (
                        <MetricCard key={card.label} icon={card.icon} label={card.label} value={card.value} accent={card.accent} />
                      ))
                    : null}
                </div>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Charts</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Price by features</h3>

                  <div className="mt-6 space-y-8">
                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Chart 1 — Price vs Bedrooms (BHK)</p>
                      <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 border border-slate-100">
                        <Plot
                          data={[
                            {
                              type: 'bar',
                              x: charts.price_vs_bhk.map((item) => String(item.BHK ?? '')),
                              y: charts.price_vs_bhk.map((item) => Number(item.Price ?? 0)),
                              marker: {
                                color: charts.price_vs_bhk.map((item) => BLUE_SCALE[Math.max(0, Math.min(BLUE_SCALE.length - 1, Number(item.BHK ?? 1) - 1))]),
                              },
                              text: charts.price_vs_bhk.map((item) => formatMoney(Number(item.Price ?? 0))),
                              textposition: 'inside',
                              textfont: { color: '#ffffff', size: 12 },
                              name: 'Price',
                              showlegend: true,
                            },
                          ]}
                          layout={{
                            ...commonLayout,
                            barmode: 'group',
                            showlegend: true,
                            height: 520,
                            xaxis: { title: 'BHK' },
                            yaxis: { title: 'Price' },
                          }}
                          style={{ width: '100%' }}
                          config={{ responsive: true, displaylogo: false }}
                        />
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Chart 2 — Price vs Bathrooms</p>
                      <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 border border-slate-100">
                        <Plot
                          data={[
                            {
                              type: 'bar',
                              x: charts.price_vs_bathrooms.map((item) => String(item.Bathroom_Count ?? '')),
                              y: charts.price_vs_bathrooms.map((item) => Number(item.Price ?? 0)),
                              marker: {
                                color: charts.price_vs_bathrooms.map((item) => BLUE_SCALE[Math.max(0, Math.min(BLUE_SCALE.length - 1, Number(item.Bathroom_Count ?? 1) - 1))]),
                              },
                              text: charts.price_vs_bathrooms.map((item) => formatMoney(Number(item.Price ?? 0))),
                              textposition: 'inside',
                              textfont: { color: '#ffffff', size: 12 },
                              name: 'Price',
                              showlegend: true,
                            },
                          ]}
                          layout={{
                            ...commonLayout,
                            barmode: 'group',
                            showlegend: true,
                            height: 520,
                            xaxis: { title: 'Bathroom Count' },
                            yaxis: { title: 'Price' },
                          }}
                          style={{ width: '100%' }}
                          config={{ responsive: true, displaylogo: false }}
                        />
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Chart 3 — Price vs Area</p>
                      <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 border border-slate-100">
                        <Plot
                          data={[
                            {
                              type: 'scatter',
                              mode: 'markers',
                              x: charts.price_vs_area.map((item) => Number(item.Area_sqft ?? 0)),
                              y: charts.price_vs_area.map((item) => Number(item.Price ?? 0)),
                              text: charts.price_vs_area.map((item) => item.Property_Type ?? 'Property'),
                              marker: {
                                size: charts.price_vs_area.map((item) => Math.max(Number(item.BHK ?? 1) * 8, 8)),
                                color: charts.price_vs_area.map((item) => PROPERTY_TYPE_COLORS[item.Property_Type ?? ''] ?? '#636EFA'),
                                line: { color: '#ffffff', width: 1 },
                                showscale: false,
                                opacity: 0.8,
                              },
                              name: 'Property Type',
                              hovertemplate: 'Area: %{x}<br>Price: %{y}<br>Type: %{text}<extra></extra>',
                            },
                          ]}
                          layout={{
                            ...commonLayout,
                            height: 560,
                            xaxis: { title: 'Area (sqft)' },
                            yaxis: { title: 'Price' },
                            legend: { ...commonLayout.legend, title: { text: 'Property Type' } },
                          }}
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
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">ML Price Prediction</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">RandomForestRegressor predictions</h3>
                    </div>
                    <Button type="button" onClick={downloadPredictions} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0">
                      <Download className="mr-2 h-4 w-4" />
                      Download ML Predictions CSV
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-3xl border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 border-b border-slate-200">
                          {['City', 'Property Type', 'BHK', 'Bathroom Count', 'Area (sqft)', 'Actual Price', 'Predicted Price'].map((column) => (
                            <TableHead key={column} className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">{column}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100">
                        {predictions.slice(0, 10).map((row, index) => (
                          <TableRow key={index} className="border-slate-100 hover:bg-slate-50/50">
                            {/* Consistent highlights for City, Property_Type, BHK, and Bathroom_Count */}
                            <TableCell className="px-4 py-3 font-semibold text-slate-800 text-sm">
                              <span className="rounded bg-[#EFF6FF] text-[#1D4ED8] px-2 py-0.5 text-xs font-bold border border-blue-100">{row.City}</span>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-slate-700 text-sm">
                              <span className="rounded bg-[#F5F3FF] text-[#7C3AED] px-2 py-0.5 text-xs font-bold border border-purple-100">{row.Property_Type}</span>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-slate-700 text-sm font-semibold">{formatNumber(row.BHK)}</TableCell>
                            <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatNumber(row.Bathroom_Count)}</TableCell>
                            <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatNumber(row.Area_sqft)}</TableCell>
                            <TableCell className="px-4 py-3 font-bold text-slate-900 text-sm">{formatMoney(row.Actual_Price)}</TableCell>
                            <TableCell className="px-4 py-3 font-bold text-[#0F766E] text-sm">{formatMoney(row.Predicted_Price)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Automated Insights</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Grouped by city and property type</h3>
                    </div>
                    <Button type="button" onClick={downloadInsights} variant="outline" className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0">
                      <Download className="mr-2 h-4 w-4" />
                      Download Insights CSV
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-3xl border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 border-b border-slate-200">
                          {['City', 'Property Type', 'Avg Price', 'Max Price', 'Min Price'].map((column) => (
                            <TableHead key={column} className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">{column}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100">
                        {insights.slice(0, 10).map((row, index) => (
                          <TableRow key={index} className="border-slate-100 hover:bg-slate-50/50">
                            <TableCell className="px-4 py-3 font-semibold text-slate-800 text-sm">
                              <span className="rounded bg-[#EFF6FF] text-[#1D4ED8] px-2 py-0.5 text-xs font-bold border border-blue-100">{row.City}</span>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-slate-700 text-sm">
                              <span className="rounded bg-[#F5F3FF] text-[#7C3AED] px-2 py-0.5 text-xs font-bold border border-purple-100">{row.Property_Type}</span>
                            </TableCell>
                            <TableCell className="px-4 py-3 font-bold text-[#0F766E] text-sm">{formatMoney(row.Avg_Price)}</TableCell>
                            <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMoney(row.Max_Price)}</TableCell>
                            <TableCell className="px-4 py-3 text-slate-700 text-sm">{formatMoney(row.Min_Price)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              </>
            ) : null}

          </div>
        )}
        </ProjectOverviewManager>
      </div>
    </div>
  )
}

export default RealEstatePriceVsPropertyFeaturesAnalyzerProjectPage