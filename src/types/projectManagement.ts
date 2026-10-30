import type { DashboardConfig, DashboardSourceType } from './dashboardConfiguration'
import type { ProjectOverviewStorageRecord } from './projectContent'
import type { MlPlaygroundConfig } from './mlPlayground'

export type ProjectType =
  | 'showcase'
  | 'dashboard'
  | 'ai_app'
  | 'notebook'
  | 'presentation'
  | 'external_app'
  | 'ml_playground'

export type PublicationStatus =
  | 'draft'
  | 'validation_failed'
  | 'ready_for_review'
  | 'published'
  | 'unpublished'
  | 'archived'

export const SUPPORTED_INDUSTRIES = [
  'Gen AI',
  'Healthcare',
  'Real Estate',
  'EV',
  'Solar Power',
  'Manufacturing',
  'Supply Chain',
  'HR',
  'Marketing Analytics',
] as const

export type SupportedIndustry = (typeof SUPPORTED_INDUSTRIES)[number]

export interface RegisteredAiServiceItem {
  id: string
  name: string
  slug: string
  industry: SupportedIndustry
  description: string
  serviceUrl: string
  healthUrl?: string
  inputSchema: {
    type: 'object'
    properties: Record<
      string,
      {
        type: string
        label?: string
        description?: string
        default?: any
        enum?: string[]
        required?: boolean
      }
    >
    required?: string[]
  }
  outputSchema: {
    type: 'object'
    properties: Record<
      string,
      {
        type: string
        label?: string
        format?: 'text' | 'badge' | 'table' | 'json' | 'chart'
      }
    >
  }
  status: 'active' | 'maintenance' | 'deprecated'
  version: string
  timeoutMs?: number
  createdAt: string
  updatedAt: string
}

export interface ProjectDatasetItem {
  id: string
  name: string
  filename: string
  fileSize: number
  rowCount: number
  headers: string[]
  schemaMeta: Record<string, 'number' | 'string' | 'date' | 'boolean'>
  sampleRows: Record<string, any>[]
  dataJson?: Record<string, any>[]
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface ProjectVersion {
  id: string
  projectId: string
  versionNumber: number
  config: ProjectConfigPayload
  changelog?: string
  createdBy: string
  createdByName?: string
  createdAt: string
}

export interface ShowcaseConfig {
  sections?: ProjectOverviewStorageRecord['sectionOverrides']
  customTabs?: ProjectOverviewStorageRecord['customTabs']
  documentationUrl?: string
  externalDemoUrl?: string
  architectureImageUrl?: string
  keyFeatures?: string[]
  metrics?: { label: string; value: string }[]
}

export interface AiAppConfig {
  serviceId: string
  defaultInputs?: Record<string, any>
  displaySettings?: {
    showConfidence?: boolean
    visualLayout?: 'standard' | 'split' | 'compact'
  }
}

export interface NotebookCellOutput {
  output_type: 'stream' | 'display_data' | 'execute_result' | 'error'
  name?: string
  text?: string | string[]
  data?: {
    'text/plain'?: string | string[]
    'text/html'?: string | string[]
    'image/png'?: string
    'image/jpeg'?: string
    'image/svg+xml'?: string | string[]
    'application/json'?: any
  }
  ename?: string
  evalue?: string
  traceback?: string[]
}

export interface NotebookCell {
  cell_type: 'markdown' | 'code' | 'raw'
  source: string | string[]
  execution_count?: number | null
  outputs?: NotebookCellOutput[]
  metadata?: Record<string, any>
}

export interface NotebookMetadata {
  language?: string
  kernel?: string
  cellCount: number
  codeCellCount: number
  markdownCellCount: number
  hasOutputs: boolean
}

export interface NotebookConfig {
  notebookStoragePath?: string
  fileName: string
  fileSize: number
  metadata: NotebookMetadata
  cells: NotebookCell[]
  connectedAppUrl?: string
  connectedAppLabel?: string
  uploadedAt: string
}

export type DocumentType =
  | 'presentation'
  | 'pdf'
  | 'architecture_diagram'
  | 'report'
  | 'documentation'
  | 'other'

export type DocumentAccessPolicy = 'project_grant' | 'admin_only'

export interface ProjectDocumentItem {
  id: string
  projectId: string
  title: string
  description?: string
  documentType: DocumentType
  accessPolicy: DocumentAccessPolicy
  currentVersion: number
  storagePath: string
  fileName: string
  fileSize: number
  mimeType: string
  previewUrl?: string
  createdBy?: string
  createdByName?: string
  createdAt: string
  updatedAt: string
}

export interface ProjectDocumentVersionItem {
  id: string
  documentId: string
  versionNumber: number
  storagePath: string
  fileName: string
  fileSize: number
  mimeType: string
  changelog?: string
  createdBy?: string
  createdAt: string
}

export interface PresentationProjectConfig {
  primaryDocumentId?: string
  featuredDocumentIds?: string[]
  overviewSummary?: string
}

export type ExternalAppType =
  | 'streamlit'
  | 'gradio'
  | 'powerbi'
  | 'tableau'
  | 'custom_web'

export type ExternalAppLaunchMethod = 'new_tab' | 'embed'

export interface ExternalAppConfig {
  appType: ExternalAppType
  appUrl: string
  launchMethod: ExternalAppLaunchMethod
  embedSupported?: boolean
  embedNotice?: string
  customHeadersAllowed?: boolean
  authRequired?: boolean
  authInstructions?: string
  verifiedAt?: string
}

export interface ProjectConfigPayload {
  projectType: ProjectType
  dashboardSource?: DashboardSourceType
  showcase?: ShowcaseConfig
  dashboard?: DashboardConfig
  aiApp?: AiAppConfig
  notebook?: NotebookConfig
  presentation?: PresentationProjectConfig
  externalApp?: ExternalAppConfig
  mlPlayground?: MlPlaygroundConfig
  documents?: ProjectDocumentItem[]
}

export interface ProjectCatalogItem {
  id: string
  title: string
  slug: string
  description: string
  detailedOverview?: string
  industry: SupportedIndustry
  category: string
  projectType: ProjectType
  dashboardSource?: DashboardSourceType
  templateId?: string
  ownerId?: string
  ownerName?: string
  ownerEmail?: string
  status: PublicationStatus
  currentVersion: number
  visibility: 'visible' | 'hidden'
  tags: string[]
  tech: string[]
  businessProblem?: string
  businessSolution?: string
  targetAudience?: string
  thumbnail?: string
  documentationLinks?: { title: string; url: string }[]
  draftConfig: ProjectConfigPayload
  publishedConfig?: ProjectConfigPayload
  lastValidatedAt?: string
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

export interface ProjectAuditEvent {
  id: string
  projectId: string
  projectSlug: string
  projectTitle: string
  actorId: string
  actorEmail: string
  action:
    | 'project_created'
    | 'project_updated'
    | 'dataset_attached'
    | 'config_validated'
    | 'publish_attempted'
    | 'project_published'
    | 'project_unpublished'
    | 'project_archived'
    | 'project_restored'
    | 'project_duplicated'
    | 'version_rollback'
    | 'access_changed'
    | 'document_uploaded'
    | 'document_version_updated'
    | 'document_deleted'
  previousStatus?: PublicationStatus
  newStatus?: PublicationStatus
  versionNumber?: number
  metadata?: Record<string, any>
  timestamp: string
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
