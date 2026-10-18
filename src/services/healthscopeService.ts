/**
 * Healthscope Insights Domain Service
 * Supports Demo mode (in-memory) and API mode (FastAPI).
 */

import { isDemoMode } from './dataMode'
import { requestJson } from './apiClient'
import { parseCsvFile, applyMappingToRows, exportToCsvFile } from '@/utils/csvParser'
import { DEMO_HEALTHSCOPE_DATA, type HealthscopeRow } from './demoData/healthcareData'
import { DemoDataProvider } from './demoDataProvider'

const API_BASE_URL =
  import.meta.env.VITE_HEALTHSCOPE_INSIGHTS_API_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8017'

export interface HealthscopeKpis {
  total_visits: number
  total_revenue: number
  avg_recovery_rate: number
  avg_satisfaction: number
}

export interface HealthscopeFilterParams {
  data: HealthscopeRow[]
  hospitals?: string[]
  departments?: string[]
  date_start?: string
  date_end?: string
}

export class HealthscopeService {
  static async loadDefault(): Promise<{
    data: HealthscopeRow[]
    preview: HealthscopeRow[]
    hospitals: string[]
    departments: string[]
    kpis: HealthscopeKpis
  }> {
    if (isDemoMode()) {
      const rows = [...DEMO_HEALTHSCOPE_DATA]
      const hospitals = Array.from(new Set(rows.map((r) => r.Hospital))).sort()
      const departments = Array.from(new Set(rows.map((r) => r.Department))).sort()
      const total_visits = rows.reduce((s, r) => s + (Number(r.Visits) || 0), 0)
      const total_revenue = rows.reduce((s, r) => s + (Number(r.Revenue) || 0), 0)
      const avg_recovery_rate = Number((rows.reduce((s, r) => s + (Number(r.RecoveryRate) || 0), 0) / rows.length).toFixed(1))
      const avg_satisfaction = Number((rows.reduce((s, r) => s + (Number(r.SatisfactionScore) || 0), 0) / rows.length).toFixed(1))

      return {
        data: rows,
        preview: rows.slice(0, 10),
        hospitals,
        departments,
        kpis: { total_visits, total_revenue, avg_recovery_rate, avg_satisfaction },
      }
    }

    return requestJson(`${API_BASE_URL}/load-default`)
  }

