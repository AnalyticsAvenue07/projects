import { useEffect, useMemo, useState, ReactNode, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowRight,
  CloudUpload,
  Download,
  Sparkles,
  ShieldCheck,
  Loader2,
  MapPin,
  BarChart3,
  ChevronLeft,
  TrendingUp,
  Building2,
  Award,
  CheckCircle2,
  DollarSign,
  IndianRupee,
  FileSpreadsheet,
  Calendar,
  LineChart,
} from 'lucide-react'
import {
  loadDefaultDataset,
  uploadCsv,
  getCsvColumns,
  applyColumnMapping,
  filterData,
  getChartData,
  runMlPrediction,
  getInsights,
  generateAiNarrative,
  downloadFilteredCsv,
  type RealEstateDatasetResponse,
  type FilterResponse,
  type ChartDataResponse,
  type GetColumnsResponse,
  type MlPredictResponse,
  type InsightsResponse,
  type AiNarrativeResponse,
} from '@/services/realEstateIntelligenceSuiteApi'
import { ChartContainer } from '@/app/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
  Legend,
} from 'recharts'
import { Slider } from '@/app/components/ui/slider'

function MetricCard({ icon, label, value, accent }: { icon: ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition hover:shadow-[0_24px_50px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 duration-200">
      <div className="flex items-center gap-4">
        <div className={`rounded-2xl p-4 shrink-0 ${accent}`}>{icon}</div>
        <div>
          <p className="text-sm font-bold text-slate-500 tracking-tight">{label}</p>
          <p className="mt-1 text-2xl font-black text-[#0F172A] tracking-tight">{value}</p>
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

type Tab = 'overview' | 'attributes' | 'application'

type Kpis = {
  total_properties: number
  median_price: number
  avg_price_per_sqft: number
  avg_area: number
}

const overviewFeatures = [
  'Load default dataset or upload your own real estate CSV with automatic column mapping.',
  'Filter by city, property type, and area range to narrow down the most relevant listings.',
  'Calculate key real estate KPIs including median price, average price per sqft, and total property count.',
  'Run ML-powered price prediction and compare actual vs predicted values for a quick estimate.',
  'Generate automated insights and AI market narrative based on filtered property data.',
  'Download filtered CSV results for offline analysis or next-stage reporting.',
]

const impactStatements = [
  'Make faster investment decisions using data-driven pricing and valuation signals.',
  'Reduce manual dataset preparation with automatic CSV mapping and preview validation.',
  'Surface property market trends and high-value neighborhoods instantly.',
  'Use AI-powered predictions to identify pricing outliers and valuation opportunities.',
  'Export clean, filtered datasets for collaboration with finance or operations teams.',
]

export function RealEstateIntelligenceSuiteSectionPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [dataset, setDataset] = useState<RealEstateDatasetResponse | null>(null)
  const [filtered, setFiltered] = useState<FilterResponse | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([])
  const [areaMin, setAreaMin] = useState<number | ''>('')
  const [areaMax, setAreaMax] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [actionText, setActionText] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [prediction, setPrediction] = useState<MlPredictResponse | null>(null)
  const [insights, setInsights] = useState<InsightsResponse | null>(null)
  const [narrative, setNarrative] = useState<AiNarrativeResponse | null>(null)
  const [loadMode, setLoadMode] = useState<'default' | 'upload' | 'upload-mapping'>('default')
  const [chartData, setChartData] = useState<ChartDataResponse | null>(null)
  const [csvColumns, setCsvColumns] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    City: '',
    Property_Type: '',
    Area_sqft: '',
    Price: '',
  })

  const activeData = filtered?.data ?? dataset?.data ?? []
  const previewRows = filtered?.preview ?? dataset?.preview ?? []
  const availableCities = dataset?.cities ?? []
  const availablePropertyTypes = dataset?.property_types ?? []
  const areaRange = useMemo(() => {
    return {
      min: dataset?.area_min ?? 0,
      max: dataset?.area_max ?? 0,
    }
  }, [dataset])

  const selectedAreaMin = typeof areaMin === 'number' ? areaMin : areaRange.min
  const selectedAreaMax = typeof areaMax === 'number' ? areaMax : areaRange.max

  async function loadCsvColumns(file: File) {
    setCsvColumns([])
    setColumnMapping({ City: '', Property_Type: '', Area_sqft: '', Price: '' })
    setLoading(true)
    setActionText('Reading CSV columns...')
    setErrorMessage(null)

    try {
      const response = (await getCsvColumns(file)) as GetColumnsResponse
      setCsvColumns(response.columns)
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to read CSV columns.')
    } finally {
      setLoading(false)
      setActionText('')
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    if (!file) return

    setSelectedFile(file)
    setKpis(null)
    setPrediction(null)
    setInsights(null)
    setNarrative(null)
    setErrorMessage(null)

    if (loadMode === 'upload-mapping') {
      await loadCsvColumns(file)
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      setErrorMessage('Please select a CSV file to upload.')
      return
    }

    setLoading(true)
    setActionText('Uploading and validating CSV...')
    setErrorMessage(null)

    try {
      const response = await uploadCsv(selectedFile)
      setDataset(response)
      setFiltered(null)
      setSelectedCities([])
      setSelectedPropertyTypes([])
      setAreaMin(response.area_min)
      setAreaMax(response.area_max)
      setKpis(null)
      setPrediction(null)
      setInsights(null)
      setNarrative(null)
      setSelectedFile(null)
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to upload CSV.')
    } finally {
      setLoading(false)
      setActionText('')
    }
  }

  async function handleApplyMapping() {
    if (!selectedFile) {
      setErrorMessage('Please select a CSV file to map.')
      return
    }

    const missing = Object.entries(columnMapping).filter(([, value]) => !value)
    if (missing.length) {
      setErrorMessage('Please map all required columns before uploading.')
      return
    }

    setLoading(true)
    setActionText('Applying column mapping...')
    setErrorMessage(null)

    try {
      const response = await applyColumnMapping(selectedFile, {
        city: columnMapping.City,
        property_type: columnMapping.Property_Type,
        area_sqft: columnMapping.Area_sqft,
        price: columnMapping.Price,
      })

      setDataset(response)
      setFiltered(null)
      setSelectedCities([])
      setSelectedPropertyTypes([])
      setAreaMin(response.area_min)
      setAreaMax(response.area_max)
      setKpis(null)
      setPrediction(null)
      setInsights(null)
      setNarrative(null)
      setSelectedFile(null)
      setCsvColumns([])
      setColumnMapping({ City: '', Property_Type: '', Area_sqft: '', Price: '' })
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to apply column mapping.')
    } finally {
      setLoading(false)
      setActionText('')
    }
  }

  async function handleApplyFilters() {
    if (!dataset?.data) {
      setErrorMessage('Load a dataset first before filtering.')
      return
    }

    setLoading(true)
    setActionText('Applying filters...')
    setErrorMessage(null)

    try {
      const response = await filterData({
        data: dataset.data,
        cities: selectedCities.length ? selectedCities : undefined,
        property_types: selectedPropertyTypes.length ? selectedPropertyTypes : undefined,
        area_min: typeof areaMin === 'number' ? areaMin : undefined,
        area_max: typeof areaMax === 'number' ? areaMax : undefined,
      })
      setFiltered(response)
      setKpis(response.kpis as Kpis)
      setPrediction(null)
      setInsights(null)
      setNarrative(null)
    } catch (error: any) {
      setErrorMessage(error?.message || 'Filter failed.')
    } finally {
      setLoading(false)
      setActionText('')
    }
  }

  async function handleRunPrediction() {
    if (!activeData.length) {
      setErrorMessage('Apply filters or load a dataset first.')
      return
    }

    setLoading(true)
    setActionText('Running ML prediction...')
    setErrorMessage(null)

    try {
      const response = await runMlPrediction(activeData)
      setPrediction(response)
    } catch (error: any) {
      setErrorMessage(error?.message || 'Prediction failed.')
    } finally {
      setLoading(false)
      setActionText('')
    }
  }

  async function handleRunInsights() {
    if (!activeData.length) {
      setErrorMessage('Apply filters or load a dataset first.')
      return
    }

    setLoading(true)
    setActionText('Generating insights...')
    setErrorMessage(null)

    try {
      const response = await getInsights(activeData)
      setInsights(response)
    } catch (error: any) {
      setErrorMessage(error?.message || 'Insights generation failed.')
    } finally {
      setLoading(false)
      setActionText('')
    }
  }

  async function handleGenerateNarrative() {
    if (!activeData.length || !kpis || !insights) {
      setErrorMessage('Run filters, insights, and KPIs before generating narrative.')
      return
    }

    setLoading(true)
    setActionText('Generating AI narrative...')
    setErrorMessage(null)

    try {
      const response = await generateAiNarrative(activeData, kpis, insights.insights)
      setNarrative(response)
    } catch (error: any) {
      setErrorMessage(error?.message || 'Narrative generation failed.')
    } finally {
      setLoading(false)
      setActionText('')
    }
  }

  async function handleDownload() {
    if (!activeData.length) {
      setErrorMessage('Load and filter data before downloading.')
      return
    }

    setLoading(true)
    setActionText('Preparing CSV download...')
    setErrorMessage(null)

    try {
      await downloadFilteredCsv(activeData)
    } catch (error: any) {
      setErrorMessage(error?.message || 'Download failed.')
    } finally {
      setLoading(false)
      setActionText('')
    }
  }

  useEffect(() => {
    async function fetchCharts() {
      const sourceData = filtered?.data ?? dataset?.data
      if (!sourceData?.length) {
        setChartData(null)
        return
      }

      try {
        const response = await getChartData(sourceData)
        setChartData(response)
      } catch (error: any) {
        console.warn('Chart data failed', error)
        setChartData(null)
      }
    }

    void fetchCharts()
  }, [dataset, filtered])

  function toggleCity(city: string) {
    setSelectedCities((current) =>
      current.includes(city) ? current.filter((item) => item !== city) : [...current, city],
    )
  }

  function togglePropertyType(type: string) {
    setSelectedPropertyTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    )
  }

  const datasetKpis = useMemo(() => {
    if (!dataset?.data?.length) return null

    const areaValues = dataset.data.map((row) => Number(row.Area_sqft) || 0)
    const priceValues = dataset.data.map((row) => Number(row.Price) || 0)
    const total = priceValues.length
    if (!total) return null

    const medianPrice = [...priceValues].sort((a, b) => a - b)[Math.floor(total / 2)] ?? 0
    const avgPricePerSqft = dataset.data.reduce((sum, row) => sum + (Number(row.Price_per_sqft) || 0), 0) / total
    const avgArea = areaValues.reduce((sum, value) => sum + value, 0) / total

    return {
      total_properties: total,
      median_price: Number(medianPrice),
      avg_price_per_sqft: Number(avgPricePerSqft),
      avg_area: Number(avgArea),
    }
  }, [dataset])

  const summaryKpis = filtered?.kpis ?? datasetKpis

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
              <span>Real Estate Intelligence Suite</span>
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">Real Estate Intelligence Suite</h1>
            <p className="mt-4 max-w-2xl text-[16px] leading-7 text-[#334155]">
              Analyze and predict property values, compare city-level trends, and generate real estate market narratives using the backend analytics API.
            </p>
          </div>

          <div className="rounded-3xl border border-[#CCFBF1] bg-[#ECFDF5] px-6 py-5 text-[#0F766E] shadow-sm shrink-0 min-w-[220px]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0F766E]">Status</p>
            <p className="mt-2 text-2xl font-black text-[#115E59] tracking-tight">{loading ? 'Refreshing...' : 'Ready'}</p>
            <p className="mt-1 text-xs text-[#0F766E]/80 font-semibold">{dataset?.total_rows ? `${dataset.total_rows} rows loaded` : 'No dataset'}</p>
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
              The Real Estate Intelligence Suite is built on a FastAPI backend with pandas and scikit-learn. It loads real estate datasets, applies filters, computes KPIs, runs price prediction models, and creates insight summaries for smarter property decisions.
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

          <section className="rounded-[32px] border border-[#DBEAFE] bg-[#EFF6FF]/50 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2 mb-6">
              <div className="rounded-xl bg-[#DBEAFE] p-2 text-[#1E40AF]">
                <Building2 className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-black text-[#0F172A]">Business impact</h2>
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
                      <th className="font-bold text-slate-600 uppercase text-[12px] tracking-[0.08em] py-3.5 px-4">Attribute</th>
                      <th className="font-bold text-slate-600 uppercase text-[12px] tracking-[0.08em] py-3.5 px-4">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      ['City', 'City where the property is located.'],
                      ['Property_Type', 'Type of property (Apartment, Villa, Plot, etc.).'],
                      ['Area_sqft', 'Built-up area in square feet.'],
                      ['Price', 'Listing or sale price (INR).'],
                    ].map(([attribute, description], idx) => (
                      <tr key={attribute} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                        <td className="px-4 py-3.5 font-semibold text-[#0F172A] text-sm">
                          <span className="inline-block rounded-lg bg-slate-100 text-slate-800 px-2.5 py-1 text-xs font-bold border border-slate-200">
                            {attribute}
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
              <p className="text-xs text-slate-500 mt-1 mb-4">Input attributes used for analytics, filters, and predictions.</p>
              <div className="flex flex-wrap gap-2">
                {['City', 'Property_Type', 'Area_sqft'].map((field) => (
                  <Chip key={field} className="border-blue-200 bg-white text-[#1D4ED8] hover:bg-blue-50 transition shadow-sm font-bold">
                    {field}
                  </Chip>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-emerald-100 bg-[#ECFDF5] p-6 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0F766E]">Dependent Variables</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">Target values predicted or calculated by the system.</p>
              <div className="flex flex-wrap gap-2">
                {['Price', 'Price_per_sqft'].map((field) => (
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
              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 1 • Load Dataset</p>
                    <h2 className="text-2xl font-black text-[#0F172A] mt-2">Dataset options</h2>
                  </div>
                  <span className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider ${dataset?.total_rows ? 'bg-[#ECFDF5] text-[#166534]' : 'bg-[#EFF6FF] text-[#1D4ED8]'}`}>
                    {dataset?.total_rows ? `${dataset.total_rows} rows loaded` : 'No dataset loaded'}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {(['default', 'upload', 'upload-mapping'] as const).map((mode) => {
                    const label = mode === 'default' ? 'Default dataset' : mode === 'upload' ? 'Upload CSV' : 'Upload CSV + Column mapping'
                    const isActive = loadMode === mode
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setLoadMode(mode)
                          setSelectedFile(null)
                          setCsvColumns([])
                          setColumnMapping({ City: '', Property_Type: '', Area_sqft: '', Price: '' })
                          setErrorMessage(null)
                        }}
                        className={`rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 ${
                          isActive
                            ? 'border-[#0F766E] bg-[#ECFDF5]/30 text-[#0F766E] shadow-sm font-bold'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <p className={`text-xs uppercase tracking-wider font-bold ${isActive ? 'text-[#0F766E]' : 'text-slate-400'}`}>Mode</p>
                        <p className="text-sm font-black mt-1">{label}</p>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-6 space-y-4">
                  {loadMode === 'default' ? (
                    <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC]/50 p-5">
                      <p className="text-sm font-medium text-slate-500">
                        Use the built-in sample dataset to explore property trends and model outputs without uploading a file.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC]/50 p-5 space-y-4">
                      <label className="flex cursor-pointer flex-col gap-4 rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-6 text-slate-600 transition hover:border-[#0F766E] hover:shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ECFDF5] shrink-0 text-[#0F766E]">
                            <CloudUpload className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-base font-bold text-[#0F172A]">{selectedFile ? selectedFile.name : 'Upload your CSV file'}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-400">
                              {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Click to browse and select a CSV file for analysis.'}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-50 pt-4 mt-2">
                          <span className="text-xs font-semibold text-slate-400">Supports .csv files up to 200MB.</span>
                          <span className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition">
                            Browse Files
                          </span>
                        </div>
                        <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                      </label>

                      {loadMode === 'upload-mapping' && (
                        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                          <h3 className="text-base font-black text-[#0F172A] mb-1">Map CSV columns</h3>
                          <p className="text-xs font-semibold text-slate-400 mb-4">Select each required dataset field from your uploaded CSV columns.</p>

                          {csvColumns.length ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                              {['City', 'Property_Type', 'Area_sqft', 'Price'].map((field) => (
                                <label key={field} className="block">
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{field}</span>
                                  <select
                                    value={columnMapping[field] ?? ''}
                                    onChange={(event) => setColumnMapping((prev) => ({ ...prev, [field]: event.target.value }))}
                                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#D8F5E7] transition"
                                  >
                                    <option value="">Select column</option>
                                    {csvColumns.map((column) => (
                                      <option key={column} value={column}>{column}</option>
                                    ))}
                                  </select>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs font-semibold text-amber-600 bg-amber-50 rounded-xl p-3 border border-amber-100">Upload a CSV file first to load available column names.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setLoadMode('default')
                        setSelectedFile(null)
                        setCsvColumns([])
                        setColumnMapping({ City: '', Property_Type: '', Area_sqft: '', Price: '' })
                        setLoading(true)
                        setActionText('Loading default dataset...')
                        setErrorMessage(null)
                        try {
                          const response = await loadDefaultDataset()
                          setDataset(response)
                          setFiltered(null)
                          setSelectedCities([])
                          setSelectedPropertyTypes([])
                          setAreaMin(response.area_min)
                          setAreaMax(response.area_max)
                          setKpis(null)
                          setPrediction(null)
                          setInsights(null)
                          setNarrative(null)
                        } catch (error: any) {
                          setErrorMessage(error?.message || 'Failed to load default dataset.')
                        } finally {
                          setLoading(false)
                          setActionText('')
                        }
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F766E] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#0D5F58] hover:-translate-y-0.5 shadow-md transition active:translate-y-0 duration-150"
                    >
                      <MapPin className="w-4 h-4" />
                      Load default dataset
                    </button>
                    {loadMode !== 'default' && (
                      <button
                        type="button"
                        onClick={loadMode === 'upload-mapping' ? handleApplyMapping : handleUpload}
                        disabled={!selectedFile || (loadMode === 'upload-mapping' && !csvColumns.length)}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F766E] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#0D5F58] hover:-translate-y-0.5 shadow-md transition active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed duration-150"
                      >
                        <CloudUpload className="w-4 h-4" />
                        {loadMode === 'upload-mapping' ? 'Map and upload CSV' : 'Upload CSV'}
                      </button>
                    )}
                  </div>

                  {dataset?.warning && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                      {dataset.warning}
                    </div>
                  )}
                </div>
              </section>

              {dataset?.preview?.length ? (
                <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-black text-[#0F172A] mb-3">Dataset preview</p>
                  <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm text-[#334155]">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            {Object.keys(previewRows[0]).slice(0, 6).map((column) => (
                              <th key={column} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">{column}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {previewRows.slice(0, 4).map((row, rowIndex) => (
                            <tr key={rowIndex} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'} hover:bg-slate-50 transition duration-150`}>
                              {Object.values(row).slice(0, 6).map((value, cellIndex) => (
                                <td key={cellIndex} className="px-4 py-3 text-slate-600 font-semibold text-xs">{value ?? '-'}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}

              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 2 • Configuration</p>
                    <h2 className="text-2xl font-black text-[#0F172A] mt-2">Filters & analysis</h2>
                  </div>
                  <p className="text-sm font-bold text-slate-500 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-100">
                    Area range: <span className="text-[#0F766E]">{areaRange.min}</span> - <span className="text-[#0F766E]">{areaRange.max}</span> sqft
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <SelectableFilter
                      label="Cities"
                      values={availableCities}
                      selected={selectedCities}
                      onToggle={toggleCity}
                      placeholder="Filter by city..."
                    />

                    <SelectableFilter
                      label="Property Types"
                      values={availablePropertyTypes}
                      selected={selectedPropertyTypes}
                      onToggle={togglePropertyType}
                      placeholder="Filter by property type..."
                    />
                  </div>

                  <div className="rounded-3xl border border-slate-100 bg-[#F8FAFC]/50 p-6 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-black text-[#0F172A]">Area range (sqft)</p>
                        <p className="text-xs text-slate-500 mt-1">Adjust the minimum and maximum area for filtered results.</p>
                      </div>
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm font-bold text-sm">
                        <span className="text-[#0F766E]">{selectedAreaMin}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[#0F766E]">{selectedAreaMax}</span>
                      </div>
                    </div>

                    <div className="py-2">
                      <Slider
                        value={[selectedAreaMin, selectedAreaMax]}
                        min={areaRange.min}
                        max={areaRange.max}
                        step={1}
                        onValueChange={(value) => {
                          setAreaMin(value[0])
                          setAreaMax(value[1])
                        }}
                        className="h-4 text-[#0F766E]"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Area min (sqft)</span>
                        <input
                          type="number"
                          value={areaMin}
                          onChange={(event) => setAreaMin(Number(event.target.value) || '')}
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-[#0F172A] focus:border-[#0F766E] outline-none transition"
                          placeholder={String(areaRange.min)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Area max (sqft)</span>
                        <input
                          type="number"
                          value={areaMax}
                          onChange={(event) => setAreaMax(Number(event.target.value) || '')}
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-[#0F172A] focus:border-[#0F766E] outline-none transition"
                          placeholder={String(areaRange.max)}
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyFilters}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0F766E] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#0D5F58] hover:-translate-y-0.5 shadow-md transition active:translate-y-0 duration-150"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Apply filters
                  </button>

                  <div className="grid gap-3 sm:grid-cols-2 border-t border-slate-100 pt-5">
                    <button
                      type="button"
                      onClick={handleRunPrediction}
                      disabled={!activeData.length}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F766E] px-5 py-3 text-xs font-bold text-white hover:bg-[#0D5F58] hover:-translate-y-0.5 shadow-md transition active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed duration-150"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Run ML prediction
                    </button>
                    <button
                      type="button"
                      onClick={handleRunInsights}
                      disabled={!activeData.length}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 hover:-translate-y-0.5 shadow-sm transition active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed duration-150"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate automated insights
                    </button>
                  </div>
                </div>
              </section>
              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E] mb-2">Metrics Summary</p>
                <h2 className="text-2xl font-black text-[#0F172A] mb-6">Key metrics</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetricCard
                    icon={<Building2 className="h-5 w-5 text-indigo-600" />}
                    label="Total properties"
                    value={summaryKpis?.total_properties ? summaryKpis.total_properties.toLocaleString() : '—'}
                    accent="bg-indigo-50 border border-indigo-100"
                  />
                  <MetricCard
                    icon={<IndianRupee className="h-5 w-5 text-blue-600" />}
                    label="Median price"
                    value={summaryKpis?.median_price ? `₹${summaryKpis.median_price.toLocaleString()}` : '—'}
                    accent="bg-blue-50 border border-blue-100"
                  />
                  <MetricCard
                    icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
                    label="Avg price / sqft"
                    value={summaryKpis?.avg_price_per_sqft ? `₹${Math.round(summaryKpis.avg_price_per_sqft).toLocaleString()}` : '—'}
                    accent="bg-emerald-50 border border-emerald-100"
                  />
                  <MetricCard
                    icon={<Calendar className="h-5 w-5 text-amber-600" />}
                    label="Avg area (sqft)"
                    value={summaryKpis?.avg_area ? `${Math.round(summaryKpis.avg_area).toLocaleString()}` : '—'}
                    accent="bg-amber-50 border border-amber-100"
                  />
                </div>
              </section>

              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E] mb-2">Visualizations</p>
                <h3 className="text-2xl font-black text-[#0F172A] mb-6">Charts</h3>
                
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC]/50 p-5">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100/50 pb-3">
                      <div>
                        <p className="text-sm font-black text-[#0F172A]">Price distribution</p>
                        <p className="text-xs text-slate-500 mt-0.5">See how property prices are distributed across the loaded dataset.</p>
                      </div>
                      <BarChart3 className="w-5 h-5 text-[#0F766E] shrink-0" />
                    </div>
                    {chartData?.price_histogram?.length ? (
                      <ChartContainer id="price-distribution" config={{ count: { color: '#0F766E' } }} className="h-[500px]">
                        <BarChart
                          data={chartData.price_histogram.map((item) => ({
                            ...item,
                            bin_label: `${item.bin_start.toLocaleString()} - ${item.bin_end.toLocaleString()}`,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="bin_label" tick={{ fill: '#475569', fontSize: 12 }} />
                          <YAxis tick={{ fill: '#475569', fontSize: 12 }} />
                          <Tooltip formatter={(value: number) => [value, 'Count']} />
                          <Bar dataKey="count" fill="#0F766E" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    ) : (
                      <p className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-3">Chart data will appear after loading a dataset.</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC]/50 p-5">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100/50 pb-3">
                      <div>
                        <p className="text-sm font-black text-[#0F172A]">City-wise avg price</p>
                        <p className="text-xs text-slate-500 mt-0.5">Compare average prices by city for the selected properties.</p>
                      </div>
                      <MapPin className="w-5 h-5 text-[#7C3AED] shrink-0" />
                    </div>
                    {chartData?.city_avg_price?.length ? (
                      <ChartContainer id="city-avg-price" config={{ avg_price: { color: '#7C3AED' } }} className="h-[500px]">
                        <BarChart
                          data={chartData.city_avg_price.map((item) => ({
                            ...item,
                            avg_price: Number(item.avg_price || item.Avg_Price || 0),
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="City" tick={{ fill: '#475569', fontSize: 12 }} />
                          <YAxis tick={{ fill: '#475569', fontSize: 12 }} />
                          <Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Avg price']} />
                          <Bar dataKey="avg_price" fill="#7C3AED" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    ) : (
                      <p className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-3">City average values not available yet.</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC]/50 p-5">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100/50 pb-3">
                      <div>
                        <p className="text-sm font-black text-[#0F172A]">Price vs Area</p>
                        <p className="text-xs text-slate-500 mt-0.5">Analyze how price scales with property size for the chosen listings.</p>
                      </div>
                      <TrendingUp className="w-5 h-5 text-[#1D4ED8] shrink-0" />
                    </div>
                    {chartData?.price_vs_area?.length ? (
                      <ChartContainer id="price-vs-area" config={{ Price: { color: '#1D4ED8' } }} className="h-[500px]">
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="Area_sqft" tick={{ fill: '#475569', fontSize: 12 }} name="Area (sqft)" />
                          <YAxis dataKey="Price" tick={{ fill: '#475569', fontSize: 12 }} name="Price" />
                          <Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Price']} />
                          <Legend />
                          <Scatter
                            name="Price vs Area"
                            data={chartData.price_vs_area.map((item) => ({
                              ...item,
                              Area_sqft: Number(item.Area_sqft ?? item.area ?? 0),
                              Price: Number(item.Price ?? item.price ?? 0),
                            }))}
                            fill="#1D4ED8"
                          />
                        </ScatterChart>
                      </ChartContainer>
                    ) : (
                      <p className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-3">Price vs area details will appear after generating chart data.</p>
                    )}
                  </div>
                </div>
              </section>

          <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Data Preview</p>
                <h2 className="text-2xl font-black text-[#0F172A] mt-2">Filtered preview</h2>
                <p className="text-xs font-semibold text-slate-400 mt-1">Review the top filtered rows before exporting or analyzing.</p>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F766E] px-5 py-3 text-sm font-bold text-white hover:bg-[#0D5F58] hover:-translate-y-0.5 shadow-md transition active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed duration-150 shrink-0"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-150 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-[#334155]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {(previewRows[0] ? Object.keys(previewRows[0]) : ['No data']).slice(0, 8).map((column) => (
                        <th key={column} className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.length ? (
                      previewRows.map((row, rowIndex) => (
                        <tr key={rowIndex} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'} hover:bg-slate-50 transition duration-150`}>
                          {Object.values(row).slice(0, 8).map((value, cellIndex) => (
                            <td key={cellIndex} className="px-4 py-3.5 text-slate-600 font-semibold text-xs">{value ?? '-'}</td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-6 text-xs font-bold text-slate-400 text-center" colSpan={8}>No preview data available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E] mb-2">Predictive Model</p>
            <h3 className="text-2xl font-black text-[#0F172A] mb-6">ML — Price prediction</h3>
            {prediction ? (
              <div className="overflow-hidden rounded-2xl border border-slate-150 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-[#334155]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Metric</th>
                        <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="bg-white hover:bg-slate-50 transition duration-150">
                        <td className="px-4 py-3.5 text-slate-600 font-semibold text-xs">RMSE</td>
                        <td className="px-4 py-3.5 text-[#0F172A] font-bold text-xs">₹{prediction.rmse.toLocaleString()}</td>
                      </tr>
                      <tr className="bg-slate-50/20 hover:bg-slate-50 transition duration-150">
                        <td className="px-4 py-3.5 text-slate-600 font-semibold text-xs">R² score</td>
                        <td className="px-4 py-3.5 text-[#0F172A] font-bold text-xs">{prediction.r2}</td>
                      </tr>
                      <tr className="bg-white hover:bg-slate-50 transition duration-150">
                        <td className="px-4 py-3.5 text-slate-600 font-semibold text-xs">Train size</td>
                        <td className="px-4 py-3.5 text-[#0F172A] font-bold text-xs">{prediction.train_size}</td>
                      </tr>
                      <tr className="bg-slate-50/20 hover:bg-slate-50 transition duration-150">
                        <td className="px-4 py-3.5 text-slate-600 font-semibold text-xs">Test size</td>
                        <td className="px-4 py-3.5 text-[#0F172A] font-bold text-xs">{prediction.test_size}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-3">Run a prediction to see model metrics and sample output.</p>
            )}
          </section>

          <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E] mb-2">Automated Insights</p>
            <h3 className="text-2xl font-black text-[#0F172A] mb-6">Automated insights</h3>
            {insights && insights.insights.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-150 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-[#334155]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">City</th>
                        <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Property Type</th>
                        <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Avg Price</th>
                        <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Min Price</th>
                        <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Max Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {insights.insights.slice(0, 8).map((item, index) => (
                        <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'} hover:bg-slate-50 transition duration-150`}>
                          <td className="px-4 py-3.5 text-slate-600 font-semibold text-xs">{item.City}</td>
                          <td className="px-4 py-3.5 text-slate-600 font-semibold text-xs">{item.Property_Type}</td>
                          <td className="px-4 py-3.5 text-[#0F172A] font-bold text-xs">₹{Number(item.Avg_Price)?.toLocaleString()}</td>
                          <td className="px-4 py-3.5 text-slate-600 font-semibold text-xs">₹{Number(item.Min_Price)?.toLocaleString()}</td>
                          <td className="px-4 py-3.5 text-slate-600 font-semibold text-xs">₹{Number(item.Max_Price)?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-3">Generate insights to populate the table.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
