import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip'
import {
  AddOverviewTabDialog,
  DeleteOverviewTabDialog,
  OverviewSectionEditor,
} from '@/components/project-content'
import { projectRegistry } from '@/config/projects'
import { useProjectOverview } from '@/hooks/useProjectOverview'
import type { CustomOverviewTab, OverviewSection } from '@/types/projectContent'
import { tagColors } from '@/utils/tagColors'

export interface ProjectDetailCardProject {
  title: string
  description: string
  date: string
  client: string
  industry: string
  function: string
  tech: string
  contact: string
  tags: string[]
  slug?: string
  viewRoute?: string
  secondaryLabel?: string
  secondaryHref?: string
}

export interface ProjectDetailCardProps {
  project: ProjectDetailCardProject
  actions?: ReactNode
  eyebrow?: string
}

function resolveSlug(project: ProjectDetailCardProject): string {
  if (project.slug) return project.slug
  if (project.viewRoute) {
    const matched = projectRegistry.find((p) => project.viewRoute?.startsWith(p.route))
    if (matched) return matched.slug
    const parts = project.viewRoute.split('/')
    if (parts[2]) {
      return parts[2].replace(/-detail$/, '')
    }
  }
  const byTitle = projectRegistry.find(
    (p) => p.title.toLowerCase() === project.title.toLowerCase()
  )
  if (byTitle) return byTitle.slug
  return project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function ProjectDetailCardSkeleton() {
  return (
    <section className="aa-surface rounded-[28px] bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] md:p-8 lg:p-10">
      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="aa-surface rounded-[24px] bg-white/95 p-6 shadow-sm md:p-8">
          <div className="h-3 w-28 animate-pulse rounded-full bg-[#CCFBF1]" />
          <div className="mt-4 h-8 w-3/4 animate-pulse rounded-xl bg-[#E2E8F0]" />
          <div className="mt-5 space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-[#E2E8F0]" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-[#E2E8F0]" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-[#E2E8F0]" />
          </div>
          <div className="mt-6 flex gap-3">
            <div className="h-12 w-40 animate-pulse rounded-2xl bg-[#E2E8F0]" />
            <div className="h-12 w-36 animate-pulse rounded-2xl bg-[#E2E8F0]" />
          </div>
        </article>

        <aside className="aa-surface rounded-[24px] bg-white/95 p-6 shadow-sm md:p-8">
          <div className="h-6 w-40 animate-pulse rounded bg-[#E2E8F0]" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC]" />
            ))}
          </div>
        </aside>
      </div>
    </section>
  )
}

