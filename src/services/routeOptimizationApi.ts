import axios from 'axios'
import { isDemoMode } from './dataMode'
import { DEMO_ROUTE_OPTIMIZATION_DATA } from './demoData/supplyChainData'
import { parseCsvFile, applyMappingToRows } from '@/utils/csvParser'
import { DemoDataProvider } from './demoDataProvider'
import type {
  RouteOptimizationAnomalyResponse,
  RouteOptimizationChartResponse,
  RouteOptimizationClusterResponse,
  RouteOptimizationCostSimulationResponse,
  RouteOptimizationDatasetResponse,
  RouteOptimizationFilterResponse,
  RouteOptimizationInsightsResponse,
  RouteOptimizationMlResponse,
  RouteOptimizationPlaybooksResponse,
  RouteOptimizationRow,
} from '@/types/routeOptimization'

const API_BASE_URL =
  import.meta.env.VITE_ROUTE_OPTIMIZATION_API_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8011'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

function normalizeError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail || error.response?.data?.message || error.message
    if (
      detail.toLowerCase().includes('failed to fetch') ||
      detail.toLowerCase().includes('network error') ||
      detail.toLowerCase().includes('econnrefused') ||
      detail.toLowerCase().includes('127.0.0.1')
    ) {
      return new Error('Backend service is currently unavailable.')
    }
    return new Error(detail || 'Request failed')
  }
  if (error instanceof Error) return error
  return new Error('Request failed')
}

