import { useMemo, useState } from 'react'
import type { DashboardConfig } from '@/types/dashboardConfiguration'
import {
  applyDashboardFilters,
  computeChartData,
  computeDashboardKpis,
} from '@/services/dashboardRendererService'
import { KpiCardRenderer } from './KpiCardRenderer'
import { ChartRenderer } from './ChartRenderer'
import { FilterControls } from './FilterControls'
import { Download, FileSpreadsheet, Info } from 'lucide-react'
import { exportToCsvFile, applyMappingToRows } from '@/utils/csvParser'

export interface GenericDashboardRendererProps {
  config: DashboardConfig
  datasetRows: Record<string, any>[]
  title?: string
  description?: string
  onUploadDifferentDataset?: () => void
}

export function GenericDashboardRenderer({
  config,
  datasetRows,
  title,
  description,
  onUploadDifferentDataset,
}: GenericDashboardRendererProps) {
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})

  // Remap rows using columnMapping before filtering and aggregations
  const mappedRows = useMemo(() => {
    if (!config.columnMapping || Object.keys(config.columnMapping).length === 0) {
      return datasetRows
    }
    return applyMappingToRows(datasetRows, config.columnMapping)
  }, [datasetRows, config.columnMapping])

  // Apply active filters to mapped rows
  const filteredRows = useMemo(() => {
    return applyDashboardFilters(mappedRows, activeFilters)
  }, [mappedRows, activeFilters])

  // Compute KPI card values
  const computedKpis = useMemo(() => {
    return computeDashboardKpis(filteredRows, config.kpis || [])
  }, [filteredRows, config.kpis])

  // Compute chart series
  const computedCharts = useMemo(() => {
    return (config.charts || []).map((chart) => computeChartData(filteredRows, chart))
  }, [filteredRows, config.charts])

  const handleFilterChange = (field: string, value: any) => {
    setActiveFilters((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleResetFilters = () => {
    setActiveFilters({})
  }

  const handleExportCsv = () => {
    const filename = `${(title || 'analytics-dashboard').toLowerCase().replace(/\s+/g, '-')}-data`
    exportToCsvFile(filteredRows, filename)
  }

  if (!datasetRows || datasetRows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center">
        <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-4 text-base font-bold text-slate-800">
          {config.emptyStateTitle || 'No dataset loaded for this dashboard'}
        </h3>
        <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto">
          {config.emptyStateDescription ||
            'Upload or attach a compatible CSV dataset in project management to populate analytics.'}
        </p>
        {onUploadDifferentDataset && (
          <button
            type="button"
            onClick={onUploadDifferentDataset}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#0F766E] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0D655E] transition-colors"
          >
            Attach Dataset
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Descriptive Analytics Banner */}
      <div className="flex items-center justify-between rounded-2xl border border-teal-200/80 bg-[#ECFDF5] px-4 py-3 text-xs text-[#0F766E]">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0" />
          <span>
            <strong>Descriptive Telemetry:</strong> Metrics reflect historical & operational sensor aggregations.
            No automated machine-learning predictions are claimed without a registered model runtime.
          </span>
        </div>
        {config.enableExport !== false && (
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#0F766E]/30 bg-white px-3 py-1.5 font-bold text-[#0F766E] shadow-2xs hover:bg-[#F0FDFA] transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV ({filteredRows.length})
          </button>
        )}
      </div>

      {/* Filter Controls */}
      {config.filters && config.filters.length > 0 && (
        <FilterControls
          filters={config.filters}
          datasetRows={mappedRows}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
        />
      )}

      {/* KPI Cards Grid */}
      {computedKpis.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {computedKpis.map((kpi) => (
            <KpiCardRenderer key={kpi.id} kpi={kpi} />
          ))}
        </div>
      )}

      {/* Charts Grid */}
      {computedCharts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {computedCharts.map((chartData) => (
            <ChartRenderer key={chartData.config.id} chartData={chartData} />
          ))}
        </div>
      )}
    </div>
  )
}
