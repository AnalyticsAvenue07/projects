/**
 * Inventory Pileup & Shortage Analytics Lab Domain Service
 */

import { isDemoMode } from './dataMode'
import { requestJson } from './apiClient'
import { parseCsvFile, applyMappingToRows, exportToCsvFile } from '@/utils/csvParser'
import { DEMO_INVENTORY_PILEUP_DATA, type InventoryPileupRow } from './demoData/manufacturingData'
import { DemoDataProvider } from './demoDataProvider'

const API_BASE_URL =
  import.meta.env.VITE_INVENTORY_PILEUP_SHORTAGE_ANALYTICS_API_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8022'

export interface InventoryPileupKpis {
  active_skus: number
  avg_inventory: number | null
  shortage_events: number
  pileup_events: number
  service_level_pct: number | null
}

function calculateKpis(rows: InventoryPileupRow[]): InventoryPileupKpis {
  const active_skus = new Set(rows.map((r) => r.SKU).filter(Boolean)).size
  const total = rows.length
  if (total === 0) {
    return {
      active_skus: 0,
      avg_inventory: null,
      shortage_events: 0,
      pileup_events: 0,
      service_level_pct: null,
    }
  }

  const shortage_events = rows.filter((r) => r.Shortage_Flag === 1).length
  const pileup_events = rows.filter((r) => r.Pileup_Flag === 1).length
  const avg_inventory = Math.round(rows.reduce((s, r) => s + (Number(r.Inventory_Level) || 0), 0) / total)
  const service_level_pct = Number((((total - shortage_events) / total) * 100).toFixed(1))

  return {
    active_skus,
    avg_inventory,
    shortage_events,
    pileup_events,
    service_level_pct,
  }
}

export class InventoryPileupService {
  static async loadDefault(): Promise<{
    data: InventoryPileupRow[]
    preview: InventoryPileupRow[]
    skus: string[]
    kpis: InventoryPileupKpis
  }> {
    if (isDemoMode()) {
      const rows = [...DEMO_INVENTORY_PILEUP_DATA]
      const skus = Array.from(new Set(rows.map((r) => r.SKU).filter(Boolean))).sort()
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        skus,
        kpis,
      }
    }

