import type {
  ProjectDocumentItem,
  ProjectDocumentVersionItem,
} from '@/types/projectManagement'
import type { AppUser } from '@/types/domain'
import { isStaffRole } from '@/types/domain'
import { tryGetSupabase } from '@/lib/supabase/client'
import { isDemoMode } from './dataMode'
import { ProjectManagementService } from './projectManagementService'

const STORAGE_DOCS_KEY = 'aa_project_documents_v1'
const STORAGE_DOC_VERSIONS_KEY = 'aa_project_doc_versions_v1'

export class ProjectDocumentService {
  private static getLocalDocuments(): ProjectDocumentItem[] {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(STORAGE_DOCS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  private static saveLocalDocuments(items: ProjectDocumentItem[]): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_DOCS_KEY, JSON.stringify(items))
    } catch (e) {
      console.warn('LocalStorage error saving documents', e)
    }
  }

  private static getLocalVersions(): ProjectDocumentVersionItem[] {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(STORAGE_DOC_VERSIONS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  private static saveLocalVersions(items: ProjectDocumentVersionItem[]): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_DOC_VERSIONS_KEY, JSON.stringify(items))
    } catch (e) {
      console.warn('LocalStorage error saving document versions', e)
    }
  }

  /**
   * Fetch all authorized documents for a project, enforcing RBAC and access policies
   */
  static async getDocumentsForProject(
    projectId: string,
    user?: AppUser | null,
    allowedIndustries?: Set<string>
  ): Promise<ProjectDocumentItem[]> {
    let docs: ProjectDocumentItem[] = []

    // Check project exists and get config
    const project = await ProjectManagementService.getProjectById(projectId)
    if (!project) return []

    const isStaff = user ? isStaffRole(user.role) : false

    // Authorization check for client
    if (!isStaff) {
      if (project.status !== 'published' || project.visibility !== 'visible') {
        return []
      }
      if (allowedIndustries && !allowedIndustries.has(project.industry)) {
        return []
      }
    }

    // Check config documents first (draft isolation)
    const effectiveConfig = isStaff
      ? project.publishedConfig || project.draftConfig
      : project.publishedConfig

    if (effectiveConfig?.documents && effectiveConfig.documents.length > 0) {
      docs = effectiveConfig.documents
    } else {
      // Supabase query
      const supabase = tryGetSupabase()
      if (!isDemoMode() && supabase) {
        try {
          const { data, error } = await supabase
            .from('project_documents')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })

          if (!error && data) {
            docs = data.map((d: any) => ({
              id: d.id,
              projectId: d.project_id,
              title: d.title,
              description: d.description,
              documentType: d.document_type,
              accessPolicy: d.access_policy,
              currentVersion: d.current_version,
              storagePath: d.storage_path,
              fileName: d.file_name,
              fileSize: Number(d.file_size || 0),
              mimeType: d.mime_type,
              createdBy: d.created_by,
              createdAt: d.created_at,
              updatedAt: d.updated_at,
            }))
          }
        } catch (err) {
          console.warn('Supabase fetch documents error, using local fallback', err)
        }
      }

      if (docs.length === 0) {
        docs = this.getLocalDocuments().filter((d) => d.projectId === projectId)
      }
    }

    // Filter by access policy: admin_only documents are hidden from non-staff
    if (!isStaff) {
      return docs.filter((d) => d.accessPolicy === 'project_grant')
    }

    return docs
  }

  /**
   * Add a new document to a project (Staff only)
   */
  static async addDocument(
    projectId: string,
    docData: {
      title: string
      description?: string
      documentType: ProjectDocumentItem['documentType']
      accessPolicy: ProjectDocumentItem['accessPolicy']
      storagePath: string
      fileName: string
      fileSize: number
      mimeType: string
    },
    actor: AppUser
  ): Promise<ProjectDocumentItem> {
    if (!isStaffRole(actor.role)) {
      throw new Error('Forbidden: Only platform administrators can manage project documents.')
    }

    const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const now = new Date().toISOString()

    const newDoc: ProjectDocumentItem = {
      id,
      projectId,
      title: docData.title.trim(),
      description: docData.description?.trim(),
      documentType: docData.documentType,
      accessPolicy: docData.accessPolicy || 'project_grant',
      currentVersion: 1,
      storagePath: docData.storagePath,
      fileName: docData.fileName,
      fileSize: docData.fileSize,
      mimeType: docData.mimeType,
      createdBy: actor.id,
      createdByName: actor.name,
      createdAt: now,
      updatedAt: now,
    }

    // Initial version entry
    const initialVersion: ProjectDocumentVersionItem = {
      id: `docver_${newDoc.id}_1`,
      documentId: newDoc.id,
      versionNumber: 1,
      storagePath: newDoc.storagePath,
      fileName: newDoc.fileName,
      fileSize: newDoc.fileSize,
      mimeType: newDoc.mimeType,
      changelog: 'Initial version',
      createdBy: actor.id,
      createdAt: now,
    }

    // Attempt Supabase insert
    const supabase = tryGetSupabase()
    if (!isDemoMode() && supabase) {
      try {
        const { data: inserted, error } = await supabase
          .from('project_documents')
          .insert({
            project_id: newDoc.projectId,
            title: newDoc.title,
            description: newDoc.description,
            document_type: newDoc.documentType,
            access_policy: newDoc.accessPolicy,
            current_version: 1,
            storage_path: newDoc.storagePath,
            file_name: newDoc.fileName,
            file_size: newDoc.fileSize,
            mime_type: newDoc.mimeType,
            created_by: actor.id,
          })
          .select()
          .single()

        if (!error && inserted) {
          newDoc.id = inserted.id
          initialVersion.documentId = inserted.id
        }

        await supabase.from('project_document_versions').insert({
          document_id: newDoc.id,
          version_number: 1,
          storage_path: newDoc.storagePath,
          file_name: newDoc.fileName,
          file_size: newDoc.fileSize,
          mime_type: newDoc.mimeType,
          changelog: 'Initial version',
          created_by: actor.id,
        })
      } catch (e) {
        console.warn('Supabase doc insert error, persisting locally', e)
      }
    }

    // Save locally
    const docs = this.getLocalDocuments()
    this.saveLocalDocuments([newDoc, ...docs])

    const versions = this.getLocalVersions()
    this.saveLocalVersions([initialVersion, ...versions])

    // Update project draftConfig.documents if project exists
    try {
      const project = await ProjectManagementService.getProjectById(projectId)
      if (project) {
        const existingDocs = project.draftConfig.documents || []
        const updatedDocs = [newDoc, ...existingDocs.filter((d) => d.id !== newDoc.id)]
        await ProjectManagementService.updateDraft(
          projectId,
          {
            ...project.draftConfig,
            documents: updatedDocs,
          },
          undefined,
          actor
        )
      }
    } catch {
      // non-fatal
    }

    return newDoc
  }

  /**
   * Upload a new version of an existing document
   */
  static async replaceDocumentVersion(
    documentId: string,
    versionData: {
      storagePath: string
      fileName: string
      fileSize: number
      mimeType: string
      changelog?: string
    },
    actor: AppUser
  ): Promise<ProjectDocumentItem> {
    if (!isStaffRole(actor.role)) {
      throw new Error('Forbidden: Only platform administrators can replace document versions.')
    }

    const docs = this.getLocalDocuments()
    const docIndex = docs.findIndex((d) => d.id === documentId)
    if (docIndex === -1) {
      throw new Error(`Document ${documentId} not found.`)
    }

    const doc = docs[docIndex]
    const nextVersion = doc.currentVersion + 1
    const now = new Date().toISOString()

    const updatedDoc: ProjectDocumentItem = {
      ...doc,
      currentVersion: nextVersion,
      storagePath: versionData.storagePath,
      fileName: versionData.fileName,
      fileSize: versionData.fileSize,
      mimeType: versionData.mimeType,
      updatedAt: now,
    }

    const newVersionRecord: ProjectDocumentVersionItem = {
      id: `docver_${documentId}_${nextVersion}`,
      documentId,
      versionNumber: nextVersion,
      storagePath: versionData.storagePath,
      fileName: versionData.fileName,
      fileSize: versionData.fileSize,
      mimeType: versionData.mimeType,
      changelog: versionData.changelog || `Updated to version ${nextVersion}`,
      createdBy: actor.id,
      createdAt: now,
    }

    // Try Supabase update
    const supabase = tryGetSupabase()
    if (!isDemoMode() && supabase) {
      try {
        await supabase
          .from('project_documents')
          .update({
            current_version: nextVersion,
            storage_path: updatedDoc.storagePath,
            file_name: updatedDoc.fileName,
            file_size: updatedDoc.fileSize,
            mime_type: updatedDoc.mimeType,
            updated_at: now,
          })
          .eq('id', documentId)

        await supabase.from('project_document_versions').insert({
          document_id: documentId,
          version_number: nextVersion,
          storage_path: versionData.storagePath,
          file_name: versionData.fileName,
          file_size: versionData.fileSize,
          mime_type: versionData.mimeType,
          changelog: newVersionRecord.changelog,
          created_by: actor.id,
        })
      } catch (err) {
        console.warn('Supabase document version update error', err)
      }
    }

    docs[docIndex] = updatedDoc
    this.saveLocalDocuments(docs)

    const versions = this.getLocalVersions()
    this.saveLocalVersions([newVersionRecord, ...versions])

    // Update project draftConfig.documents
    try {
      const project = await ProjectManagementService.getProjectById(doc.projectId)
      if (project) {
        const existingDocs = project.draftConfig.documents || []
        const updatedDocs = existingDocs.map((d) => (d.id === documentId ? updatedDoc : d))
        await ProjectManagementService.updateDraft(
          doc.projectId,
          {
            ...project.draftConfig,
            documents: updatedDocs,
          },
          undefined,
          actor
        )
      }
    } catch {
      // non-fatal
    }

    return updatedDoc
  }

  /**
   * Retrieve version history for a document
   */
  static async getDocumentVersions(documentId: string): Promise<ProjectDocumentVersionItem[]> {
    const supabase = tryGetSupabase()
    if (!isDemoMode() && supabase) {
      try {
        const { data, error } = await supabase
          .from('project_document_versions')
          .select('*')
          .eq('document_id', documentId)
          .order('version_number', { ascending: false })

        if (!error && data) {
          return data.map((d: any) => ({
            id: d.id,
            documentId: d.document_id,
            versionNumber: d.version_number,
            storagePath: d.storage_path,
            fileName: d.file_name,
            fileSize: Number(d.file_size || 0),
            mimeType: d.mime_type,
            changelog: d.changelog,
            createdBy: d.created_by,
            createdAt: d.created_at,
          }))
        }
      } catch (err) {
        console.warn('Supabase fetch document versions error', err)
      }
    }

    return this.getLocalVersions()
      .filter((v) => v.documentId === documentId)
      .sort((a, b) => b.versionNumber - a.versionNumber)
  }

  /**
   * Delete document
   */
  static async deleteDocument(documentId: string, actor: AppUser): Promise<void> {
    if (!isStaffRole(actor.role)) {
      throw new Error('Forbidden: Only platform administrators can delete documents.')
    }

    const docs = this.getLocalDocuments()
    const target = docs.find((d) => d.id === documentId)
    if (!target) return

    const supabase = tryGetSupabase()
    if (!isDemoMode() && supabase) {
      try {
        await supabase.from('project_documents').delete().eq('id', documentId)
      } catch (err) {
        console.warn('Supabase doc delete error', err)
      }
    }

    const remaining = docs.filter((d) => d.id !== documentId)
    this.saveLocalDocuments(remaining)

    try {
      const project = await ProjectManagementService.getProjectById(target.projectId)
      if (project && project.draftConfig.documents) {
        const updatedDocs = project.draftConfig.documents.filter((d) => d.id !== documentId)
        await ProjectManagementService.updateDraft(
          target.projectId,
          {
            ...project.draftConfig,
            documents: updatedDocs,
          },
          undefined,
          actor
        )
      }
    } catch {
      // non-fatal
    }
  }
}
