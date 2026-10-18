/**
 * Browser-side CSV parser and exporter.
 * Compliant with RFC 4180, handles quoted cells, newlines within quotes, escaped quotes,
 * BOM headers, numeric auto-detection, and column re-mapping.
 */

export interface ParsedCsvResult<T = Record<string, any>> {
  headers: string[]
  rows: T[]
  rowCount: number
}

/**
 * Parses raw CSV string into an array of header tokens and rows.
 */
export function parseCsvText<T = Record<string, any>>(text: string): ParsedCsvResult<T> {
  // Strip BOM if present
  let cleanText = text
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1)
  }

  const lines: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  let i = 0

  while (i < cleanText.length) {
    const char = cleanText[i]
    const nextChar = cleanText[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentField += '"'
        i += 2
        continue
      } else if (char === '"') {
        // Closing quote
        inQuotes = false
        i++
        continue
      } else {
        currentField += char
        i++
        continue
      }
    } else {
      if (char === '"') {
        // Opening quote
        inQuotes = true
        i++
        continue
      } else if (char === ',') {
        currentRow.push(currentField.trim())
        currentField = ''
        i++
        continue
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField.trim())
        lines.push(currentRow)
        currentRow = []
        currentField = ''
        i += 2
        continue
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentField.trim())
        lines.push(currentRow)
        currentRow = []
        currentField = ''
        i++
        continue
      } else {
        currentField += char
        i++
        continue
      }
    }
  }

  // Push remainder if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    lines.push(currentRow)
  }

  // Filter out completely empty lines
  const nonEmptyLines = lines.filter((row) => row.length > 0 && row.some((cell) => cell.length > 0))

  if (nonEmptyLines.length === 0) {
    return { headers: [], rows: [], rowCount: 0 }
  }

  const rawHeaders = nonEmptyLines[0].map((h) => h.replace(/^["']|["']$/g, '').trim())
  const headers = rawHeaders.filter((h) => h.length > 0)

  const rows: Record<string, any>[] = []

  for (let r = 1; r < nonEmptyLines.length; r++) {
    const rowValues = nonEmptyLines[r]
    const rowObj: Record<string, any> = {}

    headers.forEach((header, colIdx) => {
      const val = rowValues[colIdx] ?? ''
      // Try parsing numeric
      if (val !== '' && !Number.isNaN(Number(val)) && !/^[0-9]+-[0-9]+/.test(val)) {
        rowObj[header] = Number(val)
      } else if (val.toLowerCase() === 'true') {
        rowObj[header] = true
      } else if (val.toLowerCase() === 'false') {
        rowObj[header] = false
      } else {
        rowObj[header] = val
      }
    })

    rows.push(rowObj)
  }

  return {
    headers,
    rows: rows as unknown as T[],
    rowCount: rows.length,
  }
}

/**
 * Reads a browser File object and parses it.
 */
export async function parseCsvFile<T = Record<string, any>>(file: File, options?: { maxRows?: number }): Promise<ParsedCsvResult<T>> {
  if (!file) {
    throw new Error('Please select a valid CSV file.')
  }
  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('Invalid file type. Please upload a .csv file.')
  }

  const text = await file.text()
  if (!text || text.trim().length === 0) {
    throw new Error('The selected CSV file is empty.')
  }

  const result = parseCsvText<T>(text)
  if (result.rowCount === 0) {
    throw new Error('No data rows found in the uploaded CSV file.')
  }

  if (options?.maxRows && options.maxRows > 0) {
    return {
      headers: result.headers,
      rows: result.rows.slice(0, options.maxRows),
      rowCount: result.rows.slice(0, options.maxRows).length,
    }
  }

  return result
}

/**
 * Remaps rows using a field mapping object.
 * mapping is: { [expectedField]: uploadedColumnName }
 */
export function applyMappingToRows<T = Record<string, any>>(
  rows: Record<string, any>[],
  mapping: Record<string, string>,
): T[] {
  return rows.map((row) => {
    const mappedRow: Record<string, any> = { ...row }
    Object.entries(mapping).forEach(([expectedField, uploadedCol]) => {
      if (uploadedCol && uploadedCol in row) {
        mappedRow[expectedField] = row[uploadedCol]
      }
    })
    return mappedRow as unknown as T
  })
}

/**
 * Generates CSV string and triggers browser download.
 */
export function exportToCsvFile(rows: Record<string, any>[], filename: string): void {
  if (!rows || rows.length === 0) {
    return
  }

  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))))
  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return ''
    const str = String(val).replace(/"/g, '""')
    return /[",\n\r]/.test(str) ? `"${str}"` : str
  }

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(',')),
  ].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