  static async filter(params: HealthscopeFilterParams): Promise<{
    data: HealthscopeRow[]
    preview: HealthscopeRow[]
    kpis: HealthscopeKpis
  }> {
    if (isDemoMode()) {
      let filtered = [...params.data]
      if (params.hospitals && params.hospitals.length > 0) {
        filtered = filtered.filter((r) => params.hospitals!.includes(r.Hospital))
      }
      if (params.departments && params.departments.length > 0) {
        filtered = filtered.filter((r) => params.departments!.includes(r.Department))
      }

      const total_visits = filtered.reduce((s, r) => s + (Number(r.Visits) || 0), 0)
      const total_revenue = filtered.reduce((s, r) => s + (Number(r.Revenue) || 0), 0)
      const avg_recovery_rate = filtered.length > 0
        ? Number((filtered.reduce((s, r) => s + (Number(r.RecoveryRate) || 0), 0) / filtered.length).toFixed(1))
        : 0
      const avg_satisfaction = filtered.length > 0
        ? Number((filtered.reduce((s, r) => s + (Number(r.SatisfactionScore) || 0), 0) / filtered.length).toFixed(1))
        : 0

      return {
        data: filtered,
        preview: filtered.slice(0, 10),
        kpis: { total_visits, total_revenue, avg_recovery_rate, avg_satisfaction },
      }
    }

    return requestJson(`${API_BASE_URL}/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  }

  static async getCharts(rows: HealthscopeRow[]): Promise<{
    hospital_performance: Array<{ Hospital: string; Visits: number; Revenue: number }>
    visits_over_time: Array<{ Date: string; Visits: number }>
  }> {
    if (isDemoMode()) {
      const hospital_performance = DemoDataProvider.aggregateByCategory(rows, 'Hospital', 'Revenue', 'sum').map((item) => ({
        Hospital: item.Hospital,
        Revenue: item.Revenue,
        Visits: rows.filter((r) => r.Hospital === item.Hospital).reduce((s, r) => s + (Number(r.Visits) || 0), 0),
      }))

      const visits_over_time = DemoDataProvider.aggregateByCategory(rows, 'Date', 'Visits', 'sum').map((item) => ({
        Date: item.Date,
        Visits: item.Visits,
      }))

      return { hospital_performance, visits_over_time }
    }

    return requestJson(`${API_BASE_URL}/charts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async predictRevenue(rows: HealthscopeRow[]): Promise<{ rmse: number; r2: number }> {
    if (isDemoMode()) {
      const actuals = rows.map((r) => Number(r.Revenue) || 0)
      const reg = DemoDataProvider.simulateRegression(actuals, (_i, val) => val * 0.97)
      return { rmse: reg.rmse, r2: reg.r2 }
    }

    return requestJson(`${API_BASE_URL}/ml/predict-revenue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async getInsights(rows: HealthscopeRow[]): Promise<{
    insights: Array<{ Insight: string; Value: string }>
  }> {
    if (isDemoMode()) {
      const totalRev = rows.reduce((s, r) => s + (Number(r.Revenue) || 0), 0)
      const totalVisits = rows.reduce((s, r) => s + (Number(r.Visits) || 0), 0)
      return {
        insights: [
          { Insight: 'Total Portfolio Revenue', Value: `₹ ${new Intl.NumberFormat('en-IN').format(totalRev)}` },
          { Insight: 'Highest Revenue Department', Value: 'Oncology (₹ 3,40,000 / avg case)' },
          { Insight: 'Overall Recovery Benchmark', Value: '93.4% recovery across tracked admissions' },
          { Insight: 'Active Patient Inflow', Value: `${totalVisits} patient consultations analyzed` },
        ],
      }
    }

    return requestJson(`${API_BASE_URL}/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async uploadCsv(file: File): Promise<{ data: HealthscopeRow[]; preview: HealthscopeRow[]; hospitals: string[]; departments: string[]; kpis: HealthscopeKpis }> {
    if (isDemoMode()) {
      const parsed = await parseCsvFile(file)
      const rows = parsed.rows as HealthscopeRow[]
      const hospitals = Array.from(new Set(rows.map((r) => r.Hospital).filter(Boolean))).sort()
      const departments = Array.from(new Set(rows.map((r) => r.Department).filter(Boolean))).sort()
      const total_visits = rows.reduce((s, r) => s + (Number(r.Visits) || 0), 0)
      const total_revenue = rows.reduce((s, r) => s + (Number(r.Revenue) || 0), 0)
      const avg_recovery_rate = rows.length > 0 ? Number((rows.reduce((s, r) => s + (Number(r.RecoveryRate) || 0), 0) / rows.length).toFixed(1)) : 0
      const avg_satisfaction = rows.length > 0 ? Number((rows.reduce((s, r) => s + (Number(r.SatisfactionScore) || 0), 0) / rows.length).toFixed(1)) : 0

      return {
        data: rows,
        preview: rows.slice(0, 10),
        hospitals,
        departments,
        kpis: { total_visits, total_revenue, avg_recovery_rate, avg_satisfaction },
      }
    }

    const formData = new FormData()
    formData.append('file', file)
    return requestJson(`${API_BASE_URL}/upload-csv`, { method: 'POST', body: formData })
  }

  static async getCsvColumns(file: File): Promise<{ columns: string[] }> {
    if (isDemoMode()) {
      const parsed = await parseCsvFile(file)
      return { columns: parsed.headers }
    }
    const formData = new FormData()
    formData.append('file', file)
    return requestJson(`${API_BASE_URL}/get-columns`, { method: 'POST', body: formData })
  }

  static async applyMapping(file: File, mapping: Record<string, string>): Promise<{ data: HealthscopeRow[]; preview: HealthscopeRow[]; hospitals: string[]; departments: string[]; kpis: HealthscopeKpis }> {
    if (isDemoMode()) {
      const parsed = await parseCsvFile(file)
      const rows = applyMappingToRows(parsed.rows, mapping) as HealthscopeRow[]
      const hospitals = Array.from(new Set(rows.map((r) => r.Hospital).filter(Boolean))).sort()
      const departments = Array.from(new Set(rows.map((r) => r.Department).filter(Boolean))).sort()
      const total_visits = rows.reduce((s, r) => s + (Number(r.Visits) || 0), 0)
      const total_revenue = rows.reduce((s, r) => s + (Number(r.Revenue) || 0), 0)
      const avg_recovery_rate = rows.length > 0 ? Number((rows.reduce((s, r) => s + (Number(r.RecoveryRate) || 0), 0) / rows.length).toFixed(1)) : 0
      const avg_satisfaction = rows.length > 0 ? Number((rows.reduce((s, r) => s + (Number(r.SatisfactionScore) || 0), 0) / rows.length).toFixed(1)) : 0

      return {
        data: rows,
        preview: rows.slice(0, 10),
        hospitals,
        departments,
        kpis: { total_visits, total_revenue, avg_recovery_rate, avg_satisfaction },
      }
    }

    const formData = new FormData()
    formData.append('file', file)
    const params = new URLSearchParams()
    Object.entries(mapping).forEach(([key, val]) => { if (val) params.set(key, val) })
    return requestJson(`${API_BASE_URL}/apply-mapping?${params.toString()}`, { method: 'POST', body: formData })
  }

  static downloadCsv(rows: HealthscopeRow[], filename = 'healthscope_dataset.csv'): void {
    exportToCsvFile(rows, filename)
  }
}
