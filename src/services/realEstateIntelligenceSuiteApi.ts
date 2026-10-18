import { isDemoMode } from './dataMode'
import { parseCsvFile, applyMappingToRows, exportToCsvFile } from '@/utils/csvParser'
import { DEMO_REAL_ESTATE_PROPERTIES } from './demoData/realEstateData'
import { DemoDataProvider } from './demoDataProvider'

const API_BASE_URL =
  import.meta.env.VITE_REAL_ESTATE_INTELLIGENCE_SUITE_API_URL ||
  import.meta.env.VITE_REALESTATE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000'

export interface RealEstateDatasetResponse {
  total_rows: number
  columns: string[]
  cities: string[]
  property_types: string[]
  area_min: number
  area_max: number
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
  price_histogram: Array<{ bin_start: number; bin_end: number; count: number }>
  city_avg_price: Array<Record<string, any>>
  price_vs_area: Array<Record<string, any>>
}

export interface GetColumnsResponse {
  columns: string[]
  required_cols: string[]
  file_bytes_b64: string
}

export interface MlPredictResponse {
  rmse: number
  r2: number
  test_size: number
  train_size: number
  predictions: Record<string, any>[]
}

export interface InsightsResponse {
  insights: Record<string, any>[]
  total_groups: number
}

export interface AiNarrativeResponse {
  narrative: string | null
  error: string | null
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const message = errorData?.detail || errorData?.message || response.statusText || 'Request failed'
    throw new Error(message)
  }
  return response.json()
}

export async function loadDefaultDataset(): Promise<RealEstateDatasetResponse> {
  if (isDemoMode()) {
    const rows = [...DEMO_REAL_ESTATE_PROPERTIES]
    const cities = Array.from(new Set(rows.map((r) => String(r.City)))).sort()
    const property_types = Array.from(new Set(rows.map((r) => String(r.Property_Type)))).sort()
    const areas = rows.map((r) => Number(r.Area_sqft) || 0)
    const area_min = areas.length ? Math.min(...areas) : 500
    const area_max = areas.length ? Math.max(...areas) : 5000
    const columns = rows.length ? Object.keys(rows[0]) : []

    return {
      total_rows: rows.length,
      columns,
      cities,
      property_types,
      area_min,
      area_max,
      preview: rows.slice(0, 10),
      data: rows,
    }
  }

  const response = await fetch(`${API_BASE_URL}/load-default`)
  return handleResponse(response)
}

