/**
 * Solar Power Generation Forecasting Domain Service
 */

import { isDemoMode } from './dataMode'
import { requestJson } from './apiClient'
import { parseCsvFile, applyMappingToRows, exportToCsvFile } from '@/utils/csvParser'
import { DEMO_SOLAR_FORECAST_DATA, type SolarForecastRow } from './demoData/solarData'
import { DemoDataProvider } from './demoDataProvider'

const API_BASE_URL =
  import.meta.env.VITE_SOLAR_POWER_GENERATION_FORECASTING_API_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8014'

export interface SolarForecastKpis {
  total_actual_kwh: number
  total_forecast_kwh: number
  mae: number
  rmse: number
  mape_pct: number
}

export class SolarForecastService {
  static async loadDefault(): Promise<{
    data: SolarForecastRow[]
    preview: SolarForecastRow[]
    plants: string[]
    clusters: string[]
    weather_conditions: string[]
    kpis: SolarForecastKpis
  }> {
    if (isDemoMode()) {
      const rows = [...DEMO_SOLAR_FORECAST_DATA]
      const plants = Array.from(new Set(rows.map((r) => r.plant_id))).sort()
      const clusters = Array.from(new Set(rows.map((r) => r.inverter_cluster_id))).sort()
      const weather_conditions = Array.from(new Set(rows.map((r) => r.weather_condition))).sort()
      const total_actual_kwh = rows.reduce((s, r) => s + (Number(r.actual_generation_kwh) || 0), 0)
      const total_forecast_kwh = rows.reduce((s, r) => s + (Number(r.forecast_generation_kwh) || 0), 0)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        plants,
        clusters,
        weather_conditions,
        kpis: { total_actual_kwh, total_forecast_kwh, mae: 44.0, rmse: 46.2, mape_pct: 1.4 },
      }
    }

