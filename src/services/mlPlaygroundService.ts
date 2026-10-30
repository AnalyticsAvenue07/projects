import { BACKEND_API_BASE_URL } from './salesRevenueInferenceService'
import { useAuthStore } from '@/stores/authStore'
import { exportToCsvFile, parseCsvText } from '@/utils/csvParser'
import type {
  BatchPredictionResponse,
  DatasetCompatibilityReport,
  GeneratedDashboardData,
  ModelInspectionResult,
  RegisteredModelItem,
  SingleRecordPredictionResponse,
} from '@/types/mlPlayground'

export const ML_PLAYGROUND_API_BASE = `${BACKEND_API_BASE_URL}/api/ml`

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const session = useAuthStore.getState().session
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  return headers
}

export class MlPlaygroundService {
  /**
   * Statically inspects an uploaded model artifact (.joblib) before registration
   */
  static async inspectModel(file: File, manifestJson?: string): Promise<ModelInspectionResult> {
    const formData = new FormData()
    formData.append('file', file)
    if (manifestJson) {
      formData.append('manifest_json', manifestJson)
    }

    try {
      const res = await fetch(`${ML_PLAYGROUND_API_BASE}/models/inspect`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Model inspection failed with status ${res.status}`)
      }

      return res.json()
    } catch (err: any) {
      if (err.message && err.message.includes('Failed to fetch')) {
        throw new Error(`Cannot connect to Analytics Avenue ML Service at ${ML_PLAYGROUND_API_BASE}. Please ensure the backend is running on port 8000.`)
      }
      throw err
    }
  }

  /**
   * Registers a trained model artifact into the registry
   */
  static async registerModel(
    name: string,
    slug: string,
    file?: File,
    manifestJson?: string,
    projectId?: string,
    apiEndpoint?: string,
  ): Promise<RegisteredModelItem> {
    const formData = new FormData()
    formData.append('name', name)
    formData.append('slug', slug)
    if (file) formData.append('file', file)
    if (manifestJson) formData.append('manifest_json', manifestJson)
    if (projectId) formData.append('project_id', projectId)
    if (apiEndpoint) formData.append('api_endpoint', apiEndpoint)

    const res = await fetch(`${ML_PLAYGROUND_API_BASE}/models/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `Model registration failed (status ${res.status})`)
    }

    return res.json()
  }

  /**
   * Registers an external HTTPS inference API endpoint
   */
  static async registerApiEndpoint(payload: {
    name: string
    slug: string
    endpoint_url: string
    features: string[]
    model_type?: string
    api_key?: string
    project_id?: string
  }): Promise<RegisteredModelItem> {
    const res = await fetch(`${ML_PLAYGROUND_API_BASE}/models/register-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `External API registration failed (status ${res.status})`)
    }

    return res.json()
  }

  /**
   * Lists all registered models
   */
  static async listModels(): Promise<RegisteredModelItem[]> {
    try {
      const res = await fetch(`${ML_PLAYGROUND_API_BASE}/models`, {
        method: 'GET',
        headers: getAuthHeaders(),
      })

      if (!res.ok) {
        throw new Error(`Failed to list models (status ${res.status})`)
      }

      return res.json()
    } catch {
      return []
    }
  }

  /**
   * Retrieves single model metadata by ID or slug
   */
  static async getModel(idOrSlug: string): Promise<RegisteredModelItem> {
    const res = await fetch(`${ML_PLAYGROUND_API_BASE}/models/${idOrSlug}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `Model '${idOrSlug}' not found`)
    }

    return res.json()
  }

  /**
   * Validates dataset compatibility against model schema
   */
  static async validateDataset(
    modelIdOrSlug: string,
    file: File,
    targetColumn?: string,
  ): Promise<DatasetCompatibilityReport> {
    if (!modelIdOrSlug || modelIdOrSlug === 'undefined') {
      throw new Error('Model ID is required for dataset validation. Please upload and register the model in Step 2.')
    }
    const formData = new FormData()
    formData.append('file', file)
    if (targetColumn) {
      formData.append('target_column', targetColumn)
    }

    try {
      const res = await fetch(`${ML_PLAYGROUND_API_BASE}/models/${modelIdOrSlug}/validate-dataset`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Dataset validation failed (${res.status})`)
      }

      return res.json()
    } catch (err: any) {
      if (err.message && err.message.includes('Failed to fetch')) {
        throw new Error(`Cannot connect to Analytics Avenue ML Service at ${ML_PLAYGROUND_API_BASE}. Please ensure the backend is running on port 8000.`)
      }
      throw err
    }
  }

  /**
   * Executes single record prediction
   */
  static async predictRecord(
    modelIdOrSlug: string,
    inputs: Record<string, any>,
  ): Promise<SingleRecordPredictionResponse> {
    const res = await fetch(`${ML_PLAYGROUND_API_BASE}/models/${modelIdOrSlug}/predict-record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ inputs }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `Prediction failed (${res.status})`)
    }

    return res.json()
  }

  /**
   * Executes batch prediction on uploaded CSV file
   */
  static async predictCsv(
    modelIdOrSlug: string,
    file: File,
    columnMapping?: Record<string, string>,
    targetColumn?: string,
  ): Promise<BatchPredictionResponse> {
    const formData = new FormData()
    formData.append('file', file)
    if (columnMapping) {
      formData.append('column_mapping_json', JSON.stringify(columnMapping))
    }
    if (targetColumn) {
      formData.append('target_column', targetColumn)
    }

    const res = await fetch(`${ML_PLAYGROUND_API_BASE}/models/${modelIdOrSlug}/predict-csv`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `CSV Inference failed (HTTP ${res.status})`)
    }

    return res.json()
  }

  /**
   * Downloads prediction results CSV
   */
  static async exportPredictionsCsv(
    modelIdOrSlug: string,
    file: File,
    columnMapping?: Record<string, string>,
    targetColumn?: string,
  ): Promise<void> {
    const formData = new FormData()
    formData.append('file', file)
    if (columnMapping) {
      formData.append('column_mapping_json', JSON.stringify(columnMapping))
    }
    if (targetColumn) {
      formData.append('target_column', targetColumn)
    }

    const res = await fetch(`${ML_PLAYGROUND_API_BASE}/models/${modelIdOrSlug}/export-predictions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    })

    if (!res.ok) {
      throw new Error(`Export failed (HTTP ${res.status})`)
    }

    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `predicted_${file.name}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  /**
   * Client-side export helper for table records
   */
  static downloadRecordsAsCsv(
    records: { row_index: number; prediction: any; actual?: any; difference?: any; row_data: Record<string, any> }[],
    filename = 'predictions.csv',
  ): void {
    if (!records || records.length === 0) return

    const rowsToExport = records.map((r) => {
      const flat: Record<string, any> = {
        row_id: r.row_index + 1,
        ...r.row_data,
        predicted_value: r.prediction,
      }
      if (r.actual !== undefined && r.actual !== null) {
        flat['actual_value'] = r.actual
      }
      if (r.difference !== undefined && r.difference !== null) {
        flat['difference'] = r.difference
      }
      return flat
    })

    exportToCsvFile(rowsToExport, filename)
  }
}
