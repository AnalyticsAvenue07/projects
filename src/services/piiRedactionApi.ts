import { isDemoMode } from './dataMode'
import { DEMO_PII_RESULTS } from './demoData/hrAndGenAiData'

const API_BASE_URL =
  import.meta.env.VITE_PII_REDUCTION_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000'

export interface PiiRedactionResult {
  file_name: string
  redacted_text?: string
  detected_pii?: string[]
  pii_count?: number
  pii_types?: string[]
  error?: string | null
}

export interface PiiRedactionResponse {
  total_files: number
  successful: number
  failed: number
  results: PiiRedactionResult[]
}

export async function redactFiles(files: File[]): Promise<PiiRedactionResponse> {
  if (isDemoMode()) {
    const results: PiiRedactionResult[] = files.map((file, idx) => {
      return {
        file_name: file.name,
        redacted_text: `[DOCUMENT: ${file.name}]\nSubject: [NAME_REDACTED]\nContact Info: [EMAIL_REDACTED], [PHONE_REDACTED]\nTax / ID: [ID_NUM_REDACTED]\n\nRedacted in compliance with DPDP & GDPR data privacy guidelines.`,
        detected_pii: [
          `Detected Name (${idx + 1})`,
          `Detected Email (user${idx + 1}@domain.com)`,
          'Detected National ID',
          'Detected Phone (+91 98XXX XXXXX)',
        ],
        pii_count: 4,
        pii_types: ['NAME', 'EMAIL', 'GOVT_ID', 'PHONE'],
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

  const response = await fetch(`${API_BASE_URL}/redact`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.detail || error?.message || 'Failed to redact files')
  }

  return response.json()
}

export async function runDemo(): Promise<PiiRedactionResponse> {
  if (isDemoMode()) {
    return {
      total_files: DEMO_PII_RESULTS.length,
      successful: DEMO_PII_RESULTS.length,
      failed: 0,
      results: DEMO_PII_RESULTS,
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
