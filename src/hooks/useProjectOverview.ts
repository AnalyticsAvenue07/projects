import { useCallback, useEffect, useMemo, useState } from 'react'
import { getDefaultSectionsForProject } from '@/config/defaultProjectOverviews'
import { projectContentService } from '@/services/projectContentStorage'
import type {
  CustomOverviewTab,
  OverviewSection,
  OverviewSectionOverride,
  ProjectOverviewStorageRecord,
  ProjectTabItem,
} from '@/types/projectContent'

export interface UseProjectOverviewOptions {
  projectSlug: string
  systemTabs?: readonly ProjectTabItem[]
  defaultSections?: OverviewSection[]
  initialActiveTab?: string
}

export function useProjectOverview({
  projectSlug,
  systemTabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'application', label: 'Application' },
  ],
  defaultSections: propDefaultSections,
  initialActiveTab = 'overview',
}: UseProjectOverviewOptions) {
  const [activeTab, setActiveTab] = useState<string>(initialActiveTab)
  const [storageData, setStorageData] = useState<ProjectOverviewStorageRecord>(() => ({
    version: 1,
    projectSlug,
    updatedAt: new Date().toISOString(),
    sectionOverrides: {},
    customTabs: [],
    customSections: [],
  }))
  const [loading, setLoading] = useState(true)

  // Reload data from storage
  const reloadData = useCallback(() => {
    projectContentService.getProjectOverview(projectSlug).then((record) => {
      setStorageData(record)
      setLoading(false)
    })
  }, [projectSlug])

  useEffect(() => {
    reloadData()
    // Subscribe to cross-window or inter-component changes
    const unsubscribe = projectContentService.subscribe(projectSlug, reloadData)
    return () => {
      unsubscribe()
    }
  }, [projectSlug, reloadData])

  // Base system sections
  const baseDefaults = useMemo(() => {
    if (propDefaultSections && propDefaultSections.length > 0) {
      return propDefaultSections.map((s, idx) => ({
        ...s,
        projectSlug,
        sortOrder: s.sortOrder ?? idx,
        isCustom: false,
      }))
    }
    return getDefaultSectionsForProject(projectSlug)
  }, [projectSlug, propDefaultSections])

  // Effective sections: base defaults + user overrides + user custom sections
  const effectiveSections = useMemo((): OverviewSection[] => {
    const sections: OverviewSection[] = baseDefaults.map((base) => {
      const override: OverviewSectionOverride | undefined = storageData.sectionOverrides[base.id]
      if (override) {
        return {
          ...base,
          title: override.title !== undefined ? override.title : base.title,
          eyebrow: override.eyebrow !== undefined ? override.eyebrow : base.eyebrow,
          description: override.description !== undefined ? override.description : base.description,
          content: override.content !== undefined ? override.content : base.content,
          bullets: override.bullets !== undefined ? override.bullets : base.bullets,
          metadata: override.metadata !== undefined ? override.metadata : base.metadata,
          updatedAt: override.updatedAt,
          isOverridden: true,
        }
      }
      return {
        ...base,
        isOverridden: false,
      }
    })

    // Custom sections appended to overview
    if (storageData.customSections && storageData.customSections.length > 0) {
      storageData.customSections.forEach((cs) => {
        sections.push({
          id: cs.id,
          projectSlug,
          title: cs.title,
          eyebrow: cs.eyebrow,
          description: cs.description,
          content: cs.content,
          bullets: cs.bullets,
          metadata: cs.metadata,
          isCustom: true,
          sortOrder: cs.sortOrder,
          createdAt: cs.createdAt,
          updatedAt: cs.updatedAt,
          isOverridden: false,
        })
      })
    }

    return sections
  }, [baseDefaults, projectSlug, storageData.customSections, storageData.sectionOverrides])

  // Custom tabs
  const customTabs = useMemo(() => {
    return storageData.customTabs ?? []
  }, [storageData.customTabs])

  // All navigation tabs combined
  const allTabs = useMemo((): ProjectTabItem[] => {
    const list: ProjectTabItem[] = [...systemTabs]
    customTabs.forEach((ct) => {
      list.push({
        key: ct.id,
        label: ct.title,
        isCustom: true,
      })
    })
    return list
  }, [systemTabs, customTabs])

  // Check if current tab is a custom tab
  const currentCustomTab = useMemo(() => {
    return customTabs.find((t) => t.id === activeTab)
  }, [customTabs, activeTab])

  const isCustomTabActive = Boolean(currentCustomTab)

  // Ensure active tab is valid (fallback to first tab if deleted)
  useEffect(() => {
    const exists = allTabs.some((t) => t.key === activeTab)
    if (!exists && allTabs.length > 0) {
      setActiveTab(allTabs[0].key)
    }
  }, [allTabs, activeTab])

  // Save section (override or custom section)
  const saveSection = useCallback(
    async (
      sectionId: string,
      data: {
        title: string
        eyebrow?: string
        description?: string
        content?: string
        bullets?: string[]
      }
    ) => {
      const isCustomSec = (storageData.customSections ?? []).some((s) => s.id === sectionId)
      if (isCustomSec) {
        await projectContentService.updateCustomSection(projectSlug, sectionId, data)
      } else {
        await projectContentService.saveSectionOverride(projectSlug, sectionId, data)
      }
      reloadData()
    },
    [projectSlug, reloadData, storageData.customSections]
  )

  // Reset system section override
  const resetSection = useCallback(
    async (sectionId: string) => {
      await projectContentService.resetSectionOverride(projectSlug, sectionId)
      reloadData()
    },
    [projectSlug, reloadData]
  )

  // Add custom tab
  const addCustomTab = useCallback(
    async (data: {
      title: string
      eyebrow?: string
      description?: string
      content?: string
      bullets?: string[]
    }) => {
      const newTab = await projectContentService.addCustomTab(projectSlug, data)
      reloadData()
      setActiveTab(newTab.id)
      return newTab
    },
    [projectSlug, reloadData]
  )

  // Update custom tab
  const updateCustomTab = useCallback(
    async (
      tabId: string,
      data: {
        title: string
        eyebrow?: string
        description?: string
        content?: string
        bullets?: string[]
      }
    ) => {
      const updated = await projectContentService.updateCustomTab(projectSlug, tabId, data)
      reloadData()
      return updated
    },
    [projectSlug, reloadData]
  )

  // Delete custom tab
  const deleteCustomTab = useCallback(
    async (tabId: string) => {
      await projectContentService.deleteCustomTab(projectSlug, tabId)
      if (activeTab === tabId) {
        setActiveTab(systemTabs[0]?.key ?? 'overview')
      }
      reloadData()
    },
    [activeTab, projectSlug, reloadData, systemTabs]
  )

  // Add custom section within overview
  const addCustomSection = useCallback(
    async (data: {
      title: string
      eyebrow?: string
      description?: string
      content?: string
      bullets?: string[]
    }) => {
      const newSec = await projectContentService.addCustomSection(projectSlug, data)
      reloadData()
      return newSec
    },
    [projectSlug, reloadData]
  )

  // Delete custom section within overview
  const deleteCustomSection = useCallback(
    async (sectionId: string) => {
      await projectContentService.deleteCustomSection(projectSlug, sectionId)
      reloadData()
    },
    [projectSlug, reloadData]
  )

  // Reset entire project overview to original defaults
  const resetAll = useCallback(async () => {
    await projectContentService.resetAllProjectContent(projectSlug)
    reloadData()
  }, [projectSlug, reloadData])

  return {
    loading,
    activeTab,
    setActiveTab,
    allTabs,
    effectiveSections,
    customTabs,
    isCustomTabActive,
    currentCustomTab,
    saveSection,
    resetSection,
    addCustomTab,
    updateCustomTab,
    deleteCustomTab,
    addCustomSection,
    deleteCustomSection,
    resetAll,
    reloadData,
  }
}
