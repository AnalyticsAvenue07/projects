import { tryGetSupabase } from '@/lib/supabase/client'
import { isDemoMode } from './dataMode'
import type { NotebookCell, NotebookConfig, NotebookMetadata } from '@/types/projectManagement'
import type { DashboardArtifactMetadata } from '@/types/dashboardConfiguration'

export const MAX_NOTEBOOK_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB
export const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB
export const MAX_PBIX_SIZE_BYTES = 100 * 1024 * 1024 // 100 MB
export const MAX_PDF_DASHBOARD_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

export const SUPPORTED_DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.pbix',
  '.pptx',
  '.ppt',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.svg',
  '.md',
  '.txt',
  '.docx',
  '.xlsx',
  '.csv',
] as const

// In-memory / browser blob store for simulated storage references
const memoryObjectStore = new Map<string, { data: string; mimeType: string; name: string }>()

export class ProjectStorageService {
  /**
   * Helper to persist a mock object to sessionStorage, localStorage, and IndexedDB
   */
  private static persistMockObject(
    key: string,
    item: { data: string; mimeType: string; name: string }
  ): void {
    if (typeof window === 'undefined') return
    try {
      sessionStorage.setItem(`aa_mock_${key}`, JSON.stringify(item))
    } catch {
      // Ignore quota exceeded
    }
    try {
      if (item.data.length < 2 * 1024 * 1024) {
        localStorage.setItem(`aa_mock_${key}`, JSON.stringify(item))
      }
    } catch {
      // Ignore quota exceeded
    }
    try {
      void this.setIdbMockObject(key, item)
    } catch {
      // Ignore idb failure
    }
  }

  /**
   * Helper to retrieve a mock object from sessionStorage or localStorage
   */
  private static getPersistedMockObject(
    key: string
  ): { data: string; mimeType: string; name: string } | null {
    if (typeof window === 'undefined') return null
    try {
      const session = sessionStorage.getItem(`aa_mock_${key}`)
      if (session) return JSON.parse(session)
    } catch {
      // ignore
    }
    try {
      const local = localStorage.getItem(`aa_mock_${key}`)
      if (local) return JSON.parse(local)
    } catch {
      // ignore
    }
    return null
  }

