export type WarehouseOperationsRow = Record<string, any>

export interface WarehouseOperationsDatasetResponse {
  total_rows: number
  columns: string[]
  warehouses: string[]
  shifts: string[]
  picker_ids?: string[]
  date_min?: string | null
  date_max?: string | null
  preview: WarehouseOperationsRow[]
  data: WarehouseOperationsRow[]
  warning?: string | null
}

export interface WarehouseOperationsFilterResponse {
  total_rows: number
  kpis: {
    total_orders: number
    avg_pick_time_sec: number | null
    avg_travel_time_sec: number | null
    avg_heatmap_level: number | null
    avg_productivity: number | null
  }
  preview: WarehouseOperationsRow[]
  data: WarehouseOperationsRow[]
}

export interface WarehouseOperationsChartResponse {
  pick_qty_distribution?: Array<{ bin_start: number; bin_end: number; count: number }>
  travel_distance_over_time?: WarehouseOperationsRow[]
  zone_heatmap_activity?: WarehouseOperationsRow[]
  slotting_score_by_sku_class?: WarehouseOperationsRow[]
  delay_reasons?: Array<{ Delay_Reason: string; Count: number }>
  travel_time_vs_distance?: WarehouseOperationsRow[]
  equipment_usage?: Array<{ Equipment_Type: string; Count: number }>
  picker_productivity_distribution?: Array<{ bin_start: number; bin_end: number; count: number }>
  congestion_by_warehouse?: WarehouseOperationsRow[]
  sku_weight_distribution?: Array<{ bin_start: number; bin_end: number; count: number }>
  pick_vs_pack_time?: WarehouseOperationsRow[]
  heatmap_over_time?: WarehouseOperationsRow[]
  aisle_congestion?: WarehouseOperationsRow[]
  productivity_by_shift?: WarehouseOperationsRow[]
  delay_duration_distribution?: Array<{ bin_start: number; bin_end: number; count: number }>
}

export interface WarehouseOperationsClusterResponse {
  n_clusters?: number
  cluster_counts?: Array<{ Cluster: string; Count: number }>
  scatter_data?: WarehouseOperationsRow[]
  error?: string
}

export interface WarehouseOperationsMlResponse {
  model?: string
  target?: string
  rmse?: number
  r2?: number
  train_size?: number
  test_size?: number
  predictions?: Array<WarehouseOperationsRow>
  error?: string
}

export interface WarehouseOperationsInsightsResponse {
  insights?: Array<{ Insight: string; Value: string; Detail: string }>
}

export interface WarehouseOperationsPlaybooksResponse {
  playbooks?: Array<{ Action: string; Rationale: string }>
}

export type WarehouseOperationsMode = 'default' | 'upload' | 'mapping'
