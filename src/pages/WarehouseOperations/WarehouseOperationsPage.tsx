import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
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
  Package,
  AlertCircle,
  Percent,
  CalendarRange,
  Lightbulb,
  MapPin,
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'
import { ProjectOverviewManager, EditableOverviewSection } from '@/components/project-content'

import {
  applyColumnMapping,
  downloadFilteredCsv,
  filterData,
  getChartData,
  getClusters,
  getCsvColumns,
  getInsights,
  getPlaybooks,
  loadDefaultDataset,
  runDelayPredictor,
  runPickTimePredictor,
  runProductivityPredictor,
  uploadCsv,
} from '@/services/warehouseOperationsApi'

import type {
  WarehouseOperationsChartResponse,
  WarehouseOperationsClusterResponse,
  WarehouseOperationsDatasetResponse,
  WarehouseOperationsFilterResponse,
  WarehouseOperationsInsightsResponse,
  WarehouseOperationsMlResponse,
  WarehouseOperationsMode,
  WarehouseOperationsPlaybooksResponse,
  WarehouseOperationsRow,
} from '@/types/warehouseOperations'

import PickQtyDistribution from './components/charts/PickQtyDistribution'
import TravelDistanceOverTime from './components/charts/TravelDistanceOverTime'
import ZoneHeatmapActivity from './components/charts/ZoneHeatmapActivity'
import SlottingScoreSkuClass from './components/charts/SlottingScoreSkuClass'
import DelayReasonsDistribution from './components/charts/DelayReasonsDistribution'
import TravelTimeVsDistance from './components/charts/TravelTimeVsDistance'
import EquipmentUsage from './components/charts/EquipmentUsage'
import PickerProductivityDistribution from './components/charts/PickerProductivityDistribution'
import CongestionFactorWarehouse from './components/charts/CongestionFactorWarehouse'
import SkuWeightDistribution from './components/charts/SkuWeightDistribution'
import PickPackTime from './components/charts/PickPackTime'
import HeatmapLevelOverTime from './components/charts/HeatmapLevelOverTime'
import AisleCongestion from './components/charts/AisleCongestion'
import ProductivityShift from './components/charts/ProductivityShift'
import DelayDurationDistribution from './components/charts/DelayDurationDistribution'
import ClusterScatter from './components/charts/ClusterScatter'

const REQUIRED_COLUMNS = [
  { column: 'Order_ID', type: 'Categorical', description: 'Unique identifier of the customer order' },
  { column: 'Warehouse', type: 'Categorical', description: 'Warehouse / FC identifier' },
  { column: 'Zone', type: 'Categorical', description: 'Warehouse zone / segment' },
  { column: 'Aisle', type: 'Categorical', description: 'Aisle where items are stored' },
  { column: 'Bin', type: 'Categorical', description: 'Bin / location code for SKU' },
  { column: 'Order_Timestamp', type: 'Datetime', description: 'Timestamp when order was created / released' },
  { column: 'Shift', type: 'Categorical', description: 'Shift (Morning, Afternoon, Night)' },
  { column: 'Picker_ID', type: 'Categorical', description: 'Picker ID' },
  { column: 'SKU', type: 'Categorical', description: 'Stock Keeping Unit' },
  { column: 'SKU_Weight_KG', type: 'Numeric', description: 'SKU Weight' },
  { column: 'SKU_Cube_M3', type: 'Numeric', description: 'SKU Volume' },
  { column: 'SKU_Class', type: 'Categorical', description: 'SKU ABC Class' },
  { column: 'Pick_Qty', type: 'Numeric', description: 'Quantity Picked' },
  { column: 'Travel_Distance_M', type: 'Numeric', description: 'Travel Distance' },
  { column: 'Travel_Time_Sec', type: 'Numeric', description: 'Travel Time' },
  { column: 'Pick_Time_Sec', type: 'Numeric', description: 'Pick Time' },
  { column: 'Pack_Time_Sec', type: 'Numeric', description: 'Pack Time' },
  { column: 'Heatmap_Level', type: 'Numeric', description: 'Congestion Heat Level' },
  { column: 'Slotting_Score', type: 'Numeric', description: 'Slotting Optimization Score' },
  { column: 'Equipment_Type', type: 'Categorical', description: 'Equipment Used' },
  { column: 'Picker_Productivity_Items_Hour', type: 'Numeric', description: 'Productivity' },
  { column: 'Congestion_Factor', type: 'Numeric', description: 'Congestion Metric' },
  { column: 'Delay_Reason', type: 'Categorical', description: 'Delay Category' },
  { column: 'Delay_Minutes', type: 'Numeric', description: 'Delay Duration' },
]

