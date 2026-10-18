import { isDemoMode } from './dataMode'
import { DEMO_IDP_RESULTS } from './demoData/hrAndGenAiData'

const API_BASE_URL =
  import.meta.env.VITE_IDP_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8006'

export interface IdpProcessResult {
  file_name: string
  document_type?: string
  signature_present?: boolean
  extracted_data?: Record<string, any>
  signature_image?: string | null
  raw_text?: string
  error?: string | null
}

export interface IdpProcessResponse {
  total_files: number
  successful: number
  failed: number
  results: IdpProcessResult[]
}

export async function processFiles(files: File[]): Promise<IdpProcessResponse> {
  if (isDemoMode()) {
    const results: IdpProcessResult[] = files.map((file, idx) => {
      const isInvoice = file.name.toLowerCase().includes('inv')
      return {
        file_name: file.name,
        document_type: isInvoice ? 'Commercial Invoice' : 'General Contract / Form',
        signature_present: true,
        extracted_data: isInvoice
          ? {
              invoice_number: `INV-2026-${1000 + idx}`,
              vendor: 'Analytics Avenue Partner Corp',
              date: '2026-02-15',
              total_amount: 85000 + idx * 12000,
              currency: 'INR',
              tax_id: '29ABCDE1234F1Z5',
            }
          : {
              contract_id: `AGR-2026-${500 + idx}`,
              parties: ['Analytics Avenue Innovations', 'Enterprise Client'],
              effective_date: '2026-02-01',
              term: '12 Months',
              status: 'Executed',
            },
        raw_text: `Processed ${file.name} successfully via in-browser OCR & Entity Extractor (Demo Mode). Extracted all structured key-value pairs with signature verification flag.`,
        error: null,
      }
    })

    return {
      total_files: files.length,
      successful: files.length,
      failed: 0,
      results,
    }
  }

  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  const response = await fetch(`${API_BASE_URL}/process`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.detail || error?.message || 'Failed to process documents')
  }

  return response.json()
}

export async function runDemo(): Promise<IdpProcessResponse> {
  if (isDemoMode()) {
    return {
      total_files: DEMO_IDP_RESULTS.length,
      successful: DEMO_IDP_RESULTS.length,
      failed: 0,
      results: DEMO_IDP_RESULTS,
    }
  }

  const response = await fetch(`${API_BASE_URL}/demo`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.detail || error?.message || 'Failed to run demo')
  }

  return response.json()
}
