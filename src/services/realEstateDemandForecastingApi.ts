import { isDemoMode } from './dataMode'
import { parseCsvFile, exportToCsvFile } from '@/utils/csvParser'
import {
  DEMO_REAL_ESTATE_PROPERTIES,
  DEMO_REAL_ESTATE_HISTORICAL_DEMAND,
  DEMO_REAL_ESTATE_FORECAST,
} from './demoData/realEstateData'

const API_BASE_URL =
  import.meta.env.VITE_REAL_ESTATE_DEMAND_FORECASTING_API_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8000'

export interface DemandForecastingDatasetResponse {
  total_rows: number
  columns: string[]
  cities: string[]
  property_types: string[]
  date_min?: string
  date_max?: string
  preview: Record<string, any>[]
  data: Record<string, any>[]
  warning?: string | null
}

export interface FilterResponse {
  total_rows: number
  kpis: Record<string, number>
  preview: Record<string, any>[]
  data: Record<string, any>[]
}

export interface ChartDataResponse {
  monthly_demand_trend: Array<{ Month: string; Demand: number }>
  demand_by_property_type: Array<{ Property_Type: string; Count: number }>
}

export interface ForecastResponse {
  historical_trend: Array<Record<string, any>>
  forecast: Array<{ Month: string; Forecast: number }>
  growth_percent: number
  months_used: number
  r2_score: number
}

export interface InsightsResponse {
  insights: Array<Record<string, any>>
  total_groups: number
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const message = errorData?.detail || errorData?.message || response.statusText || 'Request failed'
    throw new Error(message)
  }
  return response.json()
}

export async function loadDefaultDataset(): Promise<DemandForecastingDatasetResponse> {
  if (isDemoMode()) {
    const rows = [...DEMO_REAL_ESTATE_PROPERTIES]
    const cities = Array.from(new Set(rows.map((r) => String(r.City)))).sort()
    const property_types = Array.from(new Set(rows.map((r) => String(r.Property_Type)))).sort()
    const dates = rows.map((r) => r.Listing_Date).filter(Boolean).sort()
    const columns = rows.length ? Object.keys(rows[0]) : []

    return {
      total_rows: rows.length,
      columns,
      cities,
      property_types,
      date_min: dates[0] || '2026-01-01',
      date_max: dates[dates.length - 1] || '2026-03-31',
      preview: rows.slice(0, 10),
      data: rows,
    }
  }

  const response = await fetch(`${API_BASE_URL}/load-default`)
  return handleResponse(response)
}

export async function uploadCsv(file: File): Promise<DemandForecastingDatasetResponse> {
  if (isDemoMode()) {
    const parsed = await parseCsvFile<Record<string, any>>(file)
    const rows = parsed.rows
    const cities = Array.from(new Set(rows.map((r) => String(r.City || r.city || '')))).filter(Boolean).sort()
    const property_types = Array.from(new Set(rows.map((r) => String(r.Property_Type || r.property_type || '')))).filter(Boolean).sort()
    const dates = rows.map((r) => r.Listing_Date || r.listing_date).filter(Boolean).sort()

    return {
      total_rows: rows.length,
      columns: parsed.headers,
      cities,
      property_types,
      date_min: dates[0],
      date_max: dates[dates.length - 1],
      preview: rows.slice(0, 10),
      data: rows,
    }
  }

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/upload-csv`, {
    method: 'POST',
    body: formData,
  })

  return handleResponse(response)
}

export async function applyFilters(payload: {
  data: Record<string, any>[]
  cities?: string[]
  property_types?: string[]
  date_start?: string
  date_end?: string
}): Promise<FilterResponse> {
  if (isDemoMode()) {
    let filtered = payload.data || DEMO_REAL_ESTATE_PROPERTIES

    if (payload.cities && payload.cities.length > 0) {
      filtered = filtered.filter((r) => payload.cities!.includes(String(r.City)))
    }
    if (payload.property_types && payload.property_types.length > 0) {
      filtered = filtered.filter((r) => payload.property_types!.includes(String(r.Property_Type)))
    }

    const total = filtered.length
    const avgPrice = total ? Math.round(filtered.reduce((s, r) => s + (Number(r.Price) || 0), 0) / total) : 0
    const totalDemandIndex = Math.round(total * 42.5)

    // Calculate top city by frequency
    const cityCounts: Record<string, number> = {}
    filtered.forEach((r) => {
      const city = String(r.City || '')
      if (city) cityCounts[city] = (cityCounts[city] || 0) + 1
    })
    const topCityEntry = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]
    const topCity = topCityEntry ? topCityEntry[0] : (filtered[0]?.City ? String(filtered[0].City) : 'Mumbai')
    const avgMonthlySales = Math.round(total / 3) || 12

    return {
      total_rows: total,
      kpis: {
        total_listings: total,
        total_properties: total,
        avg_monthly_sales: avgMonthlySales,
        top_city: topCity,
        avg_price: avgPrice,
        total_demand_score: totalDemandIndex,
        absorption_rate_pct: 78.4,
      } as any,
      preview: filtered.slice(0, 10),
      data: filtered,
    }
  }

  const response = await fetch(`${API_BASE_URL}/filter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse(response)
}