    return requestJson(`${API_BASE_URL}/load-default`)
  }

  static async filter(params: {
    data: InventoryPileupRow[]
    skus?: string[]
    status?: string[]
  }): Promise<{
    data: InventoryPileupRow[]
    preview: InventoryPileupRow[]
    kpis: InventoryPileupKpis
  }> {
    if (isDemoMode()) {
      let filtered = [...params.data]
      if (params.skus && params.skus.length > 0) {
        filtered = filtered.filter((r) => params.skus!.includes(r.SKU))
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

  static async getCharts(rows: InventoryPileupRow[]): Promise<{
    inventory_over_time: any[]
    demand_vs_production: any[]
    safety_stock_breach: any[]
    shortage_vs_pileup: any[]
    lead_time_distribution: any[]
    inventory_forecast: any[]
  }> {
    if (isDemoMode()) {
      const inventory_over_time = rows.map((r) => ({
        Date: r.Date,
        SKU: r.SKU,
        Inventory_Level: r.Inventory_Level,
        Safety_Stock: r.Safety_Stock,
      }))
      const demand_vs_production = rows.map((r) => ({
        Date: r.Date,
        Total_Demand: r.Daily_Demand,
        Total_Production: r.Production_Qty,
      }))
      const safety_stock_breach = rows.filter((r) => r.Inventory_Level < r.Safety_Stock).map((r) => ({
        SKU: r.SKU,
        Inventory_Level: r.Inventory_Level,
        Safety_Stock: r.Safety_Stock,
      }))
      const shortageCount = rows.filter((r) => r.Shortage_Flag === 1).length
      const pileupCount = rows.filter((r) => r.Pileup_Flag === 1).length
      const shortage_vs_pileup = [
        { Type: 'Stockout / Shortage', Events: shortageCount },
        { Type: 'Excess / Pileup', Events: pileupCount },
      ]
      const leadTimes = rows.map((r) => r.Lead_Time_Days || 4)
      const lead_time_distribution = DemoDataProvider.generateHistogram(leadTimes, 5)
      const inventory_forecast = rows.map((r) => ({
        Date: r.Date,
        Inventory_Level: r.Inventory_Level,
        MA_7: Math.round(r.Inventory_Level * 0.96),
        MA_30: Math.round(r.Inventory_Level * 1.02),
        Naive_Forecast: Math.round(r.Inventory_Level * 0.98),
      }))

      return {
        inventory_over_time,
        demand_vs_production,
        safety_stock_breach,
        shortage_vs_pileup,
        lead_time_distribution,
        inventory_forecast,
      }
    }

    return requestJson(`${API_BASE_URL}/charts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async automl(rows: InventoryPileupRow[]): Promise<{
    model_comparison: Array<{ Model: string; R2: number; RMSE: number; MAE: number }>
    best_model: string
    predictions: any[]
  }> {
    if (isDemoMode()) {
      return {
        best_model: 'LightGBM Regressor',
        model_comparison: [
          { Model: 'LightGBM Regressor', R2: 0.93, RMSE: 18.4, MAE: 14.1 },
          { Model: 'Random Forest Regressor', R2: 0.88, RMSE: 24.2, MAE: 18.6 },
          { Model: 'Gradient Boosting Regressor', R2: 0.86, RMSE: 27.5, MAE: 20.3 },
          { Model: 'Linear Regression', R2: 0.74, RMSE: 39.1, MAE: 29.8 },
        ],
        predictions: rows.slice(0, 10).map((r) => ({
          SKU: r.SKU,
          Actual_Demand: r.Daily_Demand,
          Predicted_Demand: r.Predicted_Demand || Math.round(r.Daily_Demand * 0.97),
          Forecast_Error: r.Forecast_Error || Math.round(r.Daily_Demand * 0.03),
          Recommended_Safety_Stock: Math.round((r.Safety_Stock || 500) * 1.1),
        })),
      }
    }

    return requestJson(`${API_BASE_URL}/ml/automl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async simulate(params: {
    data: InventoryPileupRow[]
    dem_pct?: number
    prod_pct?: number
    proc_pct?: number
    ss_pct?: number
    lt_pct?: number
  }): Promise<{
    shortage_risk_pct: number
    pileup_risk_pct: number
    avg_safety_stock_coverage: number
    sku_simulation: any[]
  }> {
    if (isDemoMode()) {
      const rows = params.data
      const demFactor = 1 + (params.dem_pct ?? 0) / 100
      const prodFactor = 1 + (params.prod_pct ?? 0) / 100

      const simulatedSkus = rows.map((r) => {
        const simDemand = Math.round(r.Daily_Demand * demFactor)
        const simSupply = Math.round(r.Production_Qty * prodFactor)
        const simLevel = Math.max(0, r.Inventory_Level + simSupply - simDemand)
        const isShortage = simLevel < r.Safety_Stock ? 1 : 0
        const isPileup = simLevel > r.Safety_Stock * 3 ? 1 : 0

        return {
          ...r,
          Simulated_Demand: simDemand,
          Simulated_Level: simLevel,
          Simulated_Shortage: isShortage,
          Simulated_Pileup: isPileup,
        }
      })

      const shortages = simulatedSkus.filter((r) => r.Simulated_Shortage === 1).length
      const pileups = simulatedSkus.filter((r) => r.Simulated_Pileup === 1).length
      const shortage_risk_pct = Number(((shortages / (rows.length || 1)) * 100).toFixed(1))
      const pileup_risk_pct = Number(((pileups / (rows.length || 1)) * 100).toFixed(1))
      const avg_safety_stock_coverage = Number(
        (simulatedSkus.reduce((s, r) => s + (r.Simulated_Level / (r.Safety_Stock || 1)), 0) / (rows.length || 1)).toFixed(2),
      )

      return {
        shortage_risk_pct,
        pileup_risk_pct,
        avg_safety_stock_coverage,
        sku_simulation: simulatedSkus,
      }
    }

    return requestJson(`${API_BASE_URL}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  }

  static async getInsights(rows: InventoryPileupRow[]): Promise<{
    insights: Array<{ Insight_Type: string; SKU: string; Metric: string; Value: string }>
  }> {
    if (isDemoMode()) {
      return {
        insights: [
          {
            Insight_Type: 'Critical Stockout Risk',
            SKU: 'SKU-VALVE-SEAL-X',
            Metric: 'Backorders',
            Value: '85 Units (Safety Stock Breached by 58%)',
          },
          {
            Insight_Type: 'Capital Lockup / Excess Pileup',
            SKU: 'SKU-ALUM-PLATE-10',
            Metric: 'Holding Level',
            Value: '4,200 Units (5.2x Safety Stock)',
          },
          {
            Insight_Type: 'Procurement Supplier Lag',
            SKU: 'SKU-SENSOR-TEMP-K',
            Metric: 'Lead Time Delay',
            Value: '36 Hours Supplier Delay',
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
      const rows = parsed.rows as InventoryPileupRow[]
      const skus = Array.from(new Set(rows.map((r) => r.SKU).filter(Boolean))).sort()
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        skus,
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
      const rows = applyMappingToRows(parsed.rows, mapping) as InventoryPileupRow[]
      const skus = Array.from(new Set(rows.map((r) => r.SKU).filter(Boolean))).sort()
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        skus,
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

  static downloadCsv(rows: any[], filename = 'inventory_pileup_data.csv') {
    exportToCsvFile(rows, filename)
  }
}
