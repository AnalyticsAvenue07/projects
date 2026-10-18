/**
 * EV Dynamic Range & Anxiety Reduction Lab Domain Service
 */

import { isDemoMode } from './dataMode'
import { requestJson } from './apiClient'
import { parseCsvFile, applyMappingToRows, exportToCsvFile } from '@/utils/csvParser'
import { DEMO_EV_RANGE_DATA, type EvRangeRow } from './demoData/evData'
import { DemoDataProvider } from './demoDataProvider'

const API_BASE_URL =
  import.meta.env.VITE_EV_DYNAMIC_RANGE_PREDICTION_ANXIETY_REDUCTION_API_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8023'

export interface EvRangeKpis {
  trips: number
  oem_avg_error_km: number
  dynamic_avg_error_km: number
  anxiety_rate_pct: number
}

export class EvRangeService {
  static async loadDefault(): Promise<{
    data: EvRangeRow[]
    preview: EvRangeRow[]
    vehicles: string[]
    driving_styles: string[]
    terrains: string[]
    kpis: EvRangeKpis
  }> {
    if (isDemoMode()) {
      const rows = [...DEMO_EV_RANGE_DATA]
      const vehicles = Array.from(new Set(rows.map((r) => r.vehicle_id))).sort()
      const driving_styles = Array.from(new Set(rows.map((r) => r.driving_style))).sort()
      const terrains = Array.from(new Set(rows.map((r) => r.terrain_type))).sort()
      const trips = rows.length
      const oem_avg_error_km = 14.8
      const dynamic_avg_error_km = 3.2
      const anxietyCount = rows.filter((r) => r.range_anxiety_flag === 1).length
      const anxiety_rate_pct = Number(((anxietyCount / trips) * 100).toFixed(1))

      return {
        data: rows,
        preview: rows.slice(0, 10),
        vehicles,
        driving_styles,
        terrains,
        kpis: { trips, oem_avg_error_km, dynamic_avg_error_km, anxiety_rate_pct },
      }
    }

    return requestJson(`${API_BASE_URL}/load-default`)
  }

