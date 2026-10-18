/**
 * TypeScript types for Analytics Avenue Project Overview Content Management System
 */

export interface OverviewSection {
  /** Stable unique identifier (e.g. 'purpose', 'capabilities', 'business-impact') */
  id: string
  /** Scoped project slug */
  projectSlug: string
  /** Section title */
  title: string
  /** Optional eyebrow / category tag above title (e.g. 'Purpose', 'Overview') */
  eyebrow?: string
  /** Optional short subtitle or description */
  description?: string
  /** Main body content paragraph(s) */
  content?: string
  /** Optional bullet items */
  bullets?: string[]
  /** Optional metadata / structured details */
  metadata?: Record<string, unknown>
  /** Whether this section is a user-created custom section */
  isCustom?: boolean
  /** Sort order for rendering */
  sortOrder?: number
  /** ISO timestamp of creation */
  createdAt?: string
  /** ISO timestamp of last update */
  updatedAt?: string
  /** Flag computed when this system section has user-persisted overrides */
  isOverridden?: boolean
}

export interface OverviewSectionOverride {
  id: string
  title?: string
  eyebrow?: string
  description?: string
  content?: string
  bullets?: string[]
  metadata?: Record<string, unknown>
  updatedAt: string
}

export interface CustomOverviewTab {
  /** Stable unique UUID */
  id: string
  /** Scoped project slug */
  projectSlug: string
  /** Tab label & section title */
  title: string
  /** Optional eyebrow */
  eyebrow?: string
  /** Optional short description */
  description?: string
  /** Main body content */
  content?: string
  /** Optional bullet items */
  bullets?: string[]
  /** Optional metadata */
  metadata?: Record<string, unknown>
  /** Always true for custom user-created tabs */
  isCustom: true
  /** Display sort order */
  sortOrder: number
  /** ISO timestamp of creation */
  createdAt: string
  /** ISO timestamp of last update */
  updatedAt: string
}

export interface ProjectTabItem {
  key: string
  label: string
  isCustom?: boolean
  badge?: string
}

export interface ProjectOverviewStorageRecord {
  version: 1
  projectSlug: string
  updatedAt: string
  sectionOverrides: Record<string, OverviewSectionOverride>
  customTabs: CustomOverviewTab[]
  customSections?: CustomOverviewTab[]
}

export interface IProjectContentService {
  getProjectOverview(projectSlug: string): Promise<ProjectOverviewStorageRecord>
  saveSectionOverride(
    projectSlug: string,
    sectionId: string,
    override: Omit<OverviewSectionOverride, 'id' | 'updatedAt'>
  ): Promise<OverviewSectionOverride>
  resetSectionOverride(projectSlug: string, sectionId: string): Promise<void>
  addCustomTab(
    projectSlug: string,
    tab: Omit<CustomOverviewTab, 'id' | 'createdAt' | 'updatedAt' | 'projectSlug' | 'isCustom' | 'sortOrder'>
  ): Promise<CustomOverviewTab>
  updateCustomTab(
    projectSlug: string,
    tabId: string,
    updates: Partial<Omit<CustomOverviewTab, 'id' | 'createdAt' | 'projectSlug' | 'isCustom'>>
  ): Promise<CustomOverviewTab>
  deleteCustomTab(projectSlug: string, tabId: string): Promise<void>
  addCustomSection(
    projectSlug: string,
    section: Omit<CustomOverviewTab, 'id' | 'createdAt' | 'updatedAt' | 'projectSlug' | 'isCustom' | 'sortOrder'>
  ): Promise<CustomOverviewTab>
  updateCustomSection(
    projectSlug: string,
    sectionId: string,
    updates: Partial<Omit<CustomOverviewTab, 'id' | 'createdAt' | 'projectSlug' | 'isCustom'>>
  ): Promise<CustomOverviewTab>
  deleteCustomSection(projectSlug: string, sectionId: string): Promise<void>
  resetAllProjectContent(projectSlug: string): Promise<void>
  subscribe(projectSlug: string, listener: () => void): () => void
}