export default function ProjectDetailCard({
  project,
  actions,
  eyebrow = 'Project overview',
}: ProjectDetailCardProps) {
  const navigate = useNavigate()
  const slug = resolveSlug(project)

  const {
    effectiveSections,
    customTabs,
    saveSection,
    resetSection,
    addCustomTab,
    updateCustomTab,
    deleteCustomTab,
  } = useProjectOverview({
    projectSlug: slug,
    defaultSections: [
      {
        id: 'purpose',
        projectSlug: slug,
        title: project.title,
        eyebrow,
        content: project.description,
      },
    ],
  })

  // Dialog states
  const [editingSection, setEditingSection] = useState<OverviewSection | null>(null)
  const [isAddTabOpen, setIsAddTabOpen] = useState(false)
  const [deletingTab, setDeletingTab] = useState<CustomOverviewTab | null>(null)
  const [selectedCustomTab, setSelectedCustomTab] = useState<CustomOverviewTab | null>(null)

  const purposeSection = effectiveSections.find((s) => s.id === 'purpose') || {
    id: 'purpose',
    projectSlug: slug,
    title: project.title,
    eyebrow,
    content: project.description,
    isOverridden: false,
  }

  const effectiveDescription = purposeSection.content || project.description
  const isOverridden = Boolean(purposeSection.isOverridden)

  const handleOpenEdit = () => {
    setEditingSection(purposeSection)
  }

  const handleSaveSection = async (
    sectionId: string,
    data: {
      title: string
      eyebrow?: string
      description?: string
      content?: string
      bullets?: string[]
    }
  ) => {
    await saveSection(sectionId, data)
    toast.success('Project overview updated successfully.')
  }

  const handleResetSection = async (sectionId: string) => {
    await resetSection(sectionId)
    toast.success('Project overview restored to default.')
  }

  const handleCreateCustomTab = async (data: {
    title: string
    eyebrow?: string
    description?: string
    content?: string
    bullets?: string[]
  }) => {
    const newTab = await addCustomTab(data)
    toast.success(`Custom tab "${newTab.title}" created.`)
    setSelectedCustomTab(newTab)
  }

  const handleConfirmDeleteTab = async () => {
    if (!deletingTab) return
    const title = deletingTab.title
    await deleteCustomTab(deletingTab.id)
    if (selectedCustomTab?.id === deletingTab.id) {
      setSelectedCustomTab(null)
    }
    setDeletingTab(null)
    toast.success(`Custom tab "${title}" removed.`)
  }

  const defaultActions = (
    <>
      {project.viewRoute ? (
        <button
          type="button"
          onClick={() => navigate(project.viewRoute!)}
          className="aa-button aa-button-primary md:px-8 md:py-3.5"
        >
          View Full Details
        </button>
      ) : null}

      {project.secondaryHref ? (
        <a
          href={project.secondaryHref}
          target="_blank"
          rel="noreferrer"
          className="aa-button aa-button-secondary md:px-8 md:py-3.5"
        >
          {project.secondaryLabel ?? 'Open Demo'}
        </a>
      ) : null}
    </>
  )

  return (
    <>
      <section className="aa-surface rounded-[28px] bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] md:p-8 lg:p-10">
        {/* ── Top Eyebrow & Title Row with Edit & Add Tab ── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">
                {purposeSection.eyebrow || eyebrow}
              </p>
              {isOverridden && (
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-[10px] font-semibold text-amber-700"
                >
                  Customized
                </Badge>
              )}
            </div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A] md:text-4xl">
              {purposeSection.title || project.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#CCFBF1] bg-[#ECFDF5] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0F766E]">
              Live project
            </span>

            {/* Edit button with Tooltip */}
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenEdit}
                    className="gap-1.5 rounded-full border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] hover:border-[#0F766E] hover:text-[#0F172A]"
                    aria-label="Edit section"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Edit section</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Add Custom Tab button */}
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddTabOpen(true)}
                    className="gap-1.5 rounded-full border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F766E] hover:border-[#0F766E] hover:bg-[#F0FDFA]"
                    aria-label="Add new overview tab"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add Tab</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Create a custom tab for this project</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* ── Custom Tabs Navigation if any exist ── */}
        {customTabs.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
            <button
              type="button"
              onClick={() => setSelectedCustomTab(null)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                selectedCustomTab === null
                  ? 'bg-[#0F766E] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Main Overview
            </button>
            {customTabs.map((ct) => (
              <div key={ct.id} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedCustomTab(ct)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    selectedCustomTab?.id === ct.id
                      ? 'bg-[#0F766E] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {ct.title}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeletingTab(ct)}
                  className="h-6 w-6 rounded-full text-slate-400 hover:text-red-600"
                  aria-label="Delete tab"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* ── Custom Tab Content if selected ── */}
        {selectedCustomTab ? (
          <div className="rounded-[24px] bg-white/95 p-6 shadow-sm md:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xl font-bold text-[#0F172A]">{selectedCustomTab.title}</h3>
              <Badge variant="outline" className="border-teal-200 bg-teal-50 text-[10px] font-semibold text-[#0F766E]">
                Custom Tab
              </Badge>
            </div>
            {selectedCustomTab.description && (
              <p className="text-sm text-slate-600">{selectedCustomTab.description}</p>
            )}
            {selectedCustomTab.content && (
              <div className="whitespace-pre-line text-sm text-[#334155] leading-relaxed">
                {selectedCustomTab.content}
              </div>
            )}
            {selectedCustomTab.bullets && selectedCustomTab.bullets.length > 0 && (
              <ul className="space-y-2 pt-2">
                {selectedCustomTab.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#0F766E] shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          /* ── Main Overview Grid ── */
          <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
            <article className="aa-surface rounded-[24px] bg-white/95 p-6 shadow-sm md:p-8">
              <p className="mb-4 text-[14px] leading-6 text-[#475569] whitespace-pre-line">
                {effectiveDescription}
              </p>

              {purposeSection.bullets && purposeSection.bullets.length > 0 && (
                <ul className="mb-6 space-y-2.5">
                  {purposeSection.bullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#0F766E] shrink-0" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {actions ?? defaultActions}
              </div>
            </article>

            <aside className="aa-surface rounded-[24px] bg-white/95 p-6 shadow-sm md:p-8">
              <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
                <h3 className="text-xl font-semibold text-[#0F172A]">Solution Details</h3>
                <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0F766E]">
                  Live
                </span>
              </div>

              <dl className="mt-5 space-y-4">
                {[
                  ['Updated', project.date],
                  ['Industry', project.industry],
                  ['Function', project.function],
                  ['Tech', project.tech],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="grid gap-1 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 md:grid-cols-[110px_1fr] md:gap-4"
                  >
                    <dt className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                      {label}
                    </dt>
                    <dd className="text-[15px] font-semibold text-[#0F172A]">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 border-t border-[#E2E8F0] pt-6">
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#475569]">
                  Tags
                </h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                        tagColors[tag] || 'border-[#CBD5E1] bg-[#F1F5F9] text-[#334155]'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>

      {/* ── Dialogs ── */}
      <OverviewSectionEditor
        open={Boolean(editingSection)}
        section={editingSection}
        onOpenChange={(open) => {
          if (!open) setEditingSection(null)
        }}
        onSave={handleSaveSection}
        onReset={handleResetSection}
      />

      <AddOverviewTabDialog
        open={isAddTabOpen}
        projectTitle={project.title}
        targetType="tab"
        onOpenChange={setIsAddTabOpen}
        onCreate={handleCreateCustomTab}
      />

      <DeleteOverviewTabDialog
        open={Boolean(deletingTab)}
        title={deletingTab?.title || ''}
        itemType="tab"
        onOpenChange={(open) => {
          if (!open) setDeletingTab(null)
        }}
        onConfirm={handleConfirmDeleteTab}
      />
    </>
  )
}