  static async getCharts(rows: EvRangeRow[]): Promise<{
    range_error_distribution: Array<{ bin_start: number; bin_end: number; count: number }>
    soc_vs_range: Array<{ state_of_charge_pct: number; actual_range_km: number; dynamic_range_km: number }>
    consumption_by_terrain: Array<{ terrain_type: string; energy_consumption_wh_per_km: number }>
    static_vs_actual: any[]
    dynamic_vs_actual: any[]
  }> {
    if (isDemoMode()) {
      const errors = rows.map((r) => r.range_error_km)
      const range_error_distribution = DemoDataProvider.generateHistogram(errors, 6)
      const soc_vs_range = rows.map((r) => ({
        state_of_charge_pct: r.state_of_charge_pct,
        actual_range_km: r.actual_range_km,
        dynamic_range_km: r.dynamic_range_km,
      }))
      const consumption_by_terrain = DemoDataProvider.aggregateByCategory(rows, 'terrain_type', 'energy_consumption_wh_per_km', 'avg').map((t) => ({
        terrain_type: t.terrain_type,
        energy_consumption_wh_per_km: t.energy_consumption_wh_per_km,
      }))
      const static_vs_actual = rows.map((r) => ({
        trip_id: r.trip_id,
        static_range_km: r.static_range_km,
        actual_range_km: r.actual_range_km,
      }))
      const dynamic_vs_actual = rows.map((r) => ({
        trip_id: r.trip_id,
        dynamic_range_km: r.dynamic_range_km,
        actual_range_km: r.actual_range_km,
      }))

      return { range_error_distribution, soc_vs_range, consumption_by_terrain, static_vs_actual, dynamic_vs_actual }
    }

    return requestJson(`${API_BASE_URL}/charts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async predictRange(rows: EvRangeRow[]): Promise<{ rmse: number; r2: number; predictions: any[] }> {
    if (isDemoMode()) {
      return {
        rmse: 3.4,
        r2: 0.965,
        predictions: rows.slice(0, 10).map((r) => ({
          vehicle_id: r.vehicle_id,
          Actual_Range_km: r.actual_range_km,
          Predicted_Range_km: r.dynamic_range_km,
          Difference_km: Number((r.actual_range_km - r.dynamic_range_km).toFixed(1)),
        })),
      }
    }

    return requestJson(`${API_BASE_URL}/ml/predict-range`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async predictAnxiety(rows: EvRangeRow[]): Promise<{ accuracy_pct: number; predictions: any[] }> {
    if (isDemoMode()) {
      return {
        accuracy_pct: 91.2,
        predictions: rows.slice(0, 10).map((r) => ({
          vehicle_id: r.vehicle_id,
          Actual_Anxiety: r.range_anxiety_flag,
          Predicted_Anxiety: r.state_of_charge_pct < 30 || r.driving_style === 'Aggressive' ? 1 : 0,
          Anxiety_Prob: r.state_of_charge_pct < 30 ? 0.88 : 0.12,
        })),
      }
    }

    return requestJson(`${API_BASE_URL}/ml/predict-anxiety`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async getDriverClusters(rows: EvRangeRow[]): Promise<{ clusters: any[]; summary: any[] }> {
    if (isDemoMode()) {
      return {
        clusters: rows.map((r) => ({
          vehicle_id: r.vehicle_id,
          avg_speed_kmph: r.avg_speed_kmph,
          energy_consumption_wh_per_km: r.energy_consumption_wh_per_km,
          Cluster: r.driving_style === 'Eco' ? 'Efficiency-Maximizer' : r.driving_style === 'Aggressive' ? 'High-Performance' : 'Commuter-Balanced',
        })),
        summary: [
          { Cluster: 'Efficiency-Maximizer', avg_speed_kmph: 50, acceleration_score: 55, regen_braking_pct: 32, energy_consumption_wh_per_km: 121 },
          { Cluster: 'Commuter-Balanced', avg_speed_kmph: 58, acceleration_score: 68, regen_braking_pct: 23, energy_consumption_wh_per_km: 134 },
          { Cluster: 'High-Performance', avg_speed_kmph: 77, acceleration_score: 85, regen_braking_pct: 14, energy_consumption_wh_per_km: 168 },
        ],
      }
    }

    return requestJson(`${API_BASE_URL}/ml/driver-clusters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async getInsights(rows: EvRangeRow[]): Promise<{
    insights: Array<{ Insight: string; Value: string; Metric: string; Action: string }>
  }> {
    if (isDemoMode()) {
      return {
        insights: [
          { Insight: 'Dynamic AI Calibration Advantage', Value: 'OEM Static Error 14.8 km reduced to 3.2 km', Metric: 'MAE Reduction', Action: 'Deploy edge dynamic range model to vehicle infotainment' },
          { Insight: 'Primary Anxiety Trigger', Value: 'State of Charge dropping below 25% on Highway terrains', Metric: 'Anxiety Correlation', Action: 'Trigger automatic fast-charger detour reroute at 30% SOC' },
          { Insight: 'Regenerative Braking Payoff', Value: 'Eco drivers gain up to 18% extra range from regen recapture', Metric: 'Regen Efficiency', Action: 'Implement in-app gamification badges for gentle braking' },
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
      const rows = parsed.rows as EvRangeRow[]
      const vehicles = Array.from(new Set(rows.map((r) => r.vehicle_id).filter(Boolean))).sort()
      const driving_styles = Array.from(new Set(rows.map((r) => r.driving_style).filter(Boolean))).sort()
      const terrains = Array.from(new Set(rows.map((r) => r.terrain_type).filter(Boolean))).sort()
      const trips = rows.length
      const anxietyCount = rows.filter((r) => r.range_anxiety_flag === 1).length
      const anxiety_rate_pct = trips > 0 ? Number(((anxietyCount / trips) * 100).toFixed(1)) : 0

      return {
        data: rows,
        preview: rows.slice(0, 10),
        vehicles,
        driving_styles,
        terrains,
        kpis: { trips, oem_avg_error_km: 14.8, dynamic_avg_error_km: 3.2, anxiety_rate_pct },
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
      const rows = applyMappingToRows(parsed.rows, mapping) as EvRangeRow[]
      const vehicles = Array.from(new Set(rows.map((r) => r.vehicle_id).filter(Boolean))).sort()
      const driving_styles = Array.from(new Set(rows.map((r) => r.driving_style).filter(Boolean))).sort()
      const terrains = Array.from(new Set(rows.map((r) => r.terrain_type).filter(Boolean))).sort()
      const trips = rows.length
      const anxietyCount = rows.filter((r) => r.range_anxiety_flag === 1).length
      const anxiety_rate_pct = trips > 0 ? Number(((anxietyCount / trips) * 100).toFixed(1)) : 0

      return {
        data: rows,
        preview: rows.slice(0, 10),
        vehicles,
        driving_styles,
        terrains,
        kpis: { trips, oem_avg_error_km: 14.8, dynamic_avg_error_km: 3.2, anxiety_rate_pct },
      }
    }
    const formData = new FormData()
    formData.append('file', file)
    const params = new URLSearchParams()
    Object.entries(mapping).forEach(([key, val]) => { if (val) params.set(key, val) })
    return requestJson(`${API_BASE_URL}/apply-mapping?${params.toString()}`, { method: 'POST', body: formData })
  }

  static downloadCsv(rows: EvRangeRow[], filename = 'ev_dynamic_range_trips.csv') {
    exportToCsvFile(rows, filename)
  }
}
