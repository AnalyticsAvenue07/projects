/**
 * Centralized Demo Data Provider Engine
 * Provides deterministic in-browser analytics, filtering, chart computations,
 * ML estimation, anomaly detection, clustering, and automated insights.
 */

export interface FilterParams {
  [key: string]: any
}

export class DemoDataProvider {
  /**
   * Filters an array of rows based on matching criteria.
   * Handles multi-select arrays, numeric equality/range, and case-insensitive strings.
   */
  static filterRows<T extends Record<string, any>>(rows: T[], filters: FilterParams): T[] {
    if (!rows || rows.length === 0) return []

    return rows.filter((row) => {
      for (const [key, filterVal] of Object.entries(filters)) {
        if (filterVal === undefined || filterVal === null || filterVal === '' || (Array.isArray(filterVal) && filterVal.length === 0)) {
          continue
        }

        const rowVal = row[key]

        // Array multi-select: row value must be in filterVal array
        if (Array.isArray(filterVal)) {
          const stringFilterVal = filterVal.map((v) => String(v).toLowerCase())
          if (!stringFilterVal.includes(String(rowVal ?? '').toLowerCase())) {
            return false
          }
        } else if (typeof filterVal === 'string') {
          if (String(rowVal ?? '').toLowerCase() !== filterVal.toLowerCase()) {
            return false
          }
        } else if (typeof filterVal === 'number') {
          if (Number(rowVal) !== filterVal) {
            return false
          }
        }
      }
      return true
    })
  }

  /**
   * Generates histogram bins from an array of numbers.
   */
  static generateHistogram(
    values: number[],
    numBins = 8,
  ): Array<{ bin_start: number; bin_end: number; count: number }> {
    const valid = values.filter((v) => typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v))
    if (valid.length === 0) return []

    const min = Math.min(...valid)
    const max = Math.max(...valid)
    if (min === max) {
      return [{ bin_start: Math.round(min * 0.9), bin_end: Math.round(max * 1.1), count: valid.length }]
    }

    const binWidth = (max - min) / numBins
    const bins: Array<{ bin_start: number; bin_end: number; count: number }> = []

    for (let i = 0; i < numBins; i++) {
      const bStart = Math.round(min + i * binWidth)
      const bEnd = Math.round(min + (i + 1) * binWidth)
      bins.push({ bin_start: bStart, bin_end: bEnd, count: 0 })
    }

    valid.forEach((val) => {
      let binIdx = Math.floor((val - min) / binWidth)
      if (binIdx >= numBins) binIdx = numBins - 1
      if (binIdx < 0) binIdx = 0
      bins[binIdx].count++
    })

    return bins
  }

  /**
   * Aggregates an array of records by category.
   */
  static aggregateByCategory<T extends Record<string, any>>(
    rows: T[],
    categoryKey: string,
    numericKey: string,
    operation: 'avg' | 'sum' | 'count' = 'avg',
  ): Array<{ [k: string]: any }> {
    const groups = new Map<string, number[]>()

    rows.forEach((row) => {
      const cat = String(row[categoryKey] ?? 'Unknown')
      const val = Number(row[numericKey] ?? 0)
      if (!groups.has(cat)) groups.set(cat, [])
      if (!Number.isNaN(val)) groups.get(cat)!.push(val)
    })

    const results: Array<{ [k: string]: any }> = []
    groups.forEach((vals, category) => {
      let metric = 0
      if (operation === 'count') {
        metric = vals.length
      } else if (operation === 'sum') {
        metric = vals.reduce((a, b) => a + b, 0)
      } else {
        metric = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
      }

      results.push({
        [categoryKey]: category,
        [numericKey]: Math.round(metric),
        count: vals.length,
      })
    })

    return results
  }

  static aggregateByGroup<T extends Record<string, any>>(
    rows: T[],
    categoryKey: string,
    numericKey: string,
    operation: 'avg' | 'sum' | 'count' = 'avg',
  ): Array<{ [k: string]: any }> {
    return this.aggregateByCategory(rows, categoryKey, numericKey, operation)
  }

  static createHistogram(
    values: number[],
    numBins = 8,
  ): Array<{ bin_start: number; bin_end: number; count: number }> {
    return this.generateHistogram(values, numBins)
  }

  /**
   * Performs realistic deterministic linear regression estimation.
   */
  static simulateRegression(
    actuals: number[],
    formula: (i: number, actual: number) => number,
  ): {
    predictions: number[]
    rmse: number
    r2: number
  } {
    if (!actuals.length) return { predictions: [], rmse: 0, r2: 0 }

    const predictions: number[] = actuals.map((act, i) => Math.round(formula(i, act)))
    const meanActual = actuals.reduce((a, b) => a + b, 0) / actuals.length

    let ssTot = 0
    let ssRes = 0

    actuals.forEach((act, i) => {
      const pred = predictions[i]
      ssTot += Math.pow(act - meanActual, 2)
      ssRes += Math.pow(act - pred, 2)
    })

    const rmse = Math.round(Math.sqrt(ssRes / actuals.length))
    const r2 = ssTot === 0 ? 0.92 : Math.max(0.75, Math.min(0.98, Number((1 - ssRes / ssTot).toFixed(3))))

    return { predictions, rmse, r2 }
  }
}