export async function loadDefaultDataset(): Promise<RouteOptimizationDatasetResponse> {
  if (isDemoMode()) {
    const data = [...DEMO_ROUTE_OPTIMIZATION_DATA]
    const vehicles = Array.from(new Set(data.map((r) => r.Vehicle_ID).filter(Boolean))).sort()
    const vehicle_types = Array.from(new Set(data.map((r) => r.Vehicle_Type).filter(Boolean))).sort()
    const routes = Array.from(new Set(data.map((r) => r.Route_ID).filter(Boolean))).sort()
    return {
      total_rows: data.length,
      columns: Object.keys(data[0] || {}),
      vehicles,
      vehicle_types,
      routes,
      preview: data.slice(0, 10),
      data,
    }
  }

  try {
    const response = await api.get('/load-default')
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function uploadCsv(file: File): Promise<RouteOptimizationDatasetResponse> {
  if (isDemoMode()) {
    const parsed = await parseCsvFile(file)
    const data = parsed.rows
    const vehicles = Array.from(new Set(data.map((r) => r.Vehicle_ID).filter(Boolean))).sort()
    const vehicle_types = Array.from(new Set(data.map((r) => r.Vehicle_Type).filter(Boolean))).sort()
    const routes = Array.from(new Set(data.map((r) => r.Route_ID).filter(Boolean))).sort()
    return {
      total_rows: data.length,
      columns: parsed.headers,
      vehicles,
      vehicle_types,
      routes,
      preview: data.slice(0, 10),
      data,
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

export async function getCsvColumns(file: File): Promise<{ columns: string[]; expected_cols: string[] }> {
  if (isDemoMode()) {
    const parsed = await parseCsvFile(file)
    return {
      columns: parsed.headers,
      expected_cols: [
        'Timestamp',
        'Vehicle_ID',
        'Vehicle_Type',
        'Route_ID',
        'Start_City',
        'End_City',
        'Route_Distance_km',
        'Traffic_Level',
        'Weather_Condition',
        'Actual_Travel_Hours',
        'Actual_Fuel_Liters',
        'Delay_Hours',
        'Efficiency_Score',
      ],
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
): Promise<RouteOptimizationDatasetResponse> {
  if (isDemoMode()) {
    const parsed = await parseCsvFile(file)
    const data = applyMappingToRows(parsed.rows, mapping)
    const vehicles = Array.from(new Set(data.map((r) => r.Vehicle_ID).filter(Boolean))).sort()
    const vehicle_types = Array.from(new Set(data.map((r) => r.Vehicle_Type).filter(Boolean))).sort()
    const routes = Array.from(new Set(data.map((r) => r.Route_ID).filter(Boolean))).sort()
    return {
      total_rows: data.length,
      columns: Object.keys(data[0] || {}),
      vehicles,
      vehicle_types,
      routes,
      preview: data.slice(0, 10),
      data,
    }
  }

  const formData = new FormData()
  formData.append('file', file)

  const backendFieldMap: Record<string, string> = {
    Timestamp: 'timestamp',
    Vehicle_ID: 'vehicle_id',
    Vehicle_Type: 'vehicle_type',
    Route_ID: 'route_id',
    Start_City: 'start_city',
    End_City: 'end_city',
    Route_Distance_km: 'route_distance_km',
    Traffic_Level: 'traffic_level',
    Weather_Condition: 'weather_condition',
    Predicted_Travel_Hours: 'predicted_travel_hours',
    Actual_Travel_Hours: 'actual_travel_hours',
    Predicted_Fuel_Liters: 'predicted_fuel_liters',
    Actual_Fuel_Liters: 'actual_fuel_liters',
    Vehicle_Capacity_kg: 'vehicle_capacity_kg',
    Load_Weight_kg: 'load_weight_kg',
    Delay_Hours: 'delay_hours',
    Efficiency_Score: 'efficiency_score',
  }

  Object.entries(mapping).forEach(([key, value]) => {
    if (!value) return
    formData.append(backendFieldMap[key] ?? key.toLowerCase(), value)
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
  data: RouteOptimizationRow[]
  vehicle_ids?: string[]
  vehicle_types?: string[]
  route_ids?: string[]
  date_start?: string
  date_end?: string
}): Promise<RouteOptimizationFilterResponse> {
  if (isDemoMode()) {
    let filtered = [...payload.data]
    if (payload.vehicle_ids && payload.vehicle_ids.length > 0) {
      filtered = filtered.filter((r) => payload.vehicle_ids!.includes(r.Vehicle_ID))
    }
    if (payload.vehicle_types && payload.vehicle_types.length > 0) {
      filtered = filtered.filter((r) => payload.vehicle_types!.includes(r.Vehicle_Type))
    }
    if (payload.route_ids && payload.route_ids.length > 0) {
      filtered = filtered.filter((r) => payload.route_ids!.includes(r.Route_ID))
    }

    const total_routes = filtered.length
    const avg_efficiency = total_routes > 0 ? Number((filtered.reduce((s, r) => s + (Number(r.Efficiency_Score) || 0), 0) / total_routes).toFixed(1)) : null
    const avg_delay_hours = total_routes > 0 ? Number((filtered.reduce((s, r) => s + (Number(r.Delay_Hours) || 0), 0) / total_routes).toFixed(1)) : null
    const avg_fuel_liters = total_routes > 0 ? Number((filtered.reduce((s, r) => s + (Number(r.Actual_Fuel_Liters) || 0), 0) / total_routes).toFixed(1)) : null
    const ontimeCount = filtered.filter((r) => (Number(r.Delay_Hours) || 0) <= 0.5).length
    const ontime_percent = total_routes > 0 ? Number(((ontimeCount / total_routes) * 100).toFixed(1)) : null

    return {
      total_rows: total_routes,
      kpis: {
        total_routes,
        avg_efficiency,
        avg_delay_hours,
        avg_fuel_liters,
        ontime_percent,
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

export async function getChartData(data: RouteOptimizationRow[]): Promise<RouteOptimizationChartResponse> {
  if (isDemoMode()) {
    const distances = data.map((r) => Number(r.Route_Distance_km) || 0)
    const route_distance_histogram = DemoDataProvider.generateHistogram(distances, 6)
    const efficiency_by_vehicle_type = DemoDataProvider.aggregateByCategory(data, 'Vehicle_Type', 'Efficiency_Score', 'avg')
    const delay_vs_distance = data.map((r) => ({
      Route_Distance_km: r.Route_Distance_km,
      Delay_Hours: r.Delay_Hours,
      Vehicle_Type: r.Vehicle_Type,
    }))
    const fuel_per_km = data.map((r) => ({
      Vehicle_Type: r.Vehicle_Type,
      Fuel_L_per_km: r.Fuel_L_per_km,
    }))
    const daily_efficiency_trend = data.map((r) => ({
      Timestamp: r.Timestamp,
      Efficiency_Score: r.Efficiency_Score,
    }))

    return {
      route_distance_histogram,
      efficiency_by_vehicle_type,
      delay_vs_distance,
      fuel_per_km,
      daily_efficiency_trend,
    }
  }

  try {
    const response = await api.post('/charts', { data })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function getClusters(data: RouteOptimizationRow[], n_clusters = 4): Promise<RouteOptimizationClusterResponse> {
  if (isDemoMode()) {
    return {
      clusters: data.map((r, i) => ({
        ...r,
        cluster: i % n_clusters,
      })),
    }
  }

  try {
    const response = await api.post('/clusters', { data, n_clusters })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function getCostSimulation(data: RouteOptimizationRow[]): Promise<RouteOptimizationCostSimulationResponse> {
  if (isDemoMode()) {
    const total_fuel_cost = 450000
    const total_distance_cost = 320000
    const total_delay_penalty = 85000
    return {
      simulation: data.slice(0, 10),
      total_fuel_cost,
      total_distance_cost,
      total_delay_penalty,
      grand_total_cost: total_fuel_cost + total_distance_cost + total_delay_penalty,
      assumptions: { fuel_rate_per_liter: 96.5, cost_per_km: 18.0, delay_penalty_per_hour: 450 },
    }
  }

  try {
    const response = await api.post('/cost-simulation', { data })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function runRandomForest(data: RouteOptimizationRow[]): Promise<RouteOptimizationMlResponse> {
  if (isDemoMode()) {
    return {
      model: 'Random Forest Regressor',
      target: 'Actual_Travel_Hours',
      rmse: 0.42,
      r2: 0.945,
      train_size: 48,
      test_size: 12,
      predictions: data.slice(0, 10).map((r) => ({
        Vehicle_ID: r.Vehicle_ID,
        Actual_Travel_Hours: r.Actual_Travel_Hours,
        Predicted_Travel_Hours: r.Predicted_Travel_Hours,
      })),
    }
  }

  try {
    const response = await api.post('/ml/random-forest', { data })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function runGradientBoosting(data: RouteOptimizationRow[]): Promise<RouteOptimizationMlResponse> {
  if (isDemoMode()) {
    return {
      model: 'Gradient Boosting Regressor',
      target: 'Actual_Travel_Hours',
      rmse: 0.38,
      r2: 0.961,
      train_size: 48,
      test_size: 12,
      predictions: data.slice(0, 10).map((r) => ({
        Vehicle_ID: r.Vehicle_ID,
        Actual_Travel_Hours: r.Actual_Travel_Hours,
        Predicted_Travel_Hours: r.Predicted_Travel_Hours,
      })),
    }
  }

  try {
    const response = await api.post('/ml/gradient-boosting', { data })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function runKnn(data: RouteOptimizationRow[]): Promise<RouteOptimizationMlResponse> {
  if (isDemoMode()) {
    return {
      model: 'K-Nearest Neighbors',
      target: 'Actual_Travel_Hours',
      rmse: 0.54,
      r2: 0.892,
      train_size: 48,
      test_size: 12,
      predictions: data.slice(0, 10).map((r) => ({
        Vehicle_ID: r.Vehicle_ID,
        Actual_Travel_Hours: r.Actual_Travel_Hours,
        Predicted_Travel_Hours: r.Predicted_Travel_Hours,
      })),
    }
  }

  try {
    const response = await api.post('/ml/knn', { data })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function runAnomalyDetection(data: RouteOptimizationRow[]): Promise<RouteOptimizationAnomalyResponse> {
  if (isDemoMode()) {
    const anomalies = data.map((r) => ({
      ...r,
      anomaly_score: r.Delay_Hours > 1.5 ? -0.45 : 0.25,
      is_anomaly: r.Delay_Hours > 1.5 ? 1 : 0,
    }))
    const num_anomalies = anomalies.filter((r) => r.is_anomaly === 1).length
    return {
      total_rows: data.length,
      num_anomalies,
      anomaly_rate: data.length > 0 ? Number(((num_anomalies / data.length) * 100).toFixed(1)) : 0,
      anomalies,
    }
  }

  try {
    const response = await api.post('/ml/anomaly-detection', { data })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function getInsights(data: RouteOptimizationRow[]): Promise<RouteOptimizationInsightsResponse> {
  if (isDemoMode()) {
    return {
      insights: data.slice(0, 5).map((r, idx) => ({
        Insight_Type: idx % 2 === 0 ? 'High Delay Risk' : 'Fuel Inefficiency',
        Route_ID: r.Route_ID ?? `RT-${idx + 1}`,
        Avg_Efficiency: Number(r.Efficiency_Score ?? 85),
        Count: 1,
        Avg_Delay_Hours: Number(r.Delay_Hours ?? 1.2),
        Vehicle_ID: r.Vehicle_ID ?? `VH-${idx + 1}`,
        Avg_L_per_km: Number(r.Fuel_Liters_per_km ?? 0.32),
      })),
    }
  }

  try {
    const response = await api.post('/insights', { data })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function getPlaybooks(data: RouteOptimizationRow[]): Promise<RouteOptimizationPlaybooksResponse> {
  if (isDemoMode()) {
    return {
      routes_to_reassign: data.slice(0, 5),
      vehicles_to_audit: data.slice(5, 10),
      drivers_to_coach: data.slice(10, 15),
      high_risk_conditions: data.slice(15, 20),
    }
  }

  try {
    const response = await api.post('/playbooks', { data })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function downloadFilteredCsv(data: RouteOptimizationRow[]): Promise<Blob> {
  if (isDemoMode()) {
    const headers = Object.keys(data[0] || {})
    const csvStr = [
      headers.join(','),
      ...data.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
    ].join('\r\n')
    return new Blob([csvStr], { type: 'text/csv;charset=utf-8;' })
  }

  try {
    const response = await api.post('/download-csv', { data }, { responseType: 'blob' })
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}
