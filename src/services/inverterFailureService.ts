/**
 * Inverter Failure Prediction Lab Domain Service
 */

import { isDemoMode } from './dataMode'
import { requestJson } from './apiClient'
import { parseCsvFile, applyMappingToRows, exportToCsvFile } from '@/utils/csvParser'
import { DEMO_INVERTER_FAILURE_DATA, type InverterFailureRow } from './demoData/solarData'
import { DemoDataProvider } from './demoDataProvider'

const API_BASE_URL =
  import.meta.env.VITE_INVERTER_FAILURE_PREDICTION_API_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8015'

export interface InverterFailureKpis {
  total_records: number
  failure_rate_pct: number | null
  avg_temperature_c: number | null
  avg_lifetime_energy_kwh: number | null
}

function calculateKpis(rows: InverterFailureRow[]): InverterFailureKpis {
  const total_records = rows.length
  if (total_records === 0) {
    return {
      total_records: 0,
      failure_rate_pct: null,
      avg_temperature_c: null,
      avg_lifetime_energy_kwh: null,
    }
  }

  const failures = rows.filter((r) => r.failure_within_7_days === 1).length
  const failure_rate_pct = Number(((failures / total_records) * 100).toFixed(1))
  const avg_temperature_c = Number((rows.reduce((s, r) => s + (Number(r.temperature_c) || 0), 0) / total_records).toFixed(1))
  const avg_lifetime_energy_kwh = Math.round(rows.reduce((s, r) => s + (Number(r.total_energy_generated_kwh) || 0), 0) / total_records)

  return { total_records, failure_rate_pct, avg_temperature_c, avg_lifetime_energy_kwh }
}

export class InverterFailureService {
  static async loadDefault(): Promise<{
    data: InverterFailureRow[]
    preview: InverterFailureRow[]
    inverter_ids: string[]
    grid_statuses: string[]
    fault_codes: string[]
    warning?: string
    kpis: InverterFailureKpis
  }> {
    if (isDemoMode()) {
      const rows = [...DEMO_INVERTER_FAILURE_DATA]
      const inverter_ids = Array.from(new Set(rows.map((r) => r.inverter_id).filter(Boolean))).sort()
      const grid_statuses = Array.from(new Set(rows.map((r) => r.grid_status).filter(Boolean))).sort()
      const fault_codes = Array.from(new Set(rows.map((r) => r.fault_code).filter(Boolean))).sort()
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        inverter_ids,
        grid_statuses,
        fault_codes,
        kpis,
      }
    }

