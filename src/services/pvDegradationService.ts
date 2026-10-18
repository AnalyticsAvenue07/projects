/**
 * PV Panel Degradation Intelligence Lab Domain Service
 */

import { isDemoMode } from './dataMode'
import { requestJson } from './apiClient'
import { parseCsvFile, applyMappingToRows, exportToCsvFile } from '@/utils/csvParser'
import { DEMO_PV_DEGRADATION_DATA, type PvDegradationRow } from './demoData/solarData'
export type { PvDegradationRow }
import { DemoDataProvider } from './demoDataProvider'

const API_BASE_URL =
  import.meta.env.VITE_PV_PANEL_DEGRADATION_INTELLIGENCE_API_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8016'

export interface PvDegradationKpis {
  total_rows: number
  avg_degradation_pct: number | null
  underperforming_share_pct: number | null
  hotspot_share_pct: number | null
}

function calculateKpis(rows: PvDegradationRow[]): PvDegradationKpis {
  const total_rows = rows.length
  if (total_rows === 0) {
    return {
      total_rows: 0,
      avg_degradation_pct: null,
      underperforming_share_pct: null,
      hotspot_share_pct: null,
    }
  }

  const avg_degradation_pct = Number(
    (rows.reduce((s, r) => s + (Number(r.degradation_pct) || 0), 0) / total_rows).toFixed(1),
  )
  const underperforming = rows.filter((r) => r.underperformance_flag === 1).length
  const underperforming_share_pct = Number(((underperforming / total_rows) * 100).toFixed(1))
  const hotspots = rows.filter((r) => r.hotspot_detected_flag === 1).length
  const hotspot_share_pct = Number(((hotspots / total_rows) * 100).toFixed(1))

  return { total_rows, avg_degradation_pct, underperforming_share_pct, hotspot_share_pct }
}

export class PvDegradationService {
  static async loadDefault(): Promise<{
    data: PvDegradationRow[]
    preview: PvDegradationRow[]
    regions: string[]
    manufacturers: string[]
    age_min: number
    age_max: number
    warning?: string
    kpis: PvDegradationKpis
  }> {
    if (isDemoMode()) {
      const rows = [...DEMO_PV_DEGRADATION_DATA]
      const regions = Array.from(new Set(rows.map((r) => r.region).filter(Boolean))).sort()
      const manufacturers = Array.from(new Set(rows.map((r) => r.manufacturer).filter(Boolean))).sort()
      const ages = rows.map((r) => Number(r.module_age_years)).filter((n) => !isNaN(n))
      const age_min = ages.length ? Math.min(...ages) : 1
      const age_max = ages.length ? Math.max(...ages) : 10
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        regions,
        manufacturers,
        age_min,
        age_max,
        kpis,
      }
    }

