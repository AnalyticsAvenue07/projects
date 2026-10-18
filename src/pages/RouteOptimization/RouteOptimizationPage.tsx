import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Plot from 'react-plotly.js'
import {
  Download,
  FileText,
  UploadCloud,
  X,
  ChevronLeft,
  Loader2,
  Sparkles,
  SquareStack,
  Clock,
  Settings,
  TrendingUp,
  Cpu,
  Package,
  AlertCircle,
  Percent,
  CalendarRange,
  BarChart3,
  Lightbulb,
  PlaySquare,
  MapPin,
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'
import { ProjectOverviewManager, EditableOverviewSection } from '@/components/project-content'

import {
  applyColumnMapping,
  filterData,
  getChartData,
  getClusters,
  getCostSimulation,
  getCsvColumns,
  getInsights,
  getPlaybooks,
  loadDefaultDataset,
  runAnomalyDetection,
  runGradientBoosting,
  runKnn,
  runRandomForest,
  uploadCsv,
} from '@/services/routeOptimizationApi'

import type {
  RouteOptimizationAnomalyResponse,
  RouteOptimizationChartResponse,
  RouteOptimizationClusterResponse,
  RouteOptimizationCostSimulationResponse,
  RouteOptimizationDatasetResponse,
  RouteOptimizationFilterResponse,
  RouteOptimizationInsightsResponse,
  RouteOptimizationMlResponse,
  RouteOptimizationMode,
  RouteOptimizationPlaybooksResponse,
  RouteOptimizationRow,
} from '@/types/routeOptimization'

const REQUIRED_COLUMNS = [
  { column: 'Timestamp', type: 'Datetime', description: 'Trip start timestamp' },
  { column: 'Vehicle_ID', type: 'Categorical', description: 'Unique vehicle identifier' },
  { column: 'Route_ID', type: 'Categorical', description: 'Unique route identifier' },
  { column: 'Route_Distance_km', type: 'Numeric', description: 'Distance of route' },
  { column: 'Actual_Travel_Hours', type: 'Numeric', description: 'Actual hours taken' },
  { column: 'Actual_Fuel_Liters', type: 'Numeric', description: 'Actual fuel consumed' },
  { column: 'Delay_Hours', type: 'Numeric', description: 'Delay in hours' },
]

const INDEPENDENT_VARIABLES = [
  'Route_Distance_km',
  'Vehicle_Type',
  'Vehicle_Capacity_kg',
  'Load_Weight_kg',
  'Traffic_Level',
  'Weather_Condition',
  'Start_City',
  'End_City',
  'Timestamp',
]

const DEPENDENT_VARIABLES = [
  'Actual_Travel_Hours',
  'Actual_Fuel_Liters',
  'Delay_Hours',
  'Efficiency_Score',
  'Fuel_L_per_km',
  '_is_anomaly',
]

const MAPPING_FIELDS = [
  'Timestamp',
  'Vehicle_ID',
  'Vehicle_Type',
  'Route_ID',
  'Start_City',
  'End_City',
  'Route_Distance_km',
  'Traffic_Level',
  'Weather_Condition',
  'Predicted_Travel_Hours',
  'Actual_Travel_Hours',
  'Predicted_Fuel_Liters',
  'Actual_Fuel_Liters',
  'Vehicle_Capacity_kg',
  'Load_Weight_kg',
  'Delay_Hours',
  'Efficiency_Score',
]

const PREVIEW_COLUMNS = [
  'Timestamp',
  'Vehicle_ID',
  'Vehicle_Type',
  'Route_ID',
  'Start_City',
  'End_City',
  'Route_Distance_km',
  'Traffic_Level',
  'Weather_Condition',
  'Predicted_Travel_Hours',
  'Actual_Travel_Hours',
  'Predicted_Fuel_Liters',
  'Actual_Fuel_Liters',
  'Vehicle_Capacity_kg',
  'Load_Weight_kg',
  'Delay_Hours',
  'Efficiency_Score',
]

const PLAYBOOKS = [
  {
    title: 'Top Routes to Reassign',
    key: 'routes_to_reassign' as const,
    subtitle: 'low efficiency + high fuel',
  },
  {
    title: 'Vehicles to Audit',
    key: 'vehicles_to_audit' as const,
    subtitle: 'fuel/km & delay',
  },
  {
    title: 'Drivers / Operators to Coach',
    key: 'drivers_to_coach' as const,
    subtitle: '',
  },
  {
    title: 'High-Risk Traffic × Weather Conditions',
    key: 'high_risk_conditions' as const,
    subtitle: '',
  },
]

const commonLayout = {
  template: 'plotly' as const,
  paper_bgcolor: '#ffffff',
  plot_bgcolor: '#ffffff',
  margin: { l: 60, r: 20, t: 40, b: 60 },
  font: {
    family: 'Inter, sans-serif',
    size: 11,
    color: '#2e2e2e',
  },
  legend: {
    orientation: 'v' as const,
    x: 1.02,
    y: 1,
  },
}

type TabKey = 'overview' | 'dictionary' | 'application' | 'playbooks'

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
        <div className={`rounded-2xl p-4 shrink-0 bg-slate-50 ${accent}`}>{icon}</div>
        <div>
          <p className="text-sm font-bold text-slate-500 tracking-tight uppercase">{label}</p>
          <p className="mt-1 text-2xl font-black text-[#0F172A]">{value}</p>
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
          <div className="text-xs text-slate-400 font-medium">Filter by {label.toLowerCase().replace(/_/g, ' ')}...</div>
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
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40"
      >
        <option value="">-- Skip --</option>
        {columns.map((column) => (
          <option key={column} value={column}>
            {column}
          </option>
        ))}
      </select>
    </div>
  )
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') return Number.isInteger(value) ? value.toString() : value.toFixed(4)
  return String(value)
}