    return requestJson(`${API_BASE_URL}/load-default`)
  }

  static async filter(params: { data: SolarForecastRow[]; plants?: string[]; clusters?: string[] }): Promise<{
    data: SolarForecastRow[]
    preview: SolarForecastRow[]
    kpis: SolarForecastKpis
  }> {
    if (isDemoMode()) {
      let filtered = [...params.data]
      if (params.plants && params.plants.length > 0) {
        filtered = filtered.filter((r) => params.plants!.includes(r.plant_id))
      }
      if (params.clusters && params.clusters.length > 0) {
        filtered = filtered.filter((r) => params.clusters!.includes(r.inverter_cluster_id))
      }

      const total_actual_kwh = filtered.reduce((s, r) => s + (Number(r.actual_generation_kwh) || 0), 0)
      const total_forecast_kwh = filtered.reduce((s, r) => s + (Number(r.forecast_generation_kwh) || 0), 0)

      return {
        data: filtered,
        preview: filtered.slice(0, 10),
        kpis: { total_actual_kwh, total_forecast_kwh, mae: 42.0, rmse: 44.8, mape_pct: 1.3 },
      }
    }

    return requestJson(`${API_BASE_URL}/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  }

  static async getCharts(rows: SolarForecastRow[]): Promise<{
    actual_vs_forecast: Array<{ timestamp: string; actual_generation_kwh: number; forecast_generation_kwh: number }>
    radiation_vs_generation: Array<{ solar_radiation_wm2: number; actual_generation_kwh: number }>
    plant_ranking: Array<{ plant_id: string; total_generation_kwh: number }>
  }> {
    if (isDemoMode()) {
      const actual_vs_forecast = rows.map((r) => ({
        timestamp: r.timestamp,
        actual_generation_kwh: r.actual_generation_kwh,
        forecast_generation_kwh: r.forecast_generation_kwh,
      }))
      const radiation_vs_generation = rows.map((r) => ({
        solar_radiation_wm2: r.solar_radiation_wm2,
        actual_generation_kwh: r.actual_generation_kwh,
      }))
      const plant_ranking = DemoDataProvider.aggregateByCategory(rows, 'plant_id', 'actual_generation_kwh', 'sum').map((p) => ({
        plant_id: p.plant_id,
        total_generation_kwh: p.actual_generation_kwh,
      }))

      return { actual_vs_forecast, radiation_vs_generation, plant_ranking }
    }

    return requestJson(`${API_BASE_URL}/charts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async predictGeneration(rows: SolarForecastRow[]): Promise<{ predictions: any[]; mae: number; rmse: number; mape_pct: number }> {
    if (isDemoMode()) {
      return {
        mae: 44.0,
        rmse: 46.2,
        mape_pct: 1.4,
        predictions: rows.slice(0, 10).map((r) => ({
          timestamp: r.timestamp,
          plant_id: r.plant_id,
          Actual_Generation: r.actual_generation_kwh,
          Predicted_Generation: r.forecast_generation_kwh,
          Error: r.generation_error_kwh,
        })),
      }
    }

    return requestJson(`${API_BASE_URL}/ml/predict-generation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async getInsights(rows: SolarForecastRow[]): Promise<{
    insights: Array<{ Insight: string; Entity: string; Metric: string; Action: string }>
  }> {
    if (isDemoMode()) {
      return {
        insights: [
          { Insight: 'Peak Generation Window', Entity: '12:00 - 13:30 IST', Metric: '4,850 kWh peak', Action: 'Prioritize grid dispatch export allocation' },
          { Insight: 'Forecast Accuracy Benchmark', Entity: 'Plant 01 Cluster A', Metric: '98.6% accuracy (MAPE 1.4%)', Action: 'Standardize sensor calibration parameters fleet-wide' },
          { Insight: 'Weather Attenuation Notice', Entity: 'Partly Cloudy periods', Metric: 'Diffuse radiation loss 18%', Action: 'Activate smart bifacial tracker tilt bias adjustments' },
        ],
      }
    }

    return requestJson(`${API_BASE_URL}/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async uploadCsv(file: File): Promise<{
    data: SolarForecastRow[]
    preview: SolarForecastRow[]
    plants: string[]
    clusters: string[]
    weather_conditions: string[]
    kpis: SolarForecastKpis
  }> {
    if (isDemoMode()) {
      const parsed = await parseCsvFile(file)
      const rows = parsed.rows as SolarForecastRow[]
      const plants = Array.from(new Set(rows.map((r) => r.plant_id).filter(Boolean))).sort()
      const clusters = Array.from(new Set(rows.map((r) => r.inverter_cluster_id).filter(Boolean))).sort()
      const weather_conditions = Array.from(new Set(rows.map((r) => r.weather_condition).filter(Boolean))).sort()
      const total_actual_kwh = rows.reduce((s, r) => s + (Number(r.actual_generation_kwh) || 0), 0)
      const total_forecast_kwh = rows.reduce((s, r) => s + (Number(r.forecast_generation_kwh) || 0), 0)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        plants,
        clusters,
        weather_conditions,
        kpis: { total_actual_kwh, total_forecast_kwh, mae: 44.0, rmse: 46.2, mape_pct: 1.4 },
      }
    }
    const formData = new FormData()
    formData.append('file', file)
    return requestJson<{
      data: SolarForecastRow[]
      preview: SolarForecastRow[]
      plants: string[]
      clusters: string[]
      weather_conditions: string[]
      kpis: SolarForecastKpis
    }>(`${API_BASE_URL}/upload-csv`, { method: 'POST', body: formData })
  }

  static async getCsvColumns(file: File): Promise<{ columns: string[] }> {
    if (isDemoMode()) {
      const parsed = await parseCsvFile(file)
      return { columns: parsed.headers }
    }
    const formData = new FormData()
    formData.append('file', file)
    return requestJson<{ columns: string[] }>(`${API_BASE_URL}/get-columns`, { method: 'POST', body: formData })
  }

  static async applyMapping(file: File, mapping: Record<string, string>): Promise<{
    data: SolarForecastRow[]
    preview: SolarForecastRow[]
    plants: string[]
    clusters: string[]
    weather_conditions: string[]
    kpis: SolarForecastKpis
  }> {
    if (isDemoMode()) {
      const parsed = await parseCsvFile(file)
      const rows = applyMappingToRows(parsed.rows, mapping) as SolarForecastRow[]
      const plants = Array.from(new Set(rows.map((r) => r.plant_id).filter(Boolean))).sort()
      const clusters = Array.from(new Set(rows.map((r) => r.inverter_cluster_id).filter(Boolean))).sort()
      const weather_conditions = Array.from(new Set(rows.map((r) => r.weather_condition).filter(Boolean))).sort()
      const total_actual_kwh = rows.reduce((s, r) => s + (Number(r.actual_generation_kwh) || 0), 0)
      const total_forecast_kwh = rows.reduce((s, r) => s + (Number(r.forecast_generation_kwh) || 0), 0)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        plants,
        clusters,
        weather_conditions,
        kpis: { total_actual_kwh, total_forecast_kwh, mae: 44.0, rmse: 46.2, mape_pct: 1.4 },
      }
    }
    const formData = new FormData()
    formData.append('file', file)
    const params = new URLSearchParams()
    Object.entries(mapping).forEach(([key, val]) => { if (val) params.set(key, val) })
    return requestJson<{
      data: SolarForecastRow[]
      preview: SolarForecastRow[]
      plants: string[]
      clusters: string[]
      weather_conditions: string[]
      kpis: SolarForecastKpis
    }>(`${API_BASE_URL}/apply-mapping?${params.toString()}`, { method: 'POST', body: formData })
  }

  static downloadCsv(rows: SolarForecastRow[], filename = 'solar_generation_forecast.csv') {
    exportToCsvFile(rows, filename)
  }
}
