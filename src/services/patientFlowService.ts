/**
 * PatientFlow Navigator Domain Service
 */

import { isDemoMode } from './dataMode'
import { requestJson } from './apiClient'
import { parseCsvFile, applyMappingToRows, exportToCsvFile } from '@/utils/csvParser'
import { DEMO_PATIENT_FLOW_DATA, type PatientFlowRow } from './demoData/healthcareData'
import { DemoDataProvider } from './demoDataProvider'

const API_BASE_URL =
  import.meta.env.VITE_PATIENT_FLOW_NAVIGATOR_API_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8019'

export interface PatientFlowKpis {
  total_patients: number
  avg_age: number | null
  avg_length_of_stay: number | null
  readmission_rate_pct: number | null
}

export class PatientFlowService {
  static async loadDefault(): Promise<{
    data: PatientFlowRow[]
    preview: PatientFlowRow[]
    departments: string[]
    kpis: PatientFlowKpis
  }> {
    if (isDemoMode()) {
      const rows = [...DEMO_PATIENT_FLOW_DATA]
      const departments = Array.from(new Set(rows.map((r) => r.Department))).sort()
      const total_patients = rows.length
      const avg_age = Math.round(rows.reduce((s, r) => s + (Number(r.Age) || 0), 0) / total_patients)
      const readmissions = rows.filter((r) => String(r.Readmission).toLowerCase() === 'yes').length
      const readmission_rate_pct = Number(((readmissions / total_patients) * 100).toFixed(1))

      return {
        data: rows,
        preview: rows.slice(0, 10),
        departments,
        kpis: { total_patients, avg_age, avg_length_of_stay: 4.8, readmission_rate_pct },
      }
    }

    return requestJson(`${API_BASE_URL}/load-default`)
  }

  static async filter(params: { data: PatientFlowRow[]; departments?: string[]; risk_levels?: string[] }): Promise<{
    data: PatientFlowRow[]
    preview: PatientFlowRow[]
    kpis: PatientFlowKpis
  }> {
    if (isDemoMode()) {
      let filtered = [...params.data]
      if (params.departments && params.departments.length > 0) {
        filtered = filtered.filter((r) => params.departments!.includes(r.Department))
      }
      if (params.risk_levels && params.risk_levels.length > 0) {
        filtered = filtered.filter((r) => params.risk_levels!.includes(r.Risk_Level))
      }

      const total_patients = filtered.length
      const avg_age = total_patients > 0 ? Math.round(filtered.reduce((s, r) => s + (Number(r.Age) || 0), 0) / total_patients) : null
      const readmissions = filtered.filter((r) => String(r.Readmission).toLowerCase() === 'yes').length
      const readmission_rate_pct = total_patients > 0 ? Number(((readmissions / total_patients) * 100).toFixed(1)) : null

      return {
        data: filtered,
        preview: filtered.slice(0, 10),
        kpis: { total_patients, avg_age, avg_length_of_stay: 4.5, readmission_rate_pct },
      }
    }

    return requestJson(`${API_BASE_URL}/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  }

  static async getCharts(rows: PatientFlowRow[]): Promise<{
    risk_distribution: Array<{ Risk_Level: string; Count: number }>
    cost_by_department: Array<{ Department: string; Treatment_Cost: number }>
    disease_distribution: Array<{ Disease: string; Count: number }>
    treatment_cost_histogram: Array<{ bin_start: number; bin_end: number; count: number }>
    risk_vs_los: any[]
  }> {
    if (isDemoMode()) {
      const risk_distribution = DemoDataProvider.aggregateByCategory(rows, 'Risk_Level', 'Risk_Score', 'count').map((r) => ({
        Risk_Level: r.Risk_Level,
        Count: r.count,
      }))
      const cost_by_department = DemoDataProvider.aggregateByCategory(rows, 'Department', 'Treatment_Cost', 'avg').map((c) => ({
        Department: c.Department,
        Treatment_Cost: c.Treatment_Cost,
      }))
      const diseaseCounts: Record<string, number> = {}
      rows.forEach((r) => {
        const d = String(r.Disease || 'General Consultation')
        diseaseCounts[d] = (diseaseCounts[d] || 0) + 1
      })
      const disease_distribution = Object.entries(diseaseCounts).map(([Disease, Count]) => ({ Disease, Count }))

      const costs = rows.map((r) => Number(r.Treatment_Cost) || 0)
      const treatment_cost_histogram = DemoDataProvider.createHistogram(costs, 5)

      const risk_vs_los = rows.slice(0, 20).map((r) => ({
        Age: r.Age,
        Risk_Score: r.Risk_Score,
        Treatment_Cost: r.Treatment_Cost,
        Department: r.Department,
      }))

      return { risk_distribution, cost_by_department, disease_distribution, treatment_cost_histogram, risk_vs_los }
    }

    return requestJson(`${API_BASE_URL}/charts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async predictReadmission(patient: any): Promise<{ will_readmit: boolean; probability: number; risk_factor: string }> {
    if (isDemoMode()) {
      const age = Number(patient.age || 50)
      const will_readmit = age > 60 || Number(patient.riskScore || 50) > 65
      return {
        will_readmit,
        probability: will_readmit ? 0.74 : 0.18,
        risk_factor: will_readmit ? 'Advanced age combined with elevated chronic comorbidities' : 'Low risk profile',
      }
    }

    return requestJson(`${API_BASE_URL}/ml/readmission-classifier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patient),
    })
  }

  static async predictCost(patient: any): Promise<{ estimated_cost: number; confidence_interval: string }> {
    if (isDemoMode()) {
      const base = 120000 + (Number(patient.age) || 50) * 1500 + (Number(patient.riskScore) || 50) * 1200
      return {
        estimated_cost: Math.round(base),
        confidence_interval: `₹ ${Math.round(base * 0.9)} - ₹ ${Math.round(base * 1.15)}`,
      }
    }

    return requestJson(`${API_BASE_URL}/ml/cost-regressor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patient),
    })
  }