  /**
   * IndexedDB access for larger mock objects
   */
  private static openIdb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported'))
      }
      const req = indexedDB.open('aa_storage_db', 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('mock_objects')) {
          db.createObjectStore('mock_objects', { keyPath: 'key' })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }

  private static async setIdbMockObject(
    key: string,
    item: { data: string; mimeType: string; name: string }
  ): Promise<void> {
    try {
      const db = await this.openIdb()
      return new Promise((resolve, reject) => {
        const tx = db.transaction('mock_objects', 'readwrite')
        const store = tx.objectStore('mock_objects')
        const req = store.put({ key, ...item })
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } catch {
      // IndexedDB fallback
    }
  }

  private static async getIdbMockObject(
    key: string
  ): Promise<{ data: string; mimeType: string; name: string } | null> {
    try {
      const db = await this.openIdb()
      return new Promise((resolve, reject) => {
        const tx = db.transaction('mock_objects', 'readonly')
        const store = tx.objectStore('mock_objects')
        const req = store.get(key)
        req.onsuccess = () =>
          resolve(
            req.result
              ? { data: req.result.data, mimeType: req.result.mimeType, name: req.result.name }
              : null
          )
        req.onerror = () => reject(req.error)
      })
    } catch {
      return null
    }
  }

  /**
   * Resolve public static asset path fallback
   */
  static resolveFallbackStaticUrl(nameOrPath: string): string {
    const clean = nameOrPath.toLowerCase().trim()
    if (
      clean === 'presentation.pptx' ||
      clean.endsWith('/presentation.pptx') ||
      clean.includes('presentation.pptx')
    ) {
      return '/sales-revenue/presentation.pptx'
    }
    if (clean === 'sales_revenue_data.csv' || clean.includes('sales_revenue_data.csv')) {
      return '/sales-revenue/sales_revenue_data.csv'
    }
    if (clean === 'readme.md' || clean.includes('readme.md')) {
      return '/sales-revenue/README.md'
    }
    if (clean === 'requirements.txt' || clean.includes('requirements.txt')) {
      return '/sales-revenue/requirements.txt'
    }
    return ''
  }

  /**
   * Validate and parse an uploaded Jupyter Notebook (.ipynb)
   */
  static validateNotebookFile(file: File): { isValid: boolean; error?: string } {
    if (!file.name.toLowerCase().endsWith('.ipynb')) {
      return {
        isValid: false,
        error: 'Invalid file extension. Only Jupyter Notebook (.ipynb) files are permitted.',
      }
    }

    if (file.size > MAX_NOTEBOOK_SIZE_BYTES) {
      return {
        isValid: false,
        error: `Notebook file size exceeds maximum permitted limit (${(MAX_NOTEBOOK_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB).`,
      }
    }

    return { isValid: true }
  }

  /**
   * Parse raw text of a .ipynb file and extract safe static structure without executing any code
   */
  static parseNotebookJson(rawJson: string, fileName: string, fileSize: number): NotebookConfig {
    let parsed: any
    try {
      parsed = JSON.parse(rawJson)
    } catch {
      throw new Error('Malformed notebook file. Failed to parse valid JSON structure.')
    }

    if (!parsed || !Array.isArray(parsed.cells)) {
      throw new Error('Invalid Jupyter Notebook structure: missing "cells" array.')
    }

    const cells: NotebookCell[] = parsed.cells.map((cell: any) => {
      const cellType = cell.cell_type === 'markdown' || cell.cell_type === 'code' ? cell.cell_type : 'raw'
      const source = Array.isArray(cell.source) ? cell.source.join('') : String(cell.source || '')

      let outputs = undefined
      if (cellType === 'code' && Array.isArray(cell.outputs)) {
        outputs = cell.outputs.map((out: any) => ({
          output_type: out.output_type || 'stream',
          name: out.name,
          text: Array.isArray(out.text) ? out.text.join('') : out.text,
          data: out.data,
          ename: out.ename,
          evalue: out.evalue,
          traceback: Array.isArray(out.traceback) ? out.traceback : undefined,
        }))
      }

      return {
        cell_type: cellType,
        source,
        execution_count: cell.execution_count ?? null,
        outputs,
        metadata: cell.metadata || {},
      }
    })

    const codeCells = cells.filter((c) => c.cell_type === 'code')
    const mdCells = cells.filter((c) => c.cell_type === 'markdown')
    const hasOutputs = codeCells.some((c) => c.outputs && c.outputs.length > 0)

    const metadata: NotebookMetadata = {
      language: parsed.metadata?.language_info?.name || parsed.metadata?.kernelspec?.language || 'python',
      kernel: parsed.metadata?.kernelspec?.display_name || parsed.metadata?.kernelspec?.name || 'Python 3 (ipykernel)',
      cellCount: cells.length,
      codeCellCount: codeCells.length,
      markdownCellCount: mdCells.length,
      hasOutputs,
    }

    const storagePath = `storage://notebooks/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const itemPayload = {
      data: rawJson,
      mimeType: 'application/x-ipynb+json',
      name: fileName,
    }

    // Store raw JSON in simulated storage (memory + local persistence)
    memoryObjectStore.set(storagePath, itemPayload)
    this.persistMockObject(storagePath, itemPayload)

    return {
      notebookStoragePath: storagePath,
      fileName,
      fileSize,
      metadata,
      cells,
      uploadedAt: new Date().toISOString(),
    }
  }

  /**
   * Validate a Power BI report (.pbix) file
   */
  static validatePbixFile(file: File): { isValid: boolean; error?: string } {
    if (!file.name.toLowerCase().endsWith('.pbix')) {
      return {
        isValid: false,
        error: 'Invalid file extension. Only Power BI report (.pbix) files are accepted.',
      }
    }

    if (file.size > MAX_PBIX_SIZE_BYTES) {
      return {
        isValid: false,
        error: `Power BI report exceeds maximum permitted size (${(MAX_PBIX_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB).`,
      }
    }

    return { isValid: true }
  }

  /**
   * Validate a PDF dashboard file
   */
  static validatePdfDashboardFile(file: File): { isValid: boolean; error?: string } {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return {
        isValid: false,
        error: 'Invalid file extension. Only PDF document (.pdf) files are accepted.',
      }
    }

    if (file.size > MAX_PDF_DASHBOARD_SIZE_BYTES) {
      return {
        isValid: false,
        error: `PDF dashboard file exceeds maximum permitted size (${(MAX_PDF_DASHBOARD_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB).`,
      }
    }

    return { isValid: true }
  }

  /**
   * Upload a dashboard artifact (PBIX or PDF) to private storage and create metadata
   */
  static async uploadDashboardArtifact(
    file: File,
    projectId: string,
    sourceType: 'powerbi_pbix' | 'pdf'
  ): Promise<DashboardArtifactMetadata> {
    const isPbix = sourceType === 'powerbi_pbix'
    const validation = isPbix ? this.validatePbixFile(file) : this.validatePdfDashboardFile(file)
    if (!validation.isValid) {
      throw new Error(validation.error)
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const timestamp = Date.now()
    const artifactId = `art_${timestamp}_${Math.random().toString(36).substring(2, 9)}`
    const storagePath = `storage://projects/${projectId}/dashboards/${timestamp}_${sanitizedName}`
    const mimeType = file.type || (isPbix ? 'application/x-pbix' : 'application/pdf')

    const supabase = tryGetSupabase()
    if (!isDemoMode() && supabase) {
      try {
        const { error } = await supabase.storage
          .from('project-artifacts')
          .upload(`${projectId}/${timestamp}_${sanitizedName}`, file)
        if (!error) {
          return {
            id: artifactId,
            projectId,
            originalFileName: file.name,
            fileSize: file.size,
            mimeType,
            storagePath: `supabase://project-artifacts/${projectId}/${timestamp}_${sanitizedName}`,
            artifactVersion: 1,
            uploadedAt: new Date().toISOString(),
            validationStatus: 'valid',
          }
        }
      } catch (e) {
        console.warn('Supabase storage upload error, falling back to secure local store', e)
      }
    }

    // Convert file to Base64 data URL for mock store persistence
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64Data = reader.result as string
        const payload = {
          data: base64Data,
          mimeType,
          name: file.name,
        }
        memoryObjectStore.set(storagePath, payload)
        ProjectStorageService.persistMockObject(storagePath, payload)

        resolve({
          id: artifactId,
          projectId,
          originalFileName: file.name,
          fileSize: file.size,
          mimeType,
          storagePath,
          artifactVersion: 1,
          uploadedAt: new Date().toISOString(),
          validationStatus: 'valid',
        })
      }
      reader.onerror = () => reject(new Error('Failed to read file payload.'))
      reader.readAsDataURL(file)
    })
  }

  /**
   * Validate a document file (PDF, PPTX, diagrams, README, reports)
   */
  static validateDocumentFile(file: File): { isValid: boolean; error?: string } {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    const matchesExtension = SUPPORTED_DOCUMENT_EXTENSIONS.some((supported) => ext === supported)

    if (!matchesExtension) {
      return {
        isValid: false,
        error: `Unsupported file type (${ext}). Supported formats: ${SUPPORTED_DOCUMENT_EXTENSIONS.join(', ')}`,
      }
    }

    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      return {
        isValid: false,
        error: `Document exceeds maximum permitted size (${(MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB).`,
      }
    }

    return { isValid: true }
  }

  /**
   * Uploads file to storage and returns stable private storage reference
   */
  static async uploadDocumentFile(
    file: File,
    projectId: string
  ): Promise<{ storagePath: string; fileName: string; fileSize: number; mimeType: string }> {
    const check = this.validateDocumentFile(file)
    if (!check.isValid) {
      throw new Error(check.error)
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const timestamp = Date.now()
    const storagePath = `storage://projects/${projectId}/documents/${timestamp}_${sanitizedName}`

    const supabase = tryGetSupabase()
    if (!isDemoMode() && supabase) {
      try {
        const { error } = await supabase.storage.from('project-documents').upload(`${projectId}/${timestamp}_${sanitizedName}`, file)
        if (!error) {
          return {
            storagePath: `supabase://project-documents/${projectId}/${timestamp}_${sanitizedName}`,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'application/octet-stream',
          }
        }
      } catch (e) {
        console.warn('Supabase storage upload error, falling back to secure local store', e)
      }
    }

    // Convert file to Base64 data URL for mock store persistence
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64Data = reader.result as string
        const payload = {
          data: base64Data,
          mimeType: file.type || 'application/octet-stream',
          name: file.name,
        }
        memoryObjectStore.set(storagePath, payload)
        ProjectStorageService.persistMockObject(storagePath, payload)

        resolve({
          storagePath,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
        })
      }
      reader.onerror = () => reject(new Error('Failed to read document file for upload.'))
      reader.readAsDataURL(file)
    })
  }

  /**
   * Generate secure preview or download URL for a storage reference
   */
  static async getDocumentUrl(storagePath: string, fileName?: string): Promise<string> {
    if (!storagePath) {
      if (fileName) {
        return this.resolveFallbackStaticUrl(fileName)
      }
      return ''
    }

    // 1. Supabase signed URL
    if (storagePath.startsWith('supabase://')) {
      const supabase = tryGetSupabase()
      if (supabase) {
        try {
          const parts = storagePath.replace('supabase://', '').split('/')
          const bucket = parts[0]
          const path = parts.slice(1).join('/')
          const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
          if (!error && data?.signedUrl) return data.signedUrl
        } catch (e) {
          console.warn('[ProjectStorageService] Supabase signed URL generation failed', e)
        }
      }
    }

    // 2. Direct data or web URL
    if (
      storagePath.startsWith('http://') ||
      storagePath.startsWith('https://') ||
      storagePath.startsWith('data:') ||
      storagePath.startsWith('blob:')
    ) {
      return storagePath
    }

    // 3. Absolute path on host
    if (storagePath.startsWith('/')) {
      return storagePath
    }

    // 4. In-memory object store
    const item = memoryObjectStore.get(storagePath)
    if (item?.data) {
      return item.data
    }

    // 5. Persistent session / local storage store
    const persisted = this.getPersistedMockObject(storagePath)
    if (persisted?.data) {
      memoryObjectStore.set(storagePath, persisted)
      return persisted.data
    }

    // 6. IndexedDB mock object store
    try {
      const idbItem = await this.getIdbMockObject(storagePath)
      if (idbItem?.data) {
        memoryObjectStore.set(storagePath, idbItem)
        return idbItem.data
      }
    } catch {
      // ignore
    }

    // 7. Static project asset relative reference (e.g. sales-revenue/presentation.pptx)
    if (storagePath.startsWith('sales-revenue/')) {
      return `/${storagePath}`
    }

    // 8. Static fallback check against fileName or storagePath
    const nameToCheck = fileName || storagePath.split('/').pop() || ''
    const fallbackStatic = this.resolveFallbackStaticUrl(nameToCheck)
    if (fallbackStatic) {
      return fallbackStatic
    }

    // 9. If storagePath contains presentation.pptx anywhere in string
    if (storagePath.includes('presentation.pptx')) {
      return '/sales-revenue/presentation.pptx'
    }

    // 10. Fallback: If not found, return empty
    return ''
  }

  /**
   * Trigger download of a file from its storage reference
   */
  static async triggerDownload(storagePath: string, fileName: string): Promise<void> {
    const url = await this.getDocumentUrl(storagePath, fileName)
    if (!url) {
      throw new Error('File not available for download or storage reference has expired.')
    }

    if (typeof window !== 'undefined') {
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }
}
