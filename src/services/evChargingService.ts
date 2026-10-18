/**
 * EV Charging Station Fault Detection Lab Domain Service
 */

import { isDemoMode } from './dataMode'
import { requestJson } from './apiClient'
import { parseCsvFile, applyMappingToRows, exportToCsvFile } from '@/utils/csvParser'
import { DEMO_EV_CHARGER_DATA, type EvChargerRow } from './demoData/evData'
import { DemoDataProvider } from './demoDataProvider'

const API_BASE_URL =
  import.meta.env.VITE_EV_CHARGING_STATION_FAULT_DETECTION_API_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8024'

export interface EvChargingKpis {
  records: number
  fault_rate_pct?: number
  avg_temperature_c?: number
  silent_failure_pct?: number
}

export class EvChargingService {
  static async loadDefault(): Promise<{
    data: EvChargerRow[]
    preview: EvChargerRow[]
    chargers: string[]
    kpis: EvChargingKpis
  }> {
    if (isDemoMode()) {
      const rows = [...DEMO_EV_CHARGER_DATA]
      const chargers = Array.from(new Set(rows.map((r) => r.charger_id))).sort()
      const records = rows.length
      const faults = rows.filter((r) => r.fault_flag === 1).length
      const fault_rate_pct = Number(((faults / records) * 100).toFixed(1))
      const avg_temperature_c = Number((rows.reduce((s, r) => s + (Number(r.temperature) || 0), 0) / records).toFixed(1))
      const silent_failure_pct = 8.3

      return {
        data: rows,
        preview: rows.slice(0, 10),
        chargers,
        kpis: { records, fault_rate_pct, avg_temperature_c, silent_failure_pct },
      }
    }

    return requestJson(`${API_BASE_URL}/load-default`)
  }

