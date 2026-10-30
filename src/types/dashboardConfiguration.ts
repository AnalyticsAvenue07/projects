/**
 * Configuration schema for the Analytics Avenue Dashboard Project Type.
 * Supports:
 * 1. Power BI reports (.pbix upload)
 * 2. PDF dashboard reports (.pdf upload)
 * 3. Power BI Service embeds / published report connections
 * 4. Declarative KPI cards, charts, dynamic filtering, and aggregations (Visual Analytics Builder)
 */

export type ColumnDataType = 'number' | 'string' | 'date' | 'boolean'

export interface DatasetColumnSchema {
  name: string
  label: string
  dataType: ColumnDataType
  required?: boolean
  description?: string
  sampleValues?: (string | number | boolean | null)[]
}

export type AggregationMethod = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct_count'

export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'donut'
  | 'histogram'
  | 'scatter'
  | 'table'

export interface KpiCardConfig {
  id: string
  title: string
  field?: string
  aggregation?: AggregationMethod
  staticValue?: string | number
  unit?: string
  format?: 'number' | 'percent' | 'currency' | 'integer'
  icon?: string
  colorTheme?: 'teal' | 'blue' | 'emerald' | 'amber' | 'rose' | 'slate'
  description?: string
  comparison?: {
    field?: string
    target?: number
    label?: string
  }
}

export interface ChartConfig {
  id: string
  title: string
  description?: string
  chartType: ChartType
  xField: string
  yField?: string
  seriesField?: string
  aggregation?: AggregationMethod
  orientation?: 'vertical' | 'horizontal'
  colorScheme?: 'teal' | 'emerald' | 'cyan' | 'indigo' | 'amber' | 'rose' | 'multi'
  columnSpan?: 1 | 2 | 3 | 4
  showLegend?: boolean
  showGrid?: boolean
  height?: number
  stacked?: boolean
  maxCategories?: number
}

export type FilterType = 'select' | 'multiselect' | 'daterange' | 'numberrange'

export interface FilterConfig {
  id: string
  field: string
  label: string
  filterType: FilterType
  options?: string[]
  defaultValue?: any
  placeholder?: string
}

// ---------------------------------------------------------------------------
// Dashboard Source Types & Metadata
// ---------------------------------------------------------------------------

export type DashboardSourceType = 'powerbi_pbix' | 'pdf' | 'powerbi_embed' | 'visual_builder'

export interface DashboardArtifactMetadata {
  id: string
  projectId: string
  originalFileName: string
  fileSize: number
  mimeType: string
  storagePath: string
  artifactVersion: number
  uploadedBy?: string
  uploadedAt: string
  validationStatus: 'valid' | 'invalid' | 'pending'
  validationError?: string
}

export type PowerBiEmbedMode = 'publish_to_web' | 'service_embed'

export type PowerBiConnectionState =
  | 'artifact_uploaded'
  | 'artifact_validated'
  | 'report_not_connected'
  | 'report_connected'
  | 'embed_config_available'
  | 'ready_for_preview'
  | 'published'
  | 'connection_expired'
  | 'admin_action_required'

export type PowerBiEmbeddingType = 'app_owns_data' | 'user_owns_data' | 'publish_to_web'

export interface PowerBiEmbedConfig {
  reportUrl?: string
  embedUrl?: string
  reportId?: string
  workspaceId?: string
  datasetId?: string
  reportName?: string
  embedMode?: PowerBiEmbedMode
  requiresAuth?: boolean
  authInstructions?: string
  embeddingType?: PowerBiEmbeddingType
  connectionState?: PowerBiConnectionState
  lastConnectedAt?: string
  connectionError?: string
  displaySettings?: {
    showNavPane?: boolean
    showFilterPane?: boolean
    aspectRatio?: '16:9' | '4:3' | 'custom'
  }
}

export interface DashboardConfig {
  version: number // 1 or 2
  title?: string
  description?: string
  sourceType?: DashboardSourceType

  // Source A: Power BI .pbix file artifact
  pbixArtifact?: DashboardArtifactMetadata

  // Source B: PDF dashboard report artifact
  pdfArtifact?: DashboardArtifactMetadata

  // Source C: Power BI Service embed configuration
  powerBiEmbed?: PowerBiEmbedConfig

  // Source D: Visual Builder (CSV Dataset & Chart specifications)
  datasetId?: string
  datasetName?: string
  columnMapping?: Record<string, string>
  kpis?: KpiCardConfig[]
  charts?: ChartConfig[]
  filters?: FilterConfig[]
  tableColumns?: string[]
  emptyStateTitle?: string
  emptyStateDescription?: string
  enableExport?: boolean
  refreshIntervalSeconds?: number
}

export type DashboardProjectConfig = DashboardConfig

export interface ValidationIssue {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
}

/**
 * Validates a Power BI URL to distinguish publish-to-web from standard app.powerbi.com reports
 */
