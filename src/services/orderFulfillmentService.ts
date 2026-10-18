/**
 * Order Fulfillment & SLA Analytics Domain Service
 */

import { isDemoMode } from './dataMode'
import { requestJson } from './apiClient'
import { parseCsvFile, applyMappingToRows, exportToCsvFile } from '@/utils/csvParser'
import { DEMO_ORDER_FULFILLMENT_SLA_DATA, type OrderFulfillmentSlaRow } from './demoData/supplyChainData'
import { DemoDataProvider } from './demoDataProvider'

const API_BASE_URL =
  import.meta.env.VITE_ORDER_FULFILLMENT_SLA_API_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8026'

export interface OrderFulfillmentKpis {
  orders_count: number
  sla_breach_rate: number
  avg_fulfillment_hours: number
  qty_accuracy: number
  short_ship_rate: number
}

function calculateKpis(rows: OrderFulfillmentSlaRow[]): OrderFulfillmentKpis {
  const total = rows.length
  if (total === 0) {
    return {
      orders_count: 0,
      sla_breach_rate: 0,
      avg_fulfillment_hours: 0,
      qty_accuracy: 100,
      short_ship_rate: 0,
    }
  }

  const breaches = rows.filter((r) => r.SLA_Breach_Flag === 1).length
  const sla_breach_rate = Number(((breaches / total) * 100).toFixed(1))
  const avg_fulfillment_hours = Number(
    (rows.reduce((s, r) => s + (Number(r.Total_Fulfillment_Hours) || 0), 0) / total).toFixed(1),
  )
  const avgQtyAcc = Number(
    (rows.reduce((s, r) => s + (Number(r.Qty_Accuracy) || 100), 0) / total).toFixed(1),
  )
  const shortShips = rows.filter((r) => r.Short_Ship_Flag === 1).length
  const short_ship_rate = Number(((shortShips / total) * 100).toFixed(1))

  return {
    orders_count: total,
    sla_breach_rate,
    avg_fulfillment_hours,
    qty_accuracy: avgQtyAcc,
    short_ship_rate,
  }
}

export class OrderFulfillmentService {
  static async loadDefault(): Promise<{
    data: OrderFulfillmentSlaRow[]
    preview: OrderFulfillmentSlaRow[]
    warehouses: string[]
    product_types: string[]
    priorities: string[]
    regions: string[]
    kpis: OrderFulfillmentKpis
  }> {
    if (isDemoMode()) {
      const rows = [...DEMO_ORDER_FULFILLMENT_SLA_DATA]
      const warehouses = Array.from(new Set(rows.map((r) => r.Warehouse).filter(Boolean))).sort()
      const product_types = Array.from(new Set(rows.map((r) => r.Product_Type).filter(Boolean))).sort()
      const priorities = Array.from(new Set(rows.map((r) => r.Priority).filter(Boolean))).sort()
      const regions = Array.from(new Set(rows.map((r) => r.Region).filter(Boolean))).sort()
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        warehouses,
        product_types,
        priorities,
        regions,
        kpis,
      }
    }

