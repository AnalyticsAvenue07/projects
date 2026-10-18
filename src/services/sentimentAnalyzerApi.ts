import { isDemoMode } from './dataMode'
import { exportToCsvFile } from '@/utils/csvParser'
import { DEMO_SENTIMENT_DATA } from './demoData/hrAndGenAiData'

const API_BASE_URL =
  import.meta.env.VITE_AI_FEEDBACK_API_URL ||
  import.meta.env.VITE_SENTIMENT_ANALYZER_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8005'

export interface AnalysisResult {
  original_text: string
  sentiment: 'Positive' | 'Negative' | 'Neutral'
  tone: string
  analysis: string
}

export interface SentimentSummary {
  Positive: number
  Negative: number
  Neutral: number
}

export interface SentimentAnalyzerResponse {
  total_items: number
  total_time_secs: number
  avg_time_per_item: number
  sentiment_counts: SentimentSummary
  tone_counts: Record<string, number>
  results: AnalysisResult[]
}

export async function analyzeFile(file: File): Promise<SentimentAnalyzerResponse> {
  if (isDemoMode()) {
    // In demo mode, return simulated sentiment analysis based on demo data
    const results = [...DEMO_SENTIMENT_DATA]
    const counts = { Positive: 0, Negative: 0, Neutral: 0 }
    const tones: Record<string, number> = {}

    results.forEach((r) => {
      counts[r.sentiment] = (counts[r.sentiment] || 0) + 1
      tones[r.tone] = (tones[r.tone] || 0) + 1
    })

    return {
      total_items: results.length,
      total_time_secs: 1.25,
      avg_time_per_item: 0.18,
      sentiment_counts: counts,
      tone_counts: tones,
      results,
    }
  }

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.detail || error?.message || 'Failed to analyze file')
  }

  return response.json()
}

export async function runDemo(maxRows: number = 10): Promise<SentimentAnalyzerResponse> {
  if (isDemoMode()) {
    const results = DEMO_SENTIMENT_DATA.slice(0, maxRows)
    const counts = { Positive: 0, Negative: 0, Neutral: 0 }
    const tones: Record<string, number> = {}

    results.forEach((r) => {
      counts[r.sentiment] = (counts[r.sentiment] || 0) + 1
      tones[r.tone] = (tones[r.tone] || 0) + 1
    })

    return {
      total_items: results.length,
      total_time_secs: 0.85,
      avg_time_per_item: 0.12,
      sentiment_counts: counts,
      tone_counts: tones,
      results,
    }
  }

  const response = await fetch(`${API_BASE_URL}/demo?max_rows=${maxRows}`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.detail || error?.message || 'Failed to run demo')
  }

  return response.json()
}

export async function downloadCsv(results: AnalysisResult[]): Promise<void> {
  if (isDemoMode()) {
    exportToCsvFile(results, 'sentiment_analysis_report.csv')
    return
  }

  const response = await fetch(`${API_BASE_URL}/download-csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(results),
  })

  if (!response.ok) {
    let errorMessage = 'Failed to download CSV'
    try {
      const error = await response.json()
      errorMessage = error?.detail || error?.message || `Server error: ${response.status}`
    } catch {
      errorMessage = `Server error: ${response.status} ${response.statusText}`
    }
    throw new Error(errorMessage)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'sentiment_analysis_report.csv'
  link.click()
  URL.revokeObjectURL(url)
}
