import { useState } from 'react'
import type {
  AggregationMethod,
  ChartConfig,
  ChartType,
  DashboardConfig,
  KpiCardConfig,
} from '@/types/dashboardConfiguration'
import {
  BarChart2,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Plus,
  Sliders,
  Sparkles,
  Trash2,
} from 'lucide-react'

export interface DashboardConfigBuilderProps {
  config: DashboardConfig
  availableColumns: string[]
  onChange: (updated: DashboardConfig) => void
}

export function DashboardConfigBuilder({
  config,
  availableColumns,
  onChange,
}: DashboardConfigBuilderProps) {
  const [activeTab, setActiveTab] = useState<'kpis' | 'charts' | 'filters'>('kpis')

  // KPI Card Handlers
  const handleAddKpi = () => {
    const newKpi: KpiCardConfig = {
      id: `kpi_${Date.now()}`,
      title: 'New Metric',
      field: availableColumns[0] || '',
      aggregation: 'count',
      format: 'integer',
      colorTheme: 'teal',
      description: 'Fleet summary metric',
    }
    onChange({
      ...config,
      kpis: [...(config.kpis || []), newKpi],
    })
  }

  const handleUpdateKpi = (idx: number, patch: Partial<KpiCardConfig>) => {
    const updated = [...(config.kpis || [])]
    updated[idx] = { ...updated[idx], ...patch }
    onChange({ ...config, kpis: updated })
  }

  const handleRemoveKpi = (idx: number) => {
    const updated = [...(config.kpis || [])]
    updated.splice(idx, 1)
    onChange({ ...config, kpis: updated })
  }

  // Chart Handlers
  const handleAddChart = () => {
    const newChart: ChartConfig = {
      id: `chart_${Date.now()}`,
      title: 'New Visualization',
      chartType: 'bar',
      xField: availableColumns[0] || '',
      yField: availableColumns[1] || availableColumns[0] || '',
      aggregation: 'avg',
      columnSpan: 2,
      colorScheme: 'teal',
    }
    onChange({
      ...config,
      charts: [...(config.charts || []), newChart],
    })
  }

  const handleUpdateChart = (idx: number, patch: Partial<ChartConfig>) => {
    const updated = [...(config.charts || [])]
    updated[idx] = { ...updated[idx], ...patch }
    onChange({ ...config, charts: updated })
  }

  const handleRemoveChart = (idx: number) => {
    const updated = [...(config.charts || [])]
    updated.splice(idx, 1)
    onChange({ ...config, charts: updated })
  }

  // Filter Handlers
  const handleAddFilter = () => {
    if (availableColumns.length === 0) return
    const newFilter = {
      id: `filter_${Date.now()}`,
      field: availableColumns[0],
      label: availableColumns[0].replace(/_/g, ' '),
      filterType: 'select' as const,
    }
    onChange({
      ...config,
      filters: [...(config.filters || []), newFilter],
    })
  }

  const handleRemoveFilter = (idx: number) => {
    const updated = [...(config.filters || [])]
    updated.splice(idx, 1)
    onChange({ ...config, filters: updated })
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h4 className="text-base font-bold text-[#0F172A]">Visual Dashboard Configuration</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure declarative KPI cards, visual charts, and interactive slice-and-dice filters.
          </p>
        </div>
        <div className="flex rounded-2xl bg-slate-100 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('kpis')}
            className={`rounded-xl px-4 py-2 transition-all ${
              activeTab === 'kpis'
                ? 'bg-white text-[#0F766E] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            KPI Cards ({config.kpis?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('charts')}
            className={`rounded-xl px-4 py-2 transition-all ${
              activeTab === 'charts'
                ? 'bg-white text-[#0F766E] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Charts & Visuals ({config.charts?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('filters')}
            className={`rounded-xl px-4 py-2 transition-all ${
              activeTab === 'filters'
                ? 'bg-white text-[#0F766E] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Filters ({config.filters?.length || 0})
          </button>
        </div>
      </div>

      {/* ── KPI CARDS BUILDER ────────────────────────────────────────────── */}
      {activeTab === 'kpis' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Configured KPI Summary Cards
            </span>
            <button
              type="button"
              onClick={handleAddKpi}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#0F766E] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] transition-colors"
            >
              <Plus className="h-4 w-4" /> Add KPI Card
            </button>
          </div>

          <div className="space-y-4">
            {(!config.kpis || config.kpis.length === 0) && (
              <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                No KPI cards configured. Click "Add KPI Card" above.
              </p>
            )}

            {config.kpis?.map((kpi, idx) => (
              <div
                key={kpi.id}
                className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4.5 space-y-3 transition-colors hover:border-slate-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-2xs font-bold text-slate-700">
                      KPI #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={kpi.title}
                      onChange={(e) => handleUpdateKpi(idx, { title: e.target.value })}
                      placeholder="KPI Title"
                      className="rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0F766E]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveKpi(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Remove KPI"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-2xs font-semibold text-slate-500 block mb-1">Target Field</label>
                    <select
                      value={kpi.field || ''}
                      onChange={(e) => handleUpdateKpi(idx, { field: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700"
                    >
                      <option value="">(None - Record Count)</option>
                      {availableColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-2xs font-semibold text-slate-500 block mb-1">Aggregation</label>
                    <select
                      value={kpi.aggregation || 'count'}
                      onChange={(e) =>
                        handleUpdateKpi(idx, { aggregation: e.target.value as AggregationMethod })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700"
                    >
                      <option value="count">Count Rows</option>
                      <option value="distinct_count">Distinct Count</option>
                      <option value="sum">Sum</option>
                      <option value="avg">Average</option>
                      <option value="min">Minimum</option>
                      <option value="max">Maximum</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-2xs font-semibold text-slate-500 block mb-1">Format & Unit</label>
                    <div className="flex gap-1.5">
                      <select
                        value={kpi.format || 'number'}
                        onChange={(e) => handleUpdateKpi(idx, { format: e.target.value as any })}
                        className="w-1/2 rounded-xl border border-slate-300 bg-white px-2 py-1.5 font-semibold text-slate-700"
                      >
                        <option value="number">Decimal</option>
                        <option value="integer">Integer</option>
                        <option value="percent">Percent</option>
                        <option value="currency">Currency ($)</option>
                      </select>
                      <input
                        type="text"
                        value={kpi.unit || ''}
                        onChange={(e) => handleUpdateKpi(idx, { unit: e.target.value })}
                        placeholder="Unit (e.g. °C)"
                        className="w-1/2 rounded-xl border border-slate-300 bg-white px-2 py-1.5 font-semibold text-slate-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-2xs font-semibold text-slate-500 block mb-1">Color Theme</label>
                    <select
                      value={kpi.colorTheme || 'teal'}
                      onChange={(e) => handleUpdateKpi(idx, { colorTheme: e.target.value as any })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700"
                    >
                      <option value="teal">Teal (Primary)</option>
                      <option value="blue">Blue</option>
                      <option value="emerald">Emerald</option>
                      <option value="amber">Amber</option>
                      <option value="rose">Rose (Alert)</option>
                      <option value="slate">Slate</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CHARTS BUILDER ──────────────────────────────────────────────── */}
      {activeTab === 'charts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Configured Visualizations
            </span>
            <button
              type="button"
              onClick={handleAddChart}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#0F766E] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Chart
            </button>
          </div>

          <div className="space-y-4">
            {(!config.charts || config.charts.length === 0) && (
              <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                No charts configured. Click "Add Chart" to visualize data.
              </p>
            )}

            {config.charts?.map((chart, idx) => (
              <div
                key={chart.id}
                className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4.5 space-y-3 transition-colors hover:border-slate-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-2xs font-bold text-slate-700">
                      Chart #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={chart.title}
                      onChange={(e) => handleUpdateChart(idx, { title: e.target.value })}
                      placeholder="Chart Title"
                      className="rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0F766E]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveChart(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Remove Chart"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-2xs font-semibold text-slate-500 block mb-1">Chart Type</label>
                    <select
                      value={chart.chartType}
                      onChange={(e) => handleUpdateChart(idx, { chartType: e.target.value as ChartType })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700"
                    >
                      <option value="bar">Bar Chart</option>
                      <option value="line">Line Chart</option>
                      <option value="pie">Pie Chart</option>
                      <option value="donut">Donut Chart</option>
                      <option value="histogram">Histogram / Frequency</option>
                      <option value="table">Data Table</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-2xs font-semibold text-slate-500 block mb-1">
                      X-Axis / Category Field
                    </label>
                    <select
                      value={chart.xField}
                      onChange={(e) => handleUpdateChart(idx, { xField: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700"
                    >
                      {availableColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-2xs font-semibold text-slate-500 block mb-1">
                      Y-Axis Metric & Aggregation
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        value={chart.yField || ''}
                        onChange={(e) => handleUpdateChart(idx, { yField: e.target.value })}
                        disabled={chart.chartType === 'histogram' || chart.chartType === 'table'}
                        className="w-1/2 rounded-xl border border-slate-300 bg-white px-2 py-1.5 font-semibold text-slate-700 disabled:opacity-50"
                      >
                        <option value="">(Count Rows)</option>
                        {availableColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                      <select
                        value={chart.aggregation || 'avg'}
                        onChange={(e) =>
                          handleUpdateChart(idx, { aggregation: e.target.value as AggregationMethod })
                        }
                        disabled={chart.chartType === 'histogram' || chart.chartType === 'table'}
                        className="w-1/2 rounded-xl border border-slate-300 bg-white px-2 py-1.5 font-semibold text-slate-700 disabled:opacity-50"
                      >
                        <option value="avg">Avg</option>
                        <option value="sum">Sum</option>
                        <option value="count">Count</option>
                        <option value="min">Min</option>
                        <option value="max">Max</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-2xs font-semibold text-slate-500 block mb-1">Grid Column Span</label>
                    <select
                      value={chart.columnSpan || 2}
                      onChange={(e) => handleUpdateChart(idx, { columnSpan: Number(e.target.value) as any })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700"
                    >
                      <option value={1}>1 Column (Small)</option>
                      <option value={2}>2 Columns (Half Width)</option>
                      <option value={3}>3 Columns (75% Width)</option>
                      <option value={4}>4 Columns (Full Width)</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FILTERS BUILDER ─────────────────────────────────────────────── */}
      {activeTab === 'filters' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Interactive Dashboard Filters
            </span>
            <button
              type="button"
              onClick={handleAddFilter}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#0F766E] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Filter
            </button>
          </div>

          <div className="space-y-3">
            {(!config.filters || config.filters.length === 0) && (
              <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                No filters configured. Click "Add Filter" above.
              </p>
            )}

            {config.filters?.map((f, idx) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-500">Filter #{idx + 1}</span>
                  <select
                    value={f.field}
                    onChange={(e) => {
                      const updated = [...(config.filters || [])]
                      updated[idx].field = e.target.value
                      updated[idx].label = e.target.value.replace(/_/g, ' ')
                      onChange({ ...config, filters: updated })
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700"
                  >
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>

                  <select
                    value={f.filterType}
                    onChange={(e) => {
                      const updated = [...(config.filters || [])]
                      updated[idx].filterType = e.target.value as any
                      onChange({ ...config, filters: updated })
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700"
                  >
                    <option value="select">Dropdown Single-Select</option>
                    <option value="multiselect">Pill Multi-Select</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveFilter(idx)}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