function formatMetric(value: number | null | undefined, decimals = 2) {
  if (value == null || Number.isNaN(value)) return '—'
  return Number(value).toFixed(decimals)
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const message = errorData?.detail || errorData?.message || response.statusText || 'Request failed'
    throw new Error(message)
  }
  return response.json()
}

function downloadRowsAsCsv(filename: string, rows: RouteOptimizationRow[]) {
  if (!rows.length) return
  const headerSet = new Set<string>()
  rows.forEach((row) => Object.keys(row).forEach((key) => headerSet.add(key)))
  const headers = Array.from(headerSet)
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n')
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

function downloadSampleCsv(previewRows: RouteOptimizationRow[]) {
  const sample = [
    ['Timestamp', 'Vehicle_ID', 'Vehicle_Type', 'Route_ID', 'Start_City', 'End_City', 'Route_Distance_km', 'Traffic_Level', 'Weather_Condition', 'Predicted_Travel_Hours', 'Actual_Travel_Hours', 'Predicted_Fuel_Liters', 'Actual_Fuel_Liters', 'Vehicle_Capacity_kg', 'Load_Weight_kg', 'Delay_Hours', 'Efficiency_Score'],
    ['2026-06-01 08:00', 'V001', 'Truck', 'R001', 'Mumbai', 'Pune', '148', 'Medium', 'Clear', '4.8', '5.1', '35.4', '36.2', '1200', '900', '0.4', '0.92'],
    ['2026-06-01 09:30', 'V002', 'Van', 'R002', 'Delhi', 'Jaipur', '280', 'High', 'Rain', '7.3', '8.1', '52.6', '54.8', '900', '650', '0.8', '0.81'],
  ]
  const csv = sample.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'route_optimization_sample.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function renderTable(rows: RouteOptimizationRow[], columns: string[], title: string) {
  if (!rows.length) {
    return <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">No rows to display.</div>
  }
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <UiTable>
          <TableHeader>
            <TableRow className="bg-slate-50 border-b border-slate-200">
              {columns.map((col) => (
                <TableHead key={col} className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4 whitespace-nowrap">{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {rows.slice(0, 10).map((row, index) => (
              <TableRow key={index} className="border-slate-100 hover:bg-slate-50/50">
                {columns.map((col) => (
                  <TableCell key={`${index}-${col}`} className="px-4 py-3.5 text-slate-700 text-sm max-w-[180px] truncate">{formatCell(row[col])}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </UiTable>
      </div>
    </div>
  )
}

export function RouteOptimizationPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mappingInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [mode, setMode] = useState<RouteOptimizationMode>('default')
  const [data, setData] = useState<RouteOptimizationRow[]>([])
  const [filteredRows, setFilteredRows] = useState<RouteOptimizationRow[]>([])
  const [previewRows, setPreviewRows] = useState<RouteOptimizationRow[]>([])
  const [vehicles, setVehicles] = useState<string[]>([])
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([])
  const [routes, setRoutes] = useState<string[]>([])
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState<string[]>([])
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([])
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [loadStatus, setLoadStatus] = useState('Default dataset not loaded yet.')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [mappingFile, setMappingFile] = useState<File | null>(null)
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [mappingColumns, setMappingColumns] = useState<Record<string, string>>(
    MAPPING_FIELDS.reduce((acc, field) => {
      acc[field] = field
      return acc
    }, {} as Record<string, string>)
  )

  const [kpis, setKpis] = useState<RouteOptimizationFilterResponse['kpis'] | null>(null)
  const [charts, setCharts] = useState<RouteOptimizationChartResponse | null>(null)
  const [clusters, setClusters] = useState<RouteOptimizationClusterResponse | null>(null)
  const [costSimulation, setCostSimulation] = useState<RouteOptimizationCostSimulationResponse | null>(null)
  const [randomForest, setRandomForest] = useState<RouteOptimizationMlResponse | null>(null)
  const [gradientBoosting, setGradientBoosting] = useState<RouteOptimizationMlResponse | null>(null)
  const [knn, setKnn] = useState<RouteOptimizationMlResponse | null>(null)
  const [anomalyDetection, setAnomalyDetection] = useState<RouteOptimizationAnomalyResponse | null>(null)
  const [insights, setInsights] = useState<RouteOptimizationInsightsResponse | null>(null)
  const [playbooks, setPlaybooks] = useState<RouteOptimizationPlaybooksResponse | null>(null)

  useEffect(() => {
    void loadDefaultData()
  }, [])

  useEffect(() => {
    if (!data.length) return
    const timer = window.setTimeout(() => {
      void applyCurrentFilters(data)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [data, selectedVehicles, selectedVehicleTypes, selectedRoutes, dateStart, dateEnd])

  async function loadDefaultData() {
    setLoading(true)
    setError(null)
    setMode('default')
    try {
      const response: RouteOptimizationDatasetResponse = await loadDefaultDataset()
      const rows = response.data ?? []
      setData(rows)
      setPreviewRows(response.preview ?? rows.slice(0, 10))
      setVehicles(response.vehicles ?? [])
      setVehicleTypes(response.vehicle_types ?? [])
      setRoutes(response.routes ?? [])
      setSelectedVehicles([])
      setSelectedVehicleTypes([])
      setSelectedRoutes([])
      setDateStart(response.date_min?.slice(0, 10) ?? '')
      setDateEnd(response.date_max?.slice(0, 10) ?? '')
      setLoadStatus('Default dataset loaded successfully.')
      await applyCurrentFilters(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load default dataset.')
      setLoadStatus('Unable to load default dataset.')
    } finally {
      setLoading(false)
    }
  }

  async function uploadSelectedCsv(file: File) {
    setLoading(true)
    setError(null)
    setMode('upload')
    setUploadFile(file)
    try {
      const response = await uploadCsv(file)
      const rows = response.data ?? []
      setData(rows)
      setPreviewRows(response.preview ?? rows.slice(0, 10))
      setVehicles(response.vehicles ?? [])
      setVehicleTypes(response.vehicle_types ?? [])
      setRoutes(response.routes ?? [])
      setSelectedVehicles([])
      setSelectedVehicleTypes([])
      setSelectedRoutes([])
      setDateStart(response.date_min?.slice(0, 10) ?? '')
      setDateEnd(response.date_max?.slice(0, 10) ?? '')
      setLoadStatus('Dataset uploaded successfully.')
      await applyCurrentFilters(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
      setLoadStatus('Dataset upload failed.')
    } finally {
      setLoading(false)
    }
  }

  async function prepareMappingColumns(file: File) {
    setLoading(true)
    setError(null)
    setMappingFile(file)
    setMode('mapping')
    try {
      const response = await getCsvColumns(file)
      setAvailableColumns(response.columns ?? [])
      setMappingColumns(
        MAPPING_FIELDS.reduce((acc, field) => {
          acc[field] = response.columns?.includes(field) ? field : ''
          return acc
        }, {} as Record<string, string>)
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to read CSV columns.')
    } finally {
      setLoading(false)
    }
  }

  async function applyMapping() {
    if (!mappingFile) {
      setError('Please upload a CSV file first.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await applyColumnMapping(mappingFile, mappingColumns)
      const rows = response.data ?? []
      const derivedVehicleTypes = Array.from(new Set(rows.map((row) => row.Vehicle_Type).filter(Boolean) as string[]))
      setData(rows)
      setPreviewRows(response.preview ?? rows.slice(0, 10))
      setVehicles(response.vehicles ?? [])
      setVehicleTypes(derivedVehicleTypes)
      setRoutes(response.routes ?? [])
      setSelectedVehicles([])
      setSelectedVehicleTypes([])
      setSelectedRoutes([])
      setLoadStatus('Mapping applied successfully.')
      await applyCurrentFilters(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mapping failed.')
    } finally {
      setLoading(false)
    }
  }

  async function applyCurrentFilters(rows: RouteOptimizationRow[]) {
    if (!rows.length) {
      setFilteredRows([])
      setKpis(null)
      setCharts(null)
      setClusters(null)
      setCostSimulation(null)
      setRandomForest(null)
      setGradientBoosting(null)
      setKnn(null)
      setAnomalyDetection(null)
      setInsights(null)
      setPlaybooks(null)
      return
    }
    try {
      const filterResponse = await filterData({
        data: rows,
        vehicle_ids: selectedVehicles.length ? selectedVehicles : undefined,
        vehicle_types: selectedVehicleTypes.length ? selectedVehicleTypes : undefined,
        route_ids: selectedRoutes.length ? selectedRoutes : undefined,
        date_start: dateStart || undefined,
        date_end: dateEnd || undefined,
      })
      const selectedRows = filterResponse.data ?? rows
      setFilteredRows(selectedRows)
      setKpis(filterResponse.kpis)

      const [
        chartsResponse,
        clustersResponse,
        costResponse,
        rfResponse,
        gbResponse,
        knnResponse,
        anomalyResponse,
        insightsResponse,
        playbooksResponse,
      ] = await Promise.all([
        getChartData(selectedRows).catch(() => null),
        getClusters(selectedRows).catch(() => null),
        getCostSimulation(selectedRows).catch(() => null),
        runRandomForest(selectedRows).catch(() => null),
        runGradientBoosting(selectedRows).catch(() => null),
        runKnn(selectedRows).catch(() => null),
        runAnomalyDetection(selectedRows).catch(() => null),
        getInsights(selectedRows).catch(() => null),
        getPlaybooks(selectedRows).catch(() => null),
      ])

      setCharts(chartsResponse)
      setClusters(clustersResponse)
      setCostSimulation(costResponse)
      setRandomForest(rfResponse)
      setGradientBoosting(gbResponse)
      setKnn(knnResponse)
      setAnomalyDetection(anomalyResponse)
      setInsights(insightsResponse)
      setPlaybooks(playbooksResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Filter analysis failed.')
      setFilteredRows(rows)
    }
  }

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'dictionary', label: 'Data Dictionary' },
    { key: 'application', label: 'Application' },
    { key: 'playbooks', label: 'Action Playbooks' },
  ]

  const distanceHistData = charts?.route_distance_histogram ?? []
  const dailyEffTrendData = charts?.daily_efficiency_trend ?? []
  const clusterScatterData = clusters?.clusters ?? []

  const boxPlotGrouped = useMemo(() => {
    const rawData = charts?.efficiency_by_vehicle_type ?? []
    return rawData.reduce<Record<string, number[]>>((acc, row) => {
      const key = String(row.Vehicle_Type ?? 'Unknown')
      acc[key] ||= []
      const value = Number(row.Efficiency_Score)
      if (!Number.isNaN(value)) acc[key].push(value)
      return acc
    }, {})
  }, [charts?.efficiency_by_vehicle_type])

  const scatterGrouped = useMemo(() => {
    const rawData = charts?.delay_vs_distance ?? []
    const levels = Array.from(new Set(rawData.map((row) => String(row.Traffic_Level ?? 'Unknown'))))
    return levels.map((lvl) => {
      const rows = rawData.filter((row) => String(row.Traffic_Level ?? 'Unknown') === lvl)
      return {
        lvl,
        x: rows.map((row) => Number(row.Route_Distance_km)),
        y: rows.map((row) => Number(row.Delay_Hours)),
        size: rows.map((row) => Math.max(Number(row.Load_Weight_kg ?? 1) / 25, 8)),
      }
    })
  }, [charts?.delay_vs_distance])

  const fuelViolinData = charts?.fuel_per_km ?? []

  const heatmapData = charts?.correlation_matrix ?? null

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F8FBFF_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-slate-700 border-slate-200 bg-white hover:bg-slate-50 hover:-translate-y-0.5 transition active:translate-y-0 shadow-sm"
          >
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Hero Header */}
        <div className="mb-10 rounded-[32px] border border-[#E2E8F0] bg-white px-10 py-12 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#0F766E]">
            Logistics &amp; Supply Chain &nbsp;•&nbsp; Route Optimization &amp; Logistics Efficiency
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#0F172A] sm:text-5xl">
            Route Optimization &amp; Logistics Efficiency
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-600">
            Reduce miles, cut fuel, and speed up deliveries with data-driven routing optimization and cost simulations.
          </p>
        </div>

        <ProjectOverviewManager
          projectSlug="route-optimization-logistics-efficiency"
          projectTitle="Route Optimization & Logistics Efficiency"
          systemTabs={TABS}
          activeTab={activeTab}
          onTabChange={(t) => setActiveTab(t as TabKey)}
          renderOverviewContent={(sections, onEdit, onDelete) => {
            const purposeSec = sections.find((s) => s.id === 'purpose') || {
              id: 'purpose',
              projectSlug: 'route-optimization-logistics-efficiency',
              title: 'Purpose',
              eyebrow: 'Overview',
              content:
                'Cut route costs and delivery time by optimizing routes, predicting delays & fuel usage, and prioritizing high-impact fleet actions.',
            }
            const capabilitiesSec = sections.find((s) => s.id === 'capabilities')
            const businessImpactSec = sections.find((s) => s.id === 'business-impact')
            const customSections = sections.filter((s) => s.isCustom)

            return (
              <div className="space-y-6">
                <EditableOverviewSection
                  section={purposeSec}
                  onEdit={onEdit}
                  accentColor="#0F766E"
                />

                <div className="grid gap-6 md:grid-cols-2">
                  {capabilitiesSec && (
                    <EditableOverviewSection
                      section={capabilitiesSec}
                      onEdit={onEdit}
                      icon={<Sparkles className="h-5 w-5 text-[#0F766E]" />}
                      accentColor="#0F766E"
                    />
                  )}
                  {businessImpactSec && (
                    <EditableOverviewSection
                      section={businessImpactSec}
                      onEdit={onEdit}
                      icon={<TrendingUp className="h-5 w-5 text-[#2563EB]" />}
                      accentColor="#2563EB"
                    />
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <MetricCard
                    icon={<Package className="h-5 w-5 text-[#0F766E]" />}
                    label="Total Routes"
                    value={formatMetric(kpis?.total_routes, 0)}
                    accent="bg-[#ECFDF5]"
                  />
                  <MetricCard
                    icon={<Sparkles className="h-5 w-5 text-[#D97706]" />}
                    label="Avg Efficiency"
                    value={formatMetric(kpis?.avg_efficiency, 3)}
                    accent="bg-[#FFFBEB]"
                  />
                  <MetricCard
                    icon={<Clock className="h-5 w-5 text-[#2563EB]" />}
                    label="Avg Delay"
                    value={formatMetric(kpis?.avg_delay_hours, 2) !== '—' ? `${formatMetric(kpis?.avg_delay_hours, 2)} hrs` : '—'}
                    accent="bg-[#EFF6FF]"
                  />
                  <MetricCard
                    icon={<Percent className="h-5 w-5 text-[#7C3AED]" />}
                    label="Avg Fuel/Route"
                    value={formatMetric(kpis?.avg_fuel_liters, 2) !== '—' ? `${formatMetric(kpis?.avg_fuel_liters, 2)} L` : '—'}
                    accent="bg-[#F5F3FF]"
                  />
                  <MetricCard
                    icon={<AlertCircle className="h-5 w-5 text-[#10B981]" />}
                    label="On-Time Deliveries"
                    value={formatMetric(kpis?.ontime_percent, 1) !== '—' ? `${formatMetric(kpis?.ontime_percent, 1)}%` : '—'}
                    accent="bg-[#ECFDF5]"
                  />
                </div>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <h3 className="text-2xl font-bold text-[#0F172A] mb-6">User Guide — Who Should Use &amp; How</h3>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-6">
                      <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0F766E] mb-3">Target Users</p>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        Fleet managers, logistics planners, operations heads, and sustainability teams seeking to reduce fuel costs, minimize delivery times, and maximize scheduling efficiency.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-6">
                      <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0F766E] mb-3">Standard Workflow</p>
                      <ol className="space-y-2 text-slate-600 text-sm">
                        <li className="flex gap-2"><span className="font-bold text-[#0F766E]">1.</span> Load data (default sample or upload custom CSV)</li>
                        <li className="flex gap-2"><span className="font-bold text-[#0F766E]">2.</span> Filter by vehicle ID, vehicle type, route, and time frame</li>
                        <li className="flex gap-2"><span className="font-bold text-[#0F766E]">3.</span> Examine bottleneck regions, low-efficiency routes, and delay factors</li>
                        <li className="flex gap-2"><span className="font-bold text-[#0F766E]">4.</span> Export simulated cost optimization models and action playbooks</li>
                      </ol>
                    </div>
                  </div>
                </section>

                {customSections.map((sec) => (
                  <EditableOverviewSection key={sec.id} section={sec} onEdit={onEdit} onDelete={onDelete} accentColor="#0F766E" />
                ))}
              </div>
            )
          }}
        >

        {/* ── DATA DICTIONARY TAB ── */}
        {activeTab === 'dictionary' && (
          <div className="space-y-6">
            {/* Required Schema Chips */}
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Schema</p>
              <h2 className="mt-3 text-2xl font-bold text-[#0F172A]">Required Columns</h2>
              <p className="mt-2 text-slate-600">The uploaded dataset must include or map to these essential schema fields for analysis.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {REQUIRED_COLUMNS.map((item) => (
                  <Chip key={item.column} className="border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]">{item.column}</Chip>
                ))}
              </div>
            </section>

            {/* Data Dictionary Table */}
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Reference</p>
              <h2 className="mt-3 text-2xl font-bold text-[#0F172A]">Data Dictionary</h2>
              <p className="mt-2 mb-6 text-slate-600">Business definitions and database types for the primary fields.</p>
              <div className="overflow-hidden rounded-3xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#F8FAFC] border-b border-slate-200">
                    <tr>
                      <th className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">Column Name</th>
                      <th className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">Data Type</th>
                      <th className="font-bold text-slate-600 text-[12px] uppercase tracking-[0.08em] py-3.5 px-4">Business Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {REQUIRED_COLUMNS.map((item) => (
                      <tr key={item.column} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3.5 font-semibold text-slate-800 whitespace-nowrap">{item.column}</td>
                        <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{item.type}</td>
                        <td className="px-4 py-3.5 text-slate-600">{item.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Variable Roles */}
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Model Variables</p>
              <h2 className="mt-3 text-2xl font-bold text-[#0F172A]">Variable Roles</h2>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-[#BFDBFE] bg-[#EFF6FF] p-6">
                  <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[#1D4ED8]">Independent Variables (Features)</p>
                  <div className="flex flex-wrap gap-2">
                    {INDEPENDENT_VARIABLES.map((item) => (
                      <Chip key={item} className="border-[#BFDBFE] bg-white text-[#1D4ED8]">{item}</Chip>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-[#A7F3D0] bg-[#ECFDF5] p-6">
                  <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[#0F766E]">Dependent Variables (Targets)</p>
                  <div className="flex flex-wrap gap-2">
                    {DEPENDENT_VARIABLES.map((item) => (
                      <Chip key={item} className="border-[#A7F3D0] bg-white text-[#0F766E]">{item}</Chip>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <Button
                  type="button"
                  onClick={() => {
                    const rows = REQUIRED_COLUMNS.map((row) => ({ Column: row.column, Type: row.type, Description: row.description }))
                    downloadRowsAsCsv('route_optimization_schema.csv', rows)
                  }}
                  className="rounded-full px-6 py-3 font-bold bg-[#0F766E] text-white hover:bg-[#0E6962] hover:-translate-y-0.5 transition active:translate-y-0 shadow-sm"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Schema CSV
                </Button>
              </div>
            </section>
          </div>
        )}

        {/* ── APPLICATION TAB ── */}
        {activeTab === 'application' && (
          <div className="space-y-6">
            
            {/* Step 1: Dataset Options */}
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 1</p>
              <h2 className="mt-2 text-2xl font-bold text-[#0F172A]">Dataset Options</h2>
              <p className="mt-2 text-slate-600">Load the default routing records or import custom operations datasets.</p>

              <div className="mt-6 flex flex-wrap gap-3">
                {/* Default Loader */}
                <Button
                  type="button"
                  onClick={() => { void loadDefaultData() }}
                  disabled={loading}
                  className={`rounded-full px-6 py-3 font-semibold transition hover:-translate-y-0.5 active:translate-y-0 ${
                    mode === 'default'
                      ? 'bg-[#0F766E] text-white shadow-md hover:bg-[#0E6962]'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {loading && mode === 'default' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <SquareStack className="mr-2 h-4 w-4" />
                  )}
                  Load Default Data
                </Button>

                {/* Upload CSV */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className={`rounded-full px-6 py-3 font-semibold transition hover:-translate-y-0.5 active:translate-y-0 ${
                    mode === 'upload' ? 'border-[#0F766E] bg-[#ECFDF5] text-[#0F766E]' : ''
                  }`}
                >
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Upload CSV
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void uploadSelectedCsv(file)
                  }}
                />

                {/* Upload + Manual Mapping */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => mappingInputRef.current?.click()}
                  disabled={loading}
                  className={`rounded-full px-6 py-3 font-semibold transition hover:-translate-y-0.5 active:translate-y-0 ${
                    mode === 'mapping' ? 'border-[#0F766E] bg-[#ECFDF5] text-[#0F766E]' : ''
                  }`}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Upload CSV + Manual Mapping
                </Button>
                <input
                  ref={mappingInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void prepareMappingColumns(file)
                  }}
                />
              </div>

              {/* Loader Status or Errors */}
              {loadStatus && (
                <div className="mt-5 rounded-2xl border border-emerald-100 bg-[#ECFDF5] p-4 text-sm font-medium text-[#0F766E]">
                  {loadStatus} &nbsp;•&nbsp; Loaded rows: <span className="font-bold">{data.length}</span>
                </div>
              )}
              {error && (
                <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                  {error}
                </div>
              )}
            </section>

            {/* Mapping Step */}
            {mode === 'mapping' && availableColumns.length > 0 && (
              <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Mapping</p>
                <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Column Mapping</h3>
                <p className="mt-2 mb-6 text-slate-600">Assign columns in your CSV to match Route Optimization variables.</p>
                {mappingFile && (
                  <div className="mb-6 flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-[#0F766E]" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{mappingFile.name}</p>
                        <p className="text-xs text-slate-500">{(mappingFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => { setMappingFile(null); setAvailableColumns([]); setMode('mapping'); }} className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100" aria-label="Clear file select">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="space-y-3">
                  {MAPPING_FIELDS.map((field) => (
                    <MappingRow
                      key={field}
                      field={field}
                      columns={availableColumns}
                      value={mappingColumns[field] ?? ''}
                      onChange={(val) => setMappingColumns((prev) => ({ ...prev, [field]: val }))}
                    />
                  ))}
                </div>
                <div className="mt-6">
                  <Button
                    type="button"
                    onClick={() => void applyMapping()}
                    disabled={loading}
                    className="rounded-full px-8 py-3 font-bold bg-[#0F766E] text-white hover:bg-[#0E6962] hover:-translate-y-0.5 transition active:translate-y-0"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Apply Mapping Configurations
                  </Button>
                </div>
              </section>
            )}

            {/* Primary Analysis Blocks */}
            {data.length > 0 && (
              <>
                {/* Default dataset table preview */}
                {mode === 'default' && (
                  <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Preview</p>
                        <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Dataset Preview</h3>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          onClick={() => void loadDefaultData()}
                          disabled={loading}
                          className="rounded-full px-6 py-3 font-bold bg-[#0F766E] text-white hover:bg-[#0E6962] hover:-translate-y-0.5 transition active:translate-y-0"
                        >
                          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SquareStack className="mr-2 h-4 w-4" />}
                          Reload Default Data
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void downloadSampleCsv(previewRows)}
                          className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0 bg-white border-slate-200 text-slate-700"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Sample CSV
                        </Button>
                      </div>
                    </div>
                    {renderTable(previewRows, PREVIEW_COLUMNS, 'Dataset Preview')}
                  </section>
                )}

                {/* Step 2 Filters */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Step 2</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A] mb-6">Filters &amp; Sub-Selection</h3>
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    <SelectableFilter
                      label="Vehicle ID"
                      values={vehicles}
                      selected={selectedVehicles}
                      onToggle={(val) => setSelectedVehicles((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val])}
                    />
                    <SelectableFilter
                      label="Vehicle Type"
                      values={vehicleTypes}
                      selected={selectedVehicleTypes}
                      onToggle={(val) => setSelectedVehicleTypes((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val])}
                    />
                    <SelectableFilter
                      label="Route ID"
                      values={routes}
                      selected={selectedRoutes}
                      onToggle={(val) => setSelectedRoutes((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val])}
                    />
                  </div>

                  <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-[#0F766E]/30 w-full lg:w-1/2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#0F766E]">Time Period</p>
                      <CalendarRange className="h-4 w-4 text-[#0F766E]" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm text-slate-600">
                        <span className="mb-1.5 block font-semibold text-slate-700">Start Date</span>
                        <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40" />
                      </label>
                      <label className="text-sm text-slate-600">
                        <span className="mb-1.5 block font-semibold text-slate-700">End Date</span>
                        <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40" />
                      </label>
                    </div>
                  </div>
                </section>

                {/* Filtered Preview Table */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Selection preview</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Filtered Data Preview</h3>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void downloadRowsAsCsv('filtered_preview.csv', filteredRows)}
                      className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0 bg-white border-slate-200 text-slate-700"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Filtered Preview
                    </Button>
                  </div>
                  {renderTable(filteredRows, PREVIEW_COLUMNS, 'Filtered Data Preview')}
                </section>

                {/* Dynamic Key Metrics */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Metrics</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A] mb-6">Dynamic KPIs</h3>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <MetricCard
                      icon={<Package className="h-5 w-5 text-[#0F766E]" />}
                      label="Routes in selection"
                      value={formatMetric(kpis?.total_routes, 0)}
                      accent="bg-[#ECFDF5]"
                    />
                    <MetricCard
                      icon={<Sparkles className="h-5 w-5 text-[#D97706]" />}
                      label="Avg Efficiency"
                      value={formatMetric(kpis?.avg_efficiency, 3)}
                      accent="bg-[#FFFBEB]"
                    />
                    <MetricCard
                      icon={<Clock className="h-5 w-5 text-[#2563EB]" />}
                      label="Avg Delay"
                      value={formatMetric(kpis?.avg_delay_hours, 2) !== '—' ? `${formatMetric(kpis?.avg_delay_hours, 2)} hrs` : '—'}
                      accent="bg-[#EFF6FF]"
                    />
                    <MetricCard
                      icon={<Percent className="h-5 w-5 text-[#7C3AED]" />}
                      label="Avg Fuel/Route"
                      value={formatMetric(kpis?.avg_fuel_liters, 2) !== '—' ? `${formatMetric(kpis?.avg_fuel_liters, 2)} L` : '—'}
                      accent="bg-[#F5F3FF]"
                    />
                    <MetricCard
                      icon={<AlertCircle className="h-5 w-5 text-[#10B981]" />}
                      label="On-Time Deliveries"
                      value={formatMetric(kpis?.ontime_percent, 1) !== '—' ? `${formatMetric(kpis?.ontime_percent, 1)}%` : '—'}
                      accent="bg-[#ECFDF5]"
                    />
                  </div>
                </section>

                {/* Exploratory Analysis Charts */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">EDA</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A] mb-6">Charts &amp; Visualisations</h3>
                  <div className="grid gap-6">

                    {/* Route distance distribution */}
                    {distanceHistData.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">Route Distance Distribution (km)</h4>
                        <div className="h-[360px]">
                          <Plot
                            data={[{
                              x: distanceHistData.map((item) => (item.bin_start + item.bin_end) / 2),
                              y: distanceHistData.map((item) => item.count),
                              type: 'bar',
                              marker: { color: '#0F766E' }
                            }]}
                            layout={{ ...commonLayout, xaxis: { title: 'Route Distance (km)' }, yaxis: { title: 'Count' } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Efficiency Score by Vehicle Type */}
                    {Object.keys(boxPlotGrouped).length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">Efficiency Score by Vehicle Type</h4>
                        <div className="h-[380px]">
                          <Plot
                            data={Object.entries(boxPlotGrouped).map(([vehicleType, values]) => ({
                              y: values,
                              type: 'box',
                              name: vehicleType,
                              marker: { color: '#0F766E' }
                            }))}
                            layout={{ ...commonLayout, xaxis: { title: 'Vehicle Type' }, yaxis: { title: 'Efficiency Score' }, boxmode: 'group' }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Delay vs Distance Scatter */}
                    {scatterGrouped.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">Delay vs Distance by Traffic Level</h4>
                        <div className="h-[380px]">
                          <Plot
                            data={scatterGrouped.map((trace) => ({
                              x: trace.x,
                              y: trace.y,
                              mode: 'markers',
                              type: 'scatter',
                              name: trace.lvl,
                              marker: { size: trace.size, opacity: 0.8 }
                            }))}
                            layout={{ ...commonLayout, xaxis: { title: 'Route Distance (km)' }, yaxis: { title: 'Delay (hrs)' }, legend: { orientation: 'h', y: -0.15 } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Fuel Consumption Violin */}
                    {fuelViolinData.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">Fuel Consumption (L per km)</h4>
                        <div className="h-[360px]">
                          <Plot
                            data={[{
                              y: fuelViolinData.map((row) => Number(row.Fuel_L_per_km)),
                              type: 'violin',
                              name: 'Fuel L/km',
                              box: { visible: true },
                              meanline: { visible: true },
                              marker: { color: '#0F766E' }
                            }]}
                            layout={{ ...commonLayout, yaxis: { title: 'Fuel L/km' } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Daily Avg Efficiency Score Line */}
                    {dailyEffTrendData.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">Daily Average Efficiency Score</h4>
                        <div className="h-[360px]">
                          <Plot
                            data={[{
                              x: dailyEffTrendData.map((row) => row.Timestamp),
                              y: dailyEffTrendData.map((row) => Number(row.Efficiency_Score)),
                              type: 'scatter',
                              mode: 'lines+markers',
                              line: { color: '#0F766E', width: 3 },
                              marker: { color: '#0F766E', size: 7 }
                            }]}
                            layout={{ ...commonLayout, xaxis: { title: 'Date' }, yaxis: { title: 'Efficiency Score' } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* KMeans Clusters by Distance & Delay */}
                    {clusterScatterData.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">KMeans Clusters by Distance &amp; Delay</h4>
                        <div className="h-[360px]">
                          <Plot
                            data={Array.from(new Set(clusterScatterData.map((row) => String(row.cluster ?? '0')))).map((cId) => {
                              const rows = clusterScatterData.filter((row) => String(row.cluster ?? '0') === cId)
                              return {
                                x: rows.map((row) => Number(row.Route_Distance_km)),
                                y: rows.map((row) => Number(row.Delay_Hours)),
                                mode: 'markers',
                                type: 'scatter',
                                name: `Cluster ${cId}`,
                                marker: { size: 10 }
                              }
                            })}
                            layout={{ ...commonLayout, xaxis: { title: 'Route Distance (km)' }, yaxis: { title: 'Delay (hrs)' }, legend: { orientation: 'h', y: -0.15 } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Correlation Heatmap */}
                    {heatmapData && heatmapData.columns?.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-[#0F172A] mb-4">Correlation Matrix Heatmap</h4>
                        <div className="h-[380px]">
                          <Plot
                            data={[{
                              z: heatmapData.values,
                              x: heatmapData.columns,
                              y: heatmapData.columns,
                              type: 'heatmap',
                              colorscale: [
                                [0, '#DBEAFE'],
                                [0.5, '#93C5FD'],
                                [1, '#0F766E']
                              ],
                              zmin: -1,
                              zmax: 1
                            }]}
                            layout={{ ...commonLayout, margin: { l: 100, r: 20, t: 40, b: 80 } }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}

                  </div>
                </section>

                {/* Route level cost simulation */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Simulation</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Route Level Cost Simulation</h3>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void downloadRowsAsCsv('cost_simulation.csv', costSimulation?.simulation ?? [])}
                      className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0 bg-white border-slate-200 text-slate-700"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Cost Model
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
                    <MetricCard icon={<Package className="h-5 w-5 text-[#0F766E]" />} label="Fuel Cost" value={formatMetric(costSimulation?.total_fuel_cost, 2)} accent="bg-[#ECFDF5]" />
                    <MetricCard icon={<Sparkles className="h-5 w-5 text-[#D97706]" />} label="Distance Cost" value={formatMetric(costSimulation?.total_distance_cost, 2)} accent="bg-[#FFFBEB]" />
                    <MetricCard icon={<Clock className="h-5 w-5 text-[#2563EB]" />} label="Delay Penalty" value={formatMetric(costSimulation?.total_delay_penalty, 2)} accent="bg-[#EFF6FF]" />
                    <MetricCard icon={<Percent className="h-5 w-5 text-[#7C3AED]" />} label="Grand Total" value={formatMetric(costSimulation?.grand_total_cost, 2)} accent="bg-[#F5F3FF]" />
                  </div>

                  {renderTable(
                    costSimulation?.simulation ?? [],
                    ['Route_ID', 'Vehicle_ID', 'Fuel_Cost_INR', 'Distance_Cost_INR', 'Delay_Penalty_INR', 'Total_Route_Cost_INR'],
                    'Route-Level Cost Details'
                  )}
                </section>

                {/* Machine learning models and predictions */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Machine Learning</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A] mb-6">Model Predictions</h3>
                  <div className="space-y-8">

                    {/* RandomForest */}
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-[#0F172A]">1) RandomForest — Predict Actual Travel Hours</h4>
                          <div className="mt-2 flex gap-3 text-sm text-slate-500 font-semibold uppercase tracking-wider">
                            <span>RMSE: {formatMetric(randomForest?.rmse, 3)}</span>
                            <span>R²: {formatMetric(randomForest?.r2, 3)}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => downloadRowsAsCsv('random_forest_predictions.csv', randomForest?.predictions ?? [])}
                          className="rounded-full px-6 py-3 font-bold bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition active:translate-y-0"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download RF Results
                        </Button>
                      </div>
                      {renderTable(randomForest?.predictions ?? [], ['Actual_Travel_Hours', 'Predicted_Travel_Hours'], 'RandomForest predictions')}
                    </div>

                    {/* GradientBoosting */}
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-[#0F172A]">2) GradientBoosting — Predict Actual Fuel Liters</h4>
                          <div className="mt-2 flex gap-3 text-sm text-slate-500 font-semibold uppercase tracking-wider">
                            <span>RMSE: {formatMetric(gradientBoosting?.rmse, 3)}</span>
                            <span>R²: {formatMetric(gradientBoosting?.r2, 3)}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => downloadRowsAsCsv('gradient_boosting_predictions.csv', gradientBoosting?.predictions ?? [])}
                          className="rounded-full px-6 py-3 font-bold bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition active:translate-y-0"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download GB Results
                        </Button>
                      </div>
                      {renderTable(gradientBoosting?.predictions ?? [], ['Actual_Fuel_Liters', 'Predicted_Fuel_Liters'], 'GradientBoosting predictions')}
                    </div>

                    {/* KNN */}
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-[#0F172A]">3) KNN Regressor — Predict Delay Hours</h4>
                          <div className="mt-2 flex gap-3 text-sm text-slate-500 font-semibold uppercase tracking-wider">
                            <span>RMSE: {formatMetric(knn?.rmse, 3)}</span>
                            <span>R²: {formatMetric(knn?.r2, 3)}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => downloadRowsAsCsv('knn_predictions.csv', knn?.predictions ?? [])}
                          className="rounded-full px-6 py-3 font-bold bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition active:translate-y-0"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download KNN Results
                        </Button>
                      </div>
                      {renderTable(knn?.predictions ?? [], ['Actual_Delay_Hours', 'Predicted_Delay_Hours'], 'KNN predictions')}
                    </div>

                    {/* IsolationForest Anomaly */}
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-[#0F172A]">4) Anomaly Detection — IsolationForest</h4>
                          <div className="mt-2 flex gap-3 text-sm text-slate-500 font-semibold uppercase tracking-wider">
                            <span>Anomalies count: {formatMetric(anomalyDetection?.num_anomalies, 0)}</span>
                            <span>Rate: {formatMetric(anomalyDetection?.anomaly_rate, 2)}%</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => downloadRowsAsCsv('anomaly_detection.csv', anomalyDetection?.anomalies ?? [])}
                          className="rounded-full px-6 py-3 font-bold bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition active:translate-y-0"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Anomaly Results
                        </Button>
                      </div>
                      {renderTable(anomalyDetection?.anomalies ?? [], ['Timestamp', 'Vehicle_ID', 'Route_ID', 'Route_Distance_km', 'Actual_Fuel_Liters', 'Fuel_L_per_km', 'Efficiency_Score', 'Delay_Hours', '_is_anomaly'], 'IsolationForest anomalies')}
                    </div>

                  </div>
                </section>

                {/* Automated insights */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Insights</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">Automated Insights</h3>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void downloadRowsAsCsv('insights.csv', insights?.insights ?? [])}
                      className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0 bg-white border-slate-200 text-slate-700"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Insights CSV
                    </Button>
                  </div>
                  {renderTable(insights?.insights ?? [], ['Insight_Type', 'Route_ID', 'Avg_Efficiency', 'Count', 'Avg_Delay_Hours', 'Vehicle_ID', 'Avg_L_per_km'], 'Automated Insights')}
                </section>
              </>
            )}
          </div>
        )}

        {/* ── ACTION PLAYBOOKS TAB ── */}
        {activeTab === 'playbooks' && (
          <div className="space-y-6">
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Actions</p>
              <h2 className="mt-2 text-2xl font-bold text-[#0F172A]">Operations Action Playbooks</h2>
              <p className="mt-2 text-slate-600">Download prioritize playbooks to reassign assets and reduce delays.</p>
            </section>

            {PLAYBOOKS.map((section) => {
              const rows = playbooks?.[section.key] ?? []
              const displayColumns = rows.length ? Object.keys(rows[0]).slice(0, 8) : []
              return (
                <article key={section.key} className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)] hover:shadow-md transition">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-[#0F172A]">
                        {section.title}
                        {section.subtitle ? <span className="ml-2 text-sm font-semibold text-slate-400">({section.subtitle})</span> : null}
                      </h3>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => downloadRowsAsCsv(`${section.key}.csv`, rows)}
                      className="rounded-full px-6 py-3 font-bold bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition active:translate-y-0"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download {section.title}
                    </Button>
                  </div>
                  {renderTable(rows, displayColumns, section.title)}
                </article>
              )
            })}

            {/* Recommendations panel */}
            <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-[#EFF6FF] p-3">
                  <Lightbulb className="h-5 w-5 text-[#2563EB]" />
                </div>
                <h3 className="text-2xl font-bold text-[#0F172A]">Executive Recommendations</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  'Reassign or redesign the 10 least efficient high-fuel routes.',
                  'Audit vehicles with the worst fuel/km and highest delay scores.',
                  'Coach or re-pair drivers/operators flagged by the inefficiency scorecard.',
                  'Avoid high-risk traffic-weather combinations.',
                  'Use ML-predicted travel hours for planning time-critical routes.',
                  'Feed these insights into monthly fleet reviews and vendor contracts.',
                ].map((rec, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#0F766E]" />
                    <span className="text-sm text-slate-600 leading-relaxed font-semibold">{rec}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
        </ProjectOverviewManager>
      </div>
    </div>
  )
}

export default RouteOptimizationPage
