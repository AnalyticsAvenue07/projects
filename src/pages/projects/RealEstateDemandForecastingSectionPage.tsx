import { ChangeEvent, useEffect, useMemo, useState, ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Plot from 'react-plotly.js'
import {
  CloudUpload,
  Download,
  MapPin,
  ShieldCheck,
  Sparkles,
  ChevronLeft,
  TrendingUp,
  Building2,
  Award,
  CheckCircle2,
  FileSpreadsheet,
  Calendar,
  LineChart,
  DollarSign,
  IndianRupee,
} from 'lucide-react'

import {
  loadDefaultDataset,
  uploadCsv,
  applyFilters,
  getChartData,
  getForecast,
  getInsights,
  getCsvColumns,
  applyColumnMapping,
  downloadCsvFile,
} from '@/services/realEstateDemandForecastingApi'

const BLUE = '#064b86'
const DEFAULT_TABLE_COLUMNS = [
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

type Tab = 'overview' | 'attributes' | 'application'
type AppMode = 'default' | 'upload' | 'mapping'
type TrendItem = { Month: string; Demand: number }
type PropertyDemandItem = { Property_Type: string; Count: number }
type ForecastItem = { Month: string; Forecast: number }
type InsightItem = {
  City: string
  Property_Type: string
  Avg_Price: number
  Max_Price: number
  Min_Price: number
  Count?: number
}
type Kpis = {
  total_listings: number
  avg_monthly_sales: number
  top_city: string
  avg_price: number
}

const overviewFeatures = [
  'Time-series demand tracking',
  'Property-type segmentation',
  'Price sensitivity analysis',
  'ML-based forecasting (6-month linear regression)',
  'Automated insights for cities & property types',
]

const impactStatements = [
  'Predict market cycles early',
  'Prevent over/under inventory allocation',
  'Optimize pricing strategy',
  'Support strategic investment & expansion',
]

const overviewKpis = ['Avg Monthly Sales', 'Demand Growth', 'Top Cities', 'Price Sensitivity']

function MetricCard({ icon, label, value, accent }: { icon: ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition hover:shadow-[0_24px_50px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 duration-200">
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
  placeholder,
}: {
  label: string
  values: string[]
  selected: string[]
  onToggle: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-[#0F766E]/30">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#0F766E]">{label}</p>
        <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-xs font-semibold text-[#0F766E]">
          {selected.length} selected
        </span>
      </div>
      <div className="mb-3 min-h-[56px] rounded-2xl border border-slate-100 bg-[#F8FAFC] px-3.5 py-2.5 flex items-center">
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((option) => (
              <span
                key={option}
                className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-1 text-xs font-bold text-[#0F766E]"
              >
                {option}
                <button
                  type="button"
                  onClick={() => onToggle(option)}
                  className="hover:text-red-500 font-bold ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-medium">
            {placeholder || `Filter by ${label.toLowerCase()}...`}
          </div>
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

function downloadTextCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const csvRows = [headers.join(','), ...rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))]
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function RealEstateDemandForecastingSectionPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [appMode, setAppMode] = useState<AppMode>('default')
  const [data, setData] = useState<Record<string, any>[]>([])
  const [filtered, setFiltered] = useState<Record<string, any>[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [minDate, setMinDate] = useState('')
  const [maxDate, setMaxDate] = useState('')

  function safeKpis(raw: any): Kpis {
    if (!raw) return { total_listings: 0, avg_monthly_sales: 0, top_city: 'N/A', avg_price: 0 }
    return {
      total_listings: Number(raw.total_listings ?? raw.total_properties ?? raw.total_rows ?? 0) || 0,
      avg_monthly_sales: Number(raw.avg_monthly_sales ?? raw.monthly_sales ?? 0) || 0,
      top_city: String(raw.top_city ?? raw.city ?? 'N/A') || 'N/A',
      avg_price: Number(raw.avg_price ?? raw.mean_price ?? 0) || 0,
    }
  }

  const [kpis, setKpis] = useState<Kpis>({ total_listings: 0, avg_monthly_sales: 0, top_city: 'N/A', avg_price: 0 })
  const [forecast, setForecast] = useState<ForecastItem[]>([])
  const [insights, setInsights] = useState<InsightItem[]>([])
  const [trend, setTrend] = useState<TrendItem[]>([])
  const [propertyDemand, setPropertyDemand] = useState<PropertyDemandItem[]>([])
  const [loading, setLoading] = useState(false)
  const [forecastError, setForecastError] = useState<string | null>(null)
  const [insightsError, setInsightsError] = useState<string | null>(null)
  const [mappingColumns, setMappingColumns] = useState({ city: '', listing_date: '', property_type: '', price: '' })
  const [availableCsvColumns, setAvailableCsvColumns] = useState<string[]>([])
  const [mappingFile, setMappingFile] = useState<File | null>(null)
  const [mappingError, setMappingError] = useState<string | null>(null)
  const [fileUploadLabel, setFileUploadLabel] = useState('No file chosen')

  const activeData = filtered.length ? filtered : data
  const datasetRows = activeData.length
  const datasetCities = cities.length
  const datasetTypes = types.length
  const forecastMonths = forecast.length || 6
  const previewRows = activeData.slice(0, 6)
  const selectedFiltersLabel = [
    selectedCities.length ? `${selectedCities.length} city${selectedCities.length === 1 ? '' : 'ies'} selected` : null,
    selectedTypes.length ? `${selectedTypes.length} property type${selectedTypes.length === 1 ? '' : 's'} selected` : null,
  ]
    .filter(Boolean)
    .join(' � ') || 'None selected'

  const summaryCards = useMemo(
    () => [
      { label: 'Loaded rows', value: (datasetRows ?? 0).toLocaleString() },
      { label: 'Cities', value: datasetCities.toString() },
      { label: 'Property types', value: datasetTypes.toString() },
      { label: 'Forecast horizon', value: `${forecastMonths} months` },
    ],
    [datasetRows, datasetCities, datasetTypes, forecastMonths]
  )

  useEffect(() => {
    loadDefaultDatasetFromApi()
  }, [])

  async function refreshAnalysis(rawData: Record<string, any>[]) {
    setForecastError(null)
    setInsightsError(null)
    if (!rawData.length) {
      setTrend([])
      setPropertyDemand([])
      setForecast([])
      setInsights([])
      return
    }

    try {
      const chartData = await getChartData(rawData)
      setTrend(chartData.monthly_demand_trend)
      setPropertyDemand(chartData.demand_by_property_type)
    } catch (err) {
      console.error(err)
      setTrend([])
      setPropertyDemand([])
    }

    try {
      const forecastResponse = await getForecast(rawData)
      setForecast(forecastResponse.forecast)
    } catch (err: any) {
      console.error(err)
      setForecast([])
      setForecastError(err?.message || 'Unable to generate forecast')
    }

    try {
      const insightsResponse = await getInsights(rawData)
      setInsights(insightsResponse.insights as InsightItem[])
    } catch (err: any) {
      console.error(err)
      setInsights([])
      setInsightsError(err?.message || 'Unable to generate insights')
    }
  }

  async function hydrateFromData(rawData: Record<string, any>[], rawCities: string[], rawTypes: string[], rawMinDate?: string, rawMaxDate?: string) {
    setData(rawData)
    setFiltered(rawData)
    setCities(rawCities)
    setTypes(rawTypes)
    setMinDate(rawMinDate || '')
    setMaxDate(rawMaxDate || '')
    setDateStart(rawMinDate || '')
    setDateEnd(rawMaxDate || '')
    setSelectedCities([])
    setSelectedTypes([])

    try {
      const filterResponse = await applyFilters({ data: rawData })
      setKpis(safeKpis(filterResponse.kpis))
      await refreshAnalysis(filterResponse.data)
    } catch (err) {
      console.error(err)
    }
  }

  async function loadDefaultDatasetFromApi() {
    setLoading(true)
    try {
      const response = await loadDefaultDataset()
      await hydrateFromData(response.data, response.cities, response.property_types, response.date_min, response.date_max)
      setAppMode('default')
      setFileUploadLabel('No file chosen')
      setMappingFile(null)
      setAvailableCsvColumns([])
      setMappingColumns({ city: '', listing_date: '', property_type: '', price: '' })
      setMappingError(null)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const uploadCSV = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setFileUploadLabel(file.name)
    setLoading(true)
    try {
      const response = await uploadCsv(file)
      await hydrateFromData(response.data, response.cities, response.property_types, response.date_min, response.date_max)
      setAppMode('upload')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleMappingFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setMappingFile(file)
    setMappingError(null)
    setAvailableCsvColumns([])
    setFileUploadLabel(file.name)
    setLoading(true)
    try {
      const response = await getCsvColumns(file)
      setAvailableCsvColumns(response.columns)
      setMappingColumns({ city: '', listing_date: '', property_type: '', price: '' })
    } catch (error: any) {
      setMappingError(error?.message || 'Unable to read CSV columns')
    } finally {
      setLoading(false)
    }
  }

  const applyMapping = async () => {
    if (!mappingFile) {
      setMappingError('Please upload a CSV file before mapping columns.')
      return
    }

    if (!mappingColumns.city || !mappingColumns.listing_date || !mappingColumns.property_type || !mappingColumns.price) {
      setMappingError('Please map all required columns before applying.')
      return
    }

    setLoading(true)
    try {
      const response = await applyColumnMapping(mappingFile, {
        city: mappingColumns.city,
        listing_date: mappingColumns.listing_date,
        property_type: mappingColumns.property_type,
        price: mappingColumns.price,
      })
      await hydrateFromData(response.data, response.cities, response.property_types, response.date_min, response.date_max)
      setAppMode('mapping')
      setMappingError(null)
    } catch (error: any) {
      setMappingError(error?.message || 'Unable to apply mapping')
    } finally {
      setLoading(false)
    }
  }

  const applyFilterSelection = async () => {
    if (!data.length) return
    setLoading(true)
    try {
      const response = await applyFilters({
        data,
        cities: selectedCities,
        property_types: selectedTypes,
        date_start: dateStart || undefined,
        date_end: dateEnd || undefined,
      })
      setFiltered(response.data)
      setKpis(safeKpis(response.kpis))
      await refreshAnalysis(response.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const downloadFilteredDataset = async () => {
    if (!activeData.length) return
    setLoading(true)
    try {
      const blob = await downloadCsvFile({ data: activeData })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'filtered_dataset.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const downloadForecast = () => {
    const rows = forecast.map((item) => [item.Month, item.Forecast])
    downloadTextCsv('forecast.csv', ['Month', 'Forecast'], rows)
  }

  const downloadInsights = () => {
    const rows = insights.map((item) => [item.City, item.Property_Type, item.Avg_Price, item.Max_Price, item.Min_Price, item.Count ?? ''])
    downloadTextCsv('insights.csv', ['City', 'Property Type', 'Avg Price', 'Max Price', 'Min Price', 'Count'], rows)
  }

  const downloadSampleCsv = () => {
    const rows = [
      ['City', 'Listing_Date', 'Property_Type', 'Price'],
      ['Mumbai', '2024-01-01', 'Apartment', '12000000'],
      ['Delhi', '2024-02-15', 'Villa', '25000000'],
    ]
    downloadTextCsv('sample_real_estate.csv', rows[0], rows.slice(1))
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F8FBFF_100%)] p-6">
      <div className="mx-auto max-w-7xl">
        
        {/* ── Standalone Back Button ── */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#475569] shadow-sm transition hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:text-[#0F172A] hover:shadow-md active:translate-y-0"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {/* ── Premium Hero Banner ── */}
        <div className="mb-8 rounded-[32px] bg-[linear-gradient(135deg,#F0FDFA_0%,#FFFFFF_40%,#EFF6FF_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#0F766E]">
              <span>Real Estate</span>
              <span className="text-slate-300">•</span>
              <span>Real Estate Demand Forecasting Lab</span>
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">Real Estate Demand Forecasting Lab</h1>
            <p className="mt-4 max-w-2xl text-[16px] leading-7 text-[#334155]">
              Load listing data, refine city and property type filters, and generate demand forecasts with a real estate analytics backend.
            </p>
          </div>

          <div className="rounded-3xl border border-[#CCFBF1] bg-[#ECFDF5] px-6 py-5 text-[#0F766E] shadow-sm shrink-0 min-w-[220px]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0F766E]">Status</p>
            <p className="mt-2 text-2xl font-black text-[#115E59] tracking-tight">{loading ? 'Refreshing...' : 'Ready'}</p>
            <p className="mt-1 text-xs text-[#0F766E]/80 font-semibold">{selectedFiltersLabel}</p>
          </div>
        </div>

        {/* ── Custom Pill Tabs Container ── */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] mb-6">
          <div className="inline-flex overflow-hidden rounded-3xl border border-[#CBD5E1] bg-[#F8FAFC] p-1 shadow-sm">
            {(['overview', 'attributes', 'application'] as Tab[]).map((currentTab) => (
              <button
                key={currentTab}
                type="button"
                onClick={() => setTab(currentTab)}
                className={`rounded-3xl px-5 py-3 text-sm font-semibold transition ${
                  tab === currentTab
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                {currentTab === 'overview' ? 'Overview' : currentTab === 'attributes' ? 'Important Attributes' : 'Application'}
              </button>
            ))}
          </div>
        </div>

        {/* ── KPI Summary Cards Grid ── */}
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          <MetricCard
            icon={<FileSpreadsheet className="h-6 w-6 text-[#0F766E]" />}
            label="Loaded rows"
            value={(datasetRows ?? 0).toLocaleString()}
            accent="bg-[#ECFDF5]"
          />
          <MetricCard
            icon={<MapPin className="h-6 w-6 text-[#1D4ED8]" />}
            label="Cities"
            value={datasetCities.toString()}
            accent="bg-[#EFF6FF]"
          />
          <MetricCard
            icon={<Building2 className="h-6 w-6 text-[#8B5CF6]" />}
            label="Property types"
            value={datasetTypes.toString()}
            accent="bg-[#F5F3FF]"
          />
          <MetricCard
            icon={<Calendar className="h-6 w-6 text-[#D97706]" />}
            label="Forecast horizon"
            value={`${forecastMonths} months`}
            accent="bg-[#FFFBEB]"
          />
        </div>
      </div>

      {tab === 'overview' && (
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <section className="rounded-[32px] border border-[#CCFBF1] bg-[#F0FDFA]/50 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2 mb-6">
              <div className="rounded-xl bg-[#CCFBF1] p-2 text-[#0F766E]">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-black text-[#0F172A]">Overview</h2>
            </div>
            <p className="text-base text-[#475569] leading-relaxed mb-6">
              A complete forecasting engine for real estate demand analysis. Tracks market cycles, price trends, inventory behavior, and predicts demand for the upcoming months.
            </p>
            <div className="space-y-4">
              {overviewFeatures.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 bg-white hover:bg-slate-50/50 rounded-2xl p-4 border border-[#CCFBF1]/30 transition shadow-sm duration-200"
                >
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]" />
                  <span className="text-sm font-semibold text-slate-700 leading-6">{item}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-[#DBEAFE] bg-[#EFF6FF]/50 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-2 mb-6">
                <div className="rounded-xl bg-[#DBEAFE] p-2 text-[#1E40AF]">
                  <Building2 className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-black text-[#0F172A]">Business Impact</h2>
              </div>
              <div className="space-y-4">
                {impactStatements.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 bg-white hover:bg-slate-50/50 rounded-2xl p-4 border border-[#DBEAFE]/30 transition shadow-sm duration-200"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1E40AF]" />
                    <span className="text-sm font-semibold text-slate-700 leading-6">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-[#FEF3C7] bg-[#FFFBEB]/50 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-2 mb-6">
                <div className="rounded-xl bg-[#FEF3C7] p-2 text-[#D97706]">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-black text-[#0F172A]">High-Level KPIs</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {overviewKpis.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 bg-white hover:bg-slate-50/50 rounded-2xl p-4 border border-[#FEF3C7]/30 transition shadow-sm duration-200"
                  >
                    <Award className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
                    <span className="text-sm font-semibold text-slate-700 leading-6">{item}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {tab === 'attributes' && (
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <h2 className="text-3xl font-black text-[#0F172A]">Required Column Dictionary</h2>
            <p className="mt-3 max-w-3xl text-slate-600">The backend validates this schema before analytics and predictions run.</p>
            
            <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-[#334155]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="font-bold text-slate-600 uppercase text-[12px] tracking-[0.08em] py-3.5 px-4">Column</th>
                      <th className="font-bold text-slate-600 uppercase text-[12px] tracking-[0.08em] py-3.5 px-4">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      ['City', 'City of the property listing.'],
                      ['Listing_Date', 'Date when property was listed.'],
                      ['Property_Type', 'Type of property (Villa, Plot, Apartment, etc).'],
                      ['Price', 'Listed property price.'],
                    ].map(([column, description], idx) => (
                      <tr key={column} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                        <td className="px-4 py-3.5 font-semibold text-[#0F172A] text-sm">
                          <span className="inline-block rounded-lg bg-slate-100 text-slate-800 px-2.5 py-1 text-xs font-bold border border-slate-200">
                            {column}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 text-sm font-medium">{description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-blue-100 bg-[#EFF6FF] p-6 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#1D4ED8]">Independent Variables</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">Input attributes used for analytics, filters, and forecasting models.</p>
              <div className="flex flex-wrap gap-2">
                {['City', 'Listing_Date', 'Property_Type', 'Price'].map((field) => (
                  <Chip key={field} className="border-blue-200 bg-white text-[#1D4ED8] hover:bg-blue-50 transition shadow-sm font-bold">
                    {field}
                  </Chip>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-emerald-100 bg-[#ECFDF5] p-6 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0F766E]">Dependent Variables</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">Target variables and predictions calculated by the analytical engine.</p>
              <div className="flex flex-wrap gap-2">
                {['Demand', 'Trend', 'Forecast'].map((field) => (
                  <Chip key={field} className="border-emerald-200 bg-white text-[#0F766E] hover:bg-[#ECFDF5] transition shadow-sm font-bold">
                    {field}
                  </Chip>
                ))}
              </div>
            </section>
        </div>
      </div>
    )}

      {tab === 'application' && (
        <div className="space-y-6">
          {/* Step 1: Load Dataset Options */}
          <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 1 • Load Dataset</p>
              <h2 className="text-2xl font-black text-[#0F172A] mt-2">Dataset options</h2>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {([
                { value: 'default', label: 'Default dataset' },
                { value: 'upload', label: 'Upload CSV' },
                { value: 'mapping', label: 'Upload CSV + Column mapping' },
              ] as Array<{ value: AppMode; label: string }>).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAppMode(option.value)}
                  className={`rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 ${
                    appMode === option.value
                      ? 'border-[#0F766E] bg-[#ECFDF5]/50 shadow-sm font-bold border-2'
                      : 'border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-sm font-semibold text-[#0F172A]">{option.label}</div>
                </button>
              ))}
            </div>
          </section>

          {appMode === 'default' && (
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <h2 className="text-2xl font-black text-[#0F172A] mb-4">Default dataset</h2>
              <p className="text-sm text-[#475569] mb-6 leading-relaxed">
                Load the standard dataset from the backend and visualize results in the application panels below.
              </p>
              <button
                type="button"
                onClick={loadDefaultDatasetFromApi}
                className="rounded-full bg-[#0F766E] px-6 py-3 font-bold text-white hover:bg-[#0D5F58] shadow-md hover:-translate-y-0.5 transition active:translate-y-0 disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Load default dataset
              </button>
            </section>
          )}

          {appMode === 'upload' && (
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <h2 className="text-2xl font-black text-[#0F172A] mb-4">Upload CSV</h2>
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="rounded-full px-6 py-3 font-bold border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 shadow-sm hover:-translate-y-0.5 transition active:translate-y-0 inline-flex items-center gap-2 mb-6"
              >
                <Download className="w-4 h-4" />
                Download sample CSV
              </button>
              <div className="mt-2 rounded-3xl border-dashed border-2 border-slate-300 bg-slate-50/50 p-8 hover:bg-slate-50 transition duration-200">
                <label className="block cursor-pointer">
                  <div className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white px-5 py-4 text-sm text-[#475569]">
                    <span>{fileUploadLabel}</span>
                    <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#0F766E]">CSV</span>
                  </div>
                  <input type="file" accept=".csv" className="hidden" onChange={uploadCSV} />
                </label>
                <p className="mt-4 text-xs text-[#94A3B8] font-semibold text-center">Drag and drop file here • Limit 200MB per file • CSV</p>
              </div>
            </section>
          )}

          {appMode === 'mapping' && (
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <h2 className="text-2xl font-black text-[#0F172A] mb-4">Upload CSV + Column mapping</h2>
              <div className="rounded-3xl border-dashed border-2 border-slate-300 bg-slate-50/50 p-8 hover:bg-slate-50 transition duration-200">
                <label className="block cursor-pointer">
                  <div className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white px-5 py-4 text-sm text-[#475569]">
                    <span>{mappingFile ? mappingFile.name : 'No file chosen'}</span>
                    <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#0F766E]">CSV</span>
                  </div>
                  <input type="file" accept=".csv" className="hidden" onChange={handleMappingFile} />
                </label>
                <p className="mt-4 text-xs text-[#94A3B8] font-semibold text-center">Drag and drop file here • Limit 200MB per file • CSV</p>
              </div>
              {availableCsvColumns.length > 0 && (
                <div className="mt-6 space-y-4">
                  {[
                    { label: 'City', key: 'city' },
                    { label: 'Listing_Date', key: 'listing_date' },
                    { label: 'Property_Type', key: 'property_type' },
                    { label: 'Price', key: 'price' },
                  ].map((item) => (
                    <div key={item.key} className="space-y-2">
                      <label className="text-sm font-bold text-[#0F172A]">Map: {item.label}</label>
                      <select
                        value={mappingColumns[item.key as keyof typeof mappingColumns]}
                        onChange={(event) =>
                          setMappingColumns((current) => ({
                            ...current,
                            [item.key]: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm text-slate-800 outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#D8F5E7] transition"
                      >
                        <option value="">-- Select --</option>
                        {availableCsvColumns.map((column) => (
                          <option key={column} value={column}>{column}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {mappingError && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{mappingError}</div>}
                  <button
                    type="button"
                    onClick={applyMapping}
                    className="rounded-full bg-[#0F766E] px-6 py-3 font-bold text-white hover:bg-[#0D5F58] shadow-md hover:-translate-y-0.5 transition active:translate-y-0 disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    Apply mapping
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Step 2: Filters */}
          <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 2 • Filters</p>
                <h2 className="text-2xl font-black text-[#0F172A] mt-2">Filters</h2>
              </div>
              <button
                type="button"
                onClick={downloadFilteredDataset}
                className="rounded-full px-6 py-3 font-bold border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 shadow-sm hover:-translate-y-0.5 transition active:translate-y-0 inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download filtered dataset
              </button>
            </div>
            
            <div className="grid gap-6 lg:grid-cols-3">
              <SelectableFilter
                label="City"
                values={cities}
                selected={selectedCities}
                onToggle={(city) =>
                  setSelectedCities((current) =>
                    current.includes(city) ? current.filter((value) => value !== city) : [...current, city]
                  )
                }
                placeholder="Choose one or more cities"
              />

              <SelectableFilter
                label="Property Type"
                values={types}
                selected={selectedTypes}
                onToggle={(type) =>
                  setSelectedTypes((current) =>
                    current.includes(type) ? current.filter((value) => value !== type) : [...current, type]
                  )
                }
                placeholder="Choose one or more property types"
              />

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-[#0F766E]/30">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                  <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#0F766E]">Date Range</p>
                  <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-xs font-semibold text-[#0F766E]">Active</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Start Date</label>
                    <input
                      type="date"
                      value={dateStart}
                      min={minDate}
                      max={maxDate}
                      onChange={(e) => setDateStart(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#D8F5E7] transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">End Date</label>
                    <input
                      type="date"
                      value={dateEnd}
                      min={minDate}
                      max={maxDate}
                      onChange={(e) => setDateEnd(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#D8F5E7] transition"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                type="button"
                onClick={applyFilterSelection}
                className="rounded-full bg-[#0F766E] px-6 py-3 font-bold text-white hover:bg-[#0D5F58] shadow-md hover:-translate-y-0.5 transition active:translate-y-0 disabled:opacity-50 inline-flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Apply filters
              </button>
            </div>
          </section>

          <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Data preview</p>
                <h2 className="text-2xl font-black text-[#0F172A] mt-2">Loaded rows</h2>
              </div>
              <span className="rounded-full bg-[#EFF6FF] px-4 py-2 text-sm font-semibold text-[#1D4ED8] self-start sm:self-center">
                {(datasetRows ?? 0).toLocaleString()} rows
              </span>
            </div>
            
            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-[#334155]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {DEFAULT_TABLE_COLUMNS.map((column) => (
                        <th key={column} className="font-bold text-slate-600 uppercase text-[12px] tracking-[0.08em] py-3.5 px-4">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.length ? (
                      previewRows.map((row, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                          {DEFAULT_TABLE_COLUMNS.map((column) => (
                            <td key={column} className="px-4 py-3.5 text-slate-600 text-sm font-medium whitespace-nowrap">
                              {row[column] ?? '-'}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-3.5 text-slate-500 text-sm font-medium" colSpan={DEFAULT_TABLE_COLUMNS.length}>
                          No rows available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Metrics</p>
                  <h2 className="text-2xl font-black text-[#0F172A] mt-2">Filtered dataset KPIs</h2>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'Total Listings', value: `${(kpis?.total_listings ?? 0).toLocaleString()}`, color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <FileSpreadsheet className="h-4 w-4" /> },
                  { label: 'Avg Monthly Sales', value: `${kpis?.avg_monthly_sales ?? 0}`, color: 'bg-blue-50 text-blue-700 border-blue-100', icon: <LineChart className="h-4 w-4" /> },
                  { label: 'Top City', value: kpis?.top_city || 'N/A', color: 'bg-purple-50 text-purple-700 border-purple-100', icon: <MapPin className="h-4 w-4" /> },
                  { label: 'Avg Price', value: `₹ ${(kpis?.avg_price ?? 0).toLocaleString()}`, color: 'bg-amber-50 text-amber-700 border-amber-100', icon: <IndianRupee className="h-4 w-4 font-black" /> },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-100 bg-[#F8FAFC]/50 p-5 transition hover:shadow-sm duration-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-xl ${item.color.split(' ')[0]} ${item.color.split(' ')[1]}`}>
                        {item.icon}
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{item.label}</span>
                    </div>
                    <div className="text-2xl font-black text-[#0F172A] tracking-tight">{item.value}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Forecast summary</p>
                  <h2 className="text-2xl font-black text-[#0F172A] mt-2">Forecast horizon</h2>
                </div>
                <span className="rounded-full bg-[#ECFDF5] px-4 py-2 text-sm font-bold text-[#166534]">{forecastMonths} months</span>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3 bg-[#F8FAFC]/50 hover:bg-slate-50 rounded-2xl p-4 border border-slate-100 transition shadow-sm">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]" />
                  <span className="text-sm font-semibold text-slate-700 leading-6">Forecasts are recalculated dynamically from the current filtered dataset.</span>
                </div>
                <div className="flex items-start gap-3 bg-[#F8FAFC]/50 hover:bg-slate-50 rounded-2xl p-4 border border-slate-100 transition shadow-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]" />
                  <span className="text-sm font-semibold text-slate-700 leading-6">Filter by city, property type, and date range to update the demand prediction.</span>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Analytics</p>
                <h2 className="text-2xl font-black text-[#0F172A] mt-2">Monthly Demand Trend</h2>
                <p className="text-sm text-[#475569]">Trend of listing demand over time.</p>
              </div>
            </div>
            <div className="mt-5">
              {forecastError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {forecastError}
                </div>
              ) : trend.length ? (
                <div className="overflow-hidden rounded-3xl border border-slate-100 p-4 bg-[#F8FAFC]/50">
                  <Plot
                    data={[
                      {
                        x: trend.map((t) => t.Month),
                        y: trend.map((t) => t.Demand),
                        type: 'scatter',
                        mode: 'lines+markers',
                        marker: { color: BLUE },
                      },
                    ]}
                    layout={{ autosize: true, height: 420, paper_bgcolor: 'white', plot_bgcolor: 'white' }}
                    style={{ width: '100%' }}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  Monthly demand trend is unavailable for the current dataset. Adjust filters or load a larger dataset.
                </div>
              )}
            </div>
          </section>

          <div className="grid gap-6">
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Analytics</p>
                  <h2 className="text-2xl font-black text-[#0F172A] mt-2">Demand by Property Type</h2>
                  <p className="text-sm text-[#475569]">Demand share by property category.</p>
                </div>
              </div>
              <div className="mt-5 overflow-hidden rounded-3xl border border-slate-100 p-4 bg-[#F8FAFC]/50">
                <Plot
                  data={[
                    {
                      x: propertyDemand.map((p) => p.Property_Type),
                      y: propertyDemand.map((p) => p.Count),
                      type: 'bar',
                      marker: { color: BLUE },
                    },
                  ]}
                  layout={{ autosize: true, height: 360, paper_bgcolor: 'white', plot_bgcolor: 'white' }}
                  style={{ width: '100%' }}
                />
              </div>
            </section>

            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)] overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Insights</p>
                  <h2 className="text-2xl font-black text-[#0F172A] mt-2">Automated insights</h2>
                  <p className="text-sm text-[#475569]">Property-level pricing summary by market segment.</p>
                </div>
                <button
                  type="button"
                  onClick={downloadInsights}
                  className="rounded-full bg-[#0F766E] px-6 py-3 font-bold text-white hover:bg-[#0D5F58] shadow-md hover:-translate-y-0.5 transition active:translate-y-0 disabled:opacity-50 inline-flex items-center gap-2 self-start sm:self-center"
                >
                  <Download className="w-4 h-4" />
                  Download insights
                </button>
              </div>
              
              <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  {insightsError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 m-4">
                      {insightsError}
                    </div>
                  ) : insights.length ? (
                    <table className="min-w-full text-left text-sm text-[#334155]">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="font-bold text-slate-600 uppercase text-[12px] tracking-[0.08em] py-3.5 px-4">City</th>
                          <th className="font-bold text-slate-600 uppercase text-[12px] tracking-[0.08em] py-3.5 px-4">Property Type</th>
                          <th className="font-bold text-slate-600 uppercase text-[12px] tracking-[0.08em] py-3.5 px-4">Avg Price</th>
                          <th className="font-bold text-slate-600 uppercase text-[12px] tracking-[0.08em] py-3.5 px-4">Max Price</th>
                          <th className="font-bold text-slate-600 uppercase text-[12px] tracking-[0.08em] py-3.5 px-4">Min Price</th>
                          <th className="font-bold text-slate-600 uppercase text-[12px] tracking-[0.08em] py-3.5 px-4">Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {insights.map((item, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                            <td className="px-4 py-3.5 text-slate-700 text-sm font-semibold">{item.City}</td>
                            <td className="px-4 py-3.5 text-slate-600 text-sm font-medium">{item.Property_Type}</td>
                            <td className="px-4 py-3.5 text-slate-600 text-sm font-medium">₹ {Math.round(Number(item?.Avg_Price) || 0).toLocaleString()}</td>
                            <td className="px-4 py-3.5 text-slate-600 text-sm font-medium">₹ {Math.round(Number(item?.Max_Price) || 0).toLocaleString()}</td>
                            <td className="px-4 py-3.5 text-slate-600 text-sm font-medium">₹ {Math.round(Number(item?.Min_Price) || 0).toLocaleString()}</td>
                            <td className="px-4 py-3.5 text-slate-600 text-sm font-medium">{item.Count ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 m-4">
                      Automated insights are unavailable for the current dataset. Select a dataset or adjust filters.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Forecasting</p>
                <h2 className="text-2xl font-black text-[#0F172A] mt-2">6-Month Demand Forecast</h2>
                <p className="text-sm text-[#475569]">Forecasted demand for the next six months.</p>
              </div>
              <button
                type="button"
                onClick={downloadForecast}
                className="rounded-full bg-[#0F766E] px-6 py-3 font-bold text-white hover:bg-[#0D5F58] shadow-md hover:-translate-y-0.5 transition active:translate-y-0 disabled:opacity-50 inline-flex items-center gap-2 self-start sm:self-center"
              >
                <Download className="w-4 h-4" />
                Download forecast
              </button>
            </div>
            
            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                {forecastError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 m-4">
                    {forecastError}
                  </div>
                ) : forecast.length ? (
                  <table className="min-w-full text-left text-sm text-[#334155]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="font-bold text-slate-600 uppercase text-[12px] tracking-[0.08em] py-3.5 px-4">Month</th>
                        <th className="font-bold text-slate-600 uppercase text-[12px] tracking-[0.08em] py-3.5 px-4">Forecast</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {forecast.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                          <td className="px-4 py-3.5 text-slate-700 text-sm font-semibold">{item.Month}</td>
                          <td className="px-4 py-3.5 text-slate-600 text-sm font-semibold">{item.Forecast}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 m-4">
                    6-month forecast is unavailable for the current dataset. Adjust filters or load a larger dataset.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
