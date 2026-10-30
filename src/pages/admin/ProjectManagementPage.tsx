import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  AlertTriangle,
  Archive,
  ArrowUpRight,
  BarChart2,
  BookOpen,
  CheckCircle2,
  Copy,
  Cpu,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  Globe,
  History,
  Layers,
  MoreVertical,
  Plus,
  Presentation,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { isStaffRole } from '@/types/domain'
import { ProjectManagementService } from '@/services/projectManagementService'
import type {
  ProjectAuditEvent,
  ProjectCatalogItem,
  ProjectVersion,
  PublicationStatus,
} from '@/types/projectManagement'
import { SUPPORTED_INDUSTRIES } from '@/types/projectManagement'

const STATUS_BADGES: Record<PublicationStatus, { label: string; class: string }> = {
  draft: { label: 'Draft', class: 'bg-slate-100 text-slate-700 border-slate-200' },
  validation_failed: { label: 'Validation Failed', class: 'bg-rose-50 text-rose-700 border-rose-200' },
  ready_for_review: { label: 'Ready for Review', class: 'bg-blue-50 text-blue-700 border-blue-200' },
  published: { label: 'Published', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  unpublished: { label: 'Unpublished', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  archived: { label: 'Archived', class: 'bg-slate-100 text-slate-400 border-slate-200 line-through' },
}

export function ProjectManagementPage() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const isStaff = profile && isStaffRole(profile.role)

  const [projects, setProjects] = useState<ProjectCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [industryFilter, setIndustryFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals & Dialogs
  const [historyModalProject, setHistoryModalProject] = useState<ProjectCatalogItem | null>(null)
  const [versions, setVersions] = useState<ProjectVersion[]>([])
  const [auditEvents, setAuditEvents] = useState<ProjectAuditEvent[]>([])
  const [duplicateTarget, setDuplicateTarget] = useState<ProjectCatalogItem | null>(null)
  const [duplicateTitle, setDuplicateTitle] = useState('')
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const data = await ProjectManagementService.fetchProjects()
      setProjects(data)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load project catalog.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  // Filtered list
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (industryFilter !== 'all' && p.industry !== industryFilter) return false
      if (typeFilter !== 'all' && p.projectType !== typeFilter) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const matches =
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.industry.toLowerCase().includes(q)
        if (!matches) return false
      }
      return true
    })
  }, [projects, industryFilter, typeFilter, statusFilter, search])

  // Summary counts
  const stats = useMemo(() => {
    const total = projects.length
    const published = projects.filter((p) => p.status === 'published').length
    const drafts = projects.filter((p) => p.status === 'draft').length
    const archived = projects.filter((p) => p.status === 'archived').length
    return { total, published, drafts, archived }
  }, [projects])

  // Publishing & lifecycle actions
  const handlePublish = async (project: ProjectCatalogItem) => {
    if (!profile) return
    setActionInProgress(project.id)
    try {
      await ProjectManagementService.publishProject(project.id, profile)
      toast.success(`Project "${project.title}" published successfully!`)
      await loadProjects()
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish project.')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleUnpublish = async (project: ProjectCatalogItem) => {
    if (!profile) return
    if (!window.confirm(`Unpublish project "${project.title}"? Clients will no longer see it.`)) return
    setActionInProgress(project.id)
    try {
      await ProjectManagementService.unpublishProject(project.id, profile)
      toast.success(`Project "${project.title}" unpublished.`)
      await loadProjects()
    } catch (err: any) {
      toast.error(err.message || 'Failed to unpublish.')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleArchive = async (project: ProjectCatalogItem) => {
    if (!profile) return
    if (!window.confirm(`Archive project "${project.title}"?`)) return
    setActionInProgress(project.id)
    try {
      await ProjectManagementService.archiveProject(project.id, profile)
      toast.success(`Project "${project.title}" archived.`)
      await loadProjects()
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive.')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleRestore = async (project: ProjectCatalogItem) => {
    if (!profile) return
    setActionInProgress(project.id)
    try {
      await ProjectManagementService.restoreProject(project.id, profile)
      toast.success(`Project "${project.title}" restored to Draft.`)
      await loadProjects()
    } catch (err: any) {
      toast.error(err.message || 'Failed to restore.')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleDuplicate = async () => {
    if (!profile || !duplicateTarget || !duplicateTitle.trim()) return
    setActionInProgress('duplicate')
    try {
      const duplicated = await ProjectManagementService.duplicateProject(
        duplicateTarget.id,
        duplicateTitle.trim(),
        profile
      )
      toast.success(`Duplicated into new draft "${duplicated.title}".`)
      setDuplicateTarget(null)
      setDuplicateTitle('')
      await loadProjects()
      navigate(`/admin/project-management/${duplicated.id}/edit`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to duplicate project.')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleOpenHistory = async (project: ProjectCatalogItem) => {
    setHistoryModalProject(project)
    try {
      const [vList, aList] = await Promise.all([
        ProjectManagementService.getProjectVersions(project.id),
        ProjectManagementService.getProjectAuditEvents(project.id),
      ])
      setVersions(vList)
      setAuditEvents(aList)
    } catch (e) {
      console.error(e)
    }
  }

  const handleRollback = async (versionNumber: number) => {
    if (!profile || !historyModalProject) return
    if (!window.confirm(`Roll back project to Version ${versionNumber}?`)) return
    try {
      await ProjectManagementService.rollbackVersion(historyModalProject.id, versionNumber, profile)
      toast.success(`Rolled back to v${versionNumber}.`)
      setHistoryModalProject(null)
      await loadProjects()
    } catch (err: any) {
      toast.error(err.message || 'Failed to rollback.')
    }
  }

  if (!isStaff) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-white p-12 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-rose-500" />
        <h3 className="mt-4 text-lg font-bold text-slate-800">Access Restricted</h3>
        <p className="mt-2 text-sm text-slate-500">
          Only authorized enterprise administrators can access the Project Publishing Center.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F766E]">
            <Layers className="h-4 w-4" />
            Enterprise Innovation Hub
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0F172A]">
            Project Publishing Center
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Publish, configure, preview, and govern no-code showcases, analytics dashboards, and AI applications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadProjects}
            className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-2xs hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/admin/project-management/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#0F766E] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#0D655E] transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Project
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Projects</span>
          <p className="mt-1 text-2xl font-black text-[#0F172A]">{stats.total}</p>
          <span className="text-2xs text-slate-400">In dynamic catalog</span>
        </div>
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Published</span>
          <p className="mt-1 text-2xl font-black text-emerald-700">{stats.published}</p>
          <span className="text-2xs text-slate-400">Live in user portals</span>
        </div>
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Drafts</span>
          <p className="mt-1 text-2xl font-black text-slate-700">{stats.drafts}</p>
          <span className="text-2xs text-slate-400">In-progress configs</span>
        </div>
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Archived</span>
          <p className="mt-1 text-2xl font-black text-slate-400">{stats.archived}</p>
          <span className="text-2xs text-slate-400">Inactive versions</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, slug, tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
            />
          </div>

          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#0F766E] focus:outline-none"
          >
            <option value="all">All Industries ({SUPPORTED_INDUSTRIES.length})</option>
            {SUPPORTED_INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#0F766E] focus:outline-none"
          >
            <option value="all">All Project Types</option>
            <option value="dashboard">Configurable Dashboard</option>
            <option value="notebook">Research Notebook (.ipynb)</option>
            <option value="presentation">Presentation & Documentation</option>
            <option value="external_app">Hosted Web App / Dashboard URL</option>
            <option value="ai_app">Registered AI/ML App</option>
            <option value="showcase">Project Showcase</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#0F766E] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="unpublished">Unpublished</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Projects Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-[#F8FAFC] text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Project & Slug</th>
                <th className="px-5 py-3.5">Industry</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Version</th>
                <th className="px-5 py-3.5">Last Updated</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <Layers className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    No projects match the current search or filters.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => {
                  const statusCfg = STATUS_BADGES[p.status] || STATUS_BADGES.draft
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#0F172A] text-sm leading-tight">{p.title}</span>
                          <span className="font-mono text-2xs text-slate-400 mt-0.5">/{p.slug}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-2xs font-semibold text-slate-700">
                          {p.industry}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                          {p.projectType === 'dashboard' ? (
                            <BarChart2 className="h-3.5 w-3.5 text-[#0F766E]" />
                          ) : p.projectType === 'notebook' ? (
                            <BookOpen className="h-3.5 w-3.5 text-purple-600" />
                          ) : p.projectType === 'presentation' ? (
                            <Presentation className="h-3.5 w-3.5 text-amber-600" />
                          ) : p.projectType === 'external_app' ? (
                            <Globe className="h-3.5 w-3.5 text-teal-600" />
                          ) : p.projectType === 'ai_app' ? (
                            <Cpu className="h-3.5 w-3.5 text-indigo-600" />
                          ) : (
                            <FileText className="h-3.5 w-3.5 text-blue-600" />
                          )}
                          <span className="capitalize">{p.projectType.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-2xs font-bold ${statusCfg.class}`}
                        >
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono font-semibold text-slate-600">
                        v{p.currentVersion}
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-2xs">
                        {new Date(p.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Preview Link */}
                          <Link
                            to={`/admin/project-management/${p.id}/preview`}
                            className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Preview Draft"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          {/* Edit Wizard */}
                          <Link
                            to={`/admin/project-management/${p.id}/edit`}
                            className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Edit Project"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Link>

                          {/* Version History */}
                          <button
                            type="button"
                            onClick={() => void handleOpenHistory(p)}
                            className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Version History & Rollback"
                          >
                            <History className="h-4 w-4" />
                          </button>

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => {
                              setDuplicateTarget(p)
                              setDuplicateTitle(`${p.title} (Copy)`)
                            }}
                            className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Duplicate Project"
                          >
                            <Copy className="h-4 w-4" />
                          </button>

                          {/* Publish / Unpublish */}
                          {p.status === 'published' ? (
                            <button
                              type="button"
                              onClick={() => void handleUnpublish(p)}
                              disabled={actionInProgress === p.id}
                              className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-2xs font-bold text-amber-700 hover:bg-amber-100 transition-colors"
                            >
                              Unpublish
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handlePublish(p)}
                              disabled={actionInProgress === p.id || p.status === 'archived'}
                              className="rounded-xl bg-[#0F766E] px-2.5 py-1 text-2xs font-bold text-white hover:bg-[#0D655E] disabled:opacity-50 transition-colors"
                            >
                              Publish
                            </button>
                          )}

                          {/* Archive / Restore */}
                          {p.status === 'archived' ? (
                            <button
                              type="button"
                              onClick={() => void handleRestore(p)}
                              className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100"
                              title="Restore to Draft"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleArchive(p)}
                              className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Archive Project"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Duplicate Modal */}
      {duplicateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#0F172A]">Duplicate Project</h3>
            <p className="text-xs text-slate-500">
              Create a cloned draft of "{duplicateTarget.title}". You can configure it independently.
            </p>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">New Project Title</label>
              <input
                type="text"
                value={duplicateTitle}
                onChange={(e) => setDuplicateTitle(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-3.5 py-2 text-xs font-semibold focus:border-[#0F766E] focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDuplicateTarget(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={actionInProgress === 'duplicate'}
                className="rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-bold text-white hover:bg-[#0D655E]"
              >
                Create Clone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {historyModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  Version History & Audit: {historyModalProject.title}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">/{historyModalProject.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalProject(null)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-800"
              >
                Close ✕
              </button>
            </div>

            {/* Versions List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Immutable Published Snapshots ({versions.length})
              </h4>
              {versions.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No published versions yet.</p>
              ) : (
                versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0F172A]">Version {ver.versionNumber}</span>
                        {ver.versionNumber === historyModalProject.currentVersion && (
                          <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-2xs font-bold">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-2xs text-slate-500 mt-0.5">
                        {ver.changelog || 'Snapshot release'} • {new Date(ver.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {ver.versionNumber !== historyModalProject.currentVersion && (
                      <button
                        type="button"
                        onClick={() => void handleRollback(ver.versionNumber)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1 font-bold text-slate-700 hover:bg-slate-100"
                      >
                        Rollback
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Audit Log */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Audit Trail ({auditEvents.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {auditEvents.map((ev) => (
                  <div key={ev.id} className="text-2xs text-slate-600 flex items-center justify-between py-1 border-b border-slate-50">
                    <div>
                      <span className="font-bold uppercase tracking-wider text-[#0F766E]">{ev.action}</span>
                      <span className="text-slate-400 ml-2">by {ev.actorEmail}</span>
                    </div>
                    <span className="text-slate-400">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