const INDEPENDENT_VARIABLES = [
  'Warehouse',
  'Zone',
  'Aisle',
  'Bin',
  'Order_Timestamp',
  'Shift',
  'Picker_ID',
  'SKU',
  'SKU_Weight_KG',
  'SKU_Cube_M3',
  'SKU_Class',
  'Pick_Qty',
  'Travel_Distance_M',
  'Travel_Time_Sec',
  'Heatmap_Level',
  'Slotting_Score',
  'Equipment_Type',
  'Congestion_Factor',
  'Delay_Reason',
]

const DEPENDENT_VARIABLES = [
  'Pick_Time_Sec',
  'Delay_Minutes',
  'Picker_Productivity_Items_Hour',
  'Pack_Time_Sec',
]

const MAPPING_FIELDS = REQUIRED_COLUMNS.map((col) => col.column)

const PREVIEW_COLUMNS = REQUIRED_COLUMNS.map((col) => col.column)

const DEFAULT_FIELD_MAP: Record<string, string> = MAPPING_FIELDS.reduce((acc, field) => {
  acc[field] = field
  return acc
}, {} as Record<string, string>)

const PLAYBOOKS = [
  { Action: 'Reassign congested aisles', Rationale: 'Divert picks away from aisles with persistent high Heatmap_Level and Congestion_Factor.' },
  { Action: 'Relocate slow-moving SKUs', Rationale: 'Move low-velocity SKUs to deeper locations; free golden zones for Class A SKUs.' },
  { Action: 'Picker retraining', Rationale: 'Target pickers in the bottom productivity quartile for coaching and SOP refresh.' },
  { Action: 'Forklift / AMR scheduling', Rationale: 'Assign AMRs or forklifts to long-distance routes and heavy SKUs to cut travel time.' },
  { Action: 'Travel-time reduction', Rationale: 'Group orders and routes by Zone/Aisle to minimise zig-zag walk patterns.' },
  { Action: 'Congestion hotfix', Rationale: 'Stagger high-volume picks across shifts or windows to flatten heatmap spikes.' },
  { Action: 'Slotting optimisation', Rationale: 'Increase Slotting_Score for high-frequency SKUs by bringing them closer to docks.' },
  { Action: 'Delay elimination', Rationale: 'Use Delay_Reason stats to run focused kaizen events on top-3 root causes.' },
]

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

