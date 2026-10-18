/**
 * Centralized API Client with normalized error handling
 * When API mode is enabled, handles requests with graceful error translation.
 */

export interface ApiClientConfig {
  baseUrl?: string
}

export class ApiError extends Error {
  status?: number
  details?: unknown

  constructor(message: string, status?: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export function normalizeErrorMessage(err: unknown, defaultMessage = 'Backend service is currently unavailable.'): string {
  if (!err) return defaultMessage
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (
      msg.includes('failed to fetch') ||
      msg.includes('network error') ||
      msg.includes('econnrefused') ||
      msg.includes('connection refused') ||
      msg.includes('127.0.0.1') ||
      msg.includes('localhost')
    ) {
      return 'Backend service is currently unavailable.'
    }
    return err.message
  }
  return defaultMessage
}

export async function requestJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch (netErr) {
    throw new ApiError('Backend service is currently unavailable.', undefined, netErr)
  }

  if (!response.ok) {
    let errorDetail = ''
    try {
      const body = await response.json()
      errorDetail = body?.detail || body?.message || ''
    } catch {
      // response is not JSON
    }
    throw new ApiError(errorDetail || `Request failed with status ${response.status}`, response.status)
  }

  try {
    return (await response.json()) as T
  } catch (parseErr) {
    throw new ApiError('Unable to process the server response.', response.status, parseErr)
  }
}
