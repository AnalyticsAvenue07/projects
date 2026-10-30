import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import type { ChartConfig } from '@/types/dashboardConfiguration'
import type { ComputedChartData } from '@/services/dashboardRendererService'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

const COLOR_PALETTES = {
  teal: ['#0F766E', '#14B8A6', '#2DD4BF', '#0D9488', '#042F2E'],
  emerald: ['#047857', '#10B981', '#34D399', '#059669', '#064E3B'],
  cyan: ['#0E7490', '#06B6D4', '#22D3EE', '#0891B2', '#164E63'],
  indigo: ['#4338CA', '#6366F1', '#818CF8', '#4F46E5', '#312E81'],
  amber: ['#D97706', '#F59E0B', '#FBBF24', '#B45309', '#78350F'],
  rose: ['#BE123C', '#F43F5E', '#FB7185', '#E11D48', '#881337'],
  multi: ['#0F766E', '#0284C7', '#6366F1', '#D97706', '#BE123C', '#10B981', '#8B5CF6'],
}

export function ChartRenderer({ chartData }: { chartData: ComputedChartData }) {
  const { config, data, seriesKeys } = chartData
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 8

  const colors = COLOR_PALETTES[config.colorScheme || 'teal'] || COLOR_PALETTES.teal

  const colSpanClasses = {
    1: 'col-span-1',
    2: 'col-span-1 lg:col-span-2',
    3: 'col-span-1 lg:col-span-3',
    4: 'col-span-1 lg:col-span-4',
  }

  // 1. Table Render Mode
  if (config.chartType === 'table') {
    const headers = data.length > 0 ? Object.keys(data[0]) : []
    const filteredRows = useMemo(() => {
      if (!searchTerm.trim()) return data
      const q = searchTerm.toLowerCase()
      return data.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(q))
      )
    }, [data, searchTerm])

    const totalPages = Math.ceil(filteredRows.length / pageSize) || 1
    const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)

    return (
      <div
        className={`rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm ${
          colSpanClasses[config.columnSpan || 4]
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">{config.title}</h3>
            {config.description && <p className="text-xs text-slate-500 mt-0.5">{config.description}</p>}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search table rows..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-slate-600 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-4 py-3 whitespace-nowrap">
                    {h.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  {headers.map((h) => (
                    <td key={h} className="px-4 py-2.5 whitespace-nowrap text-slate-700">
                      {String(row[h] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} rows
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Visual Chart Render Modes
  const yKey = config.yField || 'value'
  const xKey = config.xField || 'name'
  const chartHeight = config.height || 280

  return (
    <div
      className={`rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm ${
        colSpanClasses[config.columnSpan || 2]
      }`}
    >
      <div className="mb-4">
        <h3 className="text-base font-bold text-[#0F172A]">{config.title}</h3>
        {config.description && <p className="text-xs text-slate-500 mt-0.5">{config.description}</p>}
      </div>

      {data.length === 0 ? (
        <div className="flex h-56 items-center justify-center rounded-2xl bg-slate-50 text-xs text-slate-400">
          No records match the active filter criteria
        </div>
      ) : (
        <div style={{ width: '100%', height: chartHeight }}>
          <ResponsiveContainer>
            {config.chartType === 'bar' || config.chartType === 'histogram' ? (
              <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                {config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />}
                <XAxis
                  dataKey={config.chartType === 'histogram' ? 'bin' : xKey}
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                {config.showLegend && <Legend />}
                {seriesKeys && seriesKeys.length > 0 ? (
                  seriesKeys.map((k, idx) => (
                    <Bar key={k} dataKey={k} fill={colors[idx % colors.length]} radius={[6, 6, 0, 0]} />
                  ))
                ) : (
                  <Bar
                    dataKey={config.chartType === 'histogram' ? 'count' : yKey}
                    fill={colors[0]}
                    radius={[6, 6, 0, 0]}
                  />
                )}
              </BarChart>
            ) : config.chartType === 'line' ? (
              <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                {config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />}
                <XAxis dataKey={xKey} stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                {config.showLegend && <Legend />}
                {seriesKeys && seriesKeys.length > 0 ? (
                  seriesKeys.map((k, idx) => (
                    <Line
                      key={k}
                      type="monotone"
                      dataKey={k}
                      stroke={colors[idx % colors.length]}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  ))
                ) : (
                  <Line type="monotone" dataKey={yKey} stroke={colors[0]} strokeWidth={2.5} dot={{ r: 3 }} />
                )}
              </LineChart>
            ) : config.chartType === 'pie' || config.chartType === 'donut' ? (
              <PieChart>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Pie
                  data={data}
                  dataKey={yKey}
                  nameKey={xKey}
                  cx="50%"
                  cy="50%"
                  innerRadius={config.chartType === 'donut' ? 60 : 0}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
              </PieChart>
            ) : (
              <div />
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
