/**
 * Real Estate Price vs Property Features Service
 * Clean domain service providing dual-mode operations (Demo Mode vs API Mode).
 */

import { isDemoMode } from './dataMode'
import { requestJson } from './apiClient'
import { parseCsvFile, applyMappingToRows, exportToCsvFile } from '@/utils/csvParser'
import { DEMO_REAL_ESTATE_PROPERTIES, type RealEstatePropertyRow } from './demoData/realEstateData'
import { DemoDataProvider } from './demoDataProvider'

const API_BASE_URL =
  import.meta.env.VITE_REAL_ESTATE_PRICE_VS_PROPERTY_FEATURES_API_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8010'

export interface RealEstateKpis {
  avg_price: number
  avg_price_per_sqft: number
  top_property_type: string
  top_city: string
  total_properties: number
}

export interface RealEstateChartItem {
  BHK?: number
  Bathroom_Count?: number
  Price?: number
  Area_sqft?: number
  Property_Type?: string
  City?: string
  [key: string]: any
}

export interface RealEstateCharts {
  price_vs_bhk: RealEstateChartItem[]
  price_vs_bathrooms: RealEstateChartItem[]
  price_vs_area: RealEstateChartItem[]
}

export interface RealEstatePredictionRow {
  City: string
  Property_Type: string
  BHK: number
  Bathroom_Count: number
  Area_sqft: number
  Actual_Price: number
  Predicted_Price: number
  Difference?: number
}

export interface RealEstateInsightRow {
  City: string
  Property_Type: string
  Avg_Price: number
  Max_Price: number
  Min_Price: number
  Count?: number
}

export interface RealEstateDatasetResponse {
  data: RealEstatePropertyRow[]
  preview: RealEstatePropertyRow[]
  total_rows: number
  cities: string[]
  property_types: string[]
  bhk_values: number[]
  bathroom_values: number[]
}

export interface FilterParams {
  data: RealEstatePropertyRow[]
  cities?: string[]
  property_types?: string[]
  bhk_values?: number[]
  bathroom_values?: number[]
}

export class RealEstatePriceVsFeaturesService {
  /**
   * Loads the default dataset
   */
  static async loadDefaultDataset(): Promise<RealEstateDatasetResponse> {
    if (isDemoMode()) {
      const rows = [...DEMO_REAL_ESTATE_PROPERTIES]
      const cities = Array.from(new Set(rows.map((r) => r.City))).sort()
      const property_types = Array.from(new Set(rows.map((r) => r.Property_Type))).sort()
      const bhk_values = Array.from(new Set(rows.map((r) => r.BHK))).sort((a, b) => a - b)
      const bathroom_values = Array.from(new Set(rows.map((r) => r.Bathroom_Count))).sort((a, b) => a - b)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        total_rows: rows.length,
        cities,
        property_types,
        bhk_values,
        bathroom_values,
      }
    }

