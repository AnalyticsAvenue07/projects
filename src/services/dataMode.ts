/**
 * Central Data Mode Configuration
 * Controls whether the application consumes live FastAPI endpoints or local deterministic demonstration datasets.
 * Default is 'demo' since no FastAPI backend is currently running.
 */

export type DataMode = 'demo' | 'api'

const STORAGE_KEY = 'aa_data_mode'

export function getDataMode(): DataMode {
  // 1. Check runtime localStorage override if present
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'api' || saved === 'demo') {
      return saved
    }
  }

  // 2. Check environment variable VITE_DATA_MODE
  const envMode = import.meta.env.VITE_DATA_MODE
  if (envMode === 'api') {
    return 'api'
  }

  // Default fallback is always 'demo'
  return 'demo'
}

export function isDemoMode(): boolean {
  return getDataMode() === 'demo'
}

export function setDataMode(mode: DataMode): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, mode)
    window.dispatchEvent(new CustomEvent('aa_data_mode_changed', { detail: mode }))
  }
}
