import type {
  AggregationMethod,
  ChartConfig,
  DashboardConfig,
  KpiCardConfig,
} from '@/types/dashboardConfiguration'

export interface ComputedKpiResult {
  id: string
  title: string
  value: string | number
  unit?: string
  format?: 'number' | 'percent' | 'currency' | 'integer'
  icon?: string
  colorTheme?: 'teal' | 'blue' | 'emerald' | 'amber' | 'rose' | 'slate'
  description?: string
  targetComparison?: {
    diff: number
    diffPct: number
    isPositive: boolean
    target: number
    label?: string
  }
}

export interface ComputedChartData {
  config: ChartConfig
  data: Record<string, any>[]
  seriesKeys?: string[]
}

/**
 * Filter an array of records by given filter values
 */
export function applyDashboardFilters(
  rows: Record<string, any>[],
  activeFilters: Record<string, any>
): Record<string, any>[] {
  if (!rows || rows.length === 0) return []
  const filterEntries = Object.entries(activeFilters).filter(
    ([_, val]) => val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0)
  )

  if (filterEntries.length === 0) return rows

  return rows.filter((row) => {
    return filterEntries.every(([field, filterVal]) => {
      const rowVal = row[field]

      if (Array.isArray(filterVal)) {
        // Multi-select
        return filterVal.includes(String(rowVal))
      }

      if (typeof filterVal === 'object' && ('min' in filterVal || 'max' in filterVal)) {
        // Number range
        const num = Number(rowVal)
        if (Number.isNaN(num)) return true
        if (filterVal.min !== undefined && num < filterVal.min) return false
        if (filterVal.max !== undefined && num > filterVal.max) return false
        return true
      }

      // Single select or string match
      return String(rowVal).toLowerCase() === String(filterVal).toLowerCase()
    })
  })
}

/**
 * Compute an aggregated value for a specific field across records
 */
export function computeFieldAggregation(
  rows: Record<string, any>[],
  field?: string,
  method: AggregationMethod = 'count'
): number {
  if (!rows || rows.length === 0) return 0

  if (method === 'count' || !field) {
    return rows.length
  }

  if (method === 'distinct_count') {
    const distinct = new Set(rows.map((r) => String(r[field] ?? '')))
    return distinct.size
  }

  const validNumbers = rows
    .map((r) => Number(r[field]))
    .filter((n) => !Number.isNaN(n) && n !== null && n !== undefined)

  if (validNumbers.length === 0) return 0

  switch (method) {
    case 'sum':
      return validNumbers.reduce((acc, curr) => acc + curr, 0)
    case 'avg':
      return validNumbers.reduce((acc, curr) => acc + curr, 0) / validNumbers.length
    case 'min':
      return Math.min(...validNumbers)
    case 'max':
      return Math.max(...validNumbers)
    default:
      return rows.length
  }
}

/**
 * Compute KPI Card results from filtered dataset
 */
export function computeDashboardKpis(
  rows: Record<string, any>[],
  kpis: KpiCardConfig[]
): ComputedKpiResult[] {
  return kpis.map((kpi) => {
    let rawVal: number | string = 0

    if (kpi.staticValue !== undefined && kpi.staticValue !== '') {
      rawVal = kpi.staticValue
    } else {
      const computed = computeFieldAggregation(rows, kpi.field, kpi.aggregation ?? 'count')
      if (kpi.format === 'integer') {
        rawVal = Math.round(computed)
      } else if (kpi.format === 'percent' || kpi.format === 'number') {
        rawVal = Number(computed.toFixed(1))
      } else {
        rawVal = Number(computed.toFixed(2))
      }
    }

    let targetComparison = undefined
    if (kpi.comparison?.target !== undefined && typeof rawVal === 'number') {
      const diff = rawVal - kpi.comparison.target
      const diffPct = kpi.comparison.target !== 0 ? (diff / kpi.comparison.target) * 100 : 0
      targetComparison = {
        diff: Number(diff.toFixed(1)),
        diffPct: Number(diffPct.toFixed(1)),
        isPositive: diff >= 0,
        target: kpi.comparison.target,
        label: kpi.comparison.label,
      }
    }

    return {
      id: kpi.id,
      title: kpi.title,
      value: rawVal,
      unit: kpi.unit,
      format: kpi.format,
      icon: kpi.icon,
      colorTheme: kpi.colorTheme,
      description: kpi.description,
      targetComparison,
    }
  })
}

/**
 * Compute aggregated data for a chart configuration
 */