    return requestJson(`${API_BASE_URL}/load-default`)
  }

  static async filter(params: {
    data: InverterFailureRow[]
    inverter_ids?: string[]
    grid_statuses?: string[]
    fault_codes?: string[]
  }): Promise<{
    data: InverterFailureRow[]
    preview: InverterFailureRow[]
    kpis: InverterFailureKpis
  }> {
    if (isDemoMode()) {
      let filtered = [...params.data]
      if (params.inverter_ids && params.inverter_ids.length > 0) {
        filtered = filtered.filter((r) => params.inverter_ids!.includes(r.inverter_id))
      }
      if (params.grid_statuses && params.grid_statuses.length > 0) {
        filtered = filtered.filter((r) => params.grid_statuses!.includes(r.grid_status))
      }
      if (params.fault_codes && params.fault_codes.length > 0) {
        filtered = filtered.filter((r) => params.fault_codes!.includes(r.fault_code))
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

  static async getCharts(rows: InverterFailureRow[]): Promise<{
    inverter_failure_rate: any[]
    temp_vs_vibration: any[]
    lifetime_vs_energy: any[]
  }> {
    if (isDemoMode()) {
      const inverter_failure_rate = DemoDataProvider.aggregateByCategory(rows, 'inverter_id', 'failure_within_7_days', 'avg').map((item) => ({
        inverter_id: item.inverter_id,
        failure_rate_pct: Number(((Number(item.failure_within_7_days) || 0) * 100).toFixed(1)),
      }))
      const temp_vs_vibration = rows.map((r) => ({
        temperature_c: r.temperature_c,
        vibration_mms: r.vibration_mms,
        inverter_id: r.inverter_id,
        failure_within_7_days: r.failure_within_7_days,
      }))
      const lifetime_vs_energy = rows.map((r) => ({
        lifetime_hours: r.lifetime_hours,
        total_energy_generated_kwh: r.total_energy_generated_kwh,
        inverter_id: r.inverter_id,
      }))

      return {
        inverter_failure_rate,
        temp_vs_vibration,
        lifetime_vs_energy,
      }
    }

    return requestJson(`${API_BASE_URL}/charts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async predictFailure(rows: InverterFailureRow[]): Promise<{
    train_size: number
    test_size: number
    accuracy: number
    roc_auc: number
    predictions: Array<{
      Actual_failure: number
      Predicted_failure_flag: number
      Predicted_failure_prob: number
    }>
  }> {
    if (isDemoMode()) {
      const train_size = Math.round(rows.length * 0.8)
      const test_size = rows.length - train_size
      const predictions = rows.slice(0, 10).map((r) => {
        const actual = Number(r.failure_within_7_days) || 0
        const prob = actual === 1 ? Number((0.82 + (actual % 3) * 0.05).toFixed(2)) : Number((0.08 + (actual % 4) * 0.03).toFixed(2))
        return {
          Actual_failure: actual,
          Predicted_failure_flag: actual,
          Predicted_failure_prob: prob,
        }
      })

      return {
        train_size,
        test_size,
        accuracy: 0.93,
        roc_auc: 0.96,
        predictions,
      }
    }

    return requestJson(`${API_BASE_URL}/ml/predict-failure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async getInsights(rows: InverterFailureRow[]): Promise<{
    insights: Array<{ Insight: string; Entity: string; Metric: string; Action: string }>
  }> {
    if (isDemoMode()) {
      return {
        insights: [
          {
            Insight: 'High Heatsink Thermal Overheating',
            Entity: 'INV-102 & INV-202',
            Metric: 'Temp > 82°C',
            Action: 'Clean fan filters and check cooling airflow ducting immediately',
          },
          {
            Insight: 'Elevated Bearing Vibration Signature',
            Entity: 'Cluster B Inverters',
            Metric: 'Vibration > 3.8 mm/s',
            Action: 'Schedule mechanical bearing lubrication and inspect internal ventilation motor',
          },
          {
            Insight: 'Grid Voltage Fluctuation Exposure',
            Entity: 'INV-104 Substation Feeder',
            Metric: 'Unstable Grid Mode',
            Action: 'Engage reactive power compensation and audit MPPT tracking stability',
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
      const rows = parsed.rows as InverterFailureRow[]
      const inverter_ids = Array.from(new Set(rows.map((r) => r.inverter_id).filter(Boolean))).sort()
      const grid_statuses = Array.from(new Set(rows.map((r) => r.grid_status).filter(Boolean))).sort()
      const fault_codes = Array.from(new Set(rows.map((r) => r.fault_code).filter(Boolean))).sort()
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        inverter_ids,
        grid_statuses,
        fault_codes,
        columns: parsed.headers,
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
      const rows = applyMappingToRows(parsed.rows, mapping) as InverterFailureRow[]
      const inverter_ids = Array.from(new Set(rows.map((r) => r.inverter_id).filter(Boolean))).sort()
      const grid_statuses = Array.from(new Set(rows.map((r) => r.grid_status).filter(Boolean))).sort()
      const fault_codes = Array.from(new Set(rows.map((r) => r.fault_code).filter(Boolean))).sort()
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        inverter_ids,
        grid_statuses,
        fault_codes,
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

  static downloadCsv(rows: InverterFailureRow[], filename = 'inverter_failure_data.csv') {
    exportToCsvFile(rows, filename)
  }
}
