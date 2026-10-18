import type {
  CustomOverviewTab,
  IProjectContentService,
  OverviewSectionOverride,
  ProjectOverviewStorageRecord,
} from '@/types/projectContent'

const STORAGE_PREFIX = 'aa_overview_v1_'

function getStorageKey(slug: string): string {
  return `${STORAGE_PREFIX}${slug}`
}

function generateStableId(prefix = 'custom'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Validates and safely normalizes a persisted storage record defensively.
 */
function sanitizeRecord(raw: unknown, projectSlug: string): ProjectOverviewStorageRecord {
  const fallback: ProjectOverviewStorageRecord = {
    version: 1,
    projectSlug,
    updatedAt: new Date().toISOString(),
    sectionOverrides: {},
    customTabs: [],
    customSections: [],
  }

  if (!raw || typeof raw !== 'object') {
    return fallback
  }

  const obj = raw as Partial<ProjectOverviewStorageRecord>

  // Version checking
  if (obj.version !== 1) {
    return fallback
  }

  const sectionOverrides: Record<string, OverviewSectionOverride> = {}
  if (obj.sectionOverrides && typeof obj.sectionOverrides === 'object') {
    for (const [key, val] of Object.entries(obj.sectionOverrides)) {
      if (val && typeof val === 'object' && typeof (val as OverviewSectionOverride).id === 'string') {
        sectionOverrides[key] = {
          id: (val as OverviewSectionOverride).id,
          title: typeof val.title === 'string' ? val.title : undefined,
          eyebrow: typeof val.eyebrow === 'string' ? val.eyebrow : undefined,
          description: typeof val.description === 'string' ? val.description : undefined,
          content: typeof val.content === 'string' ? val.content : undefined,
          bullets: Array.isArray(val.bullets)
            ? val.bullets.filter((b): b is string => typeof b === 'string')
            : undefined,
          metadata:
            val.metadata && typeof val.metadata === 'object'
              ? (val.metadata as Record<string, unknown>)
              : undefined,
          updatedAt: typeof val.updatedAt === 'string' ? val.updatedAt : new Date().toISOString(),
        }
      }
    }
  }

  const sanitizeTabs = (tabs: unknown): CustomOverviewTab[] => {
    if (!Array.isArray(tabs)) return []
    return tabs
      .filter((t): t is CustomOverviewTab => {
        return Boolean(
          t &&
            typeof t === 'object' &&
            typeof t.id === 'string' &&
            typeof t.title === 'string'
        )
      })
      .map((t, idx) => ({
        id: t.id,
        projectSlug: typeof t.projectSlug === 'string' ? t.projectSlug : projectSlug,
        title: String(t.title).trim(),
        eyebrow: typeof t.eyebrow === 'string' ? t.eyebrow : undefined,
        description: typeof t.description === 'string' ? t.description : undefined,
        content: typeof t.content === 'string' ? t.content : undefined,
        bullets: Array.isArray(t.bullets)
          ? t.bullets.filter((b): b is string => typeof b === 'string')
          : undefined,
        metadata: t.metadata && typeof t.metadata === 'object' ? t.metadata : undefined,
        isCustom: true as const,
        sortOrder: typeof t.sortOrder === 'number' ? t.sortOrder : idx,
        createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString(),
        updatedAt: typeof t.updatedAt === 'string' ? t.updatedAt : new Date().toISOString(),
      }))
  }

  return {
    version: 1,
    projectSlug,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString(),
    sectionOverrides,
    customTabs: sanitizeTabs(obj.customTabs),
    customSections: sanitizeTabs(obj.customSections),
  }
}

/**
 * LocalStorage implementation of Project Content Persistence.
 * Implements IProjectContentService so that it can be swapped for an API provider in the future.
 */
export class LocalStorageProjectContentProvider implements IProjectContentService {
  private listeners: Map<string, Set<() => void>> = new Map()

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event: StorageEvent) => {
        if (event.key && event.key.startsWith(STORAGE_PREFIX)) {
          const slug = event.key.slice(STORAGE_PREFIX.length)
          this.notifyListeners(slug)
        }
      })
    }
  }

  private readRaw(projectSlug: string): ProjectOverviewStorageRecord {
    if (typeof window === 'undefined' || !window.localStorage) {
      return sanitizeRecord(null, projectSlug)
    }

    try {
      const data = window.localStorage.getItem(getStorageKey(projectSlug))
      if (!data) {
        return sanitizeRecord(null, projectSlug)
      }
      const parsed = JSON.parse(data)
      return sanitizeRecord(parsed, projectSlug)
    } catch {
      // Defensive fallback if JSON is corrupted
      return sanitizeRecord(null, projectSlug)
    }
  }

  private writeRaw(projectSlug: string, record: ProjectOverviewStorageRecord): void {
    if (typeof window === 'undefined' || !window.localStorage) return

    try {
      record.updatedAt = new Date().toISOString()
      window.localStorage.setItem(getStorageKey(projectSlug), JSON.stringify(record))
      this.notifyListeners(projectSlug)
    } catch {
      // Storage quota or privacy mode error handled gracefully
    }
  }

  private notifyListeners(projectSlug: string): void {
    const subs = this.listeners.get(projectSlug)
    if (subs) {
      subs.forEach((cb) => {
        try {
          cb()
        } catch {
          // ignore subscriber errors
        }
      })
    }
  }

  public subscribe(projectSlug: string, listener: () => void): () => void {
    if (!this.listeners.has(projectSlug)) {
      this.listeners.set(projectSlug, new Set())
    }
    const set = this.listeners.get(projectSlug)!
    set.add(listener)

    return () => {
      set.delete(listener)
      if (set.size === 0) {
        this.listeners.delete(projectSlug)
      }
    }
  }

  public async getProjectOverview(projectSlug: string): Promise<ProjectOverviewStorageRecord> {
    return Promise.resolve(this.readRaw(projectSlug))
  }

  public async saveSectionOverride(
    projectSlug: string,
    sectionId: string,
    override: Omit<OverviewSectionOverride, 'id' | 'updatedAt'>
  ): Promise<OverviewSectionOverride> {
    const record = this.readRaw(projectSlug)
    const newOverride: OverviewSectionOverride = {
      ...override,
      id: sectionId,
      updatedAt: new Date().toISOString(),
    }
    record.sectionOverrides[sectionId] = newOverride
    this.writeRaw(projectSlug, record)
    return Promise.resolve(newOverride)
  }

  public async resetSectionOverride(projectSlug: string, sectionId: string): Promise<void> {
    const record = this.readRaw(projectSlug)
    if (record.sectionOverrides[sectionId]) {
      delete record.sectionOverrides[sectionId]
      this.writeRaw(projectSlug, record)
    }
    return Promise.resolve()
  }

  public async addCustomTab(
    projectSlug: string,
    tab: Omit<CustomOverviewTab, 'id' | 'createdAt' | 'updatedAt' | 'projectSlug' | 'isCustom'>
  ): Promise<CustomOverviewTab> {
    const record = this.readRaw(projectSlug)
    const now = new Date().toISOString()
    const newTab: CustomOverviewTab = {
      ...tab,
      id: generateStableId('tab'),
      projectSlug,
      isCustom: true,
      sortOrder: record.customTabs.length,
      createdAt: now,
      updatedAt: now,
    }
    record.customTabs.push(newTab)
    this.writeRaw(projectSlug, record)
    return Promise.resolve(newTab)
  }

  public async updateCustomTab(
    projectSlug: string,
    tabId: string,
    updates: Partial<Omit<CustomOverviewTab, 'id' | 'createdAt' | 'projectSlug' | 'isCustom'>>
  ): Promise<CustomOverviewTab> {
    const record = this.readRaw(projectSlug)
    const idx = record.customTabs.findIndex((t) => t.id === tabId)
    if (idx === -1) {
      throw new Error(`Custom tab with ID ${tabId} not found`)
    }
    const updated: CustomOverviewTab = {
      ...record.customTabs[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    record.customTabs[idx] = updated
    this.writeRaw(projectSlug, record)
    return Promise.resolve(updated)
  }

  public async deleteCustomTab(projectSlug: string, tabId: string): Promise<void> {
    const record = this.readRaw(projectSlug)
    const initialLen = record.customTabs.length
    record.customTabs = record.customTabs.filter((t) => t.id !== tabId)
    if (record.customTabs.length !== initialLen) {
      this.writeRaw(projectSlug, record)
    }
    return Promise.resolve()
  }

  public async addCustomSection(
    projectSlug: string,
    section: Omit<CustomOverviewTab, 'id' | 'createdAt' | 'updatedAt' | 'projectSlug' | 'isCustom'>
  ): Promise<CustomOverviewTab> {
    const record = this.readRaw(projectSlug)
    const now = new Date().toISOString()
    const customSections = record.customSections ?? []
    const newSection: CustomOverviewTab = {
      ...section,
      id: generateStableId('sec'),
      projectSlug,
      isCustom: true,
      sortOrder: customSections.length,
      createdAt: now,
      updatedAt: now,
    }
    customSections.push(newSection)
    record.customSections = customSections
    this.writeRaw(projectSlug, record)
    return Promise.resolve(newSection)
  }

  public async updateCustomSection(
    projectSlug: string,
    sectionId: string,
    updates: Partial<Omit<CustomOverviewTab, 'id' | 'createdAt' | 'projectSlug' | 'isCustom'>>
  ): Promise<CustomOverviewTab> {
    const record = this.readRaw(projectSlug)
    const customSections = record.customSections ?? []
    const idx = customSections.findIndex((s) => s.id === sectionId)
    if (idx === -1) {
      throw new Error(`Custom section with ID ${sectionId} not found`)
    }
    const updated: CustomOverviewTab = {
      ...customSections[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    customSections[idx] = updated
    record.customSections = customSections
    this.writeRaw(projectSlug, record)
    return Promise.resolve(updated)
  }

  public async deleteCustomSection(projectSlug: string, sectionId: string): Promise<void> {
    const record = this.readRaw(projectSlug)
    if (!record.customSections) return Promise.resolve()
    const initialLen = record.customSections.length
    record.customSections = record.customSections.filter((s) => s.id !== sectionId)
    if (record.customSections.length !== initialLen) {
      this.writeRaw(projectSlug, record)
    }
    return Promise.resolve()
  }

  public async resetAllProjectContent(projectSlug: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(getStorageKey(projectSlug))
      this.notifyListeners(projectSlug)
    }
    return Promise.resolve()
  }
}

/**
 * Singleton service instance.
 * Decoupled from React components: ready for future swap to ApiProjectContentProvider.
 */
export const projectContentService: IProjectContentService = new LocalStorageProjectContentProvider()
