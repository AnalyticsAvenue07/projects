import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart2,
  BookOpen,
  Check,
  CheckCircle2,
  Code2,
  Cpu,
  Eye,
  FileCode,
  FileSpreadsheet,
  FileText,
  Globe,
  Info,
  Layers,
  Loader2,
  Lock,
  Plus,
  Presentation,
  Save,
  Send,
  Sparkles,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { isStaffRole } from '@/types/domain'
import { ProjectManagementService } from '@/services/projectManagementService'
import {
  ALL_PROJECT_TEMPLATES,
  getTemplateById,
  type ProjectTemplate,
} from '@/services/projectTemplateService'
import { RegisteredAiService } from '@/services/registeredAiService'
import {
  generateSlug,
  SUPPORTED_INDUSTRIES,
  type ExternalAppConfig,
  type ExternalAppLaunchMethod,
  type ExternalAppType,
  type NotebookConfig,
  type ProjectCatalogItem,
  type ProjectConfigPayload,
  type ProjectDocumentItem,
  type ProjectType,
  type SupportedIndustry,
} from '@/types/projectManagement'
import {
  validateDashboardConfig,
  type DashboardConfig,
} from '@/types/dashboardConfiguration'
import { DashboardConfigStep } from '@/components/dashboard-builder/DashboardConfigStep'
import { DashboardViewer } from '@/components/dashboard-viewer/DashboardViewer'
import { DatasetUploader } from '@/components/dataset-manager/DatasetUploader'
import { ColumnMapper } from '@/components/dataset-manager/ColumnMapper'
import { DashboardConfigBuilder } from '@/components/dashboard-builder/DashboardConfigBuilder'
import { GenericDashboardRenderer } from '@/components/dashboard-renderer/GenericDashboardRenderer'
import { RegisteredAiRunner } from '@/components/ai-app/RegisteredAiRunner'
import { SafeNotebookRenderer } from '@/components/notebook-viewer/SafeNotebookRenderer'
import { DocumentViewer } from '@/components/document-viewer/DocumentViewer'
import { ProjectDocumentManager } from '@/components/document-viewer/ProjectDocumentManager'
import { ExternalAppViewer } from '@/components/external-app/ExternalAppViewer'
import { ProjectDatasetService, type DatasetAnalysisResult } from '@/services/projectDatasetService'
import { ProjectStorageService } from '@/services/projectStorageService'
import { validateExternalAppUrl } from '@/utils/urlValidator'
import { applyMappingToRows } from '@/utils/csvParser'
import type { MlPlaygroundConfig } from '@/types/mlPlayground'
import { MlPlaygroundWizardStep } from '@/components/ml-playground/MlPlaygroundWizardStep'
import { MlModelPlaygroundView } from '@/components/ml-playground/MlModelPlaygroundView'

const STEPS = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Project Type' },
  { id: 3, label: 'Industry & Template' },
  { id: 4, label: 'Configure Application' },
  { id: 5, label: 'Documents & Presentations' },
  { id: 6, label: 'Access Governance' },
  { id: 7, label: 'Validation & Publish' },
]

