/**
 * Order-to-Delivery Analytics Lab Domain Service
 */

import { isDemoMode } from './dataMode'
import { requestJson } from './apiClient'
import { parseCsvFile, applyMappingToRows, exportToCsvFile } from '@/utils/csvParser'
import { DEMO_ORDER_TO_DELIVERY_DATA, type OrderToDeliveryRow } from './demoData/manufacturingData'

const API_BASE_URL =
  import.meta.env.VITE_ORDER_TO_DELIVERY_ANALYTICS_API_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8021'

export interface OrderToDeliveryKpis {
  orders: number
  avg_lead_time: number | null
  avg_production: number | null
  avg_machine_delay: number | null
  avg_dispatch_delay: number | null
}

function calculateKpis(rows: OrderToDeliveryRow[]): OrderToDeliveryKpis {
  const count = rows.length
  if (count === 0) {
    return {
      orders: 0,
      avg_lead_time: null,
      avg_production: null,
      avg_machine_delay: null,
      avg_dispatch_delay: null,
    }
  }

  const avg_lead_time = Number((rows.reduce((s, r) => s + (Number(r.Total_Lead_Time_Hrs) || 0), 0) / count).toFixed(1))
  const avg_production = Number((rows.reduce((s, r) => s + (Number(r.Production_Time_Hrs) || 0), 0) / count).toFixed(1))
  const avg_machine_delay = Number((rows.reduce((s, r) => s + (Number(r.Machine_Delay_Hrs) || 0), 0) / count).toFixed(1))
  const avg_dispatch_delay = Number((rows.reduce((s, r) => s + (Number(r.Dispatch_Delay_Hrs) || 0), 0) / count).toFixed(1))

  return {
    orders: count,
    avg_lead_time,
    avg_production,
    avg_machine_delay,
    avg_dispatch_delay,
  }
}

export class OrderToDeliveryService {
  static async loadDefault(): Promise<{
    data: OrderToDeliveryRow[]
    preview: OrderToDeliveryRow[]
    product_types: string[]
    machine_types: string[]
    kpis: OrderToDeliveryKpis
  }> {
    if (isDemoMode()) {
      const rows = [...DEMO_ORDER_TO_DELIVERY_DATA]
      const product_types = Array.from(new Set(rows.map((r) => r.Product_Type).filter(Boolean))).sort()
      const machine_types = Array.from(new Set(rows.map((r) => r.Machine_Type).filter(Boolean))).sort()
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        product_types,
        machine_types,
        kpis,
      }
    }