export function computeChartData(
  rows: Record<string, any>[],
  chart: ChartConfig
): ComputedChartData {
  if (!rows || rows.length === 0) {
    return { config: chart, data: [] }
  }

  // 1. Table: Return rows directly
  if (chart.chartType === 'table') {
    return {
      config: chart,
      data: rows.slice(0, 100),
    }
  }

  // 2. Histogram / Frequency distribution
  if (chart.chartType === 'histogram' && chart.xField) {
    const values = rows
      .map((r) => Number(r[chart.xField]))
      .filter((n) => !Number.isNaN(n))

    if (values.length === 0) return { config: chart, data: [] }

    const min = Math.min(...values)
    const max = Math.max(...values)
    const binCount = 8
    const step = (max - min) / binCount || 1

    const bins: { bin: string; count: number }[] = []
    for (let i = 0; i < binCount; i++) {
      const start = min + i * step
      const end = start + step
      const count = values.filter((v) => (i === binCount - 1 ? v >= start && v <= end : v >= start && v < end)).length
      bins.push({
        bin: `${start.toFixed(1)} - ${end.toFixed(1)}`,
        count,
      })
    }

    return {
      config: chart,
      data: bins,
    }
  }

  // 3. Multi-series Chart (grouped by xField and seriesField)
  if (chart.seriesField) {
    const seriesKeySet = new Set<string>()
    const xMap = new Map<string, Record<string, any>>()

    for (const r of rows) {
      const xVal = String(r[chart.xField] ?? 'Unknown')
      const sVal = String(r[chart.seriesField] ?? 'General')
      seriesKeySet.add(sVal)

      if (!xMap.has(xVal)) {
        xMap.set(xVal, { [chart.xField]: xVal })
      }
      const entry = xMap.get(xVal)!
      const yVal = chart.yField ? Number(r[chart.yField]) || 0 : 1

      if (!entry[`${sVal}_values`]) entry[`${sVal}_values`] = []
      entry[`${sVal}_values`].push(yVal)
    }

    const seriesKeys = Array.from(seriesKeySet)
    const data = Array.from(xMap.values()).map((entry) => {
      const formatted: Record<string, any> = { [chart.xField]: entry[chart.xField] }
      for (const s of seriesKeys) {
        const values: number[] = entry[`${s}_values`] || []
        if (values.length === 0) {
          formatted[s] = 0
        } else {
          switch (chart.aggregation) {
            case 'avg':
              formatted[s] = Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1))
              break
            case 'min':
              formatted[s] = Math.min(...values)
              break
            case 'max':
              formatted[s] = Math.max(...values)
              break
            default:
              formatted[s] = values.reduce((a, b) => a + b, 0)
          }
        }
      }
      return formatted
    })

    return {
      config: chart,
      data,
      seriesKeys,
    }
  }

  // 4. Standard Grouped Aggregation (Group by xField, aggregate yField)
  const groupMap = new Map<string, number[]>()
  for (const r of rows) {
    const xVal = String(r[chart.xField] ?? 'Unknown')
    if (!groupMap.has(xVal)) {
      groupMap.set(xVal, [])
    }
    const yVal = chart.yField ? Number(r[chart.yField]) || 0 : 1
    groupMap.get(xVal)!.push(yVal)
  }

  let aggregatedData = Array.from(groupMap.entries()).map(([key, values]) => {
    let result = 0
    switch (chart.aggregation) {
      case 'avg':
        result = Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1))
        break
      case 'min':
        result = Math.min(...values)
        break
      case 'max':
        result = Math.max(...values)
        break
      case 'count':
        result = values.length
        break
      case 'sum':
      default:
        result = Number(values.reduce((a, b) => a + b, 0).toFixed(1))
    }
    return {
      [chart.xField]: key,
      [chart.yField || 'value']: result,
    }
  })

  // Limit max categories if specified
  if (chart.maxCategories && aggregatedData.length > chart.maxCategories) {
    aggregatedData.sort((a, b) => (Number(b[chart.yField || 'value']) || 0) - (Number(a[chart.yField || 'value']) || 0))
    const top = aggregatedData.slice(0, chart.maxCategories - 1)
    const remaining = aggregatedData.slice(chart.maxCategories - 1)
    const otherVal = remaining.reduce((acc, curr) => acc + (Number(curr[chart.yField || 'value']) || 0), 0)
    top.push({
      [chart.xField]: 'Other',
      [chart.yField || 'value']: Number(otherVal.toFixed(1)),
    })
    aggregatedData = top
  }

  return {
    config: chart,
    data: aggregatedData,
  }
}
