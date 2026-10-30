import { parseCsvText, exportToCsvFile } from '@/utils/csvParser'
import { SALES_REVENUE_FEATURES } from './demoData/salesRevenueProjectData'
import { useAuthStore } from '@/stores/authStore'

export const BACKEND_API_BASE_URL =
  import.meta.env.VITE_BACKEND_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8000'

export const SALES_REVENUE_API_BASE_URL =
  import.meta.env.VITE_SALES_REVENUE_API_URL ||
  `${BACKEND_API_BASE_URL}/api/ml/sales-revenue`


export interface ModelInfoResponse {
  model_name: string
  model_version: string
  model_type: string
  library: string
  target_column: string
  target_units: string
  feature_count: number
  features: string[]
  intercept: number
  coefficients: Record<string, number>
  preprocessing: string
  benchmark_metrics: {
    r2: number
    rmse: number
    mae: number
  }
  artifact_path: string
}

export interface PredictionRecord {
  row_index: number
  predicted_revenue: number
  actual_revenue: number | null
  difference: number | null
  row_data: Record<string, any>
}

export interface InferenceResponse {
  model_name: string
  model_version: string
  input_row_count: number
  prediction_count: number
  target_name: string
  target_units: string
  has_ground_truth: boolean
  evaluation_metrics: {
    r2_score: number
    rmse: number
    mae: number
    evaluated_rows: number
  } | null
  summary_statistics: {
    min: number
    max: number
    mean: number
    median: number
    std: number
  }
  predictions: PredictionRecord[]
  warnings: string[]
}

export interface CsvValidationClientResult {
  isValid: boolean
  rowCount: number
  fileSize: number
  headers: string[]
  missingColumns: string[]
  extraColumns: string[]
  hasTargetColumn: boolean
  sampleRows: Record<string, any>[]
  error?: string
}

export class SalesRevenueInferenceService {
  /**
   * Health and model readiness probe
   */
  static async checkHealth(): Promise<{
    status: 'healthy' | 'degraded'
    service: string
    version: string
    model_loaded: boolean
    model_path?: string
  }> {
    const res = await fetch(`${SALES_REVENUE_API_BASE_URL}/health`, {
      method: 'GET',
    })
    if (!res.ok) {
      throw new Error(`Inference health check failed with HTTP ${res.status}`)
    }
    return res.json()
  }

  /**
   * Fetches saved model architecture and coefficients
   */
  static async getModelInfo(): Promise<ModelInfoResponse> {
    const res = await fetch(`${SALES_REVENUE_API_BASE_URL}/model-info`, {
      method: 'GET',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to fetch model info (HTTP ${res.status})`)
    }
    return res.json()
  }

  /**
   * Uploads and executes real inference on CSV file via FastAPI
   */
  static async predictCsv(file: File): Promise<InferenceResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const session = useAuthStore.getState().session
    const headers: Record<string, string> = {}
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }

    let res: Response
    try {
      res = await fetch(`${SALES_REVENUE_API_BASE_URL}/predict-csv`, {
        method: 'POST',
        headers,
        body: formData,
      })
    } catch (netErr: any) {
      throw new Error(
        `Unable to reach Sales Revenue Inference Service at ${SALES_REVENUE_API_BASE_URL}. ` +
        `Ensure the unified FastAPI backend service is running on port 8000.`
      )
    }

    if (!res.ok) {
      let detailMsg = `Inference failed with status ${res.status}`
      try {
        const errorBody = await res.json()
        if (typeof errorBody.detail === 'string') {
          detailMsg = errorBody.detail
        } else if (errorBody.detail && typeof errorBody.detail === 'object') {
          detailMsg = errorBody.detail.detail || JSON.stringify(errorBody.detail)
        }
      } catch {
        // Not JSON
      }
      throw new Error(detailMsg)
    }

    return res.json()
  }

  /**
   * Pre-validates CSV client-side before sending to server for instant feedback
   */
  static async preValidateCsv(file: File): Promise<CsvValidationClientResult> {
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return {
        isValid: false,
        rowCount: 0,
        fileSize: file.size,
        headers: [],
        missingColumns: [],
        extraColumns: [],
        hasTargetColumn: false,
        sampleRows: [],
        error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds limit of 10MB.`,
      }
    }

    const text = await file.text()
    if (!text.trim()) {
      return {
        isValid: false,
        rowCount: 0,
        fileSize: file.size,
        headers: [],
        missingColumns: [],
        extraColumns: [],
        hasTargetColumn: false,
        sampleRows: [],
        error: 'Uploaded file is empty (0 rows).',
      }
    }

    try {
      const parsed = parseCsvText(text)
      const headers = parsed.headers.map((h) => h.trim())
      const missing = SALES_REVENUE_FEATURES.filter((f) => !headers.includes(f))
      const hasTarget = headers.includes('monthly_revenue')
      const extra = headers.filter((h) => !SALES_REVENUE_FEATURES.includes(h as any) && h !== 'monthly_revenue')

      if (parsed.rowCount === 0) {
        return {
          isValid: false,
          rowCount: 0,
          fileSize: file.size,
          headers,
          missingColumns: missing,
          extraColumns: extra,
          hasTargetColumn: hasTarget,
          sampleRows: [],
          error: 'CSV contains a header row but no data rows.',
        }
      }

      const isValid = missing.length === 0
      return {
        isValid,
        rowCount: parsed.rowCount,
        fileSize: file.size,
        headers,
        missingColumns: missing,
        extraColumns: extra,
        hasTargetColumn: hasTarget,
        sampleRows: parsed.rows.slice(0, 5),
        error: isValid ? undefined : `Missing required columns: ${missing.join(', ')}`,
      }
    } catch (e: any) {
      return {
        isValid: false,
        rowCount: 0,
        fileSize: file.size,
        headers: [],
        missingColumns: [],
        extraColumns: [],
        hasTargetColumn: false,
        sampleRows: [],
        error: `CSV parse error: ${e.message}`,
      }
    }
  }

  /**
   * Generates downloadable results CSV including input columns + predicted_revenue
   */
  static downloadResults(predictions: PredictionRecord[], originalFilename = 'sales_predictions.csv'): void {
    if (!predictions || predictions.length === 0) return

    const rowsToExport = predictions.map((p) => {
      const row: Record<string, any> = {
        row_id: p.row_index + 1,
        ...p.row_data,
        predicted_revenue: p.predicted_revenue,
      }
      if (p.actual_revenue !== null) {
        row['actual_revenue'] = p.actual_revenue
        row['revenue_difference'] = p.difference
      }
      return row
    })

    const cleanFilename = originalFilename.replace(/\.csv$/i, '')
    exportToCsvFile(rowsToExport, `${cleanFilename}_with_predictions.csv`)
  }
}