    return requestJson(`${API_BASE_URL}/load-default`)
  }

  static async filter(params: {
    data: PvDegradationRow[]
    regions?: string[]
    manufacturers?: string[]
    age_min?: number
    age_max?: number
  }): Promise<{
    data: PvDegradationRow[]
    preview: PvDegradationRow[]
    kpis: PvDegradationKpis
  }> {
    if (isDemoMode()) {
      let filtered = [...params.data]
      if (params.regions && params.regions.length > 0) {
        filtered = filtered.filter((r) => params.regions!.includes(r.region))
      }
      if (params.manufacturers && params.manufacturers.length > 0) {
        filtered = filtered.filter((r) => params.manufacturers!.includes(r.manufacturer))
      }
      if (params.age_min !== undefined) {
        filtered = filtered.filter((r) => Number(r.module_age_years) >= params.age_min!)
      }
      if (params.age_max !== undefined) {
        filtered = filtered.filter((r) => Number(r.module_age_years) <= params.age_max!)
      }

      return {
        data: filtered,
        preview: filtered.slice(0, 15),
        kpis: calculateKpis(filtered),
      }
    }

    return requestJson(`${API_BASE_URL}/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  }

  static async getCharts(rows: PvDegradationRow[]): Promise<{
    degradation_histogram: any[]
    region_avg_degradation: any[]
    efficiency_scatter: any[]
    age_vs_degradation: any[]
  }> {
    if (isDemoMode()) {
      const values = rows.map((r) => Number(r.degradation_pct) || 0)
      const degradation_histogram = DemoDataProvider.generateHistogram(values, 8)
      const region_avg_degradation = DemoDataProvider.aggregateByCategory(rows, 'region', 'degradation_pct', 'avg').map((r) => ({
        region: r.region,
        degradation_pct: r.degradation_pct,
      }))
      const efficiency_scatter = rows.map((r) => ({
        irradiation_wm2: r.irradiation_wm2,
        panel_efficiency_pct: r.panel_efficiency_pct,
        panel_id: r.panel_id,
      }))
      const age_vs_degradation = rows.map((r) => ({
        module_age_years: r.module_age_years,
        degradation_pct: r.degradation_pct,
        panel_id: r.panel_id,
      }))

      return {
        degradation_histogram,
        region_avg_degradation,
        efficiency_scatter,
        age_vs_degradation,
      }
    }

    return requestJson(`${API_BASE_URL}/charts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async predictDegradation(rows: PvDegradationRow[]): Promise<{
    train_size: number
    test_size: number
    rmse: number
    r2: number
    predictions: Array<{ Actual_degradation_pct: number; Predicted_degradation_pct: number }>
  }> {
    if (isDemoMode()) {
      const train_size = Math.round(rows.length * 0.8)
      const test_size = rows.length - train_size
      const predictions = rows.slice(0, 10).map((r) => {
        const actual = Number(r.degradation_pct)
        const predicted = Number((actual * (0.97 + ((actual % 5) * 0.01))).toFixed(1))
        return {
          Actual_degradation_pct: actual,
          Predicted_degradation_pct: predicted,
        }
      })

      return {
        train_size,
        test_size,
        rmse: 1.14,
        r2: 0.94,
        predictions,
      }
    }

    return requestJson(`${API_BASE_URL}/ml/predict-degradation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async getInsights(rows: PvDegradationRow[]): Promise<{
    insights: Array<{ Insight: string; Entity: string; Metric: string; Action: string }>
  }> {
    if (isDemoMode()) {
      const avgDeg = rows.length ? (rows.reduce((s, r) => s + (Number(r.degradation_pct) || 0), 0) / rows.length).toFixed(1) : '12.4'
      return {
        insights: [
          {
            Insight: 'Thermal Hotspot Clustering Alert',
            Entity: 'String 01 & String 04',
            Metric: '22% Hotspot Rate',
            Action: 'Dispatch drone thermographic scan to inspect bypass diodes and replace defective cells',
          },
          {
            Insight: 'Accelerated Fleet Degradation',
            Entity: 'High-Temperature Regions',
            Metric: `Fleet Avg: ${avgDeg}%`,
            Action: 'Deploy active heat dissipation shields and recalibrate inverter clipping thresholds',
          },
          {
            Insight: 'Manufacturer Longevity Benchmarking',
            Entity: 'Waaree vs Tata Power Solar',
            Metric: '0.84 vs 0.81 PR Delta',
            Action: 'Favor top-performing cell chemistry in upcoming procurement and expand preventive cleaning cycle',
          },
        ],
      }
    }

    return requestJson(`${API_BASE_URL}/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async uploadCsv(file: File) {
    if (isDemoMode()) {
      const parsed = await parseCsvFile(file)
      const rows = parsed.rows as PvDegradationRow[]
      const regions = Array.from(new Set(rows.map((r) => r.region).filter(Boolean))).sort()
      const manufacturers = Array.from(new Set(rows.map((r) => r.manufacturer).filter(Boolean))).sort()
      const ages = rows.map((r) => Number(r.module_age_years)).filter((n) => !isNaN(n))
      const age_min = ages.length ? Math.min(...ages) : 1
      const age_max = ages.length ? Math.max(...ages) : 10
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        regions,
        manufacturers,
        columns: parsed.headers,
        age_min,
        age_max,
        kpis,
      }
    }
    const formData = new FormData()
    formData.append('file', file)
    return requestJson(`${API_BASE_URL}/upload-csv`, { method: 'POST', body: formData })
  }

  static async getCsvColumns(file: File) {
    if (isDemoMode()) {
      const parsed = await parseCsvFile(file)
      return { columns: parsed.headers }
    }
    const formData = new FormData()
    formData.append('file', file)
    return requestJson(`${API_BASE_URL}/get-columns`, { method: 'POST', body: formData })
  }

  static async applyMapping(file: File, mapping: Record<string, string>) {
    if (isDemoMode()) {
      const parsed = await parseCsvFile(file)
      const rows = applyMappingToRows(parsed.rows, mapping) as PvDegradationRow[]
      const regions = Array.from(new Set(rows.map((r) => r.region).filter(Boolean))).sort()
      const manufacturers = Array.from(new Set(rows.map((r) => r.manufacturer).filter(Boolean))).sort()
      const ages = rows.map((r) => Number(r.module_age_years)).filter((n) => !isNaN(n))
      const age_min = ages.length ? Math.min(...ages) : 1
      const age_max = ages.length ? Math.max(...ages) : 10
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        regions,
        manufacturers,
        age_min,
        age_max,
        kpis,
      }
    }
    const formData = new FormData()
    formData.append('file', file)
    const params = new URLSearchParams()
    Object.entries(mapping).forEach(([key, val]) => {
      if (val) params.set(key, val)
    })
    return requestJson(`${API_BASE_URL}/apply-mapping?${params.toString()}`, { method: 'POST', body: formData })
  }

  static downloadCsv(rows: PvDegradationRow[], filename = 'pv_panel_degradation.csv') {
    exportToCsvFile(rows, filename)
  }
}
