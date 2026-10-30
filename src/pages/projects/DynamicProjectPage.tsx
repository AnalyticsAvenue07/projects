import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  BarChart2,
  BookOpen,
  CheckCircle2,
  Cpu,
  Download,
  ExternalLink,
  FileCode,
  FileText,
  Globe,
  Layers,
  LayoutDashboard,
  Loader2,
  Lock,
  Presentation,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { isStaffRole } from '@/types/domain'
import { deriveAllowedIndustries, fetchAccessForUser } from '@/services/pocAccess'
import { ProjectManagementService } from '@/services/projectManagementService'
import { ProjectDocumentService } from '@/services/projectDocumentService'
import type { ProjectCatalogItem, ProjectDocumentItem } from '@/types/projectManagement'
import { GenericDashboardRenderer } from '@/components/dashboard-renderer/GenericDashboardRenderer'
import { DashboardViewer } from '@/components/dashboard-viewer/DashboardViewer'
import { RegisteredAiRunner } from '@/components/ai-app/RegisteredAiRunner'
import { SafeNotebookRenderer } from '@/components/notebook-viewer/SafeNotebookRenderer'
import { DocumentViewer } from '@/components/document-viewer/DocumentViewer'
import { ExternalAppViewer } from '@/components/external-app/ExternalAppViewer'
import { EnterpriseEmpty } from '@/components/empty-states/EnterpriseEmpty'
import { getTemplateById } from '@/services/projectTemplateService'
import { tagColors } from '@/utils/tagColors'
import { ProjectDatasetService } from '@/services/projectDatasetService'
import { SalesRevenuePredictionApp } from '@/components/sales-revenue/SalesRevenuePredictionApp'
import { MlModelPlaygroundView } from '@/components/ml-playground/MlModelPlaygroundView'

type ProjectSectionTab = 'overview' | 'application' | 'notebook' | 'results' | 'presentation' | 'documentation'

