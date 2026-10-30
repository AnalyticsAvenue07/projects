import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, CheckCircle2, Edit3, Eye, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { isStaffRole } from '@/types/domain'
import { ProjectManagementService } from '@/services/projectManagementService'
import type { ProjectCatalogItem } from '@/types/projectManagement'
import { GenericDashboardRenderer } from '@/components/dashboard-renderer/GenericDashboardRenderer'
import { DashboardViewer } from '@/components/dashboard-viewer/DashboardViewer'
import { RegisteredAiRunner } from '@/components/ai-app/RegisteredAiRunner'
import { SafeNotebookRenderer } from '@/components/notebook-viewer/SafeNotebookRenderer'
import { ExternalAppViewer } from '@/components/external-app/ExternalAppViewer'
import { DocumentViewer } from '@/components/document-viewer/DocumentViewer'
import { getTemplateById } from '@/services/projectTemplateService'
import { ProjectDatasetService } from '@/services/projectDatasetService'
import { MlModelPlaygroundView } from '@/components/ml-playground/MlModelPlaygroundView'

export function ProjectPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const isStaff = profile && isStaffRole(profile.role)

  const [project, setProject] = useState<ProjectCatalogItem | null>(null)
  const [datasetRows, setDatasetRows] = useState<Record<string, any>[]>([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    if (!id) return
    ProjectManagementService.getProjectById(id)
      .then(async (p) => {
        setProject(p)
        if (p?.projectType === 'dashboard') {
          const dash = (p.draftConfig || p.publishedConfig)?.dashboard
          if (dash?.datasetId) {
            try {
              const ds = await ProjectDatasetService.getDatasetById(dash.datasetId)
              const rows = ds?.dataJson || ds?.sampleRows || []
              if (rows.length > 0) {
                setDatasetRows(rows)
                return
              }
            } catch {
              // fallback
            }
          }
          const tpl = p.templateId ? getTemplateById(p.templateId) : null
          setDatasetRows(tpl?.sampleData || [])
        }
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const handlePublish = async () => {
    if (!profile || !project) return
    setPublishing(true)
    try {
      await ProjectManagementService.publishProject(project.id, profile)
      toast.success(`Project "${project.title}" published successfully!`)
      navigate('/admin/project-management')
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish.')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F766E]" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Project not found.</p>
        <Link to="/admin/project-management" className="text-xs font-bold text-[#0F766E] underline mt-2 block">
          Return to Project Management
        </Link>
      </div>
    )
  }

  const effectiveConfig = project.draftConfig || project.publishedConfig || { projectType: project.projectType }
  const tpl = project.templateId ? getTemplateById(project.templateId) : null
  const sampleData = tpl?.sampleData || []

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <Link
            to="/admin/project-management"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Project Catalog
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-2xs font-bold text-amber-700 uppercase tracking-wider">
              Staff Draft Preview
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-2xs font-semibold text-slate-700">
              {project.industry}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-[#0F172A] tracking-tight">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{project.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/admin/project-management/${project.id}/edit`}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
          >
            <Edit3 className="h-4 w-4" /> Edit Project
          </Link>
          {project.status !== 'published' && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0F766E] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] disabled:opacity-50 transition-all"
            >
              <Send className="h-4 w-4" />
              {publishing ? 'Publishing...' : 'Publish Project'}
            </button>
          )}
        </div>
      </div>

      {/* Render Component Body */}
      {project.projectType === 'notebook' && effectiveConfig.notebook && (
        <SafeNotebookRenderer config={effectiveConfig.notebook} title={project.title} />
      )}

      {project.projectType === 'external_app' && effectiveConfig.externalApp && (
        <ExternalAppViewer
          config={effectiveConfig.externalApp}
          title={project.title}
          description={project.description}
        />
      )}

      {project.projectType === 'presentation' && (
        <DocumentViewer
          documents={effectiveConfig.documents || []}
          title={project.title}
          isStaff={true}
        />
      )}

      {project.projectType === 'dashboard' && effectiveConfig.dashboard && (
        <DashboardViewer
          config={effectiveConfig.dashboard}
          datasetRows={datasetRows}
          title={project.title}
          description={project.description}
          isStaff={true}
        />
      )}

      {project.projectType === 'ai_app' && (
        <RegisteredAiRunner
          serviceId={effectiveConfig.aiApp?.serviceId || 'srv-sentiment-analysis'}
          defaultInputs={effectiveConfig.aiApp?.defaultInputs}
        />
      )}

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
          isStaff={true}
        />
      )}

      {project.projectType === 'showcase' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-[#0F172A]">Executive Overview</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {project.detailedOverview || project.description}
          </p>

          {effectiveConfig.showcase?.keyFeatures && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Key Capabilities
              </h4>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-700 font-medium">
                {effectiveConfig.showcase.keyFeatures.map((feat, i) => (
                  <li key={i}>{feat}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