  static async filter(params: { data: EvChargerRow[]; chargers?: string[]; fault_types?: string[] }): Promise<{
    data: EvChargerRow[]
    preview: EvChargerRow[]
    kpis: EvChargingKpis
  }> {
    if (isDemoMode()) {
      let filtered = [...params.data]
      if (params.chargers && params.chargers.length > 0) {
        filtered = filtered.filter((r) => params.chargers!.includes(r.charger_id))
      }
      if (params.fault_types && params.fault_types.length > 0) {
        filtered = filtered.filter((r) => params.fault_types!.includes(r.fault_type))
      }

      const records = filtered.length
      const faults = filtered.filter((r) => r.fault_flag === 1).length
      const fault_rate_pct = records > 0 ? Number(((faults / records) * 100).toFixed(1)) : 0
      const avg_temperature_c = records > 0 ? Number((filtered.reduce((s, r) => s + (Number(r.temperature) || 0), 0) / records).toFixed(1)) : 0

      return {
        data: filtered,
        preview: filtered.slice(0, 10),
        kpis: { records, fault_rate_pct, avg_temperature_c, silent_failure_pct: 8.3 },
      }
    }

    return requestJson(`${API_BASE_URL}/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  }

  static async getCharts(rows: EvChargerRow[]): Promise<{
    temperature_distribution: Array<{ bin_start: number; bin_end: number; count: number }>
    power_vs_temperature: Array<{ power_kw: number; temperature: number; fault_flag: number }>
    faults_by_type: Array<{ fault_type: string; count: number }>
    voltage_vs_current: any[]
    temperature_over_time: any[]
  }> {
    if (isDemoMode()) {
      const temps = rows.map((r) => r.temperature)
      const temperature_distribution = DemoDataProvider.generateHistogram(temps, 6)
      const power_vs_temperature = rows.map((r) => ({
        power_kw: r.power_kw,
        temperature: r.temperature,
        fault_flag: r.fault_flag,
      }))
      const faults_by_type = DemoDataProvider.aggregateByCategory(rows, 'fault_type', 'fault_flag', 'count').map((f) => ({
        fault_type: f.fault_type,
        count: f.count,
      }))
      const voltage_vs_current = rows.map((r) => ({
        voltage: r.voltage,
        current: r.current,
        fault_flag: r.fault_flag,
        charger_id: r.charger_id,
      }))
      const temperature_over_time = rows.map((r) => ({
        timestamp: r.timestamp,
        temperature: r.temperature,
        charger_id: r.charger_id,
      }))

      return { temperature_distribution, power_vs_temperature, faults_by_type, voltage_vs_current, temperature_over_time }
    }

    return requestJson(`${API_BASE_URL}/charts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async classifyFaults(rows: EvChargerRow[]): Promise<{ accuracy_pct: number; predictions: any[] }> {
    if (isDemoMode()) {
      return {
        accuracy_pct: 94.6,
        predictions: rows.slice(0, 10).map((r) => ({
          charger_id: r.charger_id,
          Actual_Fault: r.fault_flag,
          Predicted_Fault: r.temperature > 65 || r.voltage > 440 || r.voltage < 350 ? 1 : 0,
          Fault_Prob: r.temperature > 65 ? 0.94 : 0.05,
        })),
      }
    }

    return requestJson(`${API_BASE_URL}/ml/fault-classifier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async detectAnomalies(rows: EvChargerRow[]): Promise<{ anomalies: any[] }> {
    if (isDemoMode()) {
      return {
        anomalies: rows.map((r) => ({
          charger_id: r.charger_id,
          temperature: r.temperature,
          power_kw: r.power_kw,
          anomaly: r.temperature > 65 || r.voltage < 340 ? 1 : 0,
        })),
      }
    }

    return requestJson(`${API_BASE_URL}/ml/anomaly-detection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async getInsights(rows: EvChargerRow[]): Promise<{
    insights: Array<{ Insight: string; Value: string; Metric: string; Action: string }>
  }> {
    if (isDemoMode()) {
      return {
        insights: [
          { Insight: 'Thermal Stress Root Cause', Value: 'Chargers exceeding 65°C exhibit 84% failure rate', Metric: 'Over-Temperature', Action: 'Service cooling fans on high-utilization fast chargers' },
          { Insight: 'Grid Voltage Sensitivity', Value: 'Under-voltage drops observed during 09:00 - 11:00 peak hours', Metric: 'Grid Quality', Action: 'Install capacitor bank regulators at Mumbai substation' },
          { Insight: 'Session Recovery Optimization', Value: 'Communication timeouts clearable via remote reset daemon', Metric: 'Self-Healing', Action: 'Enable automated OCPP reboot sequence upon 30s timeout' },
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
      const rows = parsed.rows as EvChargerRow[]
      const chargers = Array.from(new Set(rows.map((r) => r.charger_id).filter(Boolean))).sort()
      const records = rows.length
      const faults = rows.filter((r) => r.fault_flag === 1).length
      const fault_rate_pct = records > 0 ? Number(((faults / records) * 100).toFixed(1)) : 0
      const avg_temperature_c = records > 0 ? Number((rows.reduce((s, r) => s + (Number(r.temperature) || 0), 0) / records).toFixed(1)) : 0

      return {
        data: rows,
        preview: rows.slice(0, 10),
        chargers,
        kpis: { records, fault_rate_pct, avg_temperature_c, silent_failure_pct: 8.3 },
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
      const rows = applyMappingToRows(parsed.rows, mapping) as EvChargerRow[]
      const chargers = Array.from(new Set(rows.map((r) => r.charger_id).filter(Boolean))).sort()
      const records = rows.length
      const faults = rows.filter((r) => r.fault_flag === 1).length
      const fault_rate_pct = records > 0 ? Number(((faults / records) * 100).toFixed(1)) : 0
      const avg_temperature_c = records > 0 ? Number((rows.reduce((s, r) => s + (Number(r.temperature) || 0), 0) / records).toFixed(1)) : 0

      return {
        data: rows,
        preview: rows.slice(0, 10),
        chargers,
        kpis: { records, fault_rate_pct, avg_temperature_c, silent_failure_pct: 8.3 },
      }
    }
    const formData = new FormData()
    formData.append('file', file)
    const params = new URLSearchParams()
    Object.entries(mapping).forEach(([key, val]) => { if (val) params.set(key, val) })
    return requestJson(`${API_BASE_URL}/apply-mapping?${params.toString()}`, { method: 'POST', body: formData })
  }

  static downloadCsv(rows: EvChargerRow[], filename = 'ev_charger_faults.csv') {
    exportToCsvFile(rows, filename)
  }
}