export function ProjectWizardPage() {
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const isStaff = profile && isStaffRole(profile.role)

  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(id)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(isEditMode)
  const [saving, setSaving] = useState(false)

  // Step 1: Basic Info
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [description, setDescription] = useState('')
  const [detailedOverview, setDetailedOverview] = useState('')
  const [industry, setIndustry] = useState<SupportedIndustry>('Manufacturing')
  const [category, setCategory] = useState('Industrial Operations')
  const [businessProblem, setBusinessProblem] = useState('')
  const [businessSolution, setBusinessSolution] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [tags, setTags] = useState<string[]>(['Manufacturing', 'IoT'])
  const [tagInput, setTagInput] = useState('')
  const [tech, setTech] = useState<string[]>(['React', 'TypeScript', 'FastAPI'])
  const [techInput, setTechInput] = useState('')
  const [thumbnail, setThumbnail] = useState('')

  // Step 2: Project Type
  const [projectType, setProjectType] = useState<ProjectType>('dashboard')

  // Step 3: Template
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('mfg-predictive-maintenance')

  // Step 4: Configuration States
  // A. Dashboard Config & Dataset
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>(() => {
    const tpl = getTemplateById('mfg-predictive-maintenance')
    return tpl?.defaultDashboardConfig || { version: 1, kpis: [], charts: [], filters: [] }
  })
  const [activeDatasetAnalysis, setActiveDatasetAnalysis] = useState<DatasetAnalysisResult | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [rawDatasetRows, setRawDatasetRows] = useState<Record<string, any>[]>(() => {
    const tpl = getTemplateById('mfg-predictive-maintenance')
    return tpl?.sampleData || []
  })

  // B. Notebook Config
  const [notebookConfig, setNotebookConfig] = useState<NotebookConfig | null>(null)
  const [notebookFile, setNotebookFile] = useState<File | null>(null)
  const [connectedAppUrl, setConnectedAppUrl] = useState('')
  const [connectedAppLabel, setConnectedAppLabel] = useState('')
  const [parsingNotebook, setParsingNotebook] = useState(false)

  // C. External Web App Config
  const [externalAppUrl, setExternalAppUrl] = useState('')
  const [externalAppType, setExternalAppType] = useState<ExternalAppType>('streamlit')
  const [externalAppLaunchMethod, setExternalAppLaunchMethod] = useState<ExternalAppLaunchMethod>('new_tab')
  const [externalAppAuthRequired, setExternalAppAuthRequired] = useState(false)
  const [externalAppAuthInstructions, setExternalAppAuthInstructions] = useState('')

  // D. AI App Config
  const [selectedAiServiceId, setSelectedAiServiceId] = useState('srv-sentiment-analysis')

  // E. Showcase Config
  const [showcaseKeyFeatures, setShowcaseKeyFeatures] = useState<string[]>([
    'Automated condition anomaly alerts',
    'Real-time multi-axial sensor telemetry',
    'Fleet-wide operating thermal variance comparison',
  ])
  const [featureInput, setFeatureInput] = useState('')

  // F. ML Model Playground Config
  const [mlPlaygroundConfig, setMlPlaygroundConfig] = useState<MlPlaygroundConfig | null>(null)

  // Step 5: Documents and Presentations
  const [documents, setDocuments] = useState<ProjectDocumentItem[]>([])

  // Step 6: Access Governance
  const [visibility, setVisibility] = useState<'visible' | 'hidden'>('visible')

  // Load existing project in edit mode
  useEffect(() => {
    if (!id) return
    let active = true

    ProjectManagementService.getProjectById(id)
      .then((proj) => {
        if (!active || !proj) return
        setTitle(proj.title)
        setSlug(proj.slug)
        setSlugEdited(true)
        setDescription(proj.description)
        setDetailedOverview(proj.detailedOverview || '')
        setIndustry(proj.industry)
        setCategory(proj.category)
        setProjectType(proj.projectType)
        setSelectedTemplateId(proj.templateId || '')
        setBusinessProblem(proj.businessProblem || '')
        setBusinessSolution(proj.businessSolution || '')
        setTargetAudience(proj.targetAudience || '')
        setTags(proj.tags || [])
        setTech(proj.tech || [])
        setThumbnail(proj.thumbnail || '')
        setVisibility(proj.visibility)

        const cfg = proj.draftConfig || proj.publishedConfig
        if (cfg) {
          if (cfg.dashboard) {
            const dash = cfg.dashboard
            setDashboardConfig(dash)
            if (dash.columnMapping) setColumnMapping(dash.columnMapping)
            if (dash.datasetId) {
              void ProjectDatasetService.getDatasetById(dash.datasetId).then((ds) => {
                if (ds && active) {
                  const rows = ds.dataJson || ds.sampleRows || []
                  const remapped = dash.columnMapping ? applyMappingToRows(rows, dash.columnMapping) : rows
                  setRawDatasetRows(remapped)
                  setActiveDatasetAnalysis({
                    filename: ds.filename,
                    fileSize: ds.fileSize,
                    rowCount: ds.rowCount,
                    headers: ds.headers,
                    schemaMeta: ds.schemaMeta,
                    sampleRows: ds.sampleRows,
                    allRows: rows,
                    quality: {
                      missingValuesPerColumn: {},
                      duplicateRowsCount: 0,
                      completenessPct: 100,
                    },
                  })
                }
              })
            }
          }

          if (cfg.notebook) {
            setNotebookConfig(cfg.notebook)
            setConnectedAppUrl(cfg.notebook.connectedAppUrl || '')
            setConnectedAppLabel(cfg.notebook.connectedAppLabel || '')
          }

          if (cfg.externalApp) {
            setExternalAppUrl(cfg.externalApp.appUrl || '')
            setExternalAppType(cfg.externalApp.appType || 'streamlit')
            setExternalAppLaunchMethod(cfg.externalApp.launchMethod || 'new_tab')
            setExternalAppAuthRequired(Boolean(cfg.externalApp.authRequired))
            setExternalAppAuthInstructions(cfg.externalApp.authInstructions || '')
          }

          if (cfg.aiApp) {
            setSelectedAiServiceId(cfg.aiApp.serviceId)
          }

          if (cfg.showcase?.keyFeatures) {
            setShowcaseKeyFeatures(cfg.showcase.keyFeatures)
          }

          if (cfg.mlPlayground) {
            setMlPlaygroundConfig(cfg.mlPlayground)
          }

          if (cfg.documents) {
            setDocuments(cfg.documents)
          }
        }
      })
      .catch((e) => toast.error(e.message))
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  // Auto-slug from title
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    if (!slugEdited) {
      setSlug(generateSlug(newTitle))
    }
  }

  // Template select
  const handleTemplateSelect = (tpl: ProjectTemplate) => {
    setSelectedTemplateId(tpl.id)
    setIndustry(tpl.industry)
    setCategory(tpl.category)
    setTags(tpl.tags)
    setTech(tpl.tech)
    if (tpl.defaultDashboardConfig) {
      setDashboardConfig(tpl.defaultDashboardConfig)
    }
    if (tpl.sampleData) {
      setRawDatasetRows(tpl.sampleData)
    }
    toast.success(`Applied template: ${tpl.name}`)
  }

  // Dataset analyzed
  const handleDatasetAnalyzed = (res: DatasetAnalysisResult) => {
    setActiveDatasetAnalysis(res)
    setRawDatasetRows(res.allRows)
    toast.success(`Analyzed ${res.rowCount} rows from ${res.filename}`)
  }

  // Column mapping
  const handleMappingChange = (mapping: Record<string, string>) => {
    setColumnMapping(mapping)
    if (activeDatasetAnalysis) {
      const remapped = applyMappingToRows(activeDatasetAnalysis.allRows, mapping)
      setRawDatasetRows(remapped)
    }
  }

  // Notebook upload handler
  const handleNotebookFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const validation = ProjectStorageService.validateNotebookFile(file)
      if (!validation.isValid) {
        toast.error(validation.error)
        return
      }

      setNotebookFile(file)
      setParsingNotebook(true)
      try {
        const text = await file.text()
        const parsedConfig = ProjectStorageService.parseNotebookJson(text, file.name, file.size)
        parsedConfig.connectedAppUrl = connectedAppUrl.trim() || undefined
        parsedConfig.connectedAppLabel = connectedAppLabel.trim() || undefined
        setNotebookConfig(parsedConfig)
        toast.success(`Parsed notebook: ${parsedConfig.metadata.cellCount} cells (${parsedConfig.metadata.language})`)
      } catch (err: any) {
        toast.error(err.message || 'Failed to parse notebook JSON.')
        setNotebookConfig(null)
      } finally {
        setParsingNotebook(false)
      }
    }
  }

  // External App URL validation
  const urlCheck = useMemo(() => {
    if (projectType !== 'external_app') return { isValid: true }
    return validateExternalAppUrl(externalAppUrl)
  }, [projectType, externalAppUrl])

  // Build current draft configuration object
  const currentConfigPayload = useMemo<ProjectConfigPayload>(() => {
    const payload: ProjectConfigPayload = {
      projectType,
      documents,
    }

    if (projectType === 'notebook' && notebookConfig) {
      payload.notebook = {
        ...notebookConfig,
        connectedAppUrl: connectedAppUrl.trim() || undefined,
        connectedAppLabel: connectedAppLabel.trim() || undefined,
      }
    } else if (projectType === 'external_app') {
      payload.externalApp = {
        appType: externalAppType,
        appUrl: externalAppUrl.trim(),
        launchMethod: externalAppLaunchMethod,
        embedSupported: urlCheck.embedSupported,
        embedNotice: urlCheck.embedNotice,
        authRequired: externalAppAuthRequired,
        authInstructions: externalAppAuthInstructions.trim() || undefined,
        verifiedAt: new Date().toISOString(),
      }
    } else if (projectType === 'presentation') {
      payload.presentation = {
        primaryDocumentId: documents.find((d) => d.documentType === 'presentation')?.id,
        overviewSummary: detailedOverview || description,
      }
    } else if (projectType === 'ai_app') {
      payload.aiApp = {
        serviceId: selectedAiServiceId,
      }
    } else if (projectType === 'dashboard') {
      payload.dashboard = {
        ...dashboardConfig,
        columnMapping,
      }
    } else if (projectType === 'showcase') {
      payload.showcase = {
        keyFeatures: showcaseKeyFeatures,
      }
    } else if (projectType === 'ml_playground') {
      payload.mlPlayground = mlPlaygroundConfig || undefined
    }

    return payload
  }, [
    projectType,
    mlPlaygroundConfig,
    documents,
    notebookConfig,
    connectedAppUrl,
    connectedAppLabel,
    externalAppType,
    externalAppUrl,
    externalAppLaunchMethod,
    urlCheck,
    externalAppAuthRequired,
    externalAppAuthInstructions,
    detailedOverview,
    description,
    selectedAiServiceId,
    dashboardConfig,
    columnMapping,
    showcaseKeyFeatures,
  ])

  // Validation
  const validationResult = useMemo(() => {
    const errors: string[] = []
    const warnings: string[] = []

    if (!title.trim()) errors.push('Project Title is required.')
    if (!slug.trim()) errors.push('Project Slug is required.')
    if (!description.trim()) errors.push('Short Description is required.')

    if (projectType === 'dashboard') {
      const availableCols =
        activeDatasetAnalysis?.headers ||
        (rawDatasetRows.length > 0 ? Object.keys(rawDatasetRows[0]) : [])
      const dashCheck = validateDashboardConfig(dashboardConfig, availableCols)
      dashCheck.errors.forEach((e) => errors.push(e.message))
      dashCheck.warnings.forEach((w) => warnings.push(w.message))
    }

    if (projectType === 'notebook') {
      if (!notebookConfig) {
        errors.push('A valid Jupyter Notebook (.ipynb) file must be uploaded.')
      }
      if (connectedAppUrl.trim()) {
        const appCheck = validateExternalAppUrl(connectedAppUrl)
        if (!appCheck.isValid) {
          errors.push(`Connected Interactive App URL Error: ${appCheck.error}`)
        }
      }
    }

    if (projectType === 'external_app') {
      if (!externalAppUrl.trim()) {
        errors.push('External Application URL is required.')
      } else {
        const check = validateExternalAppUrl(externalAppUrl)
        if (!check.isValid) {
          errors.push(check.error || 'Invalid application URL.')
        } else if (externalAppLaunchMethod === 'embed' && check.embedSupported === false) {
          warnings.push(
            check.embedNotice ||
              'This destination may restrict iframe embedding. Consider "Open in New Tab" for reliable access.'
          )
        }
      }
    }

    if (projectType === 'presentation') {
      if (documents.length === 0) {
        warnings.push('No presentation deck or document has been attached to this project yet.')
      }
    }

    if (projectType === 'ai_app' && !selectedAiServiceId) {
      errors.push('A registered AI service must be selected from the approved runtime catalog.')
    }

    if (projectType === 'ml_playground') {
      if (!mlPlaygroundConfig || !mlPlaygroundConfig.features || mlPlaygroundConfig.features.length === 0) {
        errors.push('ML Model Playground requires a verified model artifact or prediction API with input features.')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }, [
    title,
    slug,
    description,
    projectType,
    mlPlaygroundConfig,
    dashboardConfig,
    activeDatasetAnalysis,
    rawDatasetRows,
    notebookConfig,
    connectedAppUrl,
    externalAppUrl,
    externalAppLaunchMethod,
    documents,
    selectedAiServiceId,
  ])

  // Persist dataset if custom CSV was analyzed
  const persistDatasetIfNeeded = async (): Promise<{ datasetId?: string; datasetName?: string }> => {
    if (projectType !== 'dashboard') return {}
    if (activeDatasetAnalysis) {
      if (dashboardConfig.datasetId) {
        const existing = await ProjectDatasetService.getDatasetById(dashboardConfig.datasetId)
        if (existing && existing.filename === activeDatasetAnalysis.filename) {
          return { datasetId: existing.id, datasetName: existing.name || activeDatasetAnalysis.filename }
        }
      }
      const saved = await ProjectDatasetService.saveDataset(
        activeDatasetAnalysis.filename,
        activeDatasetAnalysis,
        profile?.id
      )
      setDashboardConfig((prev) => ({
        ...prev,
        datasetId: saved.id,
        datasetName: saved.name,
      }))
      return { datasetId: saved.id, datasetName: saved.name }
    }
    return {
      datasetId: dashboardConfig.datasetId,
      datasetName: dashboardConfig.datasetName,
    }
  }

  // Ensure draft project exists before model registration in Step 2
  const handleEnsureProjectId = async (): Promise<string> => {
    if (currentProjectId) return currentProjectId
    const effectiveProfile = profile || ({
      id: 'usr_admin',
      email: 'admin@analyticsavenue.in',
      name: 'Platform Administrator',
      role: 'admin',
    } as any)

    const projectTitle = title.trim() || 'Untitled ML Project'
    const baseSlug = slug.trim() || generateSlug(projectTitle)
    let candidateSlug = baseSlug
    let counter = 1
    while (await ProjectManagementService.getProjectBySlug(candidateSlug)) {
      candidateSlug = `${baseSlug}-${counter++}`
    }

    const created = await ProjectManagementService.createProject(
      {
        title: projectTitle,
        slug: candidateSlug,
        description: description || 'ML Model Playground Project',
        detailedOverview: detailedOverview || undefined,
        industry,
        category,
        projectType: 'ml_playground',
        status: 'draft',
        draftConfig: {
          projectType: 'ml_playground',
          mlPlayground: mlPlaygroundConfig || undefined,
        },
      },
      effectiveProfile
    )

    setCurrentProjectId(created.id)
    if (!slugEdited) {
      setSlug(candidateSlug)
    }
    return created.id
  }

  // Save Draft (persistent, non-destructive, isolates draft from published state)
  const handleSaveDraft = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const datasetInfo = await persistDatasetIfNeeded()
      const draftPayload: ProjectConfigPayload =
        projectType === 'dashboard'
          ? {
              ...currentConfigPayload,
              dashboard: {
                ...dashboardConfig,
                ...datasetInfo,
                columnMapping,
              },
            }
          : currentConfigPayload

      const targetId = id || currentProjectId
      if (targetId) {
        await ProjectManagementService.updateDraft(
          targetId,
          draftPayload,
          {
            title,
            slug,
            description,
            detailedOverview,
            industry,
            category,
            projectType,
            templateId: selectedTemplateId,
            tags,
            tech,
            businessProblem,
            businessSolution,
            targetAudience,
            thumbnail,
            visibility,
          },
          profile
        )
        toast.success('Project draft saved persistently.')
      } else {
        const created = await ProjectManagementService.createProject(
          {
            title,
            slug,
            description,
            detailedOverview,
            industry,
            category,
            projectType,
            templateId: selectedTemplateId,
            tags,
            tech,
            businessProblem,
            businessSolution,
            targetAudience,
            thumbnail,
            visibility,
            draftConfig: draftPayload,
          },
          profile
        )
        setCurrentProjectId(created.id)
        toast.success('New project draft created.')
        navigate(`/admin/project-management/${created.id}/edit`, { replace: true })
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save draft.')
    } finally {
      setSaving(false)
    }
  }

  // Publish Project
  const handlePublish = async () => {
    if (!profile) return
    if (!validationResult.isValid) {
      toast.error('Cannot publish project with validation errors.')
      setStep(7)
      return
    }

    setSaving(true)
    try {
      const datasetInfo = await persistDatasetIfNeeded()
      const publishPayload: ProjectConfigPayload =
        projectType === 'dashboard'
          ? {
              ...currentConfigPayload,
              dashboard: {
                ...dashboardConfig,
                ...datasetInfo,
                columnMapping,
              },
            }
          : currentConfigPayload

      let targetId = id || currentProjectId
      if (!targetId) {
        const created = await ProjectManagementService.createProject(
          {
            title,
            slug,
            description,
            detailedOverview,
            industry,
            category,
            projectType,
            templateId: selectedTemplateId,
            tags,
            tech,
            businessProblem,
            businessSolution,
            targetAudience,
            thumbnail,
            visibility,
            draftConfig: publishPayload,
          },
          profile
        )
        targetId = created.id
      } else {
        await ProjectManagementService.updateDraft(
          targetId,
          publishPayload,
          {
            title,
            slug,
            description,
            detailedOverview,
            industry,
            category,
            projectType,
            templateId: selectedTemplateId,
            tags,
            tech,
            businessProblem,
            businessSolution,
            targetAudience,
            thumbnail,
            visibility,
          },
          profile
        )
      }

      const published = await ProjectManagementService.publishProject(targetId, profile)
      toast.success(`Project "${published.title}" published successfully (v${published.currentVersion})!`)
      navigate('/admin/project-management')
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish project.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F766E]" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xs">
        <div>
          <Link
            to="/admin/project-management"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Project Catalog
          </Link>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
            {isEditMode ? `Edit Project: ${title || 'Draft'}` : 'Self-Service Project Publishing Center'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Step {step} of {STEPS.length}: {STEPS[step - 1].label}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition-all"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          {step < STEPS.length ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#0F766E] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] transition-all"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#0F766E] px-6 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] disabled:opacity-50 transition-all"
            >
              <Send className="h-4 w-4" />
              {saving ? 'Publishing...' : 'Publish Project'}
            </button>
          )}
        </div>
      </div>

      {/* Wizard Step Progress Tracker */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-2xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px]">
          {STEPS.map((s, idx) => {
            const isCompleted = step > s.id
            const isCurrent = step === s.id
            return (
              <div key={s.id} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  className="flex items-center gap-2 group text-left cursor-pointer focus:outline-none"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-2xl text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-[#0F766E] text-white shadow-sm ring-4 ring-[#0F766E]/15'
                        : isCompleted
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : s.id}
                  </div>
                  <div>
                    <span
                      className={`text-2xs font-bold block ${
                        isCurrent ? 'text-[#0F766E]' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                      }`}
                    >
                      Step {s.id}
                    </span>
                    <span
                      className={`text-xs font-semibold whitespace-nowrap block ${
                        isCurrent ? 'text-[#0F172A]' : 'text-slate-500'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                </button>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`mx-3 h-0.5 flex-1 transition-colors ${
                      step > s.id ? 'bg-[#0F766E]' : 'bg-slate-100'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── STEP 1: BASIC INFORMATION ────────────────────────────────────── */}
      {step === 1 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-[#0F172A]">Step 1: Basic Solution Profile</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter high-level identifiers and executive summaries for your enterprise project.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Project Title *</label>
              <input
                type="text"
                placeholder="e.g. Machine Health & Predictive Maintenance Suite"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Project Slug (URL Identifier) *</label>
              <input
                type="text"
                placeholder="machine-health-predictive-maintenance-suite"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value)
                  setSlugEdited(true)
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-mono font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Industry Vertical *</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value as SupportedIndustry)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-semibold text-slate-700 focus:border-[#0F766E] focus:outline-none"
              >
                {SUPPORTED_INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Category / Domain</label>
              <input
                type="text"
                placeholder="e.g. Industrial Operations, Patient Care, Fleet Optimization"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Short Description *</label>
              <textarea
                rows={2}
                placeholder="Brief summary appearing on solution catalog cards..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Detailed Overview</label>
              <textarea
                rows={3}
                placeholder="Comprehensive executive narrative explaining the project architecture, background, and business impact..."
                value={detailedOverview}
                onChange={(e) => setDetailedOverview(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Business Problem</label>
              <textarea
                rows={2}
                placeholder="What operational or financial challenge is addressed?"
                value={businessProblem}
                onChange={(e) => setBusinessProblem(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Engineered Solution</label>
              <textarea
                rows={2}
                placeholder="How does this solution solve the problem?"
                value={businessSolution}
                onChange={(e) => setBusinessSolution(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: SELECT PROJECT TYPE ──────────────────────────────────── */}
      {step === 2 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-[#0F172A]">Step 2: Universal Project Publishing Types</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select the runtime experience that powers this enterprise solution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. Notebook / Research */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setProjectType('notebook')}
              className={`rounded-3xl border-2 p-6 cursor-pointer transition-all ${
                projectType === 'notebook'
                  ? 'border-[#0F766E] bg-[#ECFDF5]/30 shadow-md ring-2 ring-[#0F766E]/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="rounded-2xl bg-purple-50 p-3 text-purple-600 w-fit mb-4">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-[#0F172A]">Jupyter Notebook / Research</h4>
                {projectType === 'notebook' && <CheckCircle2 className="h-5 w-5 text-[#0F766E]" />}
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Upload a <code>.ipynb</code> notebook. Safely renders Markdown, syntax-highlighted code, charts, and pre-computed outputs without unisolated execution.
              </p>
            </div>

            {/* 2. Presentation / Documentation */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setProjectType('presentation')}
              className={`rounded-3xl border-2 p-6 cursor-pointer transition-all ${
                projectType === 'presentation'
                  ? 'border-[#0F766E] bg-[#ECFDF5]/30 shadow-md ring-2 ring-[#0F766E]/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-600 w-fit mb-4">
                <Presentation className="h-6 w-6" />
              </div>
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-[#0F172A]">Presentation & Documentation</h4>
                {projectType === 'presentation' && <CheckCircle2 className="h-5 w-5 text-[#0F766E]" />}
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Publish executive slide decks (.pptx), PDF reports, architecture blueprints, and whitepapers with version replacement and RBAC access policies.
              </p>
            </div>

            {/* 3. Existing Hosted Dashboard URL */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setProjectType('external_app')}
              className={`rounded-3xl border-2 p-6 cursor-pointer transition-all ${
                projectType === 'external_app'
                  ? 'border-[#0F766E] bg-[#ECFDF5]/30 shadow-md ring-2 ring-[#0F766E]/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="rounded-2xl bg-teal-50 p-3 text-[#0F766E] w-fit mb-4">
                <Globe className="h-6 w-6" />
              </div>
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-[#0F172A]">Hosted Web App / Dashboard URL</h4>
                {projectType === 'external_app' && <CheckCircle2 className="h-5 w-5 text-[#0F766E]" />}
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Register existing deployed Streamlit, Gradio, Power BI, Tableau, or web applications with SSRF protection, sandboxed embedding, or New Tab launch.
              </p>
            </div>

            {/* 4. Registered AI/ML Service */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setProjectType('ai_app')}
              className={`rounded-3xl border-2 p-6 cursor-pointer transition-all ${
                projectType === 'ai_app'
                  ? 'border-[#0F766E] bg-[#ECFDF5]/30 shadow-md ring-2 ring-[#0F766E]/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600 w-fit mb-4">
                <Cpu className="h-6 w-6" />
              </div>
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-[#0F172A]">Registered AI/ML Service</h4>
                {projectType === 'ai_app' && <CheckCircle2 className="h-5 w-5 text-[#0F766E]" />}
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Connect an approved, developer-integrated microservice runtime with strict input/output contract validation and health checks.
              </p>
            </div>

            {/* 5. Dashboard (Power BI, PDF, Embed, Visual) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setProjectType('dashboard')}
              className={`rounded-3xl border-2 p-6 cursor-pointer transition-all ${
                projectType === 'dashboard'
                  ? 'border-[#0F766E] bg-[#ECFDF5]/30 shadow-md ring-2 ring-[#0F766E]/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="rounded-2xl bg-teal-50 p-3 text-[#0F766E] w-fit mb-4">
                <BarChart2 className="h-6 w-6" />
              </div>
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-[#0F172A]">Dashboard</h4>
                {projectType === 'dashboard' && <CheckCircle2 className="h-5 w-5 text-[#0F766E]" />}
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Publish Power BI reports (.pbix), PDF dashboards, or live Power BI Service embeds with authorized artifact storage and interactive rendering.
              </p>
            </div>

            {/* 5b. ML Model Playground */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setProjectType('ml_playground')}
              className={`rounded-3xl border-2 p-6 cursor-pointer transition-all ${
                projectType === 'ml_playground'
                  ? 'border-[#0F766E] bg-[#ECFDF5]/30 shadow-md ring-2 ring-[#0F766E]/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600 w-fit mb-4">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-[#0F172A]">ML Model Playground</h4>
                {projectType === 'ml_playground' && <CheckCircle2 className="h-5 w-5 text-[#0F766E]" />}
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Upload trained models (.joblib), connect prediction APIs, validate CSV datasets, auto-generate interactive KPI dashboards, and test live predictions without writing code.
              </p>
            </div>

            {/* 6. Executive Showcase Brief */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setProjectType('showcase')}
              className={`rounded-3xl border-2 p-6 cursor-pointer transition-all ${
                projectType === 'showcase'
                  ? 'border-[#0F766E] bg-[#ECFDF5]/30 shadow-md ring-2 ring-[#0F766E]/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 w-fit mb-4">
                <FileText className="h-6 w-6" />
              </div>
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-[#0F172A]">Executive Brief Showcase</h4>
                {projectType === 'showcase' && <CheckCircle2 className="h-5 w-5 text-[#0F766E]" />}
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Strategic executive brief highlighting solution architecture, deliverables, and external demonstration links.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: INDUSTRY & TEMPLATE BLUEPRINT ────────────────────────── */}
      {step === 3 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Step 3: Industry Blueprint Template</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select an enterprise template pre-configured for your vertical.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              Vertical: {industry}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ALL_PROJECT_TEMPLATES.map((tpl) => {
              const isSelected = selectedTemplateId === tpl.id
              const isSameIndustry = tpl.industry === industry
              return (
                <div
                  key={tpl.id}
                  onClick={() => handleTemplateSelect(tpl)}
                  className={`rounded-3xl border-2 p-5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#0F766E] bg-[#ECFDF5]/40 shadow-xs ring-1 ring-[#0F766E]'
                      : isSameIndustry
                      ? 'border-slate-200 hover:border-slate-300 bg-white'
                      : 'border-slate-100 bg-slate-50/50 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-2xs font-bold text-slate-700">
                      {tpl.industry}
                    </span>
                    {isSelected && <CheckCircle2 className="h-5 w-5 text-[#0F766E]" />}
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-[#0F172A]">{tpl.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tpl.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── STEP 4: CONFIGURE APPLICATION ────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-6">
          {/* A. Notebook Upload & Configuration */}
          {projectType === 'notebook' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-[#0F172A]">Configure Research Notebook</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload a Jupyter Notebook (.ipynb). Metadata and pre-computed outputs are stored securely.
                </p>
              </div>

              {/* Upload Zone */}
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-[#F8FAFC] p-8 text-center hover:border-[#0F766E]/40 transition-colors flex flex-col items-center justify-center">
                <UploadCloud className="h-10 w-10 text-purple-600 mb-2" />
                <input
                  type="file"
                  id="notebook-upload"
                  accept=".ipynb"
                  onChange={handleNotebookFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="notebook-upload"
                  className="cursor-pointer rounded-2xl bg-[#0F766E] px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-[#0D655E] transition-colors"
                >
                  {parsingNotebook ? 'Parsing Notebook...' : 'Upload .ipynb File'}
                </label>
                <p className="mt-2 text-2xs text-slate-400">
                  Maximum file size: 20MB. Safe static parsing without arbitrary code execution.
                </p>
              </div>

              {/* Parsed Notebook Metadata Card */}
              {notebookConfig && (
                <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-900 flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-purple-700" />
                      Uploaded: {notebookConfig.fileName} ({(notebookConfig.fileSize / 1024).toFixed(1)} KB)
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-0.5 font-mono text-2xs font-bold text-purple-800">
                      Kernel: {notebookConfig.metadata.kernel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                    <div className="rounded-xl bg-white p-3 border border-purple-100">
                      <span className="text-2xs text-slate-400">Total Cells</span>
                      <p className="font-bold text-purple-900 mt-0.5">{notebookConfig.metadata.cellCount}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3 border border-purple-100">
                      <span className="text-2xs text-slate-400">Code Cells</span>
                      <p className="font-bold text-purple-900 mt-0.5">{notebookConfig.metadata.codeCellCount}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3 border border-purple-100">
                      <span className="text-2xs text-slate-400">Markdown Cells</span>
                      <p className="font-bold text-purple-900 mt-0.5">{notebookConfig.metadata.markdownCellCount}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3 border border-purple-100">
                      <span className="text-2xs text-slate-400">Pre-computed Outputs</span>
                      <p className="font-bold text-purple-900 mt-0.5">
                        {notebookConfig.metadata.hasOutputs ? 'Yes' : 'None'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Separately Deployed Interactive Application (Optional) */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Connect Separately Deployed Interactive Application (Optional)
                  </h4>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Provide a link to an external interactive deployment (e.g. Streamlit app, Google Colab, or hosted cluster).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-2xs font-bold text-slate-600 block">Interactive Application URL</label>
                    <input
                      type="url"
                      placeholder="https://research-app.enterprise.internal"
                      value={connectedAppUrl}
                      onChange={(e) => setConnectedAppUrl(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-mono font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-2xs font-bold text-slate-600 block">Button Label / Environment Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Launch Interactive Model Simulator"
                      value={connectedAppLabel}
                      onChange={(e) => setConnectedAppLabel(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* B. Hosted Web App / Dashboard URL Configuration */}
          {projectType === 'external_app' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-[#0F172A]">Register Hosted Application / Dashboard URL</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register already deployed Streamlit, Gradio, Power BI, Tableau, or web applications with SSRF validation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block">Application URL *</label>
                  <input
                    type="url"
                    placeholder="https://share.streamlit.io/... or https://public.tableau.com/..."
                    value={externalAppUrl}
                    onChange={(e) => setExternalAppUrl(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-mono font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
                  />
                  {externalAppUrl && (
                    <div className="mt-2 text-xs">
                      {urlCheck.isValid ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-emerald-800 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>URL validated: Secure HTTP(S) destination. {urlCheck.embedNotice}</span>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-2.5 text-rose-800 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                          <span>{urlCheck.error}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Application Platform / Type</label>
                  <select
                    value={externalAppType}
                    onChange={(e) => setExternalAppType(e.target.value as ExternalAppType)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-semibold text-slate-700 focus:border-[#0F766E] focus:outline-none"
                  >
                    <option value="streamlit">Streamlit Application</option>
                    <option value="gradio">Gradio / HuggingFace Spaces</option>
                    <option value="powerbi">Microsoft Power BI</option>
                    <option value="tableau">Tableau Server / Public</option>
                    <option value="custom_web">Custom Enterprise Web Application</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Launch Method</label>
                  <select
                    value={externalAppLaunchMethod}
                    onChange={(e) => setExternalAppLaunchMethod(e.target.value as ExternalAppLaunchMethod)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-semibold text-slate-700 focus:border-[#0F766E] focus:outline-none"
                  >
                    <option value="new_tab">Open in New Tab (Recommended for maximum platform compatibility)</option>
                    <option value="embed">Embed in Project Page (Requires target server frame permission)</option>
                  </select>
                </div>

                <div className="md:col-span-2 pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={externalAppAuthRequired}
                      onChange={(e) => setExternalAppAuthRequired(e.target.checked)}
                      className="rounded text-[#0F766E] focus:ring-[#0F766E]"
                    />
                    Requires Dedicated External Authentication / VPN Access
                  </label>
                  {externalAppAuthRequired && (
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="e.g. Ensure you are connected to the Corporate VPN and possess Tableau Explorer permissions."
                        value={externalAppAuthInstructions}
                        onChange={(e) => setExternalAppAuthInstructions(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* C. Presentation Project Overview */}
          {projectType === 'presentation' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-[#0F172A]">Presentation & Documentation Project</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure presentation brief. Manage slide decks (.pptx), PDFs, and blueprints in Step 5.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-xs text-amber-900 flex items-start gap-3">
                <Presentation className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Next: Attach Your Presentation Slides in Step 5</p>
                  <p className="mt-0.5 text-amber-800">
                    Use the Project Documents Manager in Step 5 to upload your PowerPoint (.pptx) deck, executive summary PDF, and architecture diagrams.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* D. Dashboard Configuration (Power BI, PDF, Service Embed & Visual Builder) */}
          {projectType === 'dashboard' && (
            <DashboardConfigStep
              projectId={id || slug || 'new_dashboard'}
              projectTitle={title}
              projectDescription={description}
              config={dashboardConfig}
              onChange={setDashboardConfig}
              activeDatasetAnalysis={activeDatasetAnalysis}
              onDatasetAnalyzed={handleDatasetAnalyzed}
              columnMapping={columnMapping}
              onMappingChange={handleMappingChange}
              rawDatasetRows={rawDatasetRows}
            />
          )}

          {/* D2. ML Model Playground Configuration */}
          {projectType === 'ml_playground' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs">
              <MlPlaygroundWizardStep
                config={mlPlaygroundConfig || undefined}
                projectId={currentProjectId}
                projectSlug={slug}
                projectTitle={title}
                onEnsureProjectId={handleEnsureProjectId}
                onChange={(updated) => setMlPlaygroundConfig(updated)}
              />
            </div>
          )}

          {/* E. Registered AI App (Existing) */}
          {projectType === 'ai_app' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-[#0F172A]">Select Registered AI Service</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select an approved developer microservice runtime from the registry.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {RegisteredAiService.getServices().map((srv) => (
                  <div
                    key={srv.id}
                    onClick={() => setSelectedAiServiceId(srv.id)}
                    className={`rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                      selectedAiServiceId === srv.id
                        ? 'border-[#0F766E] bg-[#ECFDF5]/50 ring-1 ring-[#0F766E]'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <h4 className="text-xs font-bold text-[#0F172A]">{srv.name}</h4>
                    <p className="text-2xs text-slate-400 mt-1 line-clamp-2">{srv.description}</p>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Service Runtime Playground
                </h4>
                <RegisteredAiRunner serviceId={selectedAiServiceId} />
              </div>
            </div>
          )}

          {/* F. Showcase Features */}
          {projectType === 'showcase' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-[#0F172A]">Configure Executive Showcase</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define solution deliverables and core technical capabilities.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">Key Capabilities / Deliverables</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Automated real-time anomaly alerting..."
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (featureInput.trim()) {
                        setShowcaseKeyFeatures([...showcaseKeyFeatures, featureInput.trim()])
                        setFeatureInput('')
                      }
                    }}
                    className="rounded-2xl bg-[#0F766E] px-4 py-2 text-xs font-bold text-white hover:bg-[#0D655E]"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-2 pt-2">
                  {showcaseKeyFeatures.map((feat, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-xs text-slate-700 font-semibold"
                    >
                      <span>{feat}</span>
                      <button
                        type="button"
                        onClick={() => setShowcaseKeyFeatures(showcaseKeyFeatures.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 5: DOCUMENTS & PRESENTATIONS ─────────────────────────────── */}
      {step === 5 && (
        <ProjectDocumentManager
          projectId={id || 'draft'}
          documents={documents}
          onChange={setDocuments}
          actor={profile}
        />
      )}

      {/* ── STEP 6: ACCESS GOVERNANCE ─────────────────────────────────────── */}
      {step === 6 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-[#0F172A]">Step 6: Access Governance</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Access is automatically mapped to enterprise industry grants.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-teal-200 bg-[#ECFDF5] p-5 text-xs text-[#0F766E]">
              <p className="font-bold text-sm">Target Audience: {industry} Vertical</p>
              <p className="mt-1 leading-relaxed">
                Authorized users with approved account status and an explicit <strong>{industry}</strong> industry grant in{' '}
                <code>public.poc_access</code> will automatically see this project once published.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Catalog Visibility</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === 'visible'}
                    onChange={() => setVisibility('visible')}
                    className="h-4 w-4 text-[#0F766E] focus:ring-[#0F766E]"
                  />
                  Visible in Catalog
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === 'hidden'}
                    onChange={() => setVisibility('hidden')}
                    className="h-4 w-4 text-[#0F766E] focus:ring-[#0F766E]"
                  />
                  Hidden (Direct URL with Grant only)
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 7: VALIDATION, PREVIEW & PUBLISH ─────────────────────────── */}
      {step === 7 && (
        <div className="space-y-6">
          {/* Validation Banner */}
          <div
            className={`rounded-3xl border p-6 ${
              validationResult.isValid
                ? 'border-emerald-200 bg-emerald-50/50'
                : 'border-rose-200 bg-rose-50/50'
            }`}
          >
            <div className="flex items-center gap-3">
              {validationResult.isValid ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-6 w-6 text-rose-600 shrink-0" />
              )}
              <div>
                <h4 className="text-sm font-bold text-[#0F172A]">
                  {validationResult.isValid
                    ? 'Configuration Passed Pre-Publication Validation'
                    : 'Validation Issues Detected'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {validationResult.isValid
                    ? 'All required schemas, data fields, and metadata contracts are verified.'
                    : 'Resolve the errors below before publishing to user portals.'}
                </p>
              </div>
            </div>

            {validationResult.errors.length > 0 && (
              <ul className="mt-4 space-y-1 text-xs font-semibold text-rose-700 list-disc list-inside">
                {validationResult.errors.map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
              </ul>
            )}

            {validationResult.warnings.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-amber-700 list-disc list-inside">
                {validationResult.warnings.map((w, idx) => (
                  <li key={idx}>Warning: {w}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Interactive Live Preview */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-2xs font-bold text-slate-600 uppercase tracking-wider">
                  Live Preview
                </span>
                <h3 className="mt-1 text-xl font-bold text-[#0F172A]">{title || 'Untitled Project'}</h3>
                <p className="text-xs text-slate-500">{description}</p>
              </div>

              <span className="rounded-full bg-teal-50 border border-teal-200 px-3 py-1 font-mono text-2xs font-bold text-[#0F766E] uppercase">
                {projectType.replace('_', ' ')}
              </span>
            </div>

            {/* Render type-specific preview */}
            {projectType === 'notebook' && notebookConfig && (
              <SafeNotebookRenderer config={notebookConfig} title={title} />
            )}

            {projectType === 'external_app' && (
              <ExternalAppViewer
                config={{
                  appType: externalAppType,
                  appUrl: externalAppUrl,
                  launchMethod: externalAppLaunchMethod,
                  authRequired: externalAppAuthRequired,
                  authInstructions: externalAppAuthInstructions,
                }}
                title={title}
                description={description}
              />
            )}

            {projectType === 'presentation' && (
              <DocumentViewer documents={documents} title={title} isStaff={true} />
            )}

            {projectType === 'dashboard' && (
              <DashboardViewer
                config={dashboardConfig}
                datasetRows={rawDatasetRows}
                title={title}
                description={description}
                isStaff={true}
              />
            )}

            {projectType === 'ai_app' && (
              <RegisteredAiRunner serviceId={selectedAiServiceId} />
            )}

            {projectType === 'ml_playground' && mlPlaygroundConfig && (
              <MlModelPlaygroundView
                config={mlPlaygroundConfig}
                projectTitle={title}
                projectSlug={slug}
                isStaff={true}
              />
            )}

            {projectType === 'showcase' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[#0F172A]">Core Capabilities</h4>
                <ul className="list-disc list-inside space-y-2 text-xs text-slate-700">
                  {showcaseKeyFeatures.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
