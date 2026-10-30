export type ModelIntegrationType = 'trained_model' | 'external_api' | 'model_package'

export type ModelLearningTask = 'regression' | 'classification' | 'forecasting' | 'anomaly'

export type DashboardTemplateType = 'regression' | 'classification' | 'forecasting' | 'anomaly'

export interface InputFeatureDefinition {
  name: string
  type: 'number' | 'string' | 'boolean' | 'date'
  required: boolean
  description?: string
  default?: any
  min?: number
  max?: number
  enumValues?: string[]
}

export interface ModelInspectionResult {
  checksum: string
  filename: string
  file_size: number
  framework: string
  algorithm: string
  model_type: ModelLearningTask
  feature_count: number
  features: string[]
  feature_definitions: InputFeatureDefinition[]
  classes?: string[]
  has_predict_proba: boolean
  intercept?: number
  coefficients?: Record<string, number>
  feature_importances?: Record<string, number>
  status: 'valid' | 'invalid'
  error?: string
}

export interface ColumnProfile {
  name: string
  type: 'number' | 'string' | 'boolean'
  missing_count: number
  missing_pct: number
  unique_count: number
  sample_values: any[]
  min?: number | null
  max?: number | null
}

export interface DatasetCompatibilityReport {
  status: 'compatible' | 'mapping_required' | 'incompatible'
  row_count: number
  column_count: number
  available_columns: string[]
  required_features: string[]
  exact_matches: string[]
  missing_features: string[]
  suggested_mappings: Record<string, string>
  extra_columns: string[]
  has_target_column: boolean
  target_column?: string
  column_profiles: Record<string, ColumnProfile>
  sample_rows: Record<string, any>[]
}

export interface PredictionRecordItem {
  row_index: number
  prediction: number | string
  actual?: number | string | null
  difference?: number | null
  confidence?: number
  row_data: Record<string, any>
}

export interface KpiCardConfig {
  id: string
  label: string
  value: string
  subtext?: string
  format?: 'number' | 'currency' | 'text' | 'badge'
}

export interface GeneratedDashboardData {
  template: DashboardTemplateType
  target_name: string
  target_units?: string
  kpis: KpiCardConfig[]
  summary_statistics?: {
    count: number
    mean: number
    median: number
    min: number
    max: number
    std: number
  }
  evaluation_metrics?: {
    r2_score?: number
    rmse?: number
    mae?: number
    accuracy?: number
    precision?: number
    recall?: number
    f1_score?: number
    evaluated_rows: number
  } | null
  distribution_chart?: {
    bin: string
    count: number
    range_start?: number
    range_end?: number
  }[]
  comparison_chart?: {
    index: number
    predicted: number
    actual?: number
    residual?: number
  }[]
  residual_chart?: {
    bin: string
    count: number
  }[]
  feature_importance_chart?: {
    feature: string
    importance: number
    positive?: boolean
  }[]
  class_distribution?: {
    class: string
    count: number
    percentage: number
  }[]
  confidence_distribution?: {
    bin: string
    count: number
  }[]
  confusion_matrix?: {
    labels: string[]
    matrix: number[][]
  } | null
}

export interface BatchPredictionResponse {
  model_id: string
  model_name: string
  model_version: number
  model_type: ModelLearningTask
  row_count: number
  duration_ms: number
  has_ground_truth: boolean
  warnings: string[]
  dashboard: GeneratedDashboardData
  predictions: PredictionRecordItem[]
}

export interface SingleRecordPredictionResponse {
  model_id: string
  model_name: string
  model_type: ModelLearningTask
  prediction: number | string
  target_name: string
  target_units?: string
  probabilities?: Record<string, number> | null
  input_data: Record<string, any>
  duration_ms: number
}

export interface ModelVersionItem {
  version_number: number
  storage_path?: string
  artifact_checksum?: string
  artifact_size?: number
  input_schema: InputFeatureDefinition[]
  changelog?: string
  created_at: string
}

export interface RegisteredModelItem {
  id: string
  project_id?: string
  name: string
  slug: string
  framework: string
  model_type: ModelLearningTask
  algorithm?: string
  storage_path?: string
  artifact_checksum?: string
  artifact_size?: number
  input_schema: InputFeatureDefinition[]
  output_schema?: {
    type?: string
    target?: string
    units?: string
  }
  dashboard_config?: {
    template?: DashboardTemplateType
    target_name?: string
    target_units?: string
  }
  active_version: number
  status: 'active' | 'maintenance' | 'deprecated' | 'draft'
  api_endpoint?: string
  created_by?: string
  created_at: string
  updated_at: string
  versions?: ModelVersionItem[]
}

export interface MlPlaygroundConfig {
  modelId: string
  modelSlug: string
  modelName: string
  projectId?: string
  modelVersionId?: number
  integrationType: ModelIntegrationType
  modelType: ModelLearningTask
  framework: string
  algorithm?: string
  features: string[]
  featureDefinitions: InputFeatureDefinition[]
  targetName: string
  targetUnits: string
  dashboardTemplate: DashboardTemplateType
  activeVersion: number
  columnMapping?: Record<string, string>
  samplePredictions?: PredictionRecordItem[]
  sampleDashboard?: GeneratedDashboardData
  datasetId?: string
  datasetFilename?: string
  apiEndpoint?: string
}
