import { parseCsvFile, parseCsvText, applyMappingToRows } from '@/utils/csvParser'
import type { ProjectDatasetItem } from '@/types/projectManagement'
import type { ChartConfig, FilterConfig, KpiCardConfig } from '@/types/dashboardConfiguration'
import { tryGetSupabase } from '@/lib/supabase/client'
import { isDemoMode } from './dataMode'
import * as XLSX from 'xlsx'

const LOCAL_DATASETS_KEY = 'aa_project_datasets_v1'

export interface DatasetAnalysisResult {
  filename: string
  fileSize: number
  rowCount: number
  headers: string[]
  schemaMeta: Record<string, 'number' | 'string' | 'date' | 'boolean'>
  sampleRows: Record<string, any>[]
  allRows: Record<string, any>[]
  quality: {
    missingValuesPerColumn: Record<string, number>
    duplicateRowsCount: number
    completenessPct: number
  }
}

/**
 * Infer column data types from sample values
 */
export function inferColumnTypes(
  headers: string[],
  rows: Record<string, any>[]
): Record<string, 'number' | 'string' | 'date' | 'boolean'> {
  const schema: Record<string, 'number' | 'string' | 'date' | 'boolean'> = {}

  for (const h of headers) {
    const values = rows
      .slice(0, 100)
      .map((r) => r[h])
      .filter((v) => v !== null && v !== undefined && v !== '')

    if (values.length === 0) {
      schema[h] = 'string'
      continue
    }

    const isBool = values.every((v) => typeof v === 'boolean' || v === 'true' || v === 'false')
    if (isBool) {
      schema[h] = 'boolean'
      continue
    }

    const isNumeric = values.every((v) => typeof v === 'number' || (typeof v !== 'boolean' && !Number.isNaN(Number(v)) && !/^[0-9]+-[0-9]+/.test(String(v))))
    if (isNumeric) {
      schema[h] = 'number'
      continue
    }

    const datePattern = /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}/
    const isDate = values.every((v) => {
      const s = String(v).trim()
      if (!datePattern.test(s)) return false
      const parsed = Date.parse(s)
      return !Number.isNaN(parsed) && s.length >= 6
    })
    if (isDate) {
      schema[h] = 'date'
      continue
    }

    schema[h] = 'string'
  }

  return schema
}

