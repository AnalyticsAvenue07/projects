import { useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { AddOverviewTabDialog } from './AddOverviewTabDialog'
import { CustomTabContentView } from './CustomTabContentView'
import { DeleteOverviewTabDialog } from './DeleteOverviewTabDialog'
import { EditableOverviewSection } from './EditableOverviewSection'
import { OverviewSectionEditor } from './OverviewSectionEditor'
import { OverviewTabNavigation } from './OverviewTabNavigation'
import { useProjectOverview } from '@/hooks/useProjectOverview'
import type {
  CustomOverviewTab,
  OverviewSection,
  ProjectTabItem,
} from '@/types/projectContent'

export interface ProjectOverviewManagerProps {
  projectSlug: string
  projectTitle?: string
  systemTabs?: readonly ProjectTabItem[]
  defaultSections?: OverviewSection[]
  initialActiveTab?: string
  activeTab?: string
  onTabChange?: (tab: string) => void
  renderOverviewContent?: (
    sections: OverviewSection[],
    onEdit: (section: OverviewSection) => void,
    onDelete: (section: OverviewSection) => void
  ) => ReactNode
  renderCustomTab?: (
    tab: CustomOverviewTab,
    onEdit: (tab: CustomOverviewTab) => void,
    onDelete: (tab: CustomOverviewTab) => void
  ) => ReactNode
  children?: ReactNode
}

export function ProjectOverviewManager({
  projectSlug,
  projectTitle,
  systemTabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'application', label: 'Application' },
  ],
  defaultSections,
  initialActiveTab = 'overview',
  activeTab: controlledActiveTab,
  onTabChange: controlledOnTabChange,
  renderOverviewContent,
  renderCustomTab,
  children,
}: ProjectOverviewManagerProps) {
  const {
    activeTab: internalActiveTab,
    setActiveTab: setInternalActiveTab,
    allTabs,
    effectiveSections,
    isCustomTabActive,
    currentCustomTab,
    saveSection,
    resetSection,
    addCustomTab,
    updateCustomTab,
    deleteCustomTab,
    addCustomSection,
    deleteCustomSection,
  } = useProjectOverview({
    projectSlug,
    systemTabs,
    defaultSections,
    initialActiveTab,
  })

  const currentTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab
  const handleTabChange = (key: string) => {
    if (controlledOnTabChange) {
      controlledOnTabChange(key)
    }
    setInternalActiveTab(key)
  }

  // Dialog states
  const [editingSection, setEditingSection] = useState<OverviewSection | null>(null)
  const [isAddTabOpen, setIsAddTabOpen] = useState(false)
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false)
  const [deletingTab, setDeletingTab] = useState<CustomOverviewTab | null>(null)
  const [deletingSection, setDeletingSection] = useState<OverviewSection | null>(null)

  // Save handler for section editor
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
    toast.success('Section updated successfully.')
  }

  // Reset handler for system section
  const handleResetSection = async (sectionId: string) => {
    await resetSection(sectionId)
    toast.success('Section restored to default.')
  }

  // Create custom tab
  const handleCreateCustomTab = async (data: {
    title: string
    eyebrow?: string
    description?: string
    content?: string
    bullets?: string[]
  }) => {
    const newTab = await addCustomTab(data)
    toast.success(`Custom tab "${newTab.title}" created.`)
    handleTabChange(newTab.id)
  }

  // Create custom section
  const handleCreateCustomSection = async (data: {
    title: string
    eyebrow?: string
    description?: string
    content?: string
    bullets?: string[]
  }) => {
    await addCustomSection(data)
    toast.success('New section added to overview.')
  }

  // Edit custom tab
  const handleEditCustomTab = (tab: CustomOverviewTab) => {
    setEditingSection({
      id: tab.id,
      projectSlug,
      title: tab.title,
      eyebrow: tab.eyebrow,
      description: tab.description,
      content: tab.content,
      bullets: tab.bullets,
      metadata: tab.metadata,
      isCustom: true,
      sortOrder: tab.sortOrder,
    })
  }

  // Save edit for custom tab
  const handleSaveCustomTabFromEditor = async (
    sectionId: string,
    data: {
      title: string
      eyebrow?: string
      description?: string
      content?: string
      bullets?: string[]
    }
  ) => {
    const isCustomTab = allTabs.some((t) => t.key === sectionId && t.isCustom)
    if (isCustomTab) {
      await updateCustomTab(sectionId, data)
      toast.success('Custom tab updated successfully.')
    } else {
      await handleSaveSection(sectionId, data)
    }
  }

  // Confirm delete custom tab
  const handleConfirmDeleteTab = async () => {
    if (!deletingTab) return
    const title = deletingTab.title
    await deleteCustomTab(deletingTab.id)
    setDeletingTab(null)
    toast.success(`Tab "${title}" deleted successfully.`)
  }

  // Confirm delete custom section
  const handleConfirmDeleteSection = async () => {
    if (!deletingSection) return
    await deleteCustomSection(deletingSection.id)
    setDeletingSection(null)
    toast.success('Section deleted successfully.')
  }

  return (
    <div>
      {/* ── Tab Navigation Bar ── */}
      <OverviewTabNavigation
        tabs={allTabs}
        activeTab={currentTab}
        onTabChange={handleTabChange}
        onAddTabClick={() => setIsAddTabOpen(true)}
      />

      {/* ── Custom Tab Active View ── */}
      {isCustomTabActive && currentCustomTab && (
        renderCustomTab ? (
          renderCustomTab(currentCustomTab, handleEditCustomTab, setDeletingTab)
        ) : (
          <CustomTabContentView
            tab={currentCustomTab}
            onEdit={handleEditCustomTab}
            onDelete={setDeletingTab}
          />
        )
      )}

      {/* ── Overview Tab View ── */}
      {currentTab === 'overview' && (
        renderOverviewContent ? (
          renderOverviewContent(effectiveSections, setEditingSection, setDeletingSection)
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {effectiveSections.map((sec) => (
                <EditableOverviewSection
                  key={sec.id}
                  section={sec}
                  onEdit={setEditingSection}
                  onDelete={sec.isCustom ? setDeletingSection : undefined}
                />
              ))}
            </div>

            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddSectionOpen(true)}
                className="gap-2 rounded-2xl border-dashed border-[#CBD5E1] bg-white px-5 py-3 text-sm font-semibold text-[#0F766E] hover:border-[#0F766E] hover:bg-[#F0FDFA]"
              >
                <Plus className="h-4 w-4" />
                Add New Section to Overview
              </Button>
            </div>
          </div>
        )
      )}

      {/* ── System / Other Tabs Content (e.g. Application Tab) ── */}
      {currentTab !== 'overview' && !isCustomTabActive && children}

      {/* ── Dialogs ── */}
      <OverviewSectionEditor
        open={Boolean(editingSection)}
        section={editingSection}
        onOpenChange={(open) => {
          if (!open) setEditingSection(null)
        }}
        onSave={handleSaveCustomTabFromEditor}
        onReset={handleResetSection}
      />

      <AddOverviewTabDialog
        open={isAddTabOpen}
        projectTitle={projectTitle}
        targetType="tab"
        onOpenChange={setIsAddTabOpen}
        onCreate={handleCreateCustomTab}
      />

      <AddOverviewTabDialog
        open={isAddSectionOpen}
        projectTitle={projectTitle}
        targetType="section"
        onOpenChange={setIsAddSectionOpen}
        onCreate={handleCreateCustomSection}
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

      <DeleteOverviewTabDialog
        open={Boolean(deletingSection)}
        title={deletingSection?.title || ''}
        itemType="section"
        onOpenChange={(open) => {
          if (!open) setDeletingSection(null)
        }}
        onConfirm={handleConfirmDeleteSection}
      />
    </div>
  )
}
