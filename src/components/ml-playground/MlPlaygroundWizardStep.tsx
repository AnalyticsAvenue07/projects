import { useEffect, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Cpu,
  FileCheck,
  FileCode,
  FileSpreadsheet,
  Globe,
  HelpCircle,
  Info,
  Layers,
  Loader2,
  Package,
  Play,
  RefreshCw,
  Sliders,
  Sparkles,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  MlPlaygroundService,
} from '@/services/mlPlaygroundService'
import type {
  DashboardTemplateType,
  DatasetCompatibilityReport,
  InputFeatureDefinition,
  MlPlaygroundConfig,
  ModelInspectionResult,
  ModelIntegrationType,
  ModelLearningTask,
} from '@/types/mlPlayground'

interface Props {
  config?: MlPlaygroundConfig
  projectId?: string
  projectSlug: string
  projectTitle: string
  onEnsureProjectId?: () => Promise<string>
  onChange: (updated: MlPlaygroundConfig) => void
}

export function MlPlaygroundWizardStep({
  config,
  projectId,
  projectSlug,
  projectTitle,
  onEnsureProjectId,
  onChange,
}: Props) {
  // Wizard internal sub-step
  const [subStep, setSubStep] = useState<number>(1)

  // Integration Type
  const [integrationType, setIntegrationType] = useState<ModelIntegrationType>(
    config?.integrationType || 'trained_model',
  )

  // Model file state & registration
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [inspectingModel, setInspectingModel] = useState<boolean>(false)
  const [modelInspection, setModelInspection] = useState<ModelInspectionResult | null>(null)
  const [modelError, setModelError] = useState<string | null>(null)
  const [registeredModelId, setRegisteredModelId] = useState<string>(config?.modelId || '')
  const [registeredVersion, setRegisteredVersion] = useState<number>(config?.activeVersion || 1)

  // Option B: API Endpoint state
  const [apiEndpoint, setApiEndpoint] = useState<string>(config?.apiEndpoint || '')
  const [apiKey, setApiKey] = useState<string>('')
  const [apiFeaturesInput, setApiFeaturesInput] = useState<string>(
    config?.features?.join(', ') || '',
  )

  // Dataset file state
  const [datasetFile, setDatasetFile] = useState<File | null>(null)
  const [validatingDataset, setValidatingDataset] = useState<boolean>(false)
  const [datasetReport, setDatasetReport] = useState<DatasetCompatibilityReport | null>(null)
  const [datasetError, setDatasetError] = useState<string | null>(null)

  // Column Mappings
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    config?.columnMapping || {},
  )

  // Target and Dashboard settings
  const [targetName, setTargetName] = useState<string>(config?.targetName || 'Predicted Output')
  const [targetUnits, setTargetUnits] = useState<string>(config?.targetUnits || 'units')
  const [modelType, setModelType] = useState<ModelLearningTask>(config?.modelType || 'regression')
  const [dashboardTemplate, setDashboardTemplate] = useState<DashboardTemplateType>(
    config?.dashboardTemplate || 'regression',
  )

  // Testing & preview state
  const [testingPrediction, setTestingPrediction] = useState<boolean>(false)
  const [previewSuccess, setPreviewSuccess] = useState<boolean>(false)

  // Initialize from existing config if available
  useEffect(() => {
    if (config) {
      if (config.modelId) setRegisteredModelId(config.modelId)
      if (config.activeVersion) setRegisteredVersion(config.activeVersion)
      if (config.integrationType) setIntegrationType(config.integrationType)
      if (config.targetName) setTargetName(config.targetName)
      if (config.targetUnits) setTargetUnits(config.targetUnits)
      if (config.modelType) setModelType(config.modelType)
      if (config.dashboardTemplate) setDashboardTemplate(config.dashboardTemplate)
      if (config.columnMapping) setColumnMapping(config.columnMapping)
      if (config.apiEndpoint) setApiEndpoint(config.apiEndpoint)
      if (config.features && config.features.length > 0) {
        setModelInspection({
          checksum: 'existing_registered_artifact',
          filename: config.modelName + '.joblib',
          file_size: 1024 * 100,
          framework: config.framework || 'scikit-learn',
          algorithm: config.algorithm || 'LinearRegression',
          model_type: config.modelType || 'regression',
          feature_count: config.features.length,
          features: config.features,
          feature_definitions: config.featureDefinitions || config.features.map(f => ({ name: f, type: 'number', required: true })),
          has_predict_proba: config.modelType === 'classification',
          status: 'valid',
        })
      }
    }
  }, [config])

  // Sync state to parent form
  function persistChanges(overrides?: Partial<MlPlaygroundConfig>) {
    const discoveredFeatures = modelInspection?.features || (apiFeaturesInput ? apiFeaturesInput.split(',').map(s => s.trim()).filter(Boolean) : [])
    const featureDefs: InputFeatureDefinition[] = modelInspection?.feature_definitions || discoveredFeatures.map(f => ({
      name: f,
      type: 'number',
      required: true,
    }))

    const activeId = overrides?.modelId || registeredModelId || config?.modelId || ''
    const activeVer = overrides?.activeVersion ?? registeredVersion ?? config?.activeVersion ?? 1
    const pId = overrides?.projectId || projectId || config?.projectId

    const updatedConfig: MlPlaygroundConfig = {
      modelId: activeId,
      modelSlug: projectSlug,
      modelName: projectTitle || 'Trained Model',
      projectId: pId,
      modelVersionId: activeVer,
      integrationType,
      modelType,
      framework: modelInspection?.framework || (integrationType === 'external_api' ? 'external_api' : 'scikit-learn'),
      algorithm: modelInspection?.algorithm || (integrationType === 'external_api' ? 'API_Endpoint' : 'Estimator'),
      features: discoveredFeatures,
      featureDefinitions: featureDefs,
      targetName,
      targetUnits,
      dashboardTemplate,
      activeVersion: activeVer,
      columnMapping,
      datasetFilename: datasetFile?.name,
      apiEndpoint: integrationType === 'external_api' ? apiEndpoint : undefined,
      ...overrides,
    }

    onChange(updatedConfig)
    return updatedConfig
  }

  // Handle Model Artifact Selection & Backend Registration
  async function handleModelFileSelected(file: File) {
    setModelFile(file)
    setModelError(null)
    setInspectingModel(true)

    try {
      // 1. Pre-register / draft-save project to ensure real project_id
      const realProjectId = onEnsureProjectId ? await onEnsureProjectId() : (projectId || config?.projectId)

      // 2. Register model directly with the backend registry
      const res = await MlPlaygroundService.registerModel(
        projectTitle || file.name,
        projectSlug,
        file,
        undefined,
        realProjectId,
      )

      setRegisteredModelId(res.id)
      setRegisteredVersion(res.active_version)

      const features = res.features || res.input_schema.map((f) => f.name)
      const featDefs: InputFeatureDefinition[] = (res.feature_definitions || res.input_schema || []).map((f) => ({
        name: f.name,
        type: (f.type as any) || 'number',
        required: f.required !== false,
      }))

      const inspection: ModelInspectionResult = {
        checksum: res.artifact_checksum || 'sha256_' + res.id,
        filename: file.name,
        file_size: res.artifact_size || file.size,
        framework: res.framework,
        algorithm: res.algorithm,
        model_type: res.model_type,
        feature_count: features.length,
        features: features,
        feature_definitions: featDefs,
        classes: res.classes,
        has_predict_proba: Boolean(res.has_predict_proba),
        status: 'valid',
      }
      setModelInspection(inspection)
      setModelType(res.model_type)
      const template = (res.dashboard_config?.template as any) || res.model_type
      setDashboardTemplate(template)
      if (res.dashboard_config?.target_name) {
        setTargetName(res.dashboard_config.target_name)
      } else if (res.model_type === 'classification') {
        setTargetName('Target')
      }

      persistChanges({
        modelId: res.id,
        modelVersionId: res.active_version,
        projectId: realProjectId,
        modelType: res.model_type,
        dashboardTemplate: template,
        features,
        featureDefinitions: featDefs,
        activeVersion: res.active_version,
      })

      toast.success(`Discovered ${features.length} model input features (${res.algorithm}). Model registered (ID: ${res.id}).`)
    } catch (err: any) {
      const errMsg = err.message || 'Model registration failed.'
      setModelError(errMsg)
      setModelInspection(null)
      setRegisteredModelId('')
      toast.error(errMsg)
    } finally {
      setInspectingModel(false)
    }
  }

  // Handle Option B External API registration
  async function handleRegisterApi(): Promise<boolean> {
    if (!apiEndpoint) {
      toast.error('API endpoint URL is required.')
      return false
    }
    const rawFeats = apiFeaturesInput.split(',').map(s => s.trim()).filter(Boolean)
    if (rawFeats.length === 0) {
      toast.error('At least one input feature is required.')
      return false
    }
    try {
      const realProjectId = onEnsureProjectId ? await onEnsureProjectId() : (projectId || config?.projectId)
      const res = await MlPlaygroundService.registerApiEndpoint({
        name: projectTitle || 'API Inference Endpoint',
        slug: projectSlug,
        endpoint_url: apiEndpoint,
        features: rawFeats,
        model_type: modelType,
        api_key: apiKey || undefined,
        project_id: realProjectId,
      })
      setRegisteredModelId(res.id)
      setRegisteredVersion(res.active_version)
      persistChanges({
        modelId: res.id,
        modelVersionId: res.active_version,
        projectId: realProjectId,
        features: rawFeats,
      })
      toast.success('Inference API registered successfully.')
      return true
    } catch (err: any) {
      const errMsg = err.message || 'Failed to register API endpoint.'
      setModelError(errMsg)
      toast.error(errMsg)
      return false
    }
  }

  // Handle Dataset CSV Selection
  async function handleDatasetFileSelected(file: File) {
    const activeModelId = registeredModelId || config?.modelId
    if (!activeModelId) {
      const errMsg = 'Model not registered. Please complete Step 2 (Upload Model) first.'
      setDatasetError(errMsg)
      toast.error(errMsg)
      return
    }

    setDatasetFile(file)
    setDatasetError(null)
    setValidatingDataset(true)

    try {
      const report = await MlPlaygroundService.validateDataset(activeModelId, file, targetName)
      setDatasetReport(report)

      // Auto-suggest target name from extra columns if present
      if (report.extra_columns && report.extra_columns.length > 0) {
        if (!targetName || targetName === 'Predicted Output' || targetName === 'Target') {
          const suggested = report.extra_columns[0]
          setTargetName(suggested)
        }
      }

      // Pre-fill suggested mappings
      if (report.suggested_mappings && Object.keys(report.suggested_mappings).length > 0) {
        setColumnMapping((prev) => ({
          ...report.suggested_mappings,
          ...prev,
        }))
      }

      toast.success(`Dataset parsed: ${report.row_count.toLocaleString()} rows and ${report.column_count} columns.`)
    } catch (err: any) {
      setDatasetError(err.message || 'Failed to validate dataset.')
      toast.error(err.message || 'Dataset validation failed.')
    } finally {
      setValidatingDataset(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Sub-step Navigation Pill Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200">
        {[
          { id: 1, label: '1. Integration Type', icon: <Package className="h-4 w-4" /> },
          { id: 2, label: '2. Upload Model', icon: <Cpu className="h-4 w-4" /> },
          { id: 3, label: '3. Dataset Profiling', icon: <FileSpreadsheet className="h-4 w-4" /> },
          { id: 4, label: '4. Schema Compatibility', icon: <Sliders className="h-4 w-4" /> },
          { id: 5, label: '5. Dashboard Template', icon: <BarChart3 className="h-4 w-4" /> },
        ].map((tab) => {
          const isActive = subStep === tab.id
          const isDone = subStep > tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id > 2 && !registeredModelId && !config?.modelId && integrationType !== 'external_api') {
                  toast.error('Please upload and register a model in Step 2 before proceeding.')
                  return
                }
                setSubStep(tab.id)
              }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                  : isDone
                  ? 'text-teal-700 hover:text-teal-900 hover:bg-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {isDone ? <Check className="h-3.5 w-3.5 text-teal-600 stroke-[3]" /> : tab.icon}
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Sub-step 1: Select Model Integration Type */}
      {subStep === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Select Model Integration Mode</h3>
            <p className="text-xs text-slate-500 mt-1">
              Choose how your machine learning model will be connected to the Analytics Avenue Prediction Engine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Option A: Upload Trained Model */}
            <div
              onClick={() => {
                setIntegrationType('trained_model')
                persistChanges()
              }}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                integrationType === 'trained_model'
                  ? 'border-teal-600 bg-teal-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700">
                  <Cpu className="h-5 w-5" />
                </div>
                {integrationType === 'trained_model' && (
                  <span className="bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-900">Option A: Upload Trained Model</h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Upload a trusted scikit-learn model artifact (<code className="text-teal-700">.joblib</code> or <code className="text-teal-700">.pkl</code>). Automatically discovers parameters, classes, and feature names.
              </p>
            </div>

            {/* Option B: Connect Prediction API */}
            <div
              onClick={() => {
                setIntegrationType('external_api')
                persistChanges()
              }}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                integrationType === 'external_api'
                  ? 'border-teal-600 bg-teal-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                  <Globe className="h-5 w-5" />
                </div>
                {integrationType === 'external_api' && (
                  <span className="bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-900">Option B: Connect Prediction API</h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Connect an approved, server-side HTTPS inference endpoint. Features SSRF sanitization and automated request batching.
              </p>
            </div>

            {/* Option C: Compatible Model Package */}
            <div
              onClick={() => {
                setIntegrationType('model_package')
                persistChanges()
              }}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                integrationType === 'model_package'
                  ? 'border-teal-600 bg-teal-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                  <Package className="h-5 w-5" />
                </div>
                {integrationType === 'model_package' && (
                  <span className="bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-900">Option C: Model Package + Manifest</h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Upload a verified model artifact accompanied by an explicit JSON manifest defining custom target names and dashboard templates.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => {
                persistChanges()
                setSubStep(2)
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>Continue to Upload</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sub-step 2: Upload Trained Model / API Settings */}
      {subStep === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {integrationType === 'external_api' ? 'Configure Prediction API' : 'Upload Trained Model Artifact'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {integrationType === 'external_api'
                ? 'Specify the HTTPS inference endpoint and expected feature schema.'
                : 'Upload a trusted .joblib file. The engine will inspect the model in a sandboxed runtime to extract metadata.'}
            </p>
          </div>

          {integrationType === 'external_api' ? (
            <div className="space-y-4 p-5 rounded-2xl border border-slate-200 bg-white">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  HTTPS Inference Endpoint URL *
                </label>
                <input
                  type="url"
                  placeholder="https://api.enterprise-analytics.com/v1/predict"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Expected Input Features (comma-separated) *
                </label>
                <input
                  type="text"
                  placeholder="TV, Digital, Radio, Footfall, Staff"
                  value={apiFeaturesInput}
                  onChange={(e) => setApiFeaturesInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  API Key or Secret Token (Optional — Stored Server-Side Only)
                </label>
                <input
                  type="password"
                  placeholder="aa_sec_token_••••••••••••"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
                  inspectingModel
                    ? 'border-teal-400 bg-teal-50/30'
                    : modelInspection
                    ? 'border-teal-500 bg-teal-50/20'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/60'
                }`}
              >
                <input
                  id="model-file-upload"
                  type="file"
                  accept=".joblib,.pkl,.pickle"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void handleModelFileSelected(f)
                  }}
                  className="hidden"
                />
                <label
                  htmlFor="model-file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700 shadow-xs">
                    {inspectingModel ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <UploadCloud className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {modelFile ? modelFile.name : 'Click to select or drag and drop model file'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports certified scikit-learn (.joblib or .pkl) up to 50MB
                    </p>
                  </div>
                </label>
              </div>

              {/* Error display */}
              {modelError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-red-900">Model Artifact Rejected</h5>
                    <p className="text-xs text-red-700 mt-0.5">{modelError}</p>
                  </div>
                </div>
              )}

              {/* Inspection Results Card */}
              {modelInspection && (
                <div className="rounded-2xl border border-teal-200 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-teal-600" />
                      <h4 className="text-sm font-bold text-slate-900">Model Artifact Verified & Registered</h4>
                    </div>
                    <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {modelInspection.model_type}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Framework</span>
                      <span className="font-bold text-slate-800">{modelInspection.framework}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Algorithm</span>
                      <span className="font-bold text-slate-800">{modelInspection.algorithm}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Feature Count</span>
                      <span className="font-bold text-slate-800">{modelInspection.feature_count} Features</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">SHA-256 Digest</span>
                      <span className="font-mono text-[11px] text-slate-700 truncate block" title={modelInspection.checksum}>
                        {modelInspection.checksum.slice(0, 12)}...
                      </span>
                    </div>
                  </div>

                  {modelInspection.features && modelInspection.features.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 mb-2">Discovered Input Features:</h5>
                      <div className="flex flex-wrap gap-1.5">
                        {modelInspection.features.map((feat) => (
                          <span
                            key={feat}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px]"
                          >
                            <span>{feat}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setSubStep(1)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={async () => {
                if (integrationType === 'external_api') {
                  const ok = await handleRegisterApi()
                  if (!ok) return
                }
                persistChanges()
                setSubStep(3)
              }}
              disabled={(!modelInspection || (!registeredModelId && !config?.modelId)) && integrationType !== 'external_api'}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <span>Continue to Dataset</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sub-step 3: Dataset Profiling & Upload */}
      {subStep === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Upload Dataset for Profiling & Validation</h3>
            <p className="text-xs text-slate-500 mt-1">
              Upload a representative CSV dataset. The engine will inspect columns, data types, missing values, and check model compatibility.
            </p>
          </div>

          <div
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
              validatingDataset
                ? 'border-teal-400 bg-teal-50/30'
                : datasetReport
                ? 'border-teal-500 bg-teal-50/20'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/60'
            }`}
          >
            <input
              id="dataset-file-upload"
              type="file"
              accept=".csv,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleDatasetFileSelected(f)
              }}
              className="hidden"
            />
            <label
              htmlFor="dataset-file-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700 shadow-xs">
                {validatingDataset ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {datasetFile ? datasetFile.name : 'Select or drag & drop CSV dataset'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports .csv files up to 10MB and 20,000 rows
                </p>
              </div>
            </label>
          </div>

          {datasetError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-red-900">Dataset Validation Error</h5>
                <p className="text-xs text-red-700 mt-0.5">{datasetError}</p>
              </div>
            </div>
          )}

          {datasetReport && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">Dataset Profile Summary</h4>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    datasetReport.status === 'compatible'
                      ? 'bg-teal-100 text-teal-800'
                      : datasetReport.status === 'mapping_required'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {datasetReport.status === 'compatible'
                    ? '100% Compatible'
                    : datasetReport.status === 'mapping_required'
                    ? 'Mapping Required'
                    : 'Incompatible'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Row Count</span>
                  <span className="font-bold text-slate-800">{datasetReport.row_count.toLocaleString()} Rows</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Total Columns</span>
                  <span className="font-bold text-slate-800">{datasetReport.column_count} Columns</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Features Matched</span>
                  <span className="font-bold text-teal-700">
                    {datasetReport.exact_matches.length} / {datasetReport.required_features.length}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Ground Truth Target</span>
                  <span className="font-bold text-slate-800">
                    {datasetReport.has_target_column ? 'Detected' : 'Not Provided'}
                  </span>
                </div>
              </div>

              {/* Sample Data Table Preview */}
              {datasetReport.sample_rows && datasetReport.sample_rows.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-slate-700 mb-2">Sample Preview (First 5 Rows):</h5>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono">
                        <tr>
                          {Object.keys(datasetReport.sample_rows[0]).slice(0, 8).map((h) => (
                            <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {datasetReport.sample_rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/50">
                            {Object.values(row).slice(0, 8).map((val: any, cIdx) => (
                              <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap text-slate-700">
                                {String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setSubStep(2)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                persistChanges()
                setSubStep(4)
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>Continue to Schema Mapping</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sub-step 4: Schema Compatibility & Column Mapping */}
      {subStep === 4 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Model & Dataset Schema Mapping</h3>
            <p className="text-xs text-slate-500 mt-1">
              Verify that each required model feature is mapped to the corresponding column in the uploaded dataset.
            </p>
          </div>

          {datasetReport ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Required Model Feature</span>
                  <span className="text-xs font-bold text-slate-800">Mapped CSV Column</span>
                </div>

                <div className="divide-y divide-slate-100 p-2">
                  {datasetReport.required_features.map((feat) => {
                    const currentMapped = columnMapping[feat] || feat
                    const isMatched = datasetReport.available_columns.includes(currentMapped)

                    return (
                      <div key={feat} className="flex items-center justify-between p-3 gap-4">
                        <div className="flex items-center gap-2">
                          {isMatched ? (
                            <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                          )}
                          <span className="text-xs font-mono font-bold text-slate-900">{feat}</span>
                        </div>

                        <select
                          value={currentMapped}
                          onChange={(e) => {
                            const val = e.target.value
                            setColumnMapping((prev) => ({
                              ...prev,
                              [feat]: val,
                            }))
                            persistChanges()
                          }}
                          className={`text-xs font-mono rounded-xl border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer ${
                            isMatched
                              ? 'border-slate-200 bg-white text-slate-800'
                              : 'border-amber-300 bg-amber-50/50 text-amber-900'
                          }`}
                        >
                          {datasetReport.available_columns.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
              Upload a dataset in Step 3 to review and map column names.
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setSubStep(3)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                persistChanges()
                setSubStep(5)
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>Continue to Configuration</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sub-step 5: Model Configuration & Dashboard Template */}
      {subStep === 5 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Model Configuration & Dashboard Template</h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure semantic display names, target units, and select the automated dashboard visual template.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-2xl border border-slate-200 bg-white">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Name</label>
              <input
                type="text"
                placeholder="Monthly Revenue, Churn Probability, Failure Flag"
                value={targetName}
                onChange={(e) => {
                  setTargetName(e.target.value)
                  persistChanges()
                }}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Measurement Units</label>
              <input
                type="text"
                placeholder="USD ($), Hours, %, Units"
                value={targetUnits}
                onChange={(e) => {
                  setTargetUnits(e.target.value)
                  persistChanges()
                }}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {datasetReport?.extra_columns && datasetReport.extra_columns.length > 0 && (
              <div className="col-span-1 md:col-span-2 p-3 bg-teal-50/50 rounded-xl border border-teal-200">
                <label className="block text-xs font-bold text-teal-900 mb-1">
                  Ground Truth Evaluation Target (Detected in CSV)
                </label>
                <select
                  value={targetName}
                  onChange={(e) => {
                    setTargetName(e.target.value)
                    persistChanges({ targetName: e.target.value })
                  }}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-teal-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  {datasetReport.extra_columns.map((col) => (
                    <option key={col} value={col}>
                      {col} (Ground Truth Actuals)
                    </option>
                  ))}
                  <option value="">-- No Ground Truth / Unlabeled --</option>
                </select>
                <p className="text-[11px] text-teal-700 mt-1">
                  Selecting this column enables automated benchmark metrics (Precision, Recall, F1, Accuracy, and Confusion Matrix).
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Model Learning Task</label>
              <select
                value={modelType}
                onChange={(e) => {
                  const val = e.target.value as ModelLearningTask
                  setModelType(val)
                  setDashboardTemplate(val)
                  persistChanges()
                }}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="regression">Regression (Continuous Numerical)</option>
                <option value="classification">Classification (Categorical Classes)</option>
                <option value="forecasting">Time Series Forecasting</option>
                <option value="anomaly">Anomaly Detection</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Dashboard Template</label>
              <select
                value={dashboardTemplate}
                onChange={(e) => {
                  setDashboardTemplate(e.target.value as DashboardTemplateType)
                  persistChanges()
                }}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="regression">Regression Visual Dashboard (Distribution, Residuals, Scatter)</option>
                <option value="classification">Classification Dashboard (Confusion Matrix, Class Breakdown)</option>
                <option value="forecasting">Forecasting Dashboard (Trend Horizon, Timestamps)</option>
                <option value="anomaly">Anomaly Detection Dashboard</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setSubStep(4)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                persistChanges()
                toast.success('ML Model Playground configuration validated.')
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Save Playground Configuration</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