    return requestJson(`${API_BASE_URL}/load-default`)
  }

  static async filter(params: {
    data: OrderFulfillmentSlaRow[]
    warehouses?: string[]
    product_types?: string[]
    priorities?: string[]
    regions?: string[]
    date_start?: string
    date_end?: string
  }): Promise<{
    data: OrderFulfillmentSlaRow[]
    preview: OrderFulfillmentSlaRow[]
    kpis: OrderFulfillmentKpis
  }> {
    if (isDemoMode()) {
      let filtered = [...params.data]
      if (params.warehouses && params.warehouses.length > 0) {
        filtered = filtered.filter((r) => params.warehouses!.includes(r.Warehouse))
      }
      if (params.product_types && params.product_types.length > 0) {
        filtered = filtered.filter((r) => params.product_types!.includes(r.Product_Type))
      }
      if (params.priorities && params.priorities.length > 0) {
        filtered = filtered.filter((r) => params.priorities!.includes(r.Priority))
      }
      if (params.regions && params.regions.length > 0) {
        filtered = filtered.filter((r) => params.regions!.includes(r.Region))
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

  static async getCharts(rows: OrderFulfillmentSlaRow[]): Promise<{
    orders_by_warehouse: any[]
    daily_sla_trend: any[]
    fulfillment_hours_histogram: any[]
    fulfillment_by_product_type: any[]
    shipping_vs_delay_cost: any[]
    warehouse_product_heatmap: any
    root_cause_frequency: any[]
    priority_mix: any[]
    fulfillment_cdf: any[]
    qty_accuracy_vs_fulfillment: any[]
    delay_type_distributions: any[]
    avg_fulfillment_by_region: any[]
    top10_delay_cost: any[]
  }> {
    if (isDemoMode()) {
      const orders_by_warehouse = DemoDataProvider.aggregateByCategory(rows, 'Warehouse', 'Order_ID', 'count').map((w) => ({
        Warehouse: w.Warehouse,
        count: w.Order_ID,
      }))

      const daily_sla_trend = DemoDataProvider.aggregateByCategory(rows, 'Order_Date', 'SLA_Breach_Flag', 'avg').map((d) => ({
        Order_Date: d.Order_Date,
        On_Time_Pct: Number(((1 - (Number(d.SLA_Breach_Flag) || 0)) * 100).toFixed(1)),
        Breach_Pct: Number(((Number(d.SLA_Breach_Flag) || 0) * 100).toFixed(1)),
      }))

      const fulfillment_hours = rows.map((r) => r.Total_Fulfillment_Hours)
      const fulfillment_hours_histogram = DemoDataProvider.generateHistogram(fulfillment_hours, 6)

      const fulfillment_by_product_type = DemoDataProvider.aggregateByCategory(rows, 'Product_Type', 'Total_Fulfillment_Hours', 'avg').map((p) => ({
        Product_Type: p.Product_Type,
        Hours: p.Total_Fulfillment_Hours,
      }))

      const shipping_vs_delay_cost = rows.map((r) => ({
        Shipping_Cost: r.Shipping_Cost,
        Delay_Cost: r.Delay_Cost,
        Priority: r.Priority,
        SLA_Breach_Flag: r.SLA_Breach_Flag,
      }))

      const warehouses = Array.from(new Set(rows.map((r) => r.Warehouse))).slice(0, 3)
      const product_types = Array.from(new Set(rows.map((r) => r.Product_Type))).slice(0, 4)
      const values = warehouses.map(() => product_types.map(() => Math.round(10 + Math.random() * 20)))

      const warehouse_product_heatmap = {
        warehouses,
        product_types,
        values,
      }

      const root_cause_frequency = DemoDataProvider.aggregateByCategory(rows, 'Root_Cause', 'Order_ID', 'count').map((rc) => ({
        Root_Cause: rc.Root_Cause,
        count: rc.Order_ID,
      }))

      const priority_mix = DemoDataProvider.aggregateByCategory(rows, 'Priority', 'Order_ID', 'count').map((pm) => ({
        Priority: pm.Priority,
        count: pm.Order_ID,
      }))

      const sortedHours = [...fulfillment_hours].sort((a, b) => a - b)
      const fulfillment_cdf = sortedHours.map((h, i) => ({
        hours: h,
        cdf: Number(((i + 1) / sortedHours.length).toFixed(2)),
      }))

      const qty_accuracy_vs_fulfillment = rows.map((r) => ({
        Total_Fulfillment_Hours: r.Total_Fulfillment_Hours,
        Qty_Accuracy_Pct: r.Qty_Accuracy,
        SLA_Breach_Flag: r.SLA_Breach_Flag,
      }))

      const delay_type_distributions = [
        { Delay_Type: 'Processing', hours: 2.1 },
        { Delay_Type: 'Picking', hours: 3.4 },
        { Delay_Type: 'Packing', hours: 2.0 },
        { Delay_Type: 'Dispatch', hours: 4.2 },
        { Delay_Type: 'Transport', hours: 14.8 },
      ]

      const avg_fulfillment_by_region = DemoDataProvider.aggregateByCategory(rows, 'Region', 'Total_Fulfillment_Hours', 'avg').map((rg) => ({
        Region: rg.Region,
        Hours: rg.Total_Fulfillment_Hours,
      }))

      const top10_delay_cost = [...rows].sort((a, b) => b.Delay_Cost - a.Delay_Cost).slice(0, 10).map((r) => ({
        Order_ID: r.Order_ID,
        Delay_Cost: r.Delay_Cost,
      }))

      return {
        orders_by_warehouse,
        daily_sla_trend,
        fulfillment_hours_histogram,
        fulfillment_by_product_type,
        shipping_vs_delay_cost,
        warehouse_product_heatmap,
        root_cause_frequency,
        priority_mix,
        fulfillment_cdf,
        qty_accuracy_vs_fulfillment,
        delay_type_distributions,
        avg_fulfillment_by_region,
        top10_delay_cost,
      }
    }

    return requestJson(`${API_BASE_URL}/charts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async classifySla(rows: OrderFulfillmentSlaRow[]): Promise<{
    accuracy: number
    roc_auc: number
    test_rows: number
    predictions: any[]
  }> {
    if (isDemoMode()) {
      return {
        accuracy: 94.2,
        roc_auc: 0.97,
        test_rows: Math.max(1, Math.round(rows.length * 0.2)),
        predictions: rows.slice(0, 10).map((r) => ({
          Order_ID: r.Order_ID,
          Actual_Breach: r.SLA_Breach_Flag,
          Predicted_Breach: r.SLA_Breach_Flag,
          Probability: r.SLA_Breach_Flag === 1 ? 0.92 : 0.08,
          Risk_Category: r.SLA_Breach_Flag === 1 ? 'High Risk' : 'On-Schedule',
        })),
      }
    }

    return requestJson(`${API_BASE_URL}/ml/sla-classifier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async regressFulfillment(rows: OrderFulfillmentSlaRow[]): Promise<{
    rmse: number
    r2: number
    test_rows: number
    predictions: any[]
  }> {
    if (isDemoMode()) {
      return {
        rmse: 2.14,
        r2: 0.92,
        test_rows: Math.max(1, Math.round(rows.length * 0.2)),
        predictions: rows.slice(0, 10).map((r) => ({
          Order_ID: r.Order_ID,
          Actual_Hours: r.Total_Fulfillment_Hours,
          Predicted_Hours: Number((r.Total_Fulfillment_Hours * 0.98).toFixed(1)),
          Residual: Number((r.Total_Fulfillment_Hours * 0.02).toFixed(1)),
        })),
      }
    }

    return requestJson(`${API_BASE_URL}/ml/fulfillment-regressor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async clusterOrders(rows: OrderFulfillmentSlaRow[], nClusters = 3): Promise<{
    cluster_counts: any[]
    cluster_centers: any[]
    scatter_data: any[]
  }> {
    if (isDemoMode()) {
      const cluster_counts = [
        { Cluster: 'Cluster 0: Standard Routine', Count: Math.round(rows.length * 0.6) },
        { Cluster: 'Cluster 1: Expedited Express', Count: Math.round(rows.length * 0.25) },
        { Cluster: 'Cluster 2: Delayed / At-Risk', Count: Math.max(1, Math.round(rows.length * 0.15)) },
      ]
      const cluster_centers = [
        { Cluster: 0, Avg_Hours: 14.5, Avg_Delay_Cost: 120 },
        { Cluster: 1, Avg_Hours: 9.8, Avg_Delay_Cost: 50 },
        { Cluster: 2, Avg_Hours: 36.2, Avg_Delay_Cost: 1850 },
      ]
      const scatter_data = rows.map((r, i) => ({
        Total_Fulfillment_Hours: r.Total_Fulfillment_Hours,
        Delay_Cost: r.Delay_Cost,
        cluster: r.SLA_Breach_Flag ? 2 : i % 3 === 0 ? 1 : 0,
        Order_ID: r.Order_ID,
      }))

      return { cluster_counts, cluster_centers, scatter_data }
    }

    return requestJson(`${API_BASE_URL}/ml/clustering`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows, n_clusters: nClusters }),
    })
  }

  static async detectAnomalies(rows: OrderFulfillmentSlaRow[]): Promise<{
    count: number
    rate_pct: number
    anomalies: any[]
  }> {
    if (isDemoMode()) {
      const anomalyList = rows.filter((r) => r.Total_Fulfillment_Hours > 35 || r.Delay_Cost > 1500).map((r) => ({
        Order_ID: r.Order_ID,
        Anomaly_Score: -0.68,
        Total_Fulfillment_Hours: r.Total_Fulfillment_Hours,
        Delay_Cost: r.Delay_Cost,
        Warehouse: r.Warehouse,
      }))

      return {
        count: anomalyList.length,
        rate_pct: Number(((anomalyList.length / (rows.length || 1)) * 100).toFixed(1)),
        anomalies: anomalyList,
      }
    }

    return requestJson(`${API_BASE_URL}/ml/anomaly-detection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async getPlaybooks(rows: OrderFulfillmentSlaRow[]): Promise<Record<string, string[]>> {
    if (isDemoMode()) {
      return {
        transport_delay_playbook: [
          'Trigger auto-reroute to regional air freight carrier when linehaul delay exceeds 5 hours.',
          'Pre-dispatch cross-dock receiving bay alert for expedited offloading on incoming trucks.',
        ],
        warehouse_congestion_playbook: [
          'Split high-density pick orders into concurrent wave sub-batches across Zone A and Zone B.',
          'Reassign quality inspection operators to packing stations during the 14:00-18:00 dispatch peak.',
        ],
        carrier_sla_recovery_protocol: [
          'Impose automated tier-2 penalty clauses on linehaul carriers breaching 95% on-time baseline.',
          'Activate secondary regional relay hub buffer inventory for high-priority B2B accounts.',
        ],
      }
    }

    return requestJson(`${API_BASE_URL}/playbooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async getInsights(rows: OrderFulfillmentSlaRow[]): Promise<{
    insights: Array<{ Insight: string; Value: string; Metric: string; Action: string }>
  }> {
    if (isDemoMode()) {
      return {
        insights: [
          {
            Insight: 'Primary Linehaul Bottleneck',
            Value: 'Inter-hub highway transit generates 64% of total customer SLA breaches',
            Metric: 'Transit Delays',
            Action: 'Deploy GPS geofence alerts and contract regional express relays',
          },
          {
            Insight: 'Top Operating Facility',
            Value: 'South Hub Nelamangala achieves 94.2% on-time fulfillment rate',
            Metric: 'Turnaround Time',
            Action: 'Adopt wave slotting layouts from South Hub across Northern facilities',
          },
          {
            Insight: 'Order Quantity Precision',
            Value: '98.4% pick accuracy sustained across high-velocity B2B deliveries',
            Metric: 'Accuracy',
            Action: 'Incorporate automated check-weighing on all high-value outbound pallets',
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
      const rows = parsed.rows as OrderFulfillmentSlaRow[]
      const warehouses = Array.from(new Set(rows.map((r) => r.Warehouse).filter(Boolean))).sort()
      const product_types = Array.from(new Set(rows.map((r) => r.Product_Type).filter(Boolean))).sort()
      const priorities = Array.from(new Set(rows.map((r) => r.Priority).filter(Boolean))).sort()
      const regions = Array.from(new Set(rows.map((r) => r.Region).filter(Boolean))).sort()
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        warehouses,
        product_types,
        priorities,
        regions,
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
      const rows = applyMappingToRows(parsed.rows, mapping) as OrderFulfillmentSlaRow[]
      const warehouses = Array.from(new Set(rows.map((r) => r.Warehouse).filter(Boolean))).sort()
      const product_types = Array.from(new Set(rows.map((r) => r.Product_Type).filter(Boolean))).sort()
      const priorities = Array.from(new Set(rows.map((r) => r.Priority).filter(Boolean))).sort()
      const regions = Array.from(new Set(rows.map((r) => r.Region).filter(Boolean))).sort()
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        warehouses,
        product_types,
        priorities,
        regions,
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

  static downloadCsv(rows: any[], filename = 'order_fulfillment_sla_data.csv') {
    exportToCsvFile(rows, filename)
  }
}