export class ProjectDatasetService {
  /**
   * Parse and analyze a CSV file before saving
   */
  static async analyzeCsvFile(file: File): Promise<DatasetAnalysisResult> {
    const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB limit
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds maximum allowed size of 15MB.`)
    }

    const parsed = await parseCsvFile(file)
    const { headers, rows, rowCount } = parsed

    if (rowCount === 0) {
      throw new Error('The selected CSV file does not contain any data rows.')
    }

    const schemaMeta = inferColumnTypes(headers, rows)

    // Quality checks
    const missingValuesPerColumn: Record<string, number> = {}
    for (const h of headers) {
      missingValuesPerColumn[h] = 0
    }

    let totalEmptyCells = 0
    for (const r of rows) {
      for (const h of headers) {
        const val = r[h]
        if (val === null || val === undefined || val === '') {
          missingValuesPerColumn[h]++
          totalEmptyCells++
        }
      }
    }

    const totalCells = rowCount * (headers.length || 1)
    const completenessPct = Number((((totalCells - totalEmptyCells) / totalCells) * 100).toFixed(1))

    // Simple duplicate check on stringified first 3 columns
    const keySet = new Set<string>()
    let duplicateRowsCount = 0
    const primaryCols = headers.slice(0, 3)

    for (const r of rows) {
      const key = primaryCols.map((c) => String(r[c] ?? '')).join('||')
      if (keySet.has(key)) {
        duplicateRowsCount++
      } else {
        keySet.add(key)
      }
    }

    return {
      filename: file.name,
      fileSize: file.size,
      rowCount,
      headers,
      schemaMeta,
      sampleRows: rows.slice(0, 10),
      allRows: rows,
      quality: {
        missingValuesPerColumn,
        duplicateRowsCount,
        completenessPct,
      },
    }
  }

  /**
   * Parse and analyze an Excel (.xlsx or .xls) file
   */
  static async analyzeExcelFile(file: File): Promise<DatasetAnalysisResult> {
    const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB limit
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds maximum allowed size of 20MB.`)
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      throw new Error('The uploaded Excel workbook contains no sheets.')
    }

    const sheet = workbook.Sheets[sheetName]
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: null })

    if (rawRows.length === 0) {
      throw new Error('The selected Excel sheet contains no data rows.')
    }

    // Sanitize headers and format dates
    const headerSet = new Set<string>()
    for (const r of rawRows) {
      for (const k of Object.keys(r)) {
        headerSet.add(String(k).trim())
      }
    }
    const headers = Array.from(headerSet)

    const rows = rawRows.map((row) => {
      const cleanRow: Record<string, any> = {}
      for (const h of headers) {
        let val = row[h]
        if (val instanceof Date) {
          val = val.toISOString().split('T')[0]
        }
        cleanRow[h] = val
      }
      return cleanRow
    })

    const schemaMeta = inferColumnTypes(headers, rows)

    const missingValuesPerColumn: Record<string, number> = {}
    for (const h of headers) missingValuesPerColumn[h] = 0

    let totalEmptyCells = 0
    for (const r of rows) {
      for (const h of headers) {
        const val = r[h]
        if (val === null || val === undefined || val === '') {
          missingValuesPerColumn[h]++
          totalEmptyCells++
        }
      }
    }

    const totalCells = rows.length * (headers.length || 1)
    const completenessPct = Number((((totalCells - totalEmptyCells) / totalCells) * 100).toFixed(1))

    const keySet = new Set<string>()
    let duplicateRowsCount = 0
    const primaryCols = headers.slice(0, 3)

    for (const r of rows) {
      const key = primaryCols.map((c) => String(r[c] ?? '')).join('||')
      if (keySet.has(key)) {
        duplicateRowsCount++
      } else {
        keySet.add(key)
      }
    }

    return {
      filename: file.name,
      fileSize: file.size,
      rowCount: rows.length,
      headers,
      schemaMeta,
      sampleRows: rows.slice(0, 10),
      allRows: rows,
      quality: {
        missingValuesPerColumn,
        duplicateRowsCount,
        completenessPct,
      },
    }
  }

  /**
   * Unified dataset parser accepting CSV and Excel (.xlsx, .xls) files
   */
  static async analyzeDatasetFile(file: File): Promise<DatasetAnalysisResult> {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'xlsx' || ext === 'xls') {
      return this.analyzeExcelFile(file)
    }
    return this.analyzeCsvFile(file)
  }

  /**
   * Save dataset item to storage / database
   */
  static async saveDataset(
    name: string,
    analysis: DatasetAnalysisResult,
    userId?: string
  ): Promise<ProjectDatasetItem> {
    const id = `ds_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const datasetItem: ProjectDatasetItem = {
      id,
      name: name.trim() || analysis.filename.replace(/\.csv$/i, ''),
      filename: analysis.filename,
      fileSize: analysis.fileSize,
      rowCount: analysis.rowCount,
      headers: analysis.headers,
      schemaMeta: analysis.schemaMeta,
      sampleRows: analysis.sampleRows,
      dataJson: analysis.allRows,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Try Supabase first if available and not demo
    const supabase = tryGetSupabase()
    if (!isDemoMode() && supabase && userId) {
      try {
        const { data, error } = await supabase
          .from('project_datasets')
          .insert({
            name: datasetItem.name,
            filename: datasetItem.filename,
            file_size: datasetItem.fileSize,
            row_count: datasetItem.rowCount,
            headers: datasetItem.headers,
            schema_meta: datasetItem.schemaMeta,
            sample_rows: datasetItem.sampleRows,
            data_json: datasetItem.dataJson,
            created_by: userId,
          })
          .select()
          .single()

        if (!error && data) {
          datasetItem.id = data.id
        }
      } catch (err) {
        console.warn('Failed to save dataset in Supabase, falling back to local cache', err)
      }
    }

    // Always cache locally for fast offline/demo availability
    const existing = this.getLocalDatasets()
    const updated = [datasetItem, ...existing.filter((d) => d.id !== datasetItem.id)]
    this.saveLocalDatasets(updated)

    return datasetItem
  }

  static getLocalDatasets(): ProjectDatasetItem[] {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(LOCAL_DATASETS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  static saveLocalDatasets(items: ProjectDatasetItem[]): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(LOCAL_DATASETS_KEY, JSON.stringify(items))
    } catch (e) {
      console.warn('LocalStorage limit exceeded when saving dataset cache', e)
    }
  }

  static async getDatasetById(id: string): Promise<ProjectDatasetItem | null> {
    const local = this.getLocalDatasets().find((d) => d.id === id)
    if (local) return local

    const supabase = tryGetSupabase()
    if (supabase) {
      const { data } = await supabase.from('project_datasets').select('*').eq('id', id).maybeSingle()
      if (data) {
        return {
          id: data.id,
          name: data.name,
          filename: data.filename,
          fileSize: data.file_size,
          rowCount: data.row_count,
          headers: data.headers,
          schemaMeta: data.schema_meta,
          sampleRows: data.sample_rows,
          dataJson: data.data_json,
          createdBy: data.created_by,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        }
      }
    }
    return null
  }
}

/**
 * Automatically inspects dataset columns and infers KPI cards, charts,
 * filters, and table views for credential-free native dashboard rendering.
 */
export function generateDefaultDashboardConfig(
  analysis: DatasetAnalysisResult,
  projectTitle?: string
): {
  kpis: KpiCardConfig[]
  charts: ChartConfig[]
  filters: FilterConfig[]
  tableColumns: string[]
} {
  const { headers, schemaMeta, rowCount, allRows } = analysis

  const numericCols: string[] = []
  const dateCols: string[] = []
  const categoricalCols: string[] = []

  for (const h of headers) {
    const type = schemaMeta[h]
    const hLower = h.toLowerCase()
    const isIdName = /(id|uuid|guid|key|code|#|ticket|order_num)/i.test(hLower)
    const isMetricName = /(amount|sales|revenue|cost|price|total|qty|quantity|count|score|rate|profit|margin|units)/i.test(hLower)

    if (type === 'number') {
      if (isIdName && !isMetricName) {
        categoricalCols.push(h)
      } else {
        numericCols.push(h)
      }
    } else if (type === 'date') {
      dateCols.push(h)
    } else {
      categoricalCols.push(h)
    }
  }

  // 1. Generate KPIs
  const kpis: KpiCardConfig[] = [
    {
      id: 'kpi_total_records',
      title: 'Total Records',
      staticValue: rowCount,
      format: 'integer',
      icon: 'layers',
      colorTheme: 'teal',
      description: 'Total records in active dataset',
    },
  ]

  for (const numCol of numericCols.slice(0, 3)) {
    const colLower = numCol.toLowerCase()
    const isPercent = /(rate|pct|percent|margin|ratio)/i.test(colLower)
    const isCurrency = !isPercent && /(revenue|sales|amount|cost|price|spend|budget|profit)/i.test(colLower)
    const fmt = isPercent ? 'percent' : isCurrency ? 'currency' : 'number'

    kpis.push({
      id: `kpi_${numCol.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      title: `Total ${numCol}`,
      field: numCol,
      aggregation: isPercent ? 'avg' : 'sum',
      format: fmt,
      colorTheme: isPercent ? 'blue' : isCurrency ? 'emerald' : 'amber',
    })
  }

  // 2. Generate Charts
  const charts: ChartConfig[] = []
  const primaryMetric = numericCols[0]
  const primaryCat = categoricalCols.find((c) => !/(id|uuid|guid|key|code)/i.test(c.toLowerCase())) || categoricalCols[0]

  // Chart 1: Trend over time or Primary Breakdown
  if (dateCols.length > 0 && primaryMetric) {
    charts.push({
      id: 'chart_trend_over_time',
      title: `${primaryMetric} Trend Over Time`,
      description: 'Historical progression across recorded dates',
      chartType: 'line',
      xField: dateCols[0],
      yField: primaryMetric,
      aggregation: 'sum',
      columnSpan: 2,
      colorScheme: 'teal',
      showGrid: true,
      showLegend: true,
    })
  } else if (primaryCat && primaryMetric) {
    charts.push({
      id: 'chart_primary_breakdown',
      title: `${primaryMetric} by ${primaryCat}`,
      description: `Aggregated distribution across ${primaryCat} categories`,
      chartType: 'bar',
      xField: primaryCat,
      yField: primaryMetric,
      aggregation: 'sum',
      columnSpan: 2,
      colorScheme: 'teal',
      showGrid: true,
      showLegend: true,
    })
  }

  // Chart 2: Secondary Breakdown / Category Distribution
  const secondCat = categoricalCols.filter((c) => c !== primaryCat && !/(id|uuid|guid|key|code)/i.test(c.toLowerCase()))[0]
  if (secondCat && primaryMetric) {
    const uniqueValsCount = new Set(allRows.map((r) => r[secondCat])).size
    charts.push({
      id: 'chart_category_distribution',
      title: `Distribution by ${secondCat}`,
      description: `Breakdown across ${secondCat}`,
      chartType: uniqueValsCount <= 7 ? 'donut' : 'bar',
      xField: secondCat,
      yField: primaryMetric,
      aggregation: 'sum',
      columnSpan: 1,
      colorScheme: 'multi',
      showLegend: true,
    })
  } else if (numericCols.length > 1 && primaryCat) {
    const secondMetric = numericCols[1]
    charts.push({
      id: 'chart_second_metric_breakdown',
      title: `${secondMetric} by ${primaryCat}`,
      description: `Secondary performance metric across ${primaryCat}`,
      chartType: 'bar',
      xField: primaryCat,
      yField: secondMetric,
      aggregation: 'sum',
      columnSpan: 1,
      colorScheme: 'indigo',
      showLegend: true,
    })
  }

  // Chart 3: Detailed Records Table
  charts.push({
    id: 'chart_records_overview',
    title: 'Records Summary Table',
    description: 'Detailed row-level tabular overview of primary fields',
    chartType: 'table',
    xField: headers[0] || 'id',
    columnSpan: 2,
  })

  // 3. Filters
  const filters: FilterConfig[] = []
  for (const catCol of categoricalCols.slice(0, 3)) {
    const uniqueVals = Array.from(new Set(allRows.map((r) => r[catCol]).filter(Boolean))).map(String)
    if (uniqueVals.length >= 2 && uniqueVals.length <= 25) {
      filters.push({
        id: `filter_${catCol.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        field: catCol,
        label: catCol,
        filterType: 'select',
        options: uniqueVals.slice(0, 25),
      })
    }
  }

  if (dateCols.length > 0) {
    filters.push({
      id: `filter_${dateCols[0].toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      field: dateCols[0],
      label: dateCols[0],
      filterType: 'daterange',
    })
  }

  return {
    kpis,
    charts,
    filters,
    tableColumns: headers.slice(0, 8),
  }
}
