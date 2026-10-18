/**
 * Machine Failure Predictive Maintenance Domain Service
 */

import { isDemoMode } from './dataMode'
import { requestJson } from './apiClient'
import { parseCsvFile, applyMappingToRows, exportToCsvFile } from '@/utils/csvParser'
import { DEMO_MACHINE_FAILURE_DATA, type MachineFailureRow } from './demoData/manufacturingData'

const API_BASE_URL =
  import.meta.env.VITE_MACHINE_FAILURE_PREDICTIVE_MAINTENANCE_API_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8020'

export interface MachineFailureKpis {
  total_machines: number
  failure_rate_pct: number
  avg_temperature: number | null
  avg_vibration: number | null
  machines_tracked: number
  failure_events: number
}

function calculateKpis(rows: MachineFailureRow[]): MachineFailureKpis {
  const total_machines = rows.length
  if (total_machines === 0) {
    return {
      total_machines: 0,
      failure_rate_pct: 0,
      avg_temperature: null,
      avg_vibration: null,
      machines_tracked: 0,
      failure_events: 0,
    }
  }

  const failures = rows.filter((r) => r.Failure_Flag === 1).length
  const failure_rate_pct = Number(((failures / total_machines) * 100).toFixed(1))
  const avg_temperature = Number((rows.reduce((s, r) => s + (Number(r.Temperature) || 0), 0) / total_machines).toFixed(1))
  const avg_vibration = Number((rows.reduce((s, r) => s + (Number(r.Vibration) || 0), 0) / total_machines).toFixed(2))

  return {
    total_machines,
    failure_rate_pct,
    avg_temperature,
    avg_vibration,
    machines_tracked: total_machines,
    failure_events: failures,
  }
}

export class MachineFailureService {
  static async loadDefault(): Promise<{
    data: MachineFailureRow[]
    preview: MachineFailureRow[]
    machine_ids: string[]
    machine_types: string[]
    total_rows: number
    kpis: MachineFailureKpis
  }> {
    if (isDemoMode()) {
      const rows = [...DEMO_MACHINE_FAILURE_DATA]
      const machine_ids = Array.from(new Set(rows.map((r) => r.Machine_ID))).sort()
      const machine_types = Array.from(new Set(rows.map((r) => r.Machine_Type))).sort()
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        machine_ids,
        machine_types,
        total_rows: rows.length,
        kpis,
      }
    }

    return requestJson(`${API_BASE_URL}/load-default`)
  }

  static async filter(params: {
    data: MachineFailureRow[]
    machine_ids?: string[]
    machine_types?: string[]
  }): Promise<{
    data: MachineFailureRow[]
    preview: MachineFailureRow[]
    kpis: MachineFailureKpis
  }> {
    if (isDemoMode()) {
      let filtered = [...params.data]
      if (params.machine_ids && params.machine_ids.length > 0) {
        filtered = filtered.filter((r) => params.machine_ids!.includes(r.Machine_ID))
      }
      if (params.machine_types && params.machine_types.length > 0) {
        filtered = filtered.filter((r) => params.machine_types!.includes(r.Machine_Type))
      }

      return {
        data: filtered,
        preview: filtered.slice(0, 10),
        kpis: calculateKpis(filtered),
      }
    }

    return requestJson(`${API_BASE_URL}/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  }

  static async getCharts(rows: MachineFailureRow[]): Promise<{
    temperature_trend: any[]
    vibration_by_type: any[]
    temp_vs_load: any[]
  }> {
    if (isDemoMode()) {
      const temperature_trend = rows.map((r) => ({
        Timestamp: r.Timestamp,
        Temperature: r.Temperature,
        Machine_ID: r.Machine_ID,
      }))
      const vibration_by_type = rows.map((r) => ({
        Machine_Type: r.Machine_Type,
        Vibration: r.Vibration,
        Machine_ID: r.Machine_ID,
      }))
      const temp_vs_load = rows.map((r) => ({
        Load: r.Load,
        Temperature: r.Temperature,
        Failure_Flag: r.Failure_Flag,
        Machine_ID: r.Machine_ID,
      }))

      return {
        temperature_trend,
        vibration_by_type,
        temp_vs_load,
      }
    }

    return requestJson(`${API_BASE_URL}/charts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async predictFailure(rows: MachineFailureRow[]): Promise<{
    model: string
    accuracy_pct: number
    target: string
    test_size: number
    predictions: any[]
    feature_importance: Array<{ Feature: string; Importance: number }>
  }> {
    if (isDemoMode()) {
      const test_size = Math.max(1, Math.round(rows.length * 0.2))
      const predictions = rows.slice(0, 10).map((r) => ({
        Machine_ID: r.Machine_ID,
        Actual_Failure: r.Failure_Flag,
        Predicted_Failure: r.Failure_Flag,
        Probability: r.Failure_Flag === 1 ? 0.88 : 0.12,
        Risk_Level: r.Failure_Flag === 1 ? 'High' : 'Low',
      }))

      return {
        model: 'Random Forest Classifier',
        accuracy_pct: 94.2,
        target: 'Failure_Flag',
        test_size,
        predictions,
        feature_importance: [
          { Feature: 'Vibration', Importance: 0.38 },
          { Feature: 'Temperature', Importance: 0.32 },
          { Feature: 'Load', Importance: 0.18 },
          { Feature: 'RPM', Importance: 0.12 },
        ],
      }
    }

    return requestJson(`${API_BASE_URL}/ml/predict-failure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async getInsights(rows: MachineFailureRow[]): Promise<{
    insights: Array<{ Insight: string; Entity: string; Metric: string; Action: string }>
  }> {
    if (isDemoMode()) {
      return {
        insights: [
          {
            Insight: 'High Thermal Runaway on Stamping Press',
            Entity: 'STAMP-02',
            Metric: 'Temp: 91.2°C, Vib: 6.4 mm/s',
            Action: 'Shut down hydraulic line immediately to replace main hydraulic seal pack',
          },
          {
            Insight: 'Spindle Bearing Imbalance on CNC Lathe',
            Entity: 'LATHE-02',
            Metric: 'Vibration Anomaly Spike',
            Action: 'Rebalance high-speed lathe spindle chuck and lubricate guide ways',
          },
          {
            Insight: 'Thermal Zone Uniformity Good on Injection Molders',
            Entity: 'INJ-P Fleet',
            Metric: 'Zero Unscheduled Failures',
            Action: 'Maintain current 250-hour preventive lubrication schedule',
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
      const rows = parsed.rows as MachineFailureRow[]
      const machine_ids = Array.from(new Set(rows.map((r) => r.Machine_ID).filter(Boolean))).sort()
      const machine_types = Array.from(new Set(rows.map((r) => r.Machine_Type).filter(Boolean))).sort()
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        machine_ids,
        machine_types,
        columns: parsed.headers,
        total_rows: rows.length,
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
      const rows = applyMappingToRows(parsed.rows, mapping) as MachineFailureRow[]
      const machine_ids = Array.from(new Set(rows.map((r) => r.Machine_ID).filter(Boolean))).sort()
      const machine_types = Array.from(new Set(rows.map((r) => r.Machine_Type).filter(Boolean))).sort()
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        machine_ids,
        machine_types,
        total_rows: rows.length,
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

  static downloadCsv(rows: MachineFailureRow[], filename = 'machine_failure_data.csv') {
    exportToCsvFile(rows, filename)
  }
}
