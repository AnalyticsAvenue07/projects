import axios from 'axios'
import type {
  WarehouseOperationsChartResponse,
  WarehouseOperationsClusterResponse,
  WarehouseOperationsDatasetResponse,
  WarehouseOperationsFilterResponse,
  WarehouseOperationsInsightsResponse,
  WarehouseOperationsMlResponse,
  WarehouseOperationsPlaybooksResponse,
  WarehouseOperationsRow,
} from '@/types/warehouseOperations'
import { isDemoMode } from './dataMode'
import { parseCsvFile, applyMappingToRows, exportToCsvFile } from '@/utils/csvParser'
import { DEMO_WAREHOUSE_OPERATIONS_DATA } from './demoData/supplyChainData'
import { DemoDataProvider } from './demoDataProvider'

const API_BASE_URL =
  import.meta.env.VITE_WAREHOUSE_OPERATIONS_API_URL ||
  'http://127.0.0.1:8013'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

function normalizeError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail || error.response?.data?.message || error.message
    return new Error(detail || 'Request failed')
  }
  if (error instanceof Error) return error
  return new Error('Request failed')
}

export async function loadDefaultDataset(): Promise<WarehouseOperationsDatasetResponse> {
  if (isDemoMode()) {
    const rows = [...DEMO_WAREHOUSE_OPERATIONS_DATA]
    const warehouses = Array.from(new Set(rows.map((r) => String(r.Warehouse || '')))).filter(Boolean).sort()
    const shifts = Array.from(new Set(rows.map((r) => String(r.Shift || '')))).filter(Boolean).sort()
    const picker_ids = Array.from(new Set(rows.map((r) => String(r.Picker_ID || '')))).filter(Boolean).sort()
    const columns = rows.length > 0 ? Object.keys(rows[0]) : []
    const dates = rows.map((r) => r.Order_Timestamp).filter(Boolean).sort()

    return {
      total_rows: rows.length,
      columns,
      warehouses,
      shifts,
      picker_ids,
      date_min: dates[0] || null,
      date_max: dates[dates.length - 1] || null,
      preview: rows.slice(0, 10),
      data: rows,
    }
  }

  try {
    const response = await api.get('/load-default')
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function uploadCsv(file: File): Promise<WarehouseOperationsDatasetResponse> {
  if (isDemoMode()) {
    const parsed = await parseCsvFile<WarehouseOperationsRow>(file)
    const rows = parsed.rows
    const warehouses = Array.from(new Set(rows.map((r) => String(r.Warehouse || '')))).filter(Boolean).sort()
    const shifts = Array.from(new Set(rows.map((r) => String(r.Shift || '')))).filter(Boolean).sort()
    const picker_ids = Array.from(new Set(rows.map((r) => String(r.Picker_ID || '')))).filter(Boolean).sort()
    const dates = rows.map((r) => r.Order_Timestamp).filter(Boolean).sort()

    return {
      total_rows: rows.length,
      columns: parsed.headers,
      warehouses,
      shifts,
      picker_ids,
      date_min: dates[0] || null,
      date_max: dates[dates.length - 1] || null,
      preview: rows.slice(0, 10),
      data: rows,
    }
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await axios.post(`${API_BASE_URL}/upload-csv`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function getCsvColumns(file: File): Promise<{ columns: string[]; required_cols: string[] }> {
  if (isDemoMode()) {
    const parsed = await parseCsvFile(file, { maxRows: 1 })
    return {
      columns: parsed.headers,
      required_cols: ['Order_ID', 'Warehouse', 'Zone', 'Aisle', 'Bin', 'Shift', 'Picker_ID', 'SKU', 'Pick_Qty', 'Travel_Time_Sec', 'Pick_Time_Sec'],
    }
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await axios.post(`${API_BASE_URL}/get-columns`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function applyColumnMapping(
  file: File,
  mapping: Record<string, string>,
): Promise<WarehouseOperationsDatasetResponse> {
  if (isDemoMode()) {
    const parsed = await parseCsvFile(file)
    const mappedRows = applyMappingToRows<WarehouseOperationsRow>(parsed.rows, mapping)
    const warehouses = Array.from(new Set(mappedRows.map((r) => String(r.Warehouse || '')))).filter(Boolean).sort()
    const shifts = Array.from(new Set(mappedRows.map((r) => String(r.Shift || '')))).filter(Boolean).sort()
    const picker_ids = Array.from(new Set(mappedRows.map((r) => String(r.Picker_ID || '')))).filter(Boolean).sort()
    const columns = mappedRows.length > 0 ? Object.keys(mappedRows[0]) : Object.keys(mapping)

    return {
      total_rows: mappedRows.length,
      columns,
      warehouses,
      shifts,
      picker_ids,
      preview: mappedRows.slice(0, 10),
      data: mappedRows,
    }
  }

  const formData = new FormData()
  formData.append('file', file)

  const backendFieldMap: Record<string, string> = {
    Order_ID: 'order_id',
    Warehouse: 'warehouse',
    Zone: 'zone',
    Aisle: 'aisle',
    Bin: 'bin_col',
    Order_Timestamp: 'order_timestamp',
    Shift: 'shift',
    Picker_ID: 'picker_id',
    SKU: 'sku',
    SKU_Weight_KG: 'sku_weight_kg',
    SKU_Cube_M3: 'sku_cube_m3',
    SKU_Class: 'sku_class',
    Pick_Qty: 'pick_qty',
    Travel_Distance_M: 'travel_distance_m',
    Travel_Time_Sec: 'travel_time_sec',
    Pick_Time_Sec: 'pick_time_sec',
    Pack_Time_Sec: 'pack_time_sec',
    Heatmap_Level: 'heatmap_level',
    Slotting_Score: 'slotting_score',
    Equipment_Type: 'equipment_type',
    Picker_Productivity_Items_Hour: 'picker_productivity_items_hour',
    Congestion_Factor: 'congestion_factor',
    Delay_Reason: 'delay_reason',
    Delay_Minutes: 'delay_minutes',
  }

  Object.entries(mapping).forEach(([key, value]) => {
    if (!value) return
    formData.append(backendFieldMap[key] || key.toLowerCase(), value)
  })

  try {
    const response = await axios.post(`${API_BASE_URL}/apply-mapping`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function filterData(payload: {
  data: WarehouseOperationsRow[]
  warehouses?: string[]
  shifts?: string[]
  picker_ids?: string[]
  date_start?: string
  date_end?: string
}): Promise<WarehouseOperationsFilterResponse> {
  if (isDemoMode()) {
    let filtered = payload.data || DEMO_WAREHOUSE_OPERATIONS_DATA

    if (payload.warehouses && payload.warehouses.length > 0) {
      filtered = filtered.filter((r) => payload.warehouses!.includes(String(r.Warehouse)))
    }
    if (payload.shifts && payload.shifts.length > 0) {
      filtered = filtered.filter((r) => payload.shifts!.includes(String(r.Shift)))
    }
    if (payload.picker_ids && payload.picker_ids.length > 0) {
      filtered = filtered.filter((r) => payload.picker_ids!.includes(String(r.Picker_ID)))
    }

    const total = filtered.length
    const avgPickTime = total ? Math.round(filtered.reduce((s, r) => s + (Number(r.Pick_Time_Sec) || 0), 0) / total) : null
    const avgTravelTime = total ? Math.round(filtered.reduce((s, r) => s + (Number(r.Travel_Time_Sec) || 0), 0) / total) : null
    const avgHeatmap = total ? +(filtered.reduce((s, r) => s + (Number(r.Heatmap_Level) || 0), 0) / total).toFixed(1) : null
    const avgProd = total ? Math.round(filtered.reduce((s, r) => s + (Number(r.Picker_Productivity_Items_Hour) || 0), 0) / total) : null

    return {
      total_rows: total,
      kpis: {
        total_orders: total,
        avg_pick_time_sec: avgPickTime,
        avg_travel_time_sec: avgTravelTime,
        avg_heatmap_level: avgHeatmap,
        avg_productivity: avgProd,
      },
      preview: filtered.slice(0, 10),
      data: filtered,
    }
  }

  try {
    const response = await api.post('/filter', payload)
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function getChartData(data: WarehouseOperationsRow[]): Promise<WarehouseOperationsChartResponse> {
  if (isDemoMode()) {
    const pickQtyVals = data.map((d) => Number(d.Pick_Qty) || 0)
    const pick_qty_distribution = DemoDataProvider.createHistogram(pickQtyVals, 4)

    const delayReasonCounts: Record<string, number> = {}
    const equipCounts: Record<string, number> = {}
    data.forEach((r) => {
      const reason = String(r.Delay_Reason || 'None')
      delayReasonCounts[reason] = (delayReasonCounts[reason] || 0) + 1
      const eq = String(r.Equipment_Type || 'Standard')
      equipCounts[eq] = (equipCounts[eq] || 0) + 1
    })

    const delay_reasons = Object.entries(delayReasonCounts).map(([Delay_Reason, Count]) => ({ Delay_Reason, Count }))
    const equipment_usage = Object.entries(equipCounts).map(([Equipment_Type, Count]) => ({ Equipment_Type, Count }))

    const zone_heatmap_activity = data.map((r) => ({
      Zone: r.Zone || 'Zone A',
      Aisle: r.Aisle || 'A-01',
      Heatmap_Level: r.Heatmap_Level || 4,
    }))

    const travel_time_vs_distance = data.map((r) => ({
      Travel_Distance_M: r.Travel_Distance_M,
      Travel_Time_Sec: r.Travel_Time_Sec,
      Warehouse: r.Warehouse,
    }))

    const productivity_by_shift = data.map((r) => ({
      Shift: r.Shift,
      Picker_Productivity_Items_Hour: r.Picker_Productivity_Items_Hour,
    }))

    return {
      pick_qty_distribution,
      delay_reasons,
      equipment_usage,
      zone_heatmap_activity,
      travel_time_vs_distance,
      productivity_by_shift,
    }
  }

  try {
    const response = await api.post('/charts', { data })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function getClusters(data: WarehouseOperationsRow[], n_clusters = 4): Promise<WarehouseOperationsClusterResponse> {
  if (isDemoMode()) {
    const clusters = ['Fast High-Density', 'Bulk Slow-Mover', 'Congested Core', 'Standard Medium']
    const scatter_data = data.map((r, i) => ({
      ...r,
      Cluster: clusters[i % clusters.length],
      PC1: ((i * 3) % 10) - 5,
      PC2: ((i * 7) % 10) - 5,
    }))

    const clusterCountsMap: Record<string, number> = {}
    scatter_data.forEach((r) => {
      clusterCountsMap[r.Cluster] = (clusterCountsMap[r.Cluster] || 0) + 1
    })

    const cluster_counts = Object.entries(clusterCountsMap).map(([Cluster, Count]) => ({ Cluster, Count }))

    return {
      n_clusters,
      cluster_counts,
      scatter_data,
    }
  }

  try {
    const response = await api.post('/ml/clustering', { data, n_clusters })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function runPickTimePredictor(data: WarehouseOperationsRow[]): Promise<WarehouseOperationsMlResponse> {
  if (isDemoMode()) {
    const predictions = data.slice(0, 10).map((r) => {
      const actual = Number(r.Pick_Time_Sec) || 20
      const predicted = Math.round(actual * (0.92 + Math.random() * 0.15))
      return {
        Order_ID: r.Order_ID,
        SKU: r.SKU,
        Actual_Pick_Time_Sec: actual,
        Predicted_Pick_Time_Sec: predicted,
        Diff: Math.abs(actual - predicted),
      }
    })

    return {
      model: 'RandomForestRegressor (Slotting & Picker Velocity)',
      target: 'Pick_Time_Sec',
      rmse: 2.45,
      r2: 0.93,
      train_size: 450,
      test_size: 112,
      predictions,
    }
  }

  try {
    const response = await api.post('/ml/pick-time', { data })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function runDelayPredictor(data: WarehouseOperationsRow[]): Promise<WarehouseOperationsMlResponse> {
  if (isDemoMode()) {
    const predictions = data.slice(0, 10).map((r) => {
      const actual = Number(r.Delay_Minutes) || 0
      const predicted = actual > 0 ? Math.round(actual * 0.9) : 0
      return {
        Order_ID: r.Order_ID,
        Delay_Reason: r.Delay_Reason,
        Actual_Delay_Minutes: actual,
        Predicted_Delay_Minutes: predicted,
      }
    })

    return {
      model: 'GradientBoostingClassifier (Dispatch Delay Predictor)',
      target: 'Delay_Minutes',
      rmse: 1.15,
      r2: 0.89,
      predictions,
    }
  }

  try {
    const response = await api.post('/ml/delay-predictor', { data })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function runProductivityPredictor(data: WarehouseOperationsRow[]): Promise<WarehouseOperationsMlResponse> {
  if (isDemoMode()) {
    const predictions = data.slice(0, 10).map((r) => {
      const actual = Number(r.Picker_Productivity_Items_Hour) || 60
      const predicted = Math.round(actual * 1.02)
      return {
        Picker_ID: r.Picker_ID,
        Actual_Productivity: actual,
        Predicted_Productivity: predicted,
      }
    })

    return {
      model: 'XGBoost Productivity Engine',
      target: 'Picker_Productivity_Items_Hour',
      rmse: 3.1,
      r2: 0.94,
      predictions,
    }
  }

  try {
    const response = await api.post('/ml/productivity-predictor', { data })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function getInsights(data: WarehouseOperationsRow[]): Promise<WarehouseOperationsInsightsResponse> {
  if (isDemoMode()) {
    return {
      insights: [
        {
          Insight: 'Zone A Slotting Optimization',
          Value: '88% High Velocity',
          Detail: 'Zone A handles 65% of order picks with average travel time below 40 seconds. Maintain fast-moving SKU placement here.',
        },
        {
          Insight: 'Aisle Congestion Warning',
          Value: 'Aisles B-04 & B-11',
          Detail: 'Heavy forklift activity during morning shifts causes up to 14 minute delays. Introduce staggered dispatch slots.',
        },
        {
          Insight: 'Picker Productivity Leader',
          Value: 'PKR-201 (96 items/hr)',
          Detail: 'Batch picking utilizing lightweight tote carts yielded 22% higher throughput than standard hand carts.',
        },
      ],
    }
  }

  try {
    const response = await api.post('/insights', { data })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function getPlaybooks(): Promise<WarehouseOperationsPlaybooksResponse> {
  if (isDemoMode()) {
    return {
      playbooks: [
        {
          Action: 'Re-slot Fast-Moving SKUs to Aisle A-01 through A-04',
          Rationale: 'Reduces total travel distance per pick run by an estimated 18%, recovering approximately 45 man-hours per week.',
        },
        {
          Action: 'Separate Forklift Traffic from Manual Picking Lanes',
          Rationale: 'Eliminates aisle bottlenecks in Zone B, preventing queue times exceeding 10 minutes.',
        },
        {
          Action: 'Implement Dynamic Wave Batching for Morning Shifts',
          Rationale: 'Groups multi-item orders by proximity bin tags, increasing pick productivity by up to 15%.',
        },
      ],
    }
  }

  try {
    const response = await api.get('/playbooks')
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function downloadFilteredCsv(data: WarehouseOperationsRow[]): Promise<Blob> {
  if (isDemoMode()) {
    exportToCsvFile(data, 'warehouse_operations_filtered.csv')
    return new Blob([JSON.stringify(data)], { type: 'text/csv' })
  }

  try {
    const response = await api.post('/download-csv', { data }, { responseType: 'blob' })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}
