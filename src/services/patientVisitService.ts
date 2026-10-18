/**
 * Patient Visit Analytics Domain Service
 */

import { isDemoMode } from './dataMode'
import { requestJson } from './apiClient'
import { parseCsvFile, applyMappingToRows, exportToCsvFile } from '@/utils/csvParser'
import { DEMO_PATIENT_VISITS_DATA, type PatientVisitRow } from './demoData/healthcareData'
import { DemoDataProvider } from './demoDataProvider'

const API_BASE_URL =
  import.meta.env.VITE_PATIENT_VISIT_ANALYTICS_API_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8018'

export interface PatientVisitKpis {
  total_patients: number
  total_revenue: number
  admission_rate_pct: number
  revenue_per_patient: number
}

export class PatientVisitService {
  static async loadDefault(): Promise<{
    data: PatientVisitRow[]
    preview: PatientVisitRow[]
    departments: string[]
    doctors: string[]
    kpis: PatientVisitKpis
  }> {
    if (isDemoMode()) {
      const rows = [...DEMO_PATIENT_VISITS_DATA]
      const departments = Array.from(new Set(rows.map((r) => r.Department))).sort()
      const doctors = Array.from(new Set(rows.map((r) => r.Doctor))).sort()
      const total_patients = rows.length
      const total_revenue = rows.reduce((s, r) => s + (Number(r.Revenue) || 0), 0)
      const admissions = rows.filter((r) => String(r.Admission).toLowerCase() === 'yes').length
      const admission_rate_pct = Number(((admissions / total_patients) * 100).toFixed(1))
      const revenue_per_patient = Math.round(total_revenue / total_patients)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        departments,
        doctors,
        kpis: { total_patients, total_revenue, admission_rate_pct, revenue_per_patient },
      }
    }

