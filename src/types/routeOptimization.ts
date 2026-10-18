export type RouteOptimizationRow = Record<string, any>

export interface RouteOptimizationDatasetResponse {
  total_rows: number
  columns: string[]
  vehicles: string[]
  vehicle_types: string[]
  routes: string[]
  date_min?: string | null
  date_max?: string | null
  preview: RouteOptimizationRow[]
  data: RouteOptimizationRow[]
  warning?: string | null
}

export interface RouteOptimizationFilterResponse {
  total_rows: number
  kpis: {
    total_routes: number
    avg_efficiency: number | null
    avg_delay_hours: number | null
    avg_fuel_liters: number | null
    ontime_percent: number | null
  }
  preview: RouteOptimizationRow[]
  data: RouteOptimizationRow[]
}

export interface RouteOptimizationChartResponse {
  route_distance_histogram?: Array<{ bin_start: number; bin_end: number; count: number }>
  efficiency_by_vehicle_type?: RouteOptimizationRow[]
  delay_vs_distance?: RouteOptimizationRow[]
  fuel_per_km?: RouteOptimizationRow[]
  daily_efficiency_trend?: Array<{ Timestamp: string; Efficiency_Score: number }>
  correlation_matrix?: { columns: string[]; values: Array<Array<number | null>> }
}

export interface RouteOptimizationClusterResponse {
  clusters?: Array<RouteOptimizationRow>
  error?: string
}

export interface RouteOptimizationCostSimulationResponse {
  simulation?: Array<RouteOptimizationRow>
  total_fuel_cost?: number
  total_distance_cost?: number
  total_delay_penalty?: number
  grand_total_cost?: number
  assumptions?: Record<string, number>
  error?: string
}

export interface RouteOptimizationMlResponse {
  model?: string
  target?: string
  rmse?: number
  r2?: number
  train_size?: number
  test_size?: number
  predictions?: Array<RouteOptimizationRow>
  error?: string
}

export interface RouteOptimizationAnomalyResponse {
  total_rows?: number
  num_anomalies?: number
  anomaly_rate?: number
  anomalies?: Array<RouteOptimizationRow>
  error?: string
}

export interface RouteOptimizationInsightsResponse {
  insights?: Array<RouteOptimizationRow>
  summary?: Record<string, number | null>
}

export interface RouteOptimizationPlaybooksResponse {
  routes_to_reassign?: Array<RouteOptimizationRow>
  vehicles_to_audit?: Array<RouteOptimizationRow>
  drivers_to_coach?: Array<RouteOptimizationRow>
  high_risk_conditions?: Array<RouteOptimizationRow>
}

export type RouteOptimizationMode = 'default' | 'upload' | 'mapping'