export async function getChartData(data: Record<string, any>[]): Promise<ChartDataResponse> {
  if (isDemoMode()) {
    const propTypeCounts: Record<string, number> = {}
    data.forEach((r) => {
      const type = String(r.Property_Type || 'Apartment')
      propTypeCounts[type] = (propTypeCounts[type] || 0) + 1
    })

    const demand_by_property_type = Object.entries(propTypeCounts).map(([Property_Type, Count]) => ({
      Property_Type,
      Count,
    }))

    return {
      monthly_demand_trend: DEMO_REAL_ESTATE_HISTORICAL_DEMAND,
      demand_by_property_type,
    }
  }

  const response = await fetch(`${API_BASE_URL}/charts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  return handleResponse(response)
}

export async function getForecast(data: Record<string, any>[]): Promise<ForecastResponse> {
  if (isDemoMode()) {
    return {
      historical_trend: DEMO_REAL_ESTATE_HISTORICAL_DEMAND,
      forecast: DEMO_REAL_ESTATE_FORECAST,
      growth_percent: 12.8,
      months_used: 24,
      r2_score: 0.94,
    }
  }

  const response = await fetch(`${API_BASE_URL}/forecast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  return handleResponse(response)
}

export async function getInsights(data: Record<string, any>[]): Promise<InsightsResponse> {
  if (isDemoMode()) {
    const list = data && data.length ? data : DEMO_REAL_ESTATE_PROPERTIES
    const groups: Record<string, { city: string; type: string; prices: number[]; count: number }> = {}

    list.forEach((r) => {
      const city = String(r.City || 'Mumbai')
      const type = String(r.Property_Type || 'Apartment')
      const key = `${city}__${type}`
      const price = Number(r.Price) || 0
      if (!groups[key]) {
        groups[key] = { city, type, prices: [], count: 0 }
      }
      groups[key].prices.push(price)
      groups[key].count += 1
    })

    const insights = Object.values(groups)
      .map((g) => {
        const sum = g.prices.reduce((a, b) => a + b, 0)
        const avg = g.count ? Math.round(sum / g.count) : 0
        const max = g.prices.length ? Math.max(...g.prices) : 0
        const min = g.prices.length ? Math.min(...g.prices) : 0
        return {
          City: g.city,
          Property_Type: g.type,
          Avg_Price: avg,
          Max_Price: max,
          Min_Price: min,
          Count: g.count,
        }
      })
      .sort((a, b) => b.Count - a.Count)
      .slice(0, 15)

    return {
      insights,
      total_groups: Object.keys(groups).length,
    }
  }

  const response = await fetch(`${API_BASE_URL}/insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  return handleResponse(response)
}

export async function getCsvColumns(file: File): Promise<{ columns: string[] }> {
  if (isDemoMode()) {
    const parsed = await parseCsvFile(file, { maxRows: 1 })
    return { columns: parsed.headers }
  }

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/get-columns`, {
    method: 'POST',
    body: formData,
  })

  return handleResponse(response)
}

export async function applyColumnMapping(file: File, mapping: { city: string; listing_date: string; property_type: string; price: string }) {
  if (isDemoMode()) {
    const parsed = await parseCsvFile(file)
    const mapDict: Record<string, string> = {
      City: mapping.city,
      Listing_Date: mapping.listing_date,
      Property_Type: mapping.property_type,
      Price: mapping.price,
    }
    const mapped = parsed.rows.map((r: any) => {
      const out: Record<string, any> = {}
      for (const [targetKey, sourceKey] of Object.entries(mapDict)) {
        if (sourceKey && r[sourceKey] !== undefined) {
          out[targetKey] = r[sourceKey]
        }
      }
      return out
    })

    const dates = mapped.map((m: any) => m.Listing_Date).filter(Boolean).sort()
    return {
      data: mapped,
      preview: mapped.slice(0, 10),
      total_rows: mapped.length,
      cities: Array.from(new Set(mapped.map((m: any) => m.City))).filter(Boolean),
      property_types: Array.from(new Set(mapped.map((m: any) => m.Property_Type))).filter(Boolean),
      date_min: dates[0] || '2026-01-01',
      date_max: dates[dates.length - 1] || '2026-03-31',
    }
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('city', mapping.city)
  formData.append('listing_date', mapping.listing_date)
  formData.append('property_type', mapping.property_type)
  formData.append('price', mapping.price)

  const response = await fetch(`${API_BASE_URL}/apply-mapping`, {
    method: 'POST',
    body: formData,
  })

  return handleResponse(response)
}

export async function downloadCsvFile(payload: { data: Record<string, any>[] }): Promise<Blob> {
  if (isDemoMode()) {
    exportToCsvFile(payload.data, 'real_estate_demand_forecast.csv')
    return new Blob([JSON.stringify(payload.data)], { type: 'text/csv' })
  }

  const response = await fetch(`${API_BASE_URL}/download-csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const message = errorData?.detail || errorData?.message || response.statusText || 'Request failed'
    throw new Error(message)
  }

  return response.blob()
}