    return requestJson(`${API_BASE_URL}/load-default`)
  }

  static async filter(params: { data: PatientVisitRow[]; departments?: string[]; doctors?: string[] }): Promise<{
    data: PatientVisitRow[]
    preview: PatientVisitRow[]
    kpis: PatientVisitKpis
  }> {
    if (isDemoMode()) {
      let filtered = [...params.data]
      if (params.departments && params.departments.length > 0) {
        filtered = filtered.filter((r) => params.departments!.includes(r.Department))
      }
      if (params.doctors && params.doctors.length > 0) {
        filtered = filtered.filter((r) => params.doctors!.includes(r.Doctor))
      }

      const total_patients = filtered.length
      const total_revenue = filtered.reduce((s, r) => s + (Number(r.Revenue) || 0), 0)
      const admissions = filtered.filter((r) => String(r.Admission).toLowerCase() === 'yes').length
      const admission_rate_pct = total_patients > 0 ? Number(((admissions / total_patients) * 100).toFixed(1)) : 0
      const revenue_per_patient = total_patients > 0 ? Math.round(total_revenue / total_patients) : 0

      return {
        data: filtered,
        preview: filtered.slice(0, 10),
        kpis: { total_patients, total_revenue, admission_rate_pct, revenue_per_patient },
      }
    }

    return requestJson(`${API_BASE_URL}/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  }

  static async getCharts(rows: PatientVisitRow[]): Promise<{
    visits_by_date: Array<{ Date: string; Visits: number; MA7: number }>
    revenue_by_department: Array<{ Department: string; Revenue: number }>
    admission_rates: Array<{ Department: string; Admission_Rate: number }>
  }> {
    if (isDemoMode()) {
      const dateMap = new Map<string, number>()
      rows.forEach((r) => {
        dateMap.set(r.Date, (dateMap.get(r.Date) || 0) + 1)
      })

      const visits_by_date = Array.from(dateMap.entries()).map(([Date, Visits]) => ({
        Date,
        Visits,
        MA7: Visits,
      }))

      const revenue_by_department = DemoDataProvider.aggregateByCategory(rows, 'Department', 'Revenue', 'sum').map((d) => ({
        Department: d.Department,
        Revenue: d.Revenue,
      }))

      const deptAdmissions = new Map<string, { total: number; admitted: number }>()
      rows.forEach((r) => {
        if (!deptAdmissions.has(r.Department)) deptAdmissions.set(r.Department, { total: 0, admitted: 0 })
        const entry = deptAdmissions.get(r.Department)!
        entry.total++
        if (String(r.Admission).toLowerCase() === 'yes') entry.admitted++
      })

      const admission_rates = Array.from(deptAdmissions.entries()).map(([Department, val]) => ({
        Department,
        Admission_Rate: Number(((val.admitted / val.total) * 100).toFixed(1)),
      }))

      return { visits_by_date, revenue_by_department, admission_rates }
    }

    return requestJson(`${API_BASE_URL}/charts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async predictAdmission(rows: PatientVisitRow[]): Promise<{ accuracy_pct: number; predictions: any[] }> {
    if (isDemoMode()) {
      return {
        accuracy_pct: 88.4,
        predictions: rows.slice(0, 10).map((r) => ({
          Patient_ID: r.Patient_ID,
          Department: r.Department,
          Actual_Admission: r.Admission,
          Predicted_Admission: r.Age > 50 || r.Visit_Type === 'Emergency' ? 'Yes' : 'No',
          Probability: r.Age > 50 ? 0.85 : 0.22,
        })),
      }
    }

    return requestJson(`${API_BASE_URL}/ml/predict-admission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async getInsights(rows: PatientVisitRow[]): Promise<{
    insights: Array<{ Insight: string; Value: string; Metric: string; Action: string }>
  }> {
    if (isDemoMode()) {
      return {
        insights: [
          { Insight: 'Highest Patient Volume', Value: 'Pediatrics (28% of all visits)', Metric: 'OP Volume', Action: 'Allocate additional nursing staff to triage' },
          { Insight: 'Revenue Driver', Value: 'Oncology & Cardiology (62% of revenue)', Metric: 'Per-Case Revenue', Action: 'Streamline insurance pre-authorizations' },
          { Insight: 'Admission Conversion', Value: 'Emergency arrivals convert at 76%', Metric: 'Admission Rate', Action: 'Ensure CCU and IP bed reserve capacity' },
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
    data: PatientVisitRow[]
    preview: PatientVisitRow[]
    departments: string[]
    doctors: string[]
    kpis: PatientVisitKpis
  }> {
    if (isDemoMode()) {
      const parsed = await parseCsvFile(file)
      const rows = parsed.rows as PatientVisitRow[]
      const departments = Array.from(new Set(rows.map((r) => r.Department).filter(Boolean))).sort()
      const doctors = Array.from(new Set(rows.map((r) => r.Doctor).filter(Boolean))).sort()
      const total_patients = rows.length
      const total_revenue = rows.reduce((s, r) => s + (Number(r.Revenue) || 0), 0)
      const admissions = rows.filter((r) => String(r.Admission).toLowerCase() === 'yes').length
      const admission_rate_pct = total_patients > 0 ? Number(((admissions / total_patients) * 100).toFixed(1)) : 0
      const revenue_per_patient = total_patients > 0 ? Math.round(total_revenue / total_patients) : 0

      return {
        data: rows,
        preview: rows.slice(0, 10),
        departments,
        doctors,
        kpis: { total_patients, total_revenue, admission_rate_pct, revenue_per_patient },
      }
    }
    const formData = new FormData()
    formData.append('file', file)
    return requestJson<{
      data: PatientVisitRow[]
      preview: PatientVisitRow[]
      departments: string[]
      doctors: string[]
      kpis: PatientVisitKpis
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
    data: PatientVisitRow[]
    preview: PatientVisitRow[]
    departments: string[]
    doctors: string[]
    kpis: PatientVisitKpis
  }> {
    if (isDemoMode()) {
      const parsed = await parseCsvFile(file)
      const rows = applyMappingToRows(parsed.rows, mapping) as PatientVisitRow[]
      const departments = Array.from(new Set(rows.map((r) => r.Department).filter(Boolean))).sort()
      const doctors = Array.from(new Set(rows.map((r) => r.Doctor).filter(Boolean))).sort()
      const total_patients = rows.length
      const total_revenue = rows.reduce((s, r) => s + (Number(r.Revenue) || 0), 0)
      const admissions = rows.filter((r) => String(r.Admission).toLowerCase() === 'yes').length
      const admission_rate_pct = total_patients > 0 ? Number(((admissions / total_patients) * 100).toFixed(1)) : 0
      const revenue_per_patient = total_patients > 0 ? Math.round(total_revenue / total_patients) : 0

      return {
        data: rows,
        preview: rows.slice(0, 10),
        departments,
        doctors,
        kpis: { total_patients, total_revenue, admission_rate_pct, revenue_per_patient },
      }
    }
    const formData = new FormData()
    formData.append('file', file)
    const params = new URLSearchParams()
    Object.entries(mapping).forEach(([key, val]) => { if (val) params.set(key, val) })
    return requestJson<{
      data: PatientVisitRow[]
      preview: PatientVisitRow[]
      departments: string[]
      doctors: string[]
      kpis: PatientVisitKpis
    }>(`${API_BASE_URL}/apply-mapping?${params.toString()}`, { method: 'POST', body: formData })
  }

  static downloadCsv(rows: PatientVisitRow[], filename = 'patient_visits.csv') {
    exportToCsvFile(rows, filename)
  }
}