export function DynamicProjectPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)

  const [project, setProject] = useState<ProjectCatalogItem | null | undefined>(undefined)
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [datasetRows, setDatasetRows] = useState<Record<string, any>[]>([])
  const [documents, setDocuments] = useState<ProjectDocumentItem[]>([])
  const [activeTab, setActiveTab] = useState<ProjectSectionTab>('overview')

  useEffect(() => {
    if (!slug) return
    let active = true

    async function load() {
      try {
        if (!profile || profile.status !== 'approved') {
          if (active) {
            setProject(null)
            setHasAccess(false)
          }
          return
        }

        const proj = await ProjectManagementService.getProjectBySlug(slug!)
        if (!proj) {
          if (active) {
            setProject(null)
            setHasAccess(false)
          }
          return
        }

        const isStaff = isStaffRole(profile.role)

        // Ordinary client checks: must be published and visible
        if (!isStaff) {
          if (proj.status !== 'published' || proj.visibility !== 'visible' || !proj.publishedConfig) {
            if (active) {
              setProject(null)
              setHasAccess(false)
            }
            return
          }

          const accessRows = await fetchAccessForUser(profile.id)
          const allowedIndustries = deriveAllowedIndustries(accessRows)

          if (!allowedIndustries.has(proj.industry)) {
            if (active) {
              setProject(proj)
              setHasAccess(false)
            }
            return
          }
        }

        const effectiveConfig = isStaff
          ? proj.publishedConfig || proj.draftConfig
          : proj.publishedConfig

        // Load dataset for dashboard
        if (proj.projectType === 'dashboard') {
          const dash = effectiveConfig?.dashboard
          if (dash?.datasetId) {
            try {
              const ds = await ProjectDatasetService.getDatasetById(dash.datasetId)
              const rows = ds?.dataJson || ds?.sampleRows || []
              if (active) {
                if (rows.length > 0) {
                  setDatasetRows(rows)
                } else {
                  const tpl = proj.templateId ? getTemplateById(proj.templateId) : null
                  setDatasetRows(tpl?.sampleData || [])
                }
              }
            } catch {
              const tpl = proj.templateId ? getTemplateById(proj.templateId) : null
              if (active) setDatasetRows(tpl?.sampleData || [])
            }
          } else {
            const tpl = proj.templateId ? getTemplateById(proj.templateId) : null
            if (active) setDatasetRows(tpl?.sampleData || [])
          }
        }

        // Load project documents
        const accessRows = !isStaff ? await fetchAccessForUser(profile.id) : []
        const allowedIndustries = !isStaff ? deriveAllowedIndustries(accessRows) : undefined
        const docs = await ProjectDocumentService.getDocumentsForProject(proj.id, profile, allowedIndustries)

        if (active) {
          setProject(proj)
          setDocuments(docs)
          setHasAccess(true)

          // Set sensible initial tab
          if (proj.projectType === 'dashboard' || proj.projectType === 'notebook' || proj.projectType === 'external_app' || proj.projectType === 'ai_app') {
            setActiveTab('application')
          } else if (proj.projectType === 'presentation') {
            setActiveTab('presentation')
          } else {
            setActiveTab('overview')
          }
        }
      } catch {
        if (active) {
          setProject(null)
          setHasAccess(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [profile, slug])

  // Determine applicable tabs for this project
  const applicableTabs = useMemo(() => {
    if (!project) return []

    const tabs: { key: ProjectSectionTab; label: string; icon: React.ReactNode; count?: number }[] = []

    // 1. Overview is always applicable
    tabs.push({
      key: 'overview',
      label: 'Overview',
      icon: <FileText className="h-4 w-4" />,
    })

    const isStaff = profile ? isStaffRole(profile.role) : false
    const config = isStaff ? project.publishedConfig || project.draftConfig : project.publishedConfig

    // 2. Application & Notebook tabs
    if (project.slug === 'sales-revenue') {
      // For sales-revenue project, surface both the interactive ML Prediction Application and the Research Notebook
      tabs.push({
        key: 'application',
        label: 'Predict Revenue',
        icon: <Sparkles className="h-4 w-4" />,
      })
      if (config?.notebook) {
        tabs.push({
          key: 'notebook',
          label: 'Research Notebook',
          icon: <BookOpen className="h-4 w-4" />,
        })
      }
    } else if (
      project.projectType === 'dashboard' ||
      project.projectType === 'notebook' ||
      project.projectType === 'external_app' ||
      project.projectType === 'ai_app' ||
      project.projectType === 'ml_playground' ||
      Boolean(config?.mlPlayground)
    ) {
      tabs.push({
        key: 'application',
        label:
          project.projectType === 'notebook'
            ? 'Research Notebook'
            : project.projectType === 'external_app'
            ? 'Application'
            : project.projectType === 'ai_app'
            ? 'AI Engine'
            : project.projectType === 'ml_playground' || config?.mlPlayground
            ? 'ML Playground'
            : 'Dashboard',
        icon:
          project.projectType === 'notebook' ? (
            <BookOpen className="h-4 w-4" />
          ) : project.projectType === 'external_app' ? (
            <Globe className="h-4 w-4" />
          ) : project.projectType === 'ai_app' ? (
            <Cpu className="h-4 w-4" />
          ) : project.projectType === 'ml_playground' || config?.mlPlayground ? (
            <Sparkles className="h-4 w-4" />
          ) : (
            <LayoutDashboard className="h-4 w-4" />
          ),
      })
    }

    // 3. Results tab (if deliverables, metrics, or showcase features exist)
    const hasResults =
      (config?.showcase?.metrics && config.showcase.metrics.length > 0) ||
      (config?.showcase?.keyFeatures && config.showcase.keyFeatures.length > 0) ||
      project.businessSolution
    if (hasResults) {
      tabs.push({
        key: 'results',
        label: 'Results & Impact',
        icon: <BarChart2 className="h-4 w-4" />,
      })
    }

    // 4. Presentation tab (if project is presentation type or has presentation docs)
    const presentationDocs = documents.filter((d) => d.documentType === 'presentation')
    if (project.projectType === 'presentation' || presentationDocs.length > 0) {
      tabs.push({
        key: 'presentation',
        label: 'Presentation',
        icon: <Presentation className="h-4 w-4" />,
        count: presentationDocs.length > 0 ? presentationDocs.length : undefined,
      })
    }

    // 5. Documentation tab (if documents or documentationLinks exist)
    const otherDocs = documents.filter((d) => d.documentType !== 'presentation')
    const hasDocs =
      documents.length > 0 ||
      (project.documentationLinks && project.documentationLinks.length > 0) ||
      Boolean(project.detailedOverview)

    if (hasDocs) {
      tabs.push({
        key: 'documentation',
        label: 'Documentation',
        icon: <FileCode className="h-4 w-4" />,
        count: documents.length > 0 ? documents.length : undefined,
      })
    }

    return tabs
  }, [project, profile, documents])

  if (project === undefined || hasAccess === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F766E]" />
      </div>
    )
  }

  if (!hasAccess || !project) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <EnterpriseEmpty
          title="Access Restricted"
          description="You do not have the required industry access permissions to view this enterprise solution. Contact an administrator to request access."
          action={
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0F766E] px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] transition-colors"
            >
              Back to Dashboard
            </Link>
          }
        />
      </div>
    )
  }

  const isStaff = profile ? isStaffRole(profile.role) : false
  const effectiveConfig =
    (isStaff ? project.publishedConfig || project.draftConfig : project.publishedConfig) || {
      projectType: project.projectType,
    }

  const presentationDocs = documents.filter((d) => d.documentType === 'presentation')

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Back button & Header Card */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Catalog
        </button>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1 text-xs font-bold text-[#0F766E]">
                  {project.industry}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {project.category}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-2xs font-semibold text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Verified Solution
                </span>
                {project.status !== 'published' && (
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-2xs font-bold text-amber-700 uppercase tracking-wider">
                    Staff Preview ({project.status})
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">{project.title}</h1>
              <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">{project.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`rounded-full border px-2.5 py-0.5 text-2xs font-bold ${
                      tagColors[tag] || 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Details Sidebar Card */}
            <div className="sm:w-72 shrink-0 rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4 text-xs space-y-2.5">
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-400 font-semibold">Published</span>
                <span className="font-bold text-slate-700">
                  {project.publishedAt ? new Date(project.publishedAt).toLocaleDateString() : 'Active'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-400 font-semibold">Type</span>
                <span className="font-bold capitalize text-slate-700">{project.projectType.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-400 font-semibold">Version</span>
                <span className="font-bold text-slate-700 font-mono">v{project.currentVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Tech Stack</span>
                <span className="font-bold text-slate-700 text-right">{project.tech.slice(0, 3).join(', ')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Tab Navigation Bar */}
      <div className="flex border-b border-slate-200/80 gap-2 overflow-x-auto pb-px">
        {applicableTabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-t-2xl border-t border-x transition-all shrink-0 ${
                isActive
                  ? 'border-slate-200 bg-white text-[#0F766E] border-b-transparent -mb-px shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.2 font-mono text-2xs text-slate-600">
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}

      {/* 1. Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-xs space-y-6">
            <h3 className="text-lg font-bold text-[#0F172A]">Executive Brief & Solution Overview</h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {project.detailedOverview || project.description}
            </p>

            {project.businessProblem && (
              <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Business Problem & Strategic Need
                </h4>
                <p className="text-xs text-slate-700">{project.businessProblem}</p>
              </div>
            )}

            {project.businessSolution && (
              <div className="rounded-2xl border border-teal-100 bg-[#ECFDF5]/50 p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F766E] mb-1">
                  Engineered Solution
                </h4>
                <p className="text-xs text-slate-700">{project.businessSolution}</p>
              </div>
            )}

            {project.targetAudience && (
              <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Target Audience & Stakeholders
                </h4>
                <p className="text-xs text-slate-700">{project.targetAudience}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Application Tab */}
      {activeTab === 'application' && (
        <div>
          {/* Sales Revenue Prediction Application */}
          {project.slug === 'sales-revenue' ? (
            <SalesRevenuePredictionApp />
          ) : (
            <>
              {/* Notebook Renderer */}
              {project.projectType === 'notebook' && (
                effectiveConfig.notebook ? (
                  <SafeNotebookRenderer config={effectiveConfig.notebook} title={project.title} />
                ) : (
                  <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                    No notebook file configured for this project.
                  </div>
                )
              )}

              {/* External App Viewer */}
              {project.projectType === 'external_app' && (
                effectiveConfig.externalApp ? (
                  <ExternalAppViewer
                    config={effectiveConfig.externalApp}
                    title={project.title}
                    description={project.description}
                  />
                ) : (
                  <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                    No external application URL configured.
                  </div>
                )
              )}

              {/* Dashboard Project Renderer (Power BI, PDF, Embed, or Visual Builder) */}
              {project.projectType === 'dashboard' && effectiveConfig.dashboard && (
                <DashboardViewer
                  config={effectiveConfig.dashboard}
                  datasetRows={datasetRows}
                  title={project.title}
                  description={project.description}
                  isStaff={isStaff}
                />
              )}

              {/* Registered AI Runner */}
              {project.projectType === 'ai_app' && (
                <RegisteredAiRunner
                  serviceId={effectiveConfig.aiApp?.serviceId || 'srv-sentiment-analysis'}
                  defaultInputs={effectiveConfig.aiApp?.defaultInputs}
                />
              )}

              {/* Presentation type as primary application */}
              {project.projectType === 'presentation' && (
                <DocumentViewer
                  documents={documents}
                  title={project.title}
                  isStaff={isStaff}
                />
              )}

              {/* ML Model Playground Renderer */}
              {(project.projectType === 'ml_playground' || effectiveConfig.mlPlayground) && (
                <MlModelPlaygroundView
                  config={effectiveConfig.mlPlayground || {
                    modelId: project.id,
                    modelSlug: project.slug,
                    modelName: project.title,
                    integrationType: 'trained_model',
                    modelType: 'regression',
                    framework: 'scikit-learn',
                    features: [],
                    featureDefinitions: [],
                    targetName: 'Target',
                    targetUnits: 'units',
                    dashboardTemplate: 'regression',
                    activeVersion: project.currentVersion || 1,
                  }}
                  projectTitle={project.title}
                  projectSlug={project.slug}
                  isStaff={isStaff}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* 2b. Dedicated Research Notebook Tab (for projects with both interactive app and notebook) */}
      {activeTab === 'notebook' && (
        <div>
          {effectiveConfig.notebook ? (
            <SafeNotebookRenderer config={effectiveConfig.notebook} title={project.title} />
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              No notebook file configured for this project.
            </div>
          )}
        </div>
      )}

      {/* 3. Results Tab */}
      {activeTab === 'results' && (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-xs space-y-6">
          <h3 className="text-lg font-bold text-[#0F172A]">Results, Deliverables & Key Metrics</h3>

          {effectiveConfig.showcase?.keyFeatures && effectiveConfig.showcase.keyFeatures.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Key Deliverables & Engineered Capabilities
              </h4>
              <ul className="list-disc list-inside space-y-2 text-xs text-slate-700 font-medium">
                {effectiveConfig.showcase.keyFeatures.map((feat, i) => (
                  <li key={i}>{feat}</li>
                ))}
              </ul>
            </div>
          )}

          {effectiveConfig.showcase?.metrics && effectiveConfig.showcase.metrics.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Strategic Impact & KPI Measurements
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {effectiveConfig.showcase.metrics.map((m, i) => (
                  <div key={i} className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4 text-center">
                    <span className="text-2xs text-slate-400 font-semibold">{m.label}</span>
                    <p className="text-2xl font-black text-[#0F766E] mt-1">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {project.businessSolution && !effectiveConfig.showcase?.keyFeatures && (
            <div className="rounded-2xl border border-teal-100 bg-[#ECFDF5]/50 p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F766E] mb-1">
                Solution Deliverable
              </h4>
              <p className="text-xs text-slate-700">{project.businessSolution}</p>
            </div>
          )}
        </div>
      )}

      {/* 4. Presentation Tab */}
      {activeTab === 'presentation' && (
        <DocumentViewer
          documents={presentationDocs.length > 0 ? presentationDocs : documents}
          title={`${project.title} — Presentation Deck & Artifacts`}
          isStaff={isStaff}
        />
      )}

      {/* 5. Documentation Tab */}
      {activeTab === 'documentation' && (
        <div className="space-y-6">
          <DocumentViewer
            documents={documents}
            title={`${project.title} — Supporting Documentation & Technical Reports`}
            isStaff={isStaff}
          />

          {project.documentationLinks && project.documentationLinks.length > 0 && (
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
              <h4 className="font-bold text-sm text-[#0F172A]">External References & Field Guides</h4>
              <div className="divide-y divide-slate-100">
                {project.documentationLinks.map((link, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3">
                    <span className="text-xs font-bold text-slate-700">{link.title}</span>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E] hover:underline"
                    >
                      Open Link <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