  static async getInsights(rows: PatientFlowRow[]): Promise<{
    insights: Array<{ Insight: string; Value: string; Metric: string; Action: string }>
  }> {
    if (isDemoMode()) {
      return {
        insights: [
          { Insight: 'High Readmission Hotspot', Value: 'Neurology (stroke cases 30-day readmission at 35%)', Metric: 'Readmission %', Action: 'Establish dedicated home post-discharge rehab visits' },
          { Insight: 'Highest Treatment Outlay', Value: 'Cardiology (Emergency CABG averaging ₹ 4,20,000)', Metric: 'Average Cost', Action: 'Standardize stent and consumable procurement contracts' },
          { Insight: 'Rapid Recovery Index', Value: 'Pediatrics average length of stay is 2.3 days', Metric: 'ALOS', Action: 'Benchmarked as highest operational throughput department' },
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
      const rows = parsed.rows as PatientFlowRow[]
      const departments = Array.from(new Set(rows.map((r) => r.Department).filter(Boolean))).sort()
      const total_patients = rows.length
      const avg_age = total_patients > 0 ? Math.round(rows.reduce((s, r) => s + (Number(r.Age) || 0), 0) / total_patients) : null
      const readmissions = rows.filter((r) => String(r.Readmission).toLowerCase() === 'yes').length
      const readmission_rate_pct = total_patients > 0 ? Number(((readmissions / total_patients) * 100).toFixed(1)) : null

      return {
        data: rows,
        preview: rows.slice(0, 10),
        departments,
        kpis: { total_patients, avg_age, avg_length_of_stay: 4.8, readmission_rate_pct },
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
      const rows = applyMappingToRows(parsed.rows, mapping) as PatientFlowRow[]
      const departments = Array.from(new Set(rows.map((r) => r.Department).filter(Boolean))).sort()
      const total_patients = rows.length
      const avg_age = total_patients > 0 ? Math.round(rows.reduce((s, r) => s + (Number(r.Age) || 0), 0) / total_patients) : null
      const readmissions = rows.filter((r) => String(r.Readmission).toLowerCase() === 'yes').length
      const readmission_rate_pct = total_patients > 0 ? Number(((readmissions / total_patients) * 100).toFixed(1)) : null

      return {
        data: rows,
        preview: rows.slice(0, 10),
        departments,
        kpis: { total_patients, avg_age, avg_length_of_stay: 4.8, readmission_rate_pct },
      }
    }
    const formData = new FormData()
    formData.append('file', file)
    const params = new URLSearchParams()
    Object.entries(mapping).forEach(([key, val]) => { if (val) params.set(key, val) })
    return requestJson(`${API_BASE_URL}/apply-mapping?${params.toString()}`, { method: 'POST', body: formData })
  }

  static downloadCsv(rows: PatientFlowRow[], filename = 'patient_flow.csv') {
    exportToCsvFile(rows, filename)
  }
}