export async function uploadCsv(file: File): Promise<RealEstateDatasetResponse> {
  if (isDemoMode()) {
    const parsed = await parseCsvFile<Record<string, any>>(file)
    const rows = parsed.rows
    const cities = Array.from(new Set(rows.map((r) => String(r.City || r.city || '')))).filter(Boolean).sort()
    const property_types = Array.from(new Set(rows.map((r) => String(r.Property_Type || r.property_type || '')))).filter(Boolean).sort()
    const areas = rows.map((r) => Number(r.Area_sqft || r.area_sqft || 0))
    const area_min = areas.length ? Math.min(...areas) : 500
    const area_max = areas.length ? Math.max(...areas) : 5000

    return {
      total_rows: rows.length,
      columns: parsed.headers,
      cities,
      property_types,
      area_min,
      area_max,
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

export async function getCsvColumns(file: File): Promise<GetColumnsResponse> {
  if (isDemoMode()) {
    const parsed = await parseCsvFile(file, { maxRows: 1 })
    return {
      columns: parsed.headers,
      required_cols: ['city', 'property_type', 'area_sqft', 'price'],
      file_bytes_b64: '',
    }
  }

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/get-columns`, {
    method: 'POST',
    body: formData,
  })
  return handleResponse(response)
}

export async function applyColumnMapping(file: File, mapping: {
  city: string
  property_type: string
  area_sqft: string
  price: string
}): Promise<RealEstateDatasetResponse> {
  if (isDemoMode()) {
    const parsed = await parseCsvFile(file)
    const mapDict: Record<string, string> = {
      City: mapping.city,
      Property_Type: mapping.property_type,
      Area_sqft: mapping.area_sqft,
      Price: mapping.price,
    }
    const mappedRows = applyMappingToRows(parsed.rows, mapDict)
    const cities = Array.from(new Set(mappedRows.map((r) => String(r.City || '')))).filter(Boolean).sort()
    const property_types = Array.from(new Set(mappedRows.map((r) => String(r.Property_Type || '')))).filter(Boolean).sort()
    const areas = mappedRows.map((r) => Number(r.Area_sqft || 0))

    return {
      total_rows: mappedRows.length,
      columns: Object.keys(mappedRows[0] || {}),
      cities,
      property_types,
      area_min: areas.length ? Math.min(...areas) : 500,
      area_max: areas.length ? Math.max(...areas) : 5000,
      preview: mappedRows.slice(0, 10),
      data: mappedRows,
    }
  }

  const formData = new FormData()
  formData.append('file', file)

  const params = new URLSearchParams({
    city: mapping.city,
    property_type: mapping.property_type,
    area_sqft: mapping.area_sqft,
    price: mapping.price,
  })

  const response = await fetch(`${API_BASE_URL}/apply-mapping?${params.toString()}`, {
    method: 'POST',
    body: formData,
  })

  return handleResponse(response)
}

export async function filterData(payload: {
  data: Record<string, any>[]
  cities?: string[]
  property_types?: string[]
  area_min?: number
  area_max?: number
}): Promise<FilterResponse> {
  if (isDemoMode()) {
    let filtered = payload.data || DEMO_REAL_ESTATE_PROPERTIES

    if (payload.cities && payload.cities.length > 0) {
      filtered = filtered.filter((r) => payload.cities!.includes(String(r.City)))
    }
    if (payload.property_types && payload.property_types.length > 0) {
      filtered = filtered.filter((r) => payload.property_types!.includes(String(r.Property_Type)))
    }
    if (typeof payload.area_min === 'number') {
      filtered = filtered.filter((r) => Number(r.Area_sqft) >= payload.area_min!)
    }
    if (typeof payload.area_max === 'number') {
      filtered = filtered.filter((r) => Number(r.Area_sqft) <= payload.area_max!)
    }

    const total = filtered.length
    const avgPrice = total ? Math.round(filtered.reduce((s, r) => s + (Number(r.Price) || 0), 0) / total) : 0
    const avgArea = total ? Math.round(filtered.reduce((s, r) => s + (Number(r.Area_sqft) || 0), 0) / total) : 0
    const avgPricePerSqft = avgArea > 0 ? Math.round(avgPrice / avgArea) : 0

    return {
      total_rows: total,
      kpis: {
        total_properties: total,
        avg_price: avgPrice,
        avg_price_per_sqft: avgPricePerSqft,
        avg_area: avgArea,
      },
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
    const prices = data.map((d) => Number(d.Price) || 0)
    const price_histogram = DemoDataProvider.createHistogram(prices, 5)

    const cityAvg = DemoDataProvider.aggregateByCategory(data, 'City', 'Price', 'avg')
    const city_avg_price = cityAvg.map((item) => ({ City: String(item.City), Avg_Price: Math.round(Number(item.Price) || 0) }))

    const price_vs_area = data.map((r) => ({
      Area_sqft: Number(r.Area_sqft) || 0,
      Price: Number(r.Price) || 0,
      City: r.City,
      Property_Type: r.Property_Type,
    }))

    return {
      price_histogram,
      city_avg_price,
      price_vs_area,
    }
  }

  const response = await fetch(`${API_BASE_URL}/charts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  return handleResponse(response)
}

export async function runMlPrediction(data: Record<string, any>[]): Promise<MlPredictResponse> {
  if (isDemoMode()) {
    const predictions = data.slice(0, 10).map((r) => {
      const actual = Number(r.Price) || 5000000
      const predicted = Math.round(actual * 0.98 + (Math.random() - 0.5) * 200000)
      return {
        ...r,
        Actual_Price: actual,
        Predicted_Price: predicted,
        Difference: actual - predicted,
      }
    })

    return {
      rmse: 342000,
      r2: 0.94,
      train_size: 48,
      test_size: 12,
      predictions,
    }
  }

  const response = await fetch(`${API_BASE_URL}/ml-predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  return handleResponse(response)
}

export async function getInsights(data: Record<string, any>[]): Promise<InsightsResponse> {
  if (isDemoMode()) {
    const grouped = DemoDataProvider.aggregateByCategory(data, 'Property_Type', 'Price', 'avg')
    const insights = grouped.map((item) => ({
      Property_Type: String(item.Property_Type),
      Avg_Price: Math.round(Number(item.Price) || 0),
      Count: Number(item.count) || data.filter((d) => d.Property_Type === item.Property_Type).length,
    }))

    return {
      insights,
      total_groups: insights.length,
    }
  }

  const response = await fetch(`${API_BASE_URL}/insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  return handleResponse(response)
}

export async function generateAiNarrative(data: Record<string, any>[], kpis: Record<string, any>, insights: Record<string, any>[]): Promise<AiNarrativeResponse> {
  if (isDemoMode()) {
    const avgPrice = kpis?.avg_price ? `₹${new Intl.NumberFormat('en-IN').format(kpis.avg_price)}` : 'market average'
    return {
      narrative: `Market Analysis Summary: Across the evaluated properties, the average price stands at ${avgPrice}. Premium villas in tech-corridors command strong capital appreciation, while 2-3 BHK apartments represent steady transaction volume. Square footage and proximity to transport arteries remain the primary valuation drivers.`,
      error: null,
    }
  }

  const response = await fetch(`${API_BASE_URL}/ai-narrative`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, kpis, insights }),
  })
  return handleResponse(response)
}

export async function downloadFilteredCsv(data: Record<string, any>[]): Promise<void> {
  if (isDemoMode()) {
    exportToCsvFile(data, 'real_estate_data.csv')
    return
  }

  const response = await fetch(`${API_BASE_URL}/download-csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const message = errorData?.detail || errorData?.message || response.statusText || 'Download failed'
    throw new Error(message)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'real_estate_data.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