    return requestJson(`${API_BASE_URL}/load-default`)
  }

  static async filter(params: {
    data: OrderToDeliveryRow[]
    product_types?: string[]
    machine_types?: string[]
  }): Promise<{
    data: OrderToDeliveryRow[]
    preview: OrderToDeliveryRow[]
    kpis: OrderToDeliveryKpis
  }> {
    if (isDemoMode()) {
      let filtered = [...params.data]
      if (params.product_types && params.product_types.length > 0) {
        filtered = filtered.filter((r) => params.product_types!.includes(r.Product_Type))
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

  static async simulate(params: {
    data: OrderToDeliveryRow[]
    sched_pct?: number
    prod_pct?: number
    mach_pct?: number
    disp_pct?: number
  }): Promise<{
    baseline_lead_time: number
    simulated_lead_time: number
    improvement_hrs: number
    improvement_pct: number
    top10_orders: any[]
  }> {
    if (isDemoMode()) {
      const rows = params.data
      const schedFactor = 1 - (params.sched_pct ?? 0) / 100
      const prodFactor = 1 - (params.prod_pct ?? 0) / 100
      const machFactor = 1 - (params.mach_pct ?? 0) / 100
      const dispFactor = 1 - (params.disp_pct ?? 0) / 100

      const baseline_lead_time = Number(
        (rows.reduce((s, r) => s + (Number(r.Total_Lead_Time_Hrs) || 0), 0) / (rows.length || 1)).toFixed(1),
      )

      const simulatedRows = rows.map((r) => {
        const simSched = Number(((Number(r.Scheduling_Delay_Hrs) || 0) * schedFactor).toFixed(1))
        const simProd = Number(((Number(r.Production_Time_Hrs) || 0) * prodFactor).toFixed(1))
        const simMach = Number(((Number(r.Machine_Delay_Hrs) || 0) * machFactor).toFixed(1))
        const simDisp = Number(((Number(r.Dispatch_Delay_Hrs) || 0) * dispFactor).toFixed(1))
        const simLead = Number((simSched + simProd + simMach + simDisp).toFixed(1))
        return {
          ...r,
          Simulated_Lead_Time_Hrs: simLead,
          Time_Saved_Hrs: Number(((Number(r.Total_Lead_Time_Hrs) || 0) - simLead).toFixed(1)),
        }
      })

      const simulated_lead_time = Number(
        (simulatedRows.reduce((s, r) => s + r.Simulated_Lead_Time_Hrs, 0) / (simulatedRows.length || 1)).toFixed(1),
      )
      const improvement_hrs = Number((baseline_lead_time - simulated_lead_time).toFixed(1))
      const improvement_pct = Number(((improvement_hrs / (baseline_lead_time || 1)) * 100).toFixed(1))

      return {
        baseline_lead_time,
        simulated_lead_time,
        improvement_hrs,
        improvement_pct,
        top10_orders: simulatedRows.slice(0, 10),
      }
    }

    return requestJson(`${API_BASE_URL}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  }

  static async getCharts(rows: OrderToDeliveryRow[]): Promise<{
    lead_time_trend: any[]
    lead_time_by_machine: any[]
  }> {
    if (isDemoMode()) {
      const lead_time_trend = rows.map((r) => ({
        Product_Type: r.Product_Type,
        Order_Date: r.Order_Date,
        Total_Lead_Time_Hrs: r.Total_Lead_Time_Hrs,
      }))
      const lead_time_by_machine = rows.map((r) => ({
        Machine_Type: r.Machine_Type,
        Total_Lead_Time_Hrs: r.Total_Lead_Time_Hrs,
      }))

      return {
        lead_time_trend,
        lead_time_by_machine,
      }
    }

    return requestJson(`${API_BASE_URL}/charts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async automl(rows: OrderToDeliveryRow[]): Promise<{
    best_model: string
    model_comparison: Array<{ Model: string; R2: number; RMSE: number; MAE: number }>
    predictions: any[]
  }> {
    if (isDemoMode()) {
      return {
        best_model: 'XGBoost Regressor',
        model_comparison: [
          { Model: 'XGBoost Regressor', R2: 0.94, RMSE: 1.85, MAE: 1.35 },
          { Model: 'Random Forest Regressor', R2: 0.89, RMSE: 2.38, MAE: 1.82 },
          { Model: 'Gradient Boosting Regressor', R2: 0.87, RMSE: 2.62, MAE: 2.01 },
          { Model: 'Ridge Regression', R2: 0.78, RMSE: 3.45, MAE: 2.68 },
        ],
        predictions: rows.slice(0, 10).map((r) => ({
          Order_ID: r.Order_ID,
          Actual_Lead_Time: r.Total_Lead_Time_Hrs,
          Predicted_Lead_Time: r.Predicted_Lead_Time_Hrs ?? Number((r.Total_Lead_Time_Hrs * 0.98).toFixed(1)),
          Variance: Number(((r.Predicted_Lead_Time_Hrs ?? r.Total_Lead_Time_Hrs) - r.Total_Lead_Time_Hrs).toFixed(1)),
        })),
      }
    }

    return requestJson(`${API_BASE_URL}/ml/automl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async getInsights(rows: OrderToDeliveryRow[]): Promise<{
    insights: Array<{ Insight: string; Entity: string; Metric: string; Action: string }>
  }> {
    if (isDemoMode()) {
      return {
        insights: [
          {
            Insight: 'Machine Breakdown Bottleneck on CNC Lathes',
            Entity: 'CNC Lathe Line 2',
            Metric: 'Avg Machine Delay: 8.5 hrs',
            Action: 'Implement dual-stage tool change routine to cut spindle idle time by 40%',
          },
          {
            Insight: 'Weekend Batch Dispatch Lag',
            Entity: 'Friday Evening Batches',
            Metric: 'Dispatch Delay: 4.2 hrs',
            Action: 'Align 3PL cross-dock pickup window with shift completion cutoff',
          },
          {
            Insight: 'High Precision Injection Molding Stability',
            Entity: 'Injection Molded Casing',
            Metric: 'CSAT: 4.9 / 5.0',
            Action: 'Standardize mold preheating cycle across parallel fabrication cells',
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
      const rows = parsed.rows as OrderToDeliveryRow[]
      const product_types = Array.from(new Set(rows.map((r) => r.Product_Type).filter(Boolean))).sort()
      const machine_types = Array.from(new Set(rows.map((r) => r.Machine_Type).filter(Boolean))).sort()
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        product_types,
        machine_types,
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
      const rows = applyMappingToRows(parsed.rows, mapping) as OrderToDeliveryRow[]
      const product_types = Array.from(new Set(rows.map((r) => r.Product_Type).filter(Boolean))).sort()
      const machine_types = Array.from(new Set(rows.map((r) => r.Machine_Type).filter(Boolean))).sort()
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        product_types,
        machine_types,
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

  static downloadCsv(rows: any[], filename = 'order_to_delivery_data.csv') {
    exportToCsvFile(rows, filename)
  }
}