function downloadSampleCsv() {
  const sample = [
    ['Order_ID', 'Warehouse', 'Zone', 'Aisle', 'Bin', 'Order_Timestamp', 'Shift', 'Picker_ID', 'SKU', 'SKU_Weight_KG', 'SKU_Cube_M3', 'SKU_Class', 'Pick_Qty', 'Travel_Distance_M', 'Travel_Time_Sec', 'Pick_Time_Sec', 'Pack_Time_Sec', 'Heatmap_Level', 'Slotting_Score', 'Equipment_Type', 'Picker_Productivity_Items_Hour', 'Congestion_Factor', 'Delay_Reason', 'Delay_Minutes'],
    ['ORD1001', 'WH_North', 'Zone_A', 'Aisle_12', 'Bin_04', '2023-06-15 08:30:00', 'Morning', 'PK_042', 'SKU_90234', '12.4', '0.045', 'A', '3', '45.2', '72', '120', '45', '2', '85.5', 'Forklift', '150.0', '1.2', 'None', '0.0'],
    ['ORD1002', 'WH_North', 'Zone_B', 'Aisle_18', 'Bin_12', '2023-06-15 09:15:00', 'Morning', 'PK_018', 'SKU_11234', '1.8', '0.005', 'C', '1', '12.6', '24', '35', '18', '4', '62.1', 'Hand_Cart', '95.0', '2.8', 'Aisle Congestion', '4.5'],
  ]
  const csv = sample.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'warehouse_operations_sample.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function createRequiredColumnsCsv() {
  const rows = REQUIRED_COLUMNS.map((row) => [row.column, row.type, row.description])
  const csv = ['Column,Type,Description', ...rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'warehouse_operations_required_columns.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function downloadRowsAsCsv(filename: string, rows: WarehouseOperationsRow[]) {
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

function renderTable(rows: WarehouseOperationsRow[], columns: string[], title: string) {
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

export function WarehouseOperationsPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mappingInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [mode, setMode] = useState<WarehouseOperationsMode>('default')
  const [data, setData] = useState<WarehouseOperationsRow[]>([])
  const [filteredRows, setFilteredRows] = useState<WarehouseOperationsRow[]>([])
  const [previewRows, setPreviewRows] = useState<WarehouseOperationsRow[]>([])
  
  const [warehouses, setWarehouses] = useState<string[]>([])
  const [shifts, setShifts] = useState<string[]>([])
  const [pickerIds, setPickerIds] = useState<string[]>([])
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([])
  const [selectedShifts, setSelectedShifts] = useState<string[]>([])
  const [selectedPickerIds, setSelectedPickerIds] = useState<string[]>([])
  
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [loadStatus, setLoadStatus] = useState('Default dataset not loaded yet.')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [mappingFile, setMappingFile] = useState<File | null>(null)
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [mappingColumns, setMappingColumns] = useState<Record<string, string>>(DEFAULT_FIELD_MAP)
  
  const [kpis, setKpis] = useState<WarehouseOperationsFilterResponse['kpis'] | null>(null)
  const [charts, setCharts] = useState<WarehouseOperationsChartResponse | null>(null)
  const [clusters, setClusters] = useState<WarehouseOperationsClusterResponse | null>(null)
  const [pickTimeMl, setPickTimeMl] = useState<WarehouseOperationsMlResponse | null>(null)
  const [delayMl, setDelayMl] = useState<WarehouseOperationsMlResponse | null>(null)
  const [productivityMl, setProductivityMl] = useState<WarehouseOperationsMlResponse | null>(null)
  const [insights, setInsights] = useState<WarehouseOperationsInsightsResponse | null>(null)
  const [playbooks, setPlaybooks] = useState<WarehouseOperationsRow[]>(PLAYBOOKS)

  useEffect(() => {
    void loadDefaultData()
    void getPlaybooks().then((res) => {
      if (res.playbooks) {
        setPlaybooks(res.playbooks)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!data.length) return
    const timer = window.setTimeout(() => {
      void applyCurrentFilters(data)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [data, selectedWarehouses, selectedShifts, selectedPickerIds, dateStart, dateEnd])

  async function loadDefaultData() {
    setLoading(true)
    setError(null)
    setMode('default')
    try {
      const response: WarehouseOperationsDatasetResponse = await loadDefaultDataset()
      const rows = response.data ?? []
      setData(rows)
      setPreviewRows(response.preview ?? rows.slice(0, 10))
      setWarehouses(response.warehouses ?? [])
      setShifts(response.shifts ?? [])
      setPickerIds(response.picker_ids ?? [])
      setSelectedWarehouses([])
      setSelectedShifts([])
      setSelectedPickerIds([])
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
      setWarehouses(response.warehouses ?? [])
      setShifts(response.shifts ?? [])
      setPickerIds(response.picker_ids || Array.from(new Set(rows.map((r) => r.Picker_ID).filter(Boolean))).slice(0, 50) as string[])
      setSelectedWarehouses([])
      setSelectedShifts([])
      setSelectedPickerIds([])
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
      setData(rows)
      setPreviewRows(response.preview ?? rows.slice(0, 10))
      setWarehouses(response.warehouses ?? [])
      setShifts(response.shifts ?? [])
      setPickerIds(response.picker_ids || Array.from(new Set(rows.map((r) => r.Picker_ID).filter(Boolean))).slice(0, 50) as string[])
      setSelectedWarehouses([])
      setSelectedShifts([])
      setSelectedPickerIds([])
      setLoadStatus('Mapping applied successfully.')
      await applyCurrentFilters(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mapping failed.')
    } finally {
      setLoading(false)
    }
  }

  async function applyCurrentFilters(rows: WarehouseOperationsRow[]) {
    if (!rows.length) {
      setFilteredRows([])
      setKpis(null)
      setCharts(null)
      setClusters(null)
      setPickTimeMl(null)
      setDelayMl(null)
      setProductivityMl(null)
      setInsights(null)
      return
    }
    try {
      const filterResponse = await filterData({
        data: rows,
        warehouses: selectedWarehouses.length ? selectedWarehouses : undefined,
        shifts: selectedShifts.length ? selectedShifts : undefined,
        picker_ids: selectedPickerIds.length ? selectedPickerIds : undefined,
        date_start: dateStart || undefined,
        date_end: dateEnd || undefined,
      })
      const selectedRows = filterResponse.data ?? rows
      setFilteredRows(selectedRows)
      setKpis(filterResponse.kpis)

      const [chartsResponse, clustersResponse, ptMlResponse, dlMlResponse, prodMlResponse, insightsResponse] = await Promise.all([
        getChartData(selectedRows).catch(() => null),
        getClusters(selectedRows).catch(() => null),
        runPickTimePredictor(selectedRows).catch(() => null),
        runDelayPredictor(selectedRows).catch(() => null),
        runProductivityPredictor(selectedRows).catch(() => null),
        getInsights(selectedRows).catch(() => null),
      ])

      setCharts(chartsResponse)
      setClusters(clustersResponse)
      setPickTimeMl(ptMlResponse)
      setDelayMl(dlMlResponse)
      setProductivityMl(prodMlResponse)
      setInsights(insightsResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Filter application failed.')
      setFilteredRows(rows)
    }
  }

  async function handleDownloadFiltered() {
    try {
      const blob = await downloadFilteredCsv(filteredRows.length ? filteredRows : data)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'filtered_warehouse_operations_data.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      downloadRowsAsCsv('filtered_warehouse_operations_data.csv', filteredRows.length ? filteredRows : data)
    }
  }

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'dictionary', label: 'Data Dictionary' },
    { key: 'application', label: 'Application' },
    { key: 'playbooks', label: 'Action Playbooks' },
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F8FBFF_100%)]">
      <div className="mx-auto max-w-[95%] xl:max-w-[1550px] px-4 py-8 sm:px-6 lg:px-8">
        
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
            Logistics &amp; Supply Chain &nbsp;•&nbsp; Warehouse Operations Analytics
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#0F172A] sm:text-5xl">
            Warehouse Operations Analytics
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-600">
            Analyse picking efficiency, slotting layout, congestion bottlenecks, picker productivity, and equipment utilization.
          </p>
        </div>

        <ProjectOverviewManager
          projectSlug="warehouse-operations-analytics"
          projectTitle="Warehouse Operations Analytics"
          systemTabs={TABS}
          activeTab={activeTab}
          onTabChange={(t) => setActiveTab(t as TabKey)}
          renderOverviewContent={(sections, onEdit, onDelete) => {
            const purposeSec = sections.find((s) => s.id === 'purpose') || {
              id: 'purpose',
              projectSlug: 'warehouse-operations-analytics',
              title: 'Purpose',
              eyebrow: 'Overview',
              content:
                'Optimize fulfillment flows by identifying congestion zones, rebalancing picking patterns, and training staff based on ML productivity scorecards.',
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
                  <MetricCard icon={<Package className="h-5 w-5 text-[#0F766E]" />} label="Total Orders" value={formatMetric(kpis?.total_orders, 0)} accent="bg-[#ECFDF5]" />
                  <MetricCard icon={<Clock className="h-5 w-5 text-[#D97706]" />} label="Avg Pick Time" value={formatMetric(kpis?.avg_pick_time_sec, 1) !== '—' ? `${formatMetric(kpis?.avg_pick_time_sec, 1)}s` : '—'} accent="bg-[#FFFBEB]" />
                  <MetricCard icon={<TrendingUp className="h-5 w-5 text-[#2563EB]" />} label="Avg Travel Time" value={formatMetric(kpis?.avg_travel_time_sec, 1) !== '—' ? `${formatMetric(kpis?.avg_travel_time_sec, 1)}s` : '—'} accent="bg-[#EFF6FF]" />
                  <MetricCard icon={<AlertCircle className="h-5 w-5 text-[#7C3AED]" />} label="Avg Heatmap Level" value={formatMetric(kpis?.avg_heatmap_level, 2)} accent="bg-[#F5F3FF]" />
                  <MetricCard icon={<Sparkles className="h-5 w-5 text-[#10B981]" />} label="Avg Productivity" value={formatMetric(kpis?.avg_productivity, 1) !== '—' ? `${formatMetric(kpis?.avg_productivity, 1)} items/hr` : '—'} accent="bg-[#ECFDF5]" />
                </div>

                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <h3 className="text-2xl font-bold text-[#0F172A] mb-6">User Guide — Who Should Use &amp; How</h3>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-6">
                      <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0F766E] mb-3">Target Users</p>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        Warehouse managers, fulfillment center operations heads, industrial engineers, supply chain designers, and process improvement leaders looking to eliminate fulfillment delay root causes.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-6">
                      <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0F766E] mb-3">Standard Workflow</p>
                      <ol className="space-y-2 text-slate-600 text-sm">
                        <li className="flex gap-2"><span className="font-bold text-[#0F766E]">1.</span> Load operations dataset (default sample or upload custom CSV)</li>
                        <li className="flex gap-2"><span className="font-bold text-[#0F766E]">2.</span> Filter by warehouse, shift, and picker ID</li>
                        <li className="flex gap-2"><span className="font-bold text-[#0F766E]">3.</span> Audit pick times, slotting scores, and travel distance distributions</li>
                        <li className="flex gap-2"><span className="font-bold text-[#0F766E]">4.</span> Generate ML productivity scorecards and download operational playbooks</li>
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
              {renderTable(REQUIRED_COLUMNS as unknown as WarehouseOperationsRow[], ['column', 'type', 'description'], 'Data Dictionary')}
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
                  onClick={createRequiredColumnsCsv}
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
              <p className="mt-2 text-slate-600">Load standard warehouse logs or import custom picker records.</p>

              <div className="mt-6 flex flex-wrap gap-3">
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
                <p className="mt-2 mb-6 text-slate-600">Assign columns in your CSV to match Warehouse Operations variables.</p>
                {mappingFile && (
                  <div className="mb-6 flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-[#0F766E]" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{mappingFile.name}</p>
                        <p className="text-xs text-slate-500">{(mappingFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => { setMappingFile(null); setAvailableColumns([]); setMode('mapping'); }} className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100" aria-label="Clear mapping file">
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
                          onClick={downloadSampleCsv}
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
                      label="Warehouse"
                      values={warehouses}
                      selected={selectedWarehouses}
                      onToggle={(val) => setSelectedWarehouses((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val])}
                    />
                    <SelectableFilter
                      label="Shift"
                      values={shifts}
                      selected={selectedShifts}
                      onToggle={(val) => setSelectedShifts((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val])}
                    />
                    <SelectableFilter
                      label="Picker ID"
                      values={pickerIds}
                      selected={selectedPickerIds}
                      onToggle={(val) => setSelectedPickerIds((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val])}
                    />
                  </div>

                  <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-[#0F766E]/30 w-full lg:w-1/2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#0F766E]">Order Period</p>
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
                      onClick={handleDownloadFiltered}
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
                    <MetricCard icon={<Package className="h-5 w-5 text-[#0F766E]" />} label="Orders in selection" value={formatMetric(kpis?.total_orders, 0)} accent="bg-[#ECFDF5]" />
                    <MetricCard icon={<Clock className="h-5 w-5 text-[#D97706]" />} label="Avg Pick Time" value={formatMetric(kpis?.avg_pick_time_sec, 1) !== '—' ? `${formatMetric(kpis?.avg_pick_time_sec, 1)}s` : '—'} accent="bg-[#FFFBEB]" />
                    <MetricCard icon={<TrendingUp className="h-5 w-5 text-[#2563EB]" />} label="Avg Travel Time" value={formatMetric(kpis?.avg_travel_time_sec, 1) !== '—' ? `${formatMetric(kpis?.avg_travel_time_sec, 1)}s` : '—'} accent="bg-[#EFF6FF]" />
                    <MetricCard icon={<AlertCircle className="h-5 w-5 text-[#7C3AED]" />} label="Avg Heatmap Level" value={formatMetric(kpis?.avg_heatmap_level, 2)} accent="bg-[#F5F3FF]" />
                    <MetricCard icon={<Sparkles className="h-5 w-5 text-[#10B981]" />} label="Avg Productivity" value={formatMetric(kpis?.avg_productivity, 1) !== '—' ? `${formatMetric(kpis?.avg_productivity, 1)} items/hr` : '—'} accent="bg-[#ECFDF5]" />
                  </div>
                </section>

                {/* Exploratory Analysis Charts */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">EDA</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A] mb-6">Charts &amp; Visualisations</h3>
                  
                  {/* Single Column Layout of 15 imported charts */}
                  <div className="grid grid-cols-1 gap-6">
                    <PickQtyDistribution data={charts?.pick_qty_distribution ?? []} />
                    <TravelDistanceOverTime data={charts?.travel_distance_over_time ?? []} />
                    <ZoneHeatmapActivity data={charts?.zone_heatmap_activity ?? []} />
                    <SlottingScoreSkuClass data={charts?.slotting_score_by_sku_class ?? []} />
                    <DelayReasonsDistribution data={charts?.delay_reasons ?? []} />
                    <TravelTimeVsDistance data={charts?.travel_time_vs_distance ?? []} />
                    <EquipmentUsage data={charts?.equipment_usage ?? []} />
                    <PickerProductivityDistribution data={charts?.picker_productivity_distribution ?? []} />
                    <CongestionFactorWarehouse data={charts?.congestion_by_warehouse ?? []} />
                    <SkuWeightDistribution data={charts?.sku_weight_distribution ?? []} />
                    <PickPackTime data={charts?.pick_vs_pack_time ?? []} />
                    <HeatmapLevelOverTime data={charts?.heatmap_over_time ?? []} />
                    <AisleCongestion data={filteredRows.length ? filteredRows : previewRows} />
                    <ProductivityShift data={charts?.productivity_by_shift ?? []} />
                    <DelayDurationDistribution data={charts?.delay_duration_distribution ?? []} />
                  </div>
                </section>

                {/* Machine learning models and predictions */}
                <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">Machine Learning</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A] mb-6">Model Predictions</h3>
                  <div className="space-y-8">

                    {/* RandomForest Pick Time */}
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-[#0F172A]">1. Predict Pick Time (RandomForestRegressor)</h4>
                          <div className="mt-2 flex gap-3 text-sm text-slate-500 font-semibold uppercase tracking-wider">
                            <span>RMSE: {formatMetric(pickTimeMl?.rmse, 3)}</span>
                            <span>R²: {formatMetric(pickTimeMl?.r2, 3)}</span>
                            <span>Train size: {pickTimeMl?.train_size ?? '—'}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => downloadRowsAsCsv('pick_time_predictions.csv', pickTimeMl?.predictions ?? [])}
                          className="rounded-full px-6 py-3 font-bold bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition active:translate-y-0"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Predictions
                        </Button>
                      </div>
                      {renderTable(pickTimeMl?.predictions ?? [], ['Actual_Pick_Time_Sec', 'Predicted_Pick_Time_Sec'], 'Pick Time Regressor')}
                    </div>

                    {/* KMeans Cluster */}
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 space-y-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h4 className="text-lg font-bold text-[#0F172A]">2. Congestion Pattern Clustering (KMeans Cluster)</h4>
                          <p className="text-sm text-[#475569]">Groups warehouse picks by Heatmap, Congestion, and Pick Quantity.</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleDownloadFiltered}
                          className="rounded-full px-6 py-3 font-bold bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition active:translate-y-0"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Clusters Distribution
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-6">
                        {renderTable(clusters?.cluster_counts ?? [], ['Cluster', 'Count'], 'Cluster counts')}
                        <ClusterScatter data={clusters?.scatter_data ?? []} />
                      </div>
                    </div>

                    {/* GradientBoosting Delay */}
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-[#0F172A]">3. Predict Delay Minutes (GradientBoostingRegressor)</h4>
                          <div className="mt-2 flex gap-3 text-sm text-slate-500 font-semibold uppercase tracking-wider">
                            <span>RMSE: {formatMetric(delayMl?.rmse, 3)}</span>
                            <span>R²: {formatMetric(delayMl?.r2, 3)}</span>
                            <span>Train size: {delayMl?.train_size ?? '—'}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => downloadRowsAsCsv('delay_predictions.csv', delayMl?.predictions ?? [])}
                          className="rounded-full px-6 py-3 font-bold bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition active:translate-y-0"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Predictions
                        </Button>
                      </div>
                      {renderTable(delayMl?.predictions ?? [], ['Actual_Delay_Min', 'Predicted_Delay_Min'], 'Delay regressor')}
                    </div>

                    {/* RandomForest Picker Productivity */}
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-[#0F172A]">4. Predict Picker Productivity (RandomForestRegressor)</h4>
                          <div className="mt-2 flex gap-3 text-sm text-slate-500 font-semibold uppercase tracking-wider">
                            <span>RMSE: {formatMetric(productivityMl?.rmse, 3)}</span>
                            <span>R²: {formatMetric(productivityMl?.r2, 3)}</span>
                            <span>Train size: {productivityMl?.train_size ?? '—'}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => downloadRowsAsCsv('picker_productivity_predictions.csv', productivityMl?.predictions ?? [])}
                          className="rounded-full px-6 py-3 font-bold bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition active:translate-y-0"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Predictions
                        </Button>
                      </div>
                      {renderTable(productivityMl?.predictions ?? [], ['Actual_Productivity', 'Predicted_Productivity'], 'Productivity regressor')}
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
                      onClick={() => downloadRowsAsCsv('warehouse_operations_insights.csv', insights?.insights ?? [])}
                      className="rounded-full px-6 py-3 font-bold hover:-translate-y-0.5 transition active:translate-y-0 bg-white border-slate-200 text-slate-700"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Insights CSV
                    </Button>
                  </div>
                  {renderTable(insights?.insights ?? [], ['Insight', 'Value', 'Detail'], 'Automated Insights')}
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
              <p className="mt-2 text-slate-600">Download prioritized recommendation matrices to redesign warehouse floor patterns.</p>
            </section>

            <article className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)] hover:shadow-md transition">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[#0F172A]">Action Recommendations</h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => downloadRowsAsCsv('warehouse_playbooks.csv', playbooks)}
                  className="rounded-full px-6 py-3 font-bold bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition active:translate-y-0"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Playbooks
                </Button>
              </div>
              {renderTable(playbooks, ['Action', 'Rationale'], 'Action Recommendations')}
            </article>

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
                  'Prioritise slotting optimisation for Class A SKUs to reduce avg travel distance.',
                  'Reroute or stagger picks in high-congestion aisles to flatline heatmap spikes.',
                  'Schedule AMRs / Forklifts for heavier SKU weights to reduce picker fatigue and travel duration.',
                  'Target bottom quartile pickers for training on standard SOP workflows.',
                  'Conduct root-cause kaizen events on the highest frequency delay categories.',
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

export default WarehouseOperationsPage
