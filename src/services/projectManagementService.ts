import type {
  ProjectAuditEvent,
  ProjectCatalogItem,
  ProjectConfigPayload,
  ProjectVersion,
  PublicationStatus,
} from '@/types/projectManagement'
import { generateSlug } from '@/types/projectManagement'
import type { AppUser } from '@/types/domain'
import { isStaffRole } from '@/types/domain'
import { tryGetSupabase } from '@/lib/supabase/client'
import { isDemoMode } from './dataMode'
import {
  MANUFACTURING_PREDICTIVE_MAINTENANCE_TEMPLATE,
  MARKETING_CAMPAIGN_ROI_TEMPLATE,
} from './projectTemplateService'
import { sendAdminAlert } from './email'
import { invalidateProjectsCache } from './pocs'
import { SALES_REVENUE_PROJECT } from './demoData/salesRevenueProjectData'

const STORAGE_CATALOG_KEY = 'aa_project_catalog_v1'
const STORAGE_VERSIONS_KEY = 'aa_project_versions_v1'
const STORAGE_AUDIT_KEY = 'aa_project_audit_v1'

/**
 * Seed data for realistic initial platform state
 */
const SEED_PROJECTS: ProjectCatalogItem[] = [
  {
    id: 'proj_mfg_001',
    title: 'Machine Health & Predictive Maintenance Suite',
    slug: 'machine-health-predictive-maintenance-suite',
    description:
      'Continuous sensor telemetry monitoring temperature, vibration, RPM, and failure indicators across manufacturing equipment.',
    detailedOverview:
      'Configurable enterprise IoT dashboard monitoring operational parameters, thermal anomalies, and mechanical stress across production CNC, lathe, and press machines.',
    industry: 'Manufacturing',
    category: 'Industrial Operations',
    projectType: 'dashboard',
    templateId: 'mfg-predictive-maintenance',
    ownerId: 'usr_admin',
    ownerName: 'Rafiq Sheriff',
    ownerEmail: 'sheriffrafiq71@gmail.com',
    status: 'published',
    currentVersion: 1,
    visibility: 'visible',
    tags: ['Manufacturing', 'Predictive Maintenance', 'IoT', 'Telemetry'],
    tech: ['React', 'Plotly.js', 'FastAPI', 'Pandas'],
    businessProblem:
      'Unplanned machine breakdowns cause cascading factory downtime and excessive repair costs.',
    businessSolution:
      'Monitor multi-axis sensor variance in real-time and correlate operating temperatures with historical failure flags.',
    targetAudience: 'Plant Managers, Reliability Engineers, Operations Directors',
    thumbnail: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop',
    documentationLinks: [
      { title: 'Telemetry Field Guide', url: 'https://analyticsavenue.in/docs/telemetry' },
    ],
    draftConfig: {
      projectType: 'dashboard',
      dashboard: MANUFACTURING_PREDICTIVE_MAINTENANCE_TEMPLATE.defaultDashboardConfig,
    },
    publishedConfig: {
      projectType: 'dashboard',
      dashboard: MANUFACTURING_PREDICTIVE_MAINTENANCE_TEMPLATE.defaultDashboardConfig,
    },
    lastValidatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'proj_genai_002',
    title: 'Enterprise PII Redaction & Data Protection Lab',
    slug: 'enterprise-pii-redaction-lab',
    description:
      'Secure AI application protecting confidential customer identities and financial credentials through automated NLP entity masking.',
    industry: 'Gen AI',
    category: 'Security & Governance',
    projectType: 'ai_app',
    ownerId: 'usr_admin',
    ownerName: 'Rafiq Sheriff',
    ownerEmail: 'sheriffrafiq71@gmail.com',
    status: 'published',
    currentVersion: 1,
    visibility: 'visible',
    tags: ['Gen AI', 'PII Redaction', 'Data Privacy', 'NLP'],
    tech: ['React', 'FastAPI', 'spaCy', 'Presidio'],
    businessProblem:
      'Accidental disclosure of personal identifiable information during LLM ingestion creates high regulatory liability.',
    businessSolution:
      'Inline token redaction replacing emails, phones, and SSNs with compliant synthetic tokens before document dispatch.',
    draftConfig: {
      projectType: 'ai_app',
      aiApp: {
        serviceId: 'srv-pii-redactor',
        defaultInputs: {
          document_text:
            'Please contact officer John Smith at jsmith@enterprise-partner.com or call +1-555-0199 regarding machine invoice #9821.',
          masking_style: 'REDACTED_TAG',
        },
      },
    },
    publishedConfig: {
      projectType: 'ai_app',
      aiApp: {
        serviceId: 'srv-pii-redactor',
        defaultInputs: {
          document_text:
            'Please contact officer John Smith at jsmith@enterprise-partner.com or call +1-555-0199 regarding machine invoice #9821.',
          masking_style: 'REDACTED_TAG',
        },
      },
    },
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'proj_crm_003',
    title: 'CRM Dashboard',
    slug: 'crm-dashboard',
    description:
      'Omnichannel customer acquisition attribution, pipeline health, conversion velocity, and campaign ad spend ROI analytics.',
    detailedOverview:
      'Executive CRM and customer acquisition analytics dashboard providing multi-touch attribution, conversion rates, customer retention metrics, and sales funnel performance across digital channels.',
    industry: 'Marketing Analytics',
    category: 'Growth & Acquisition',
    projectType: 'dashboard',
    templateId: 'mkt-campaign-roi',
    ownerId: 'usr_admin',
    ownerName: 'Rafiq Sheriff',
    ownerEmail: 'sheriffrafiq71@gmail.com',
    status: 'published',
    currentVersion: 1,
    visibility: 'visible',
    tags: ['Marketing Analytics', 'CRM', 'ROI', 'Acquisition', 'Conversion Funnel'],
    tech: ['React', 'Plotly.js', 'FastAPI', 'Pandas'],
    businessProblem:
      'Fragmented customer touchpoints and delayed pipeline reporting obscure true customer acquisition costs and attribution ROI.',
    businessSolution:
      'Unified funnel telemetry aggregating acquisition channels, lead stages, customer conversion velocity, and campaign ad spend ROI.',
    targetAudience: 'CMOs, Growth Directors, VP of Marketing, Revenue Operations',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop',
    documentationLinks: [
      { title: 'Attribution Modeling Guide', url: 'https://analyticsavenue.in/docs/attribution' },
    ],
    draftConfig: {
      projectType: 'dashboard',
      dashboard: MARKETING_CAMPAIGN_ROI_TEMPLATE.defaultDashboardConfig,
    },
    publishedConfig: {
      projectType: 'dashboard',
      dashboard: MARKETING_CAMPAIGN_ROI_TEMPLATE.defaultDashboardConfig,
    },
    lastValidatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  SALES_REVENUE_PROJECT,
]

export class ProjectManagementService {
  /**
   * Helper to dispatch change notification to listeners and clear stale catalog caches
   */
  private static notifyCatalogChanged(): void {
    invalidateProjectsCache()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aa_project_catalog_changed'))
    }
  }

  /**
   * Initialize local cache with seed data if empty, and ensure all seed projects exist
   */
  private static ensureInitialized(): void {
    if (typeof window === 'undefined') return
    const current = localStorage.getItem(STORAGE_CATALOG_KEY)
    if (!current) {
      localStorage.setItem(STORAGE_CATALOG_KEY, JSON.stringify(SEED_PROJECTS))
      // Seed initial version records
      const versions: ProjectVersion[] = SEED_PROJECTS.map((p) => ({
        id: `ver_${p.id}_1`,
        projectId: p.id,
        versionNumber: 1,
        config: p.publishedConfig || p.draftConfig,
        changelog: 'Initial publication',
        createdBy: p.ownerId || 'admin',
        createdByName: p.ownerName || 'Platform Administrator',
        createdAt: p.createdAt,
      }))
      localStorage.setItem(STORAGE_VERSIONS_KEY, JSON.stringify(versions))
    } else {
      // Ensure all seed projects are present if localStorage was previously initialized with fewer seeds
      try {
        const existing: ProjectCatalogItem[] = JSON.parse(current)
        let changed = false
        for (const seed of SEED_PROJECTS) {
          if (!existing.some((p) => p.slug === seed.slug || p.id === seed.id)) {
            existing.push(seed)
            changed = true
          }
        }
        if (changed) {
          localStorage.setItem(STORAGE_CATALOG_KEY, JSON.stringify(existing))
          const rawVersions = localStorage.getItem(STORAGE_VERSIONS_KEY)
          const versions: ProjectVersion[] = rawVersions ? JSON.parse(rawVersions) : []
          for (const seed of SEED_PROJECTS) {
            if (!versions.some((v) => v.projectId === seed.id)) {
              versions.push({
                id: `ver_${seed.id}_1`,
                projectId: seed.id,
                versionNumber: 1,
                config: seed.publishedConfig || seed.draftConfig,
                changelog: 'Initial publication',
                createdBy: seed.ownerId || 'admin',
                createdByName: seed.ownerName || 'Platform Administrator',
                createdAt: seed.createdAt,
              })
            }
          }
          localStorage.setItem(STORAGE_VERSIONS_KEY, JSON.stringify(versions))
        }
      } catch {
        // ignore
      }
    }
  }

  static getLocalCatalog(): ProjectCatalogItem[] {
    this.ensureInitialized()
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(STORAGE_CATALOG_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  static saveLocalCatalog(items: ProjectCatalogItem[]): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_CATALOG_KEY, JSON.stringify(items))
    } catch (e) {
      console.warn('LocalStorage quota error saving catalog', e)
    }
  }

  /**
   * Fetch all projects matching filter parameters
   */
  static async fetchProjects(filters?: {
    industry?: string
    projectType?: string
    status?: string
    search?: string
  }): Promise<ProjectCatalogItem[]> {
    let items: ProjectCatalogItem[] = []

    const supabase = tryGetSupabase()
    if (!isDemoMode() && supabase) {
      try {
        let query = supabase.from('project_catalog').select('*').order('created_at', { ascending: false })
        if (filters?.industry && filters.industry !== 'all') {
          query = query.eq('industry', filters.industry)
        }
        if (filters?.projectType && filters.projectType !== 'all') {
          query = query.eq('project_type', filters.projectType)
        }
        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status)
        }
        const { data, error } = await query
        if (!error && data) {
          items = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            slug: d.slug,
            description: d.description,
            detailedOverview: d.detailed_overview,
            industry: d.industry,
            category: d.category,
            projectType: d.project_type,
            templateId: d.template_id,
            ownerId: d.owner_id,
            status: d.status,
            currentVersion: d.current_version,
            visibility: d.visibility,
            tags: d.tags || [],
            tech: d.tech || [],
            businessProblem: d.business_problem,
            businessSolution: d.business_solution,
            targetAudience: d.target_audience,
            thumbnail: d.thumbnail,
            documentationLinks: d.documentation_links,
            draftConfig: d.draft_config || {},
            publishedConfig: d.published_config,
            lastValidatedAt: d.last_validated_at,
            publishedAt: d.published_at,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }))
        }
      } catch (err) {
        console.warn('Supabase fetch projects error, using local catalog', err)
      }
    }

    if (items.length === 0) {
      items = this.getLocalCatalog()
    }

    // Apply in-memory search and filters if needed
    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase()
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.industry.toLowerCase().includes(q)
      )
    }

    if (filters?.industry && filters.industry !== 'all') {
      items = items.filter((p) => p.industry === filters.industry)
    }

    if (filters?.projectType && filters.projectType !== 'all') {
      items = items.filter((p) => p.projectType === filters.projectType)
    }

    if (filters?.status && filters.status !== 'all') {
      items = items.filter((p) => p.status === filters.status)
    }

    return items
  }

  static async getProjectById(id: string): Promise<ProjectCatalogItem | null> {
    const local = this.getLocalCatalog().find((p) => p.id === id)
    if (local) return local

    const supabase = tryGetSupabase()
    if (supabase) {
      const { data } = await supabase.from('project_catalog').select('*').eq('id', id).maybeSingle()
      if (data) {
        return {
          id: data.id,
          title: data.title,
          slug: data.slug,
          description: data.description,
          detailedOverview: data.detailed_overview,
          industry: data.industry,
          category: data.category,
          projectType: data.project_type,
          templateId: data.template_id,
          ownerId: data.owner_id,
          status: data.status,
          currentVersion: data.current_version,
          visibility: data.visibility,
          tags: data.tags || [],
          tech: data.tech || [],
          draftConfig: data.draft_config || {},
          publishedConfig: data.published_config,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        }
      }
    }
    return null
  }

  static async getProjectBySlug(slug: string): Promise<ProjectCatalogItem | null> {
    const local = this.getLocalCatalog().find((p) => p.slug === slug)
    if (local) return local

    const supabase = tryGetSupabase()
    if (supabase) {
      const { data } = await supabase.from('project_catalog').select('*').eq('slug', slug).maybeSingle()
      if (data) {
        return {
          id: data.id,
          title: data.title,
          slug: data.slug,
          description: data.description,
          detailedOverview: data.detailed_overview,
          industry: data.industry,
          category: data.category,
          projectType: data.project_type,
          templateId: data.template_id,
          ownerId: data.owner_id,
          status: data.status,
          currentVersion: data.current_version,
          visibility: data.visibility,
          tags: data.tags || [],
          tech: data.tech || [],
          draftConfig: data.draft_config || {},
          publishedConfig: data.published_config,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        }
      }
    }
    return null
  }

  /**
   * Create a new project in Draft status.
   * Enforces staff authorization and unique slug.
   */
  static async createProject(
    data: Partial<ProjectCatalogItem>,
    actor: AppUser
  ): Promise<ProjectCatalogItem> {
    if (!isStaffRole(actor.role)) {
      throw new Error('Forbidden: Only platform administrators can create projects.')
    }

    if (!data.title?.trim()) {
      throw new Error('Project title is required.')
    }

    const slug = data.slug?.trim() || generateSlug(data.title)
    if (!slug) {
      throw new Error('Valid project slug is required.')
    }

    // Verify uniqueness
    const existing = await this.getProjectBySlug(slug)
    if (existing) {
      throw new Error(`A project with slug "${slug}" already exists. Please choose a unique slug.`)
    }

    const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const now = new Date().toISOString()

    const newProject: ProjectCatalogItem = {
      id,
      title: data.title.trim(),
      slug,
      description: data.description?.trim() || '',
      detailedOverview: data.detailedOverview?.trim() || '',
      industry: data.industry || 'Manufacturing',
      category: data.category || 'General',
      projectType: data.projectType || 'dashboard',
      templateId: data.templateId,
      ownerId: actor.id,
      ownerName: actor.name,
      ownerEmail: actor.email,
      status: 'draft',
      currentVersion: 1,
      visibility: 'visible',
      tags: data.tags || [data.industry || 'Manufacturing'],
      tech: data.tech || ['React', 'TypeScript'],
      businessProblem: data.businessProblem,
      businessSolution: data.businessSolution,
      targetAudience: data.targetAudience,
      thumbnail: data.thumbnail,
      documentationLinks: data.documentationLinks || [],
      draftConfig: data.draftConfig || { projectType: data.projectType || 'dashboard' },
      createdAt: now,
      updatedAt: now,
    }

    // Attempt Supabase insert
    const supabase = tryGetSupabase()
    if (!isDemoMode() && supabase) {
      try {
        const { data: inserted, error } = await supabase
          .from('project_catalog')
          .insert({
            title: newProject.title,
            slug: newProject.slug,
            description: newProject.description,
            detailed_overview: newProject.detailedOverview,
            industry: newProject.industry,
            category: newProject.category,
            project_type: newProject.projectType,
            template_id: newProject.templateId,
            owner_id: actor.id,
            status: 'draft',
            current_version: 1,
            visibility: newProject.visibility,
            tags: newProject.tags,
            tech: newProject.tech,
            business_problem: newProject.businessProblem,
            business_solution: newProject.businessSolution,
            target_audience: newProject.targetAudience,
            thumbnail: newProject.thumbnail,
            documentation_links: newProject.documentationLinks,
            draft_config: newProject.draftConfig,
          })
          .select()
          .single()

        if (!error && inserted) {
          newProject.id = inserted.id
        }
      } catch (err) {
        console.warn('Supabase create error, saving locally', err)
      }
    }

    // Update local cache
    const catalog = this.getLocalCatalog()
    this.saveLocalCatalog([newProject, ...catalog])
    this.notifyCatalogChanged()

    // Audit log
    await this.recordAuditEvent({
      projectId: newProject.id,
      projectSlug: newProject.slug,
      projectTitle: newProject.title,
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'project_created',
      newStatus: 'draft',
      versionNumber: 1,
    })

    return newProject
  }

  /**
   * Save draft modifications without affecting published configuration
   */
  static async updateDraft(
    projectId: string,
    draftConfig: ProjectConfigPayload,
    metadata?: Partial<ProjectCatalogItem>,
    actor?: AppUser
  ): Promise<ProjectCatalogItem> {
    if (actor && !isStaffRole(actor.role)) {
      throw new Error('Forbidden: Only platform administrators can edit projects.')
    }

    const project = await this.getProjectById(projectId)
    if (!project) {
      throw new Error(`Project ${projectId} not found.`)
    }

    const now = new Date().toISOString()
    const updated: ProjectCatalogItem = {
      ...project,
      ...(metadata || {}),
      draftConfig,
      updatedAt: now,
    }

    // Preserve published status if already published, otherwise keep draft
    if (updated.status !== 'published') {
      updated.status = 'draft'
    }

    const supabase = tryGetSupabase()
    if (!isDemoMode() && supabase) {
      try {
        await supabase
          .from('project_catalog')
          .update({
            title: updated.title,
            description: updated.description,
            detailed_overview: updated.detailedOverview,
            industry: updated.industry,
            category: updated.category,
            project_type: updated.projectType,
            template_id: updated.templateId,
            tags: updated.tags,
            tech: updated.tech,
            thumbnail: updated.thumbnail,
            draft_config: updated.draftConfig,
            updated_at: now,
          })
          .eq('id', projectId)
      } catch (err) {
        console.warn('Supabase update draft error', err)
      }
    }

    const catalog = this.getLocalCatalog()
    const idx = catalog.findIndex((p) => p.id === projectId)
    if (idx >= 0) {
      catalog[idx] = updated
    } else {
      catalog.unshift(updated)
    }
    this.saveLocalCatalog(catalog)
    this.notifyCatalogChanged()

    if (actor) {
      await this.recordAuditEvent({
        projectId: updated.id,
        projectSlug: updated.slug,
        projectTitle: updated.title,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'project_updated',
        newStatus: updated.status,
      })
    }

    return updated
  }

  /**
   * Publish a project: validates configuration, increments/promotes version,
   * copies draft_config to published_config, marks status='published'.
   */
  static async publishProject(
    projectId: string,
    actor: AppUser,
    changelog?: string
  ): Promise<ProjectCatalogItem> {
    if (!isStaffRole(actor.role)) {
      throw new Error('Forbidden: Only administrators can publish projects.')
    }

    const project = await this.getProjectById(projectId)
    if (!project) {
      throw new Error(`Project ${projectId} not found.`)
    }

    const nextVersion = (project.currentVersion || 1) + (project.status === 'published' ? 1 : 0)
    const now = new Date().toISOString()

    const updated: ProjectCatalogItem = {
      ...project,
      status: 'published',
      currentVersion: nextVersion,
      publishedConfig: JSON.parse(JSON.stringify(project.draftConfig)),
      lastValidatedAt: now,
      publishedAt: now,
      updatedAt: now,
    }

    // Create immutable version record
    const versionRecord: ProjectVersion = {
      id: `ver_${projectId}_${nextVersion}`,
      projectId,
      versionNumber: nextVersion,
      config: JSON.parse(JSON.stringify(project.draftConfig)),
      changelog: changelog || `Published version ${nextVersion}`,
      createdBy: actor.id,
      createdByName: actor.name,
      createdAt: now,
    }

    // Try Supabase atomic update
    const supabase = tryGetSupabase()
    if (!isDemoMode() && supabase) {
      try {
        await supabase
          .from('project_catalog')
          .update({
            status: 'published',
            current_version: nextVersion,
            published_config: updated.publishedConfig,
            last_validated_at: now,
            published_at: now,
            updated_at: now,
          })
          .eq('id', projectId)

        await supabase.from('project_versions').insert({
          project_id: projectId,
          version_number: nextVersion,
          config: versionRecord.config,
          changelog: versionRecord.changelog,
          created_by: actor.id,
        })
      } catch (err) {
        console.warn('Supabase publish error', err)
      }
    }

    // Update local cache
    const catalog = this.getLocalCatalog()
    const idx = catalog.findIndex((p) => p.id === projectId)
    if (idx >= 0) catalog[idx] = updated
    this.saveLocalCatalog(catalog)

    // Save version locally
    this.saveVersionLocally(versionRecord)
    this.notifyCatalogChanged()

    // Audit log
    await this.recordAuditEvent({
      projectId: updated.id,
      projectSlug: updated.slug,
      projectTitle: updated.title,
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'project_published',
      previousStatus: project.status,
      newStatus: 'published',
      versionNumber: nextVersion,
    })

    // Optional email notification (non-blocking)
    try {
      void sendAdminAlert(
        actor.email,
        actor.email,
        actor.name,
        `Project "${updated.title}" was published under ${updated.industry} (v${nextVersion}).`
      )
    } catch {
      // Fail safely without affecting transaction
    }

    return updated
  }

  /**
   * Unpublish project: removes from catalog visibility while preserving configs
   */
  static async unpublishProject(projectId: string, actor: AppUser): Promise<ProjectCatalogItem> {
    if (!isStaffRole(actor.role)) {
      throw new Error('Forbidden: Only administrators can unpublish projects.')
    }

    const project = await this.getProjectById(projectId)
    if (!project) throw new Error('Project not found.')

    const now = new Date().toISOString()
    const updated: ProjectCatalogItem = {
      ...project,
      status: 'unpublished',
      updatedAt: now,
    }

    const supabase = tryGetSupabase()
    if (!isDemoMode() && supabase) {
      try {
        await supabase.from('project_catalog').update({ status: 'unpublished', updated_at: now }).eq('id', projectId)
      } catch (err) {
        console.warn('Supabase unpublish error', err)
      }
    }

    const catalog = this.getLocalCatalog()
    const idx = catalog.findIndex((p) => p.id === projectId)
    if (idx >= 0) catalog[idx] = updated
    this.saveLocalCatalog(catalog)
    this.notifyCatalogChanged()

    await this.recordAuditEvent({
      projectId: updated.id,
      projectSlug: updated.slug,
      projectTitle: updated.title,
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'project_unpublished',
      previousStatus: project.status,
      newStatus: 'unpublished',
    })

    return updated
  }

  /**
   * Archive project
   */
  static async archiveProject(projectId: string, actor: AppUser): Promise<ProjectCatalogItem> {
    if (!isStaffRole(actor.role)) {
      throw new Error('Forbidden: Only administrators can archive projects.')
    }

    const project = await this.getProjectById(projectId)
    if (!project) throw new Error('Project not found.')

    const now = new Date().toISOString()
    const updated: ProjectCatalogItem = {
      ...project,
      status: 'archived',
      updatedAt: now,
    }

    const supabase = tryGetSupabase()
    if (!isDemoMode() && supabase) {
      try {
        await supabase.from('project_catalog').update({ status: 'archived', updated_at: now }).eq('id', projectId)
      } catch (err) {
        console.warn('Supabase archive error', err)
      }
    }

    const catalog = this.getLocalCatalog()
    const idx = catalog.findIndex((p) => p.id === projectId)
    if (idx >= 0) catalog[idx] = updated
    this.saveLocalCatalog(catalog)
    this.notifyCatalogChanged()

    await this.recordAuditEvent({
      projectId: updated.id,
      projectSlug: updated.slug,
      projectTitle: updated.title,
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'project_archived',
      previousStatus: project.status,
      newStatus: 'archived',
    })

    return updated
  }

  /**
   * Restore archived project back to draft
   */
  static async restoreProject(projectId: string, actor: AppUser): Promise<ProjectCatalogItem> {
    if (!isStaffRole(actor.role)) {
      throw new Error('Forbidden: Only administrators can restore projects.')
    }

    const project = await this.getProjectById(projectId)
    if (!project) throw new Error('Project not found.')

    const now = new Date().toISOString()
    const updated: ProjectCatalogItem = {
      ...project,
      status: 'draft',
      updatedAt: now,
    }

    const supabase = tryGetSupabase()
    if (!isDemoMode() && supabase) {
      try {
        await supabase.from('project_catalog').update({ status: 'draft', updated_at: now }).eq('id', projectId)
      } catch (err) {
        console.warn('Supabase restore error', err)
      }
    }

    const catalog = this.getLocalCatalog()
    const idx = catalog.findIndex((p) => p.id === projectId)
    if (idx >= 0) catalog[idx] = updated
    this.saveLocalCatalog(catalog)
    this.notifyCatalogChanged()

    await this.recordAuditEvent({
      projectId: updated.id,
      projectSlug: updated.slug,
      projectTitle: updated.title,
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'project_restored',
      previousStatus: 'archived',
      newStatus: 'draft',
    })

    return updated
  }

  /**
   * Duplicate existing project into a new draft
   */
  static async duplicateProject(
    projectId: string,
    newTitle: string,
    actor: AppUser
  ): Promise<ProjectCatalogItem> {
    if (!isStaffRole(actor.role)) {
      throw new Error('Forbidden: Only administrators can duplicate projects.')
    }

    const source = await this.getProjectById(projectId)
    if (!source) throw new Error('Source project not found.')

    const baseSlug = generateSlug(newTitle)
    let candidateSlug = `${baseSlug}-copy`
    let counter = 1
    while (await this.getProjectBySlug(candidateSlug)) {
      counter++
      candidateSlug = `${baseSlug}-copy-${counter}`
    }

    const duplicated = await this.createProject(
      {
        title: newTitle,
        slug: candidateSlug,
        description: `Copy of ${source.description}`,
        detailedOverview: source.detailedOverview,
        industry: source.industry,
        category: source.category,
        projectType: source.projectType,
        templateId: source.templateId,
        tags: [...source.tags],
        tech: [...source.tech],
        businessProblem: source.businessProblem,
        businessSolution: source.businessSolution,
        targetAudience: source.targetAudience,
        thumbnail: source.thumbnail,
        documentationLinks: source.documentationLinks ? [...source.documentationLinks] : [],
        draftConfig: JSON.parse(JSON.stringify(source.publishedConfig || source.draftConfig)),
      },
      actor
    )

    await this.recordAuditEvent({
      projectId: duplicated.id,
      projectSlug: duplicated.slug,
      projectTitle: duplicated.title,
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'project_duplicated',
      metadata: { sourceProjectId: projectId, sourceSlug: source.slug },
    })

    return duplicated
  }

  /**
   * Rollback draft/published configuration to an earlier version
   */
  static async rollbackVersion(
    projectId: string,
    targetVersionNumber: number,
    actor: AppUser
  ): Promise<ProjectCatalogItem> {
    if (!isStaffRole(actor.role)) {
      throw new Error('Forbidden: Only administrators can rollback versions.')
    }

    const project = await this.getProjectById(projectId)
    if (!project) throw new Error('Project not found.')

    const versions = await this.getProjectVersions(projectId)
    const targetVersion = versions.find((v) => v.versionNumber === targetVersionNumber)
    if (!targetVersion) {
      throw new Error(`Version ${targetVersionNumber} was not found for this project.`)
    }

    // Set the draft config to the historical version config
    const updated = await this.updateDraft(
      projectId,
      JSON.parse(JSON.stringify(targetVersion.config)),
      undefined,
      actor
    )

    await this.recordAuditEvent({
      projectId: updated.id,
      projectSlug: updated.slug,
      projectTitle: updated.title,
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'version_rollback',
      versionNumber: targetVersionNumber,
    })

    return updated
  }

  /**
   * Retrieve version history for a project
   */
  static async getProjectVersions(projectId: string): Promise<ProjectVersion[]> {
    const supabase = tryGetSupabase()
    if (!isDemoMode() && supabase) {
      try {
        const { data, error } = await supabase
          .from('project_versions')
          .select('*')
          .eq('project_id', projectId)
          .order('version_number', { ascending: false })

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            projectId: d.project_id,
            versionNumber: d.version_number,
            config: d.config,
            changelog: d.changelog,
            createdBy: d.created_by,
            createdAt: d.created_at,
          }))
        }
      } catch (err) {
        console.warn('Supabase fetch versions error', err)
      }
    }

    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(STORAGE_VERSIONS_KEY)
      const all: ProjectVersion[] = raw ? JSON.parse(raw) : []
      return all
        .filter((v) => v.projectId === projectId)
        .sort((a, b) => b.versionNumber - a.versionNumber)
    } catch {
      return []
    }
  }

  private static saveVersionLocally(ver: ProjectVersion): void {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(STORAGE_VERSIONS_KEY)
      const all: ProjectVersion[] = raw ? JSON.parse(raw) : []
      all.unshift(ver)
      localStorage.setItem(STORAGE_VERSIONS_KEY, JSON.stringify(all))
    } catch (e) {
      console.warn('LocalStorage error saving version', e)
    }
  }

  /**
   * Record an audit event
   */
  static async recordAuditEvent(event: Omit<ProjectAuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: ProjectAuditEvent = {
      ...event,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    }

    const supabase = tryGetSupabase()
    if (!isDemoMode() && supabase) {
      try {
        await supabase.from('project_audit_log').insert({
          project_id: fullEvent.projectId,
          project_slug: fullEvent.projectSlug,
          project_title: fullEvent.projectTitle,
          actor_id: fullEvent.actorId,
          actor_email: fullEvent.actorEmail,
          action: fullEvent.action,
          prev_status: fullEvent.previousStatus,
          new_status: fullEvent.newStatus,
          version_number: fullEvent.versionNumber,
          metadata: fullEvent.metadata || {},
        })
      } catch (err) {
        console.warn('Supabase audit error', err)
      }
    }

    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(STORAGE_AUDIT_KEY)
      const list: ProjectAuditEvent[] = raw ? JSON.parse(raw) : []
      list.unshift(fullEvent)
      localStorage.setItem(STORAGE_AUDIT_KEY, JSON.stringify(list.slice(0, 100)))
    } catch (e) {
      console.warn('LocalStorage error saving audit event', e)
    }
  }

  static async getProjectAuditEvents(projectId: string): Promise<ProjectAuditEvent[]> {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(STORAGE_AUDIT_KEY)
      const list: ProjectAuditEvent[] = raw ? JSON.parse(raw) : []
      return list.filter((e) => e.projectId === projectId)
    } catch {
      return []
    }
  }
}