    return requestJson<RealEstateDatasetResponse>(`${API_BASE_URL}/load-default`)
  }

  /**
   * Filters the dataset
   */
  static async filterDataset(params: FilterParams): Promise<{
    data: RealEstatePropertyRow[]
    preview: RealEstatePropertyRow[]
    kpis: RealEstateKpis | null
  }> {
    if (isDemoMode()) {
      let filtered = [...params.data]

      if (params.cities && params.cities.length > 0) {
        filtered = filtered.filter((r) => params.cities!.includes(r.City))
      }
      if (params.property_types && params.property_types.length > 0) {
        filtered = filtered.filter((r) => params.property_types!.includes(r.Property_Type))
      }
      if (params.bhk_values && params.bhk_values.length > 0) {
        filtered = filtered.filter((r) => params.bhk_values!.includes(r.BHK))
      }
      if (params.bathroom_values && params.bathroom_values.length > 0) {
        filtered = filtered.filter((r) => params.bathroom_values!.includes(r.Bathroom_Count))
      }

      const total_properties = filtered.length
      if (total_properties === 0) {
        return { data: [], preview: [], kpis: null }
      }

      const totalPrice = filtered.reduce((sum, r) => sum + (Number(r.Price) || 0), 0)
      const avg_price = Math.round(totalPrice / total_properties)

      const totalPps = filtered.reduce((sum, r) => sum + (Number(r.Price_per_sqft) || 0), 0)
      const avg_price_per_sqft = Math.round(totalPps / total_properties)

      // Frequency counts for top city and top property type
      const cityCounts: Record<string, number> = {}
      const typeCounts: Record<string, number> = {}
      filtered.forEach((r) => {
        cityCounts[r.City] = (cityCounts[r.City] || 0) + 1
        typeCounts[r.Property_Type] = (typeCounts[r.Property_Type] || 0) + 1
      })

      const top_city = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
      const top_property_type = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

      const kpis: RealEstateKpis = {
        avg_price,
        avg_price_per_sqft,
        top_property_type,
        top_city,
        total_properties,
      }

      return {
        data: filtered,
        preview: filtered.slice(0, 10),
        kpis,
      }
    }

    return requestJson<{ data: RealEstatePropertyRow[]; preview: RealEstatePropertyRow[]; kpis: RealEstateKpis }>(
      `${API_BASE_URL}/filter`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      },
    )
  }

  /**
   * Generates chart payloads
   */
  static async getCharts(rows: RealEstatePropertyRow[]): Promise<RealEstateCharts> {
    if (isDemoMode()) {
      if (!rows || rows.length === 0) {
        return { price_vs_bhk: [], price_vs_bathrooms: [], price_vs_area: [] }
      }

      const price_vs_bhk: RealEstateChartItem[] = rows.map((r) => ({
        BHK: r.BHK,
        Price: r.Price,
        Property_Type: r.Property_Type,
        City: r.City,
      }))

      const price_vs_bathrooms: RealEstateChartItem[] = rows.map((r) => ({
        Bathroom_Count: r.Bathroom_Count,
        Price: r.Price,
        Property_Type: r.Property_Type,
        City: r.City,
      }))

      const price_vs_area: RealEstateChartItem[] = rows.map((r) => ({
        Area_sqft: r.Area_sqft,
        Price: r.Price,
        Property_Type: r.Property_Type,
        City: r.City,
      }))

      return { price_vs_bhk, price_vs_bathrooms, price_vs_area }
    }

    return requestJson<RealEstateCharts>(`${API_BASE_URL}/charts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  /**
   * Generates ML predictions
   */
  static async predictMl(rows: RealEstatePropertyRow[]): Promise<{
    predictions: RealEstatePredictionRow[]
    rmse?: number
    r2?: number
  }> {
    if (isDemoMode()) {
      if (!rows || rows.length === 0) {
        return { predictions: [], rmse: 0, r2: 0 }
      }

      const actualPrices = rows.map((r) => Number(r.Price) || 0)
      const reg = DemoDataProvider.simulateRegression(actualPrices, (i, act) => {
        // Deterministic realistic variance +/- 4%
        const multiplier = 0.96 + ((i * 13) % 9) * 0.01
        return act * multiplier
      })

      const predictions: RealEstatePredictionRow[] = rows.slice(0, 15).map((r, i) => {
        const actual = Number(r.Price) || 0
        const predicted = reg.predictions[i] || Math.round(actual * 0.98)
        return {
          City: r.City,
          Property_Type: r.Property_Type,
          BHK: r.BHK,
          Bathroom_Count: r.Bathroom_Count,
          Area_sqft: r.Area_sqft,
          Actual_Price: actual,
          Predicted_Price: predicted,
          Difference: actual - predicted,
        }
      })

      return {
        predictions,
        rmse: reg.rmse,
        r2: reg.r2,
      }
    }

    return requestJson<{ predictions: RealEstatePredictionRow[]; rmse?: number; r2?: number }>(
      `${API_BASE_URL}/ml-predict`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: rows }),
      },
    )
  }

  /**
   * Generates grouped market insights
   */
  static async getInsights(rows: RealEstatePropertyRow[]): Promise<{ insights: RealEstateInsightRow[] }> {
    if (isDemoMode()) {
      if (!rows || rows.length === 0) {
        return { insights: [] }
      }

      // Group by City & Property_Type
      const groupMap = new Map<string, { city: string; type: string; prices: number[] }>()

      rows.forEach((r) => {
        const key = `${r.City}__${r.Property_Type}`
        if (!groupMap.has(key)) {
          groupMap.set(key, { city: r.City, type: r.Property_Type, prices: [] })
        }
        groupMap.get(key)!.prices.push(Number(r.Price) || 0)
      })

      const insights: RealEstateInsightRow[] = Array.from(groupMap.values()).map((g) => {
        const sorted = [...g.prices].sort((a, b) => a - b)
        const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length)
        return {
          City: g.city,
          Property_Type: g.type,
          Avg_Price: avg,
          Max_Price: sorted[sorted.length - 1],
          Min_Price: sorted[0],
          Count: sorted.length,
        }
      })

      return { insights: insights.sort((a, b) => b.Avg_Price - a.Avg_Price) }
    }

    return requestJson<{ insights: RealEstateInsightRow[] }>(`${API_BASE_URL}/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  /**
   * Browser-safe CSV Upload
   */
  static async uploadCsv(file: File): Promise<RealEstateDatasetResponse> {
    if (isDemoMode()) {
      const parsed = await parseCsvFile(file)
      const rows = parsed.rows as RealEstatePropertyRow[]
      const cities = Array.from(new Set(rows.map((r) => r.City).filter(Boolean))).sort()
      const property_types = Array.from(new Set(rows.map((r) => r.Property_Type).filter(Boolean))).sort()
      const bhk_values = Array.from(new Set(rows.map((r) => Number(r.BHK)).filter((v) => !Number.isNaN(v)))).sort((a, b) => a - b)
      const bathroom_values = Array.from(new Set(rows.map((r) => Number(r.Bathroom_Count)).filter((v) => !Number.isNaN(v)))).sort((a, b) => a - b)

      return {
        data: rows,
        preview: rows.slice(0, 10),
        total_rows: rows.length,
        cities,
        property_types,
        bhk_values,
        bathroom_values,
      }
    }

    const formData = new FormData()
    formData.append('file', file)
    return requestJson<RealEstateDatasetResponse>(`${API_BASE_URL}/upload-csv`, {
      method: 'POST',
      body: formData,
    })
  }

  /**
   * Inspect CSV columns for mapping
   */
  static async getCsvColumns(file: File): Promise<{ columns: string[]; expected_cols: string[] }> {
    if (isDemoMode()) {
      const parsed = await parseCsvFile(file)
      return {
        columns: parsed.headers,
        expected_cols: ['City', 'Property_Type', 'BHK', 'Bathroom_Count', 'Area_sqft', 'Price', 'Parking', 'Age_Years'],
      }
    }

    const formData = new FormData()
    formData.append('file', file)
    return requestJson<{ columns: string[]; expected_cols: string[] }>(`${API_BASE_URL}/get-columns`, {
      method: 'POST',
      body: formData,
    })
  }

  /**
   * Apply column mapping
   */
  static async applyMapping(file: File, mapping: Record<string, string>): Promise<RealEstateDatasetResponse> {
    if (isDemoMode()) {
      const parsed = await parseCsvFile(file)
      const mappedRows = applyMappingToRows(parsed.rows, mapping) as RealEstatePropertyRow[]
      const cities = Array.from(new Set(mappedRows.map((r) => r.City).filter(Boolean))).sort()
      const property_types = Array.from(new Set(mappedRows.map((r) => r.Property_Type).filter(Boolean))).sort()
      const bhk_values = Array.from(new Set(mappedRows.map((r) => Number(r.BHK)).filter((v) => !Number.isNaN(v)))).sort((a, b) => a - b)
      const bathroom_values = Array.from(new Set(mappedRows.map((r) => Number(r.Bathroom_Count)).filter((v) => !Number.isNaN(v)))).sort((a, b) => a - b)

      return {
        data: mappedRows,
        preview: mappedRows.slice(0, 10),
        total_rows: mappedRows.length,
        cities,
        property_types,
        bhk_values,
        bathroom_values,
      }
    }

    const formData = new FormData()
    formData.append('file', file)
    Object.entries(mapping).forEach(([key, val]) => {
      if (val) formData.append(key, val)
    })
    return requestJson<RealEstateDatasetResponse>(`${API_BASE_URL}/apply-mapping`, {
      method: 'POST',
      body: formData,
    })
  }

  /**
   * Download CSV
   */
  static downloadCsv(rows: RealEstatePropertyRow[], filename = 'real_estate_properties.csv'): void {
    exportToCsvFile(rows, filename)
  }
}
