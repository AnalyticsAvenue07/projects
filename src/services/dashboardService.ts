import { useAuthStore } from '@/stores/authStore'

export const BACKEND_API_BASE_URL =
  (import.meta.env.VITE_BACKEND_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

export const DASHBOARD_API_BASE_URL = `${BACKEND_API_BASE_URL}/api/dashboard`

export interface EmbedConfigStatus {
  configured: boolean
  tenant_id_set: boolean
  client_id_set: boolean
  workspace_id_set: boolean
  embed_mode: string
  supported_models: string[]
  instructions: string
}

export interface PowerBiWorkspaceItem {
  id: string
  name: string
  is_read_only?: boolean
  is_on_dedicated_capacity?: boolean
}

export interface PowerBiReportItem {
  id: string
  name: string
  dataset_id?: string
  embed_url?: string
  web_url?: string
}

export interface TestConnectionResult {
  success: boolean
  status: string
  message: string
  workspace_id: string
  report_id?: string
  report_name?: string
  embed_url?: string
  error_code?: string
}

export interface EmbedTokenResult {
  report_id: string
  report_name?: string
  workspace_id: string
  embed_url: string
  access_token: string
  token_id?: string
  expiration: string
  token_type: 'Embed' | 'Aad'
  embedding_model: string
  status: string
  warning?: string
}

export interface RefreshTokenResult {
  access_token: string
  expiration: string
  token_id?: string
  status: string
}

export interface PbixInspectionResult {
  is_valid_pbix: boolean
  filename: string
  file_size: number
  version?: string | null
  page_count: number
  pages: string[]
  visual_count: number
  visual_types: Record<string, number>
  field_references: string[]
  data_model_format: string
  can_render_native_data: boolean
  error?: string | null
  guidance_message: string
}

export interface DatasetColumnMeta {
  name: string
  inferred_type: string
  unique_count: number
  missing_count: number
  sample_values: any[]
}

export interface SuggestedKpi {
  id: string
  title: string
  field: string
  aggregation: string
  format: string
}

export interface SuggestedChart {
  id: string
  title: string
  chart_type: string
  x_field: string
  y_field?: string
  aggregation?: string
  column_span: number
}

export interface DatasetParseResult {
  success: boolean
  filename: string
  file_size: number
  format: string
  row_count: number
  column_count: number
  columns: DatasetColumnMeta[]
  suggested_kpis: SuggestedKpi[]
  suggested_charts: SuggestedChart[]
  sample_rows: Record<string, any>[]
  error?: string | null
}

export class DashboardService {
  private static getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    const session = useAuthStore.getState().session
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
    return headers
  }

  /**
   * Fetches backend Power BI integration readiness status
   */
  static async getEmbedConfigStatus(): Promise<EmbedConfigStatus> {
    try {
      const res = await fetch(`${DASHBOARD_API_BASE_URL}/powerbi/status`, {
        method: 'GET',
        headers: this.getHeaders(),
      })
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`)
      }
      return await res.json()
    } catch (err: any) {
      return {
        configured: false,
        tenant_id_set: false,
        client_id_set: false,
        workspace_id_set: false,
        embed_mode: 'publish_to_web_or_browser_auth',
        supported_models: ['publish_to_web', 'service_embed', 'pbix_artifact_download'],
        instructions:
          'Backend Power BI Service connection is unavailable or unconfigured. Please ensure the backend is running.',
      }
    }
  }

  /**
   * Lists available workspaces (groups) accessible by the backend service principal
   */
  static async getPowerBiWorkspaces(): Promise<PowerBiWorkspaceItem[]> {
    const res = await fetch(`${DASHBOARD_API_BASE_URL}/powerbi/workspaces`, {
      method: 'GET',
      headers: this.getHeaders(),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail || `Failed to fetch Power BI workspaces (HTTP ${res.status})`)
    }
    return await res.json()
  }

  /**
   * Lists reports in a Power BI workspace
   */
  static async getPowerBiReports(workspaceId?: string): Promise<PowerBiReportItem[]> {
    const url = workspaceId
      ? `${DASHBOARD_API_BASE_URL}/powerbi/reports?workspace_id=${encodeURIComponent(workspaceId)}`
      : `${DASHBOARD_API_BASE_URL}/powerbi/reports`

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail || `Failed to fetch reports from workspace (HTTP ${res.status})`)
    }
    return await res.json()
  }

  /**
   * Tests connection to a workspace and optional report
   */
  static async testConnection(workspaceId: string, reportId?: string): Promise<TestConnectionResult> {
    const res = await fetch(`${DASHBOARD_API_BASE_URL}/powerbi/test-connection`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        workspace_id: workspaceId.trim(),
        report_id: reportId?.trim() || undefined,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail || `Connection test failed with HTTP ${res.status}`)
    }
    return await res.json()
  }

  /**
   * Generates short-lived embed token and configuration for an authorized report
   */
  static async getEmbedToken(
    workspaceId: string,
    reportId: string,
    projectId?: string,
    accessLevel = 'View'
  ): Promise<EmbedTokenResult> {
    const res = await fetch(`${DASHBOARD_API_BASE_URL}/powerbi/embed-token`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        workspace_id: workspaceId.trim(),
        report_id: reportId.trim(),
        project_id: projectId,
        access_level: accessLevel,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail || `Failed to generate embed token (HTTP ${res.status})`)
    }
    return await res.json()
  }

  /**
   * Refreshes an expiring embed token
   */
  static async refreshEmbedToken(
    workspaceId: string,
    reportId: string,
    tokenId?: string
  ): Promise<RefreshTokenResult> {
    const res = await fetch(`${DASHBOARD_API_BASE_URL}/powerbi/refresh-token`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        workspace_id: workspaceId.trim(),
        report_id: reportId.trim(),
        token_id: tokenId,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail || `Failed to refresh embed token (HTTP ${res.status})`)
    }
    return await res.json()
  }

  /**
   * Helper: extracts workspaceId and reportId from any standard Power BI link
   * Examples:
   * https://app.powerbi.com/groups/e31295be-23e5-4f76-88a3-e8c18de32810/reports/f19f2be1-d648-4cb2-a7d5-8f6511a2f913/ReportSection
   * https://app.powerbi.com/reportEmbed?reportId=f19f2be1-d648-4cb2-a7d5-8f6511a2f913&groupId=e31295be-23e5-4f76-88a3-e8c18de32810
   */
  static extractPowerBiIdentifiers(input: string): { workspaceId?: string; reportId?: string } {
    const clean = (input || '').trim()
    if (!clean) return {}

    const result: { workspaceId?: string; reportId?: string } = {}

    // Check query params first
    try {
      const url = new URL(clean)
      const qp = url.searchParams
      if (qp.has('groupId')) result.workspaceId = qp.get('groupId')!
      if (qp.has('reportId')) result.reportId = qp.get('reportId')!
      if (qp.has('r') && !result.reportId) result.reportId = qp.get('r')!

      // Check path regex
      const groupMatch = url.pathname.match(/groups\/([0-9a-fA-F-]{32,38})/i)
      if (groupMatch && !result.workspaceId) {
        result.workspaceId = groupMatch[1]
      }

      const reportMatch = url.pathname.match(/reports\/([0-9a-fA-F-]{32,38})/i)
      if (reportMatch && !result.reportId) {
        result.reportId = reportMatch[1]
      }
    } catch {
      // Not a full URL, maybe GUIDs or query segment
      const groupMatch = clean.match(/groups\/([0-9a-fA-F-]{32,38})/i)
      if (groupMatch) result.workspaceId = groupMatch[1]

      const reportMatch = clean.match(/reports\/([0-9a-fA-F-]{32,38})/i)
      if (reportMatch) result.reportId = reportMatch[1]
    }

    return result
  }

  /**
   * Inspects Power BI (.pbix) archive metadata through the unified backend service
   */
  static async inspectPbixFile(file: File): Promise<PbixInspectionResult> {
    const formData = new FormData()
    formData.append('file', file)

    const headers: Record<string, string> = {}
    const session = useAuthStore.getState().session
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }

    const res = await fetch(`${DASHBOARD_API_BASE_URL}/inspect-pbix`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail || `PBIX inspection failed with HTTP ${res.status}`)
    }

    return await res.json()
  }

  /**
   * Parses and profiles a CSV or Excel dataset through the unified backend service
   */
  static async parseDatasetFile(file: File): Promise<DatasetParseResult> {
    const formData = new FormData()
    formData.append('file', file)

    const headers: Record<string, string> = {}
    const session = useAuthStore.getState().session
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }

    const res = await fetch(`${DASHBOARD_API_BASE_URL}/parse-dataset`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail || `Dataset parsing failed with HTTP ${res.status}`)
    }

    return await res.json()
  }
}