export function validatePowerBiUrl(rawUrl: string): {
  isValid: boolean
  embedMode?: PowerBiEmbedMode
  reportId?: string
  error?: string
  warning?: string
} {
  const url = rawUrl.trim()
  if (!url) {
    return { isValid: false, error: 'Power BI URL is required.' }
  }

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') {
      return { isValid: false, error: 'Power BI report URL must use secure HTTPS.' }
    }

    const hostname = parsed.hostname.toLowerCase()
    const isPowerBiDomain =
      hostname.endsWith('powerbi.com') ||
      hostname.endsWith('analysis.windows.net') ||
      hostname.endsWith('powerplatform.com')

    if (!isPowerBiDomain) {
      return {
        isValid: false,
        error: `Invalid Power BI host (${hostname}). Only official Microsoft Power BI domains (*.powerbi.com) are accepted.`,
      }
    }

    // Check if Publish to Web
    const isPublishToWeb =
      parsed.pathname.includes('/view') ||
      parsed.pathname.includes('/reportEmbed') ||
      parsed.searchParams.has('reportId')

    // Extract report ID if present
    let reportId: string | undefined
    if (parsed.searchParams.has('r') || parsed.searchParams.has('reportId')) {
      reportId = parsed.searchParams.get('r') || parsed.searchParams.get('reportId') || undefined
    } else {
      const match = parsed.pathname.match(/reports\/([a-f0-9-]{36})/i)
      if (match) reportId = match[1]
    }

    const warning = isPublishToWeb
      ? 'Note: Power BI "Publish to Web" reports are publicly accessible to anyone with the link. Do not publish confidential corporate data with Publish to Web.'
      : undefined

    return {
      isValid: true,
      embedMode: isPublishToWeb ? 'publish_to_web' : 'service_embed',
      reportId,
      warning,
    }
  } catch {
    return { isValid: false, error: 'Malformed Power BI URL. Please provide a valid HTTPS URL.' }
  }
}

/**
 * Validates a dashboard configuration to ensure required fields,
 * types, and structural integrity across all dashboard sources.
 */
export function validateDashboardConfig(
  config: DashboardConfig,
  availableColumns: string[] = []
): ValidationResult {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  const sourceType = config.sourceType || 'visual_builder'

  if (sourceType === 'powerbi_pbix') {
    if (!config.pbixArtifact) {
      errors.push({
        field: 'pbixArtifact',
        message: 'A Power BI report (.pbix) file must be uploaded.',
        severity: 'error',
      })
    } else if (config.pbixArtifact.validationStatus === 'invalid') {
      errors.push({
        field: 'pbixArtifact',
        message: config.pbixArtifact.validationError || 'Uploaded Power BI (.pbix) file validation failed.',
        severity: 'error',
      })
    } else {
      warnings.push({
        field: 'pbixArtifact',
        message:
          'Uploaded .pbix file is stored as a secure project artifact. Interactive browser rendering requires publication to Power BI Service.',
        severity: 'warning',
      })
    }
  } else if (sourceType === 'pdf') {
    if (!config.pdfArtifact) {
      errors.push({
        field: 'pdfArtifact',
        message: 'A PDF dashboard/report (.pdf) file must be uploaded.',
        severity: 'error',
      })
    } else if (config.pdfArtifact.validationStatus === 'invalid') {
      errors.push({
        field: 'pdfArtifact',
        message: config.pdfArtifact.validationError || 'Uploaded PDF dashboard file validation failed.',
        severity: 'error',
      })
    }
  } else if (sourceType === 'powerbi_embed') {
    if (!config.powerBiEmbed?.reportUrl?.trim()) {
      errors.push({
        field: 'powerBiEmbed.reportUrl',
        message: 'Published Power BI report URL is required.',
        severity: 'error',
      })
    } else {
      const check = validatePowerBiUrl(config.powerBiEmbed.reportUrl)
      if (!check.isValid) {
        errors.push({
          field: 'powerBiEmbed.reportUrl',
          message: check.error || 'Invalid Power BI report URL.',
          severity: 'error',
        })
      }
      if (check.warning) {
        warnings.push({
          field: 'powerBiEmbed.reportUrl',
          message: check.warning,
          severity: 'warning',
        })
      }
    }
  } else {
    // sourceType === 'visual_builder' (legacy & declarative charts)
    if (!config.kpis || config.kpis.length === 0) {
      warnings.push({
        field: 'kpis',
        message: 'Dashboard has no KPI cards configured.',
        severity: 'warning',
      })
    }

    if (!config.charts || config.charts.length === 0) {
      errors.push({
        field: 'charts',
        message: 'At least one visualization chart is required.',
        severity: 'error',
      })
    }

    const columnSet = new Set(availableColumns)
    const validateFieldExists = (field: string | undefined, context: string) => {
      if (field && columnSet.size > 0 && !columnSet.has(field)) {
        warnings.push({
          field: context,
          message: `Field "${field}" not found in current dataset columns.`,
          severity: 'warning',
        })
      }
    }

    if (config.kpis) {
      config.kpis.forEach((kpi, idx) => {
        if (!kpi.title?.trim()) {
          errors.push({
            field: `kpis[${idx}].title`,
            message: `KPI #${idx + 1} requires a title.`,
            severity: 'error',
          })
        }
      })
    }

    if (config.charts) {
      config.charts.forEach((chart, idx) => {
        if (!chart.title?.trim()) {
          errors.push({
            field: `charts[${idx}].title`,
            message: `Chart #${idx + 1} requires a title.`,
            severity: 'error',
          })
        }
        if (!chart.xField?.trim()) {
          errors.push({
            field: `charts[${idx}].xField`,
            message: `Chart "${chart.title || `#${idx + 1}`}" requires an X-axis field.`,
            severity: 'error',
          })
        }
        validateFieldExists(chart.xField, `charts[${idx}].xField`)
        validateFieldExists(chart.yField, `charts[${idx}].yField`)
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}
