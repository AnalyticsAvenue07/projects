import { useState } from 'react'
import type {
  DocumentAccessPolicy,
  DocumentType,
  ProjectDocumentItem,
} from '@/types/projectManagement'
import {
  ProjectStorageService,
  SUPPORTED_DOCUMENT_EXTENSIONS,
} from '@/services/projectStorageService'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  History,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { AppUser } from '@/types/domain'

interface ProjectDocumentManagerProps {
  projectId: string
  documents: ProjectDocumentItem[]
  onChange: (docs: ProjectDocumentItem[]) => void
  actor?: AppUser | null
}

export function ProjectDocumentManager({
  projectId,
  documents,
  onChange,
  actor,
}: ProjectDocumentManagerProps) {
  // New document form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [docTitle, setDocTitle] = useState('')
  const [docDesc, setDocDesc] = useState('')
  const [docType, setDocType] = useState<DocumentType>('pdf')
  const [accessPolicy, setAccessPolicy] = useState<DocumentAccessPolicy>('project_grant')
  const [uploading, setUploading] = useState(false)

  // Version replacement state
  const [replacingDoc, setReplacingDoc] = useState<ProjectDocumentItem | null>(null)
  const [versionFile, setVersionFile] = useState<File | null>(null)
  const [versionChangelog, setVersionChangelog] = useState('')
  const [replacing, setReplacing] = useState(false)

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const validation = ProjectStorageService.validateDocumentFile(file)
      if (!validation.isValid) {
        toast.error(validation.error)
        return
      }

      setSelectedFile(file)
      if (!docTitle) {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
        setDocTitle(nameWithoutExt.replace(/[-_]/g, ' '))
      }

      // Auto-detect document type
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'pptx' || ext === 'ppt') {
        setDocType('presentation')
      } else if (ext === 'pdf') {
        setDocType('pdf')
      } else if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext || '')) {
        setDocType('architecture_diagram')
      } else if (['md', 'txt'].includes(ext || '')) {
        setDocType('documentation')
      } else if (['xlsx', 'csv', 'docx'].includes(ext || '')) {
        setDocType('report')
      }
    }
  }

  // Upload and attach
  const handleUploadNewDocument = async () => {
    if (!selectedFile) {
      toast.error('Please select a document file to upload.')
      return
    }
    if (!docTitle.trim()) {
      toast.error('Document title is required.')
      return
    }

    setUploading(true)
    try {
      const uploadRes = await ProjectStorageService.uploadDocumentFile(selectedFile, projectId || 'temp')
      const newDoc: ProjectDocumentItem = {
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        projectId: projectId || 'temp',
        title: docTitle.trim(),
        description: docDesc.trim() || undefined,
        documentType: docType,
        accessPolicy,
        currentVersion: 1,
        storagePath: uploadRes.storagePath,
        fileName: uploadRes.fileName,
        fileSize: uploadRes.fileSize,
        mimeType: uploadRes.mimeType,
        createdBy: actor?.id,
        createdByName: actor?.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      onChange([...documents, newDoc])
      toast.success(`Attached "${newDoc.title}" (v1)`)

      // Reset form
      setSelectedFile(null)
      setDocTitle('')
      setDocDesc('')
      setDocType('pdf')
      setAccessPolicy('project_grant')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  // Replace version
  const handleReplaceVersion = async () => {
    if (!replacingDoc || !versionFile) return

    const validation = ProjectStorageService.validateDocumentFile(versionFile)
    if (!validation.isValid) {
      toast.error(validation.error)
      return
    }

    setReplacing(true)
    try {
      const uploadRes = await ProjectStorageService.uploadDocumentFile(versionFile, projectId || 'temp')
      const nextVersion = replacingDoc.currentVersion + 1
      const updatedDoc: ProjectDocumentItem = {
        ...replacingDoc,
        currentVersion: nextVersion,
        storagePath: uploadRes.storagePath,
        fileName: uploadRes.fileName,
        fileSize: uploadRes.fileSize,
        mimeType: uploadRes.mimeType,
        updatedAt: new Date().toISOString(),
      }

      onChange(documents.map((d) => (d.id === replacingDoc.id ? updatedDoc : d)))
      toast.success(`Updated "${updatedDoc.title}" to version ${nextVersion}`)

      setReplacingDoc(null)
      setVersionFile(null)
      setVersionChangelog('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to replace document version.')
    } finally {
      setReplacing(false)
    }
  }

  // Delete document
  const handleDeleteDoc = (id: string, title: string) => {
    if (!window.confirm(`Remove document "${title}" from project attachments?`)) return
    onChange(documents.filter((d) => d.id !== id))
    toast.success(`Removed "${title}"`)
  }

  return (
    <div className="space-y-6">
      {/* Upload New Document Box */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-5">
        <div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-2xs font-bold uppercase tracking-wider text-slate-600">
            Project Documents Manager
          </span>
          <h3 className="mt-1 text-lg font-bold text-[#0F172A]">Attach Presentations & Documentation</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload PDF reports, PowerPoint slide decks, architecture blueprints, and field guides. Supported: {SUPPORTED_DOCUMENT_EXTENSIONS.join(', ')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* File Picker Zone */}
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-[#F8FAFC] p-6 text-center hover:border-[#0F766E]/40 transition-colors flex flex-col items-center justify-center min-h-[180px]">
            <UploadCloud className="h-8 w-8 text-slate-400 mb-2" />
            <input
              type="file"
              id="doc-upload"
              accept={SUPPORTED_DOCUMENT_EXTENSIONS.join(',')}
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="doc-upload"
              className="cursor-pointer rounded-2xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              Select File to Attach
            </label>
            {selectedFile ? (
              <div className="mt-3 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            ) : (
              <p className="mt-2 text-2xs text-slate-400">Drag or browse max 50MB per file</p>
            )}
          </div>

          {/* Metadata Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Document Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Executive Architecture Deck Q3"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Document Type
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocumentType)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#0F766E] focus:outline-none"
                >
                  <option value="presentation">Presentation (.pptx / slides)</option>
                  <option value="pdf">PDF Report</option>
                  <option value="architecture_diagram">Architecture Diagram</option>
                  <option value="documentation">Documentation / README</option>
                  <option value="report">Supporting Data / Report</option>
                  <option value="other">Other Asset</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Access Policy
                </label>
                <select
                  value={accessPolicy}
                  onChange={(e) => setAccessPolicy(e.target.value as DocumentAccessPolicy)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#0F766E] focus:outline-none"
                >
                  <option value="project_grant">Authorized Project Access</option>
                  <option value="admin_only">Admin / Staff Only</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="Brief summary of document contents..."
                value={docDesc}
                onChange={(e) => setDocDesc(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
              />
            </div>

            <button
              type="button"
              disabled={!selectedFile || !docTitle.trim() || uploading}
              onClick={handleUploadNewDocument}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0F766E] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] disabled:opacity-50 transition-all mt-1"
            >
              <Plus className="h-4 w-4" />
              {uploading ? 'Attaching Document...' : 'Attach Document to Project'}
            </button>
          </div>
        </div>
      </div>

      {/* Attached Documents List */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-[#0F172A]">
            Attached Documents ({documents.length})
          </h4>
          <span className="text-2xs text-slate-400">
            Saved as stable private storage references with project draft isolation
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
            No documents attached yet. Upload presentation decks, whitepapers or architecture diagrams above.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white hover:bg-[#F8FAFC] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 mt-0.5">
                    <FileText className="h-4 w-4 text-[#0F766E]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#0F172A]">{doc.title}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.2 font-mono text-2xs font-bold text-slate-600">
                        v{doc.currentVersion}
                      </span>
                      {doc.accessPolicy === 'admin_only' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.2 text-2xs font-bold text-amber-800">
                          <Lock className="h-3 w-3" /> Admin Only
                        </span>
                      )}
                    </div>
                    <p className="text-2xs text-slate-500 font-mono mt-0.5">
                      {doc.fileName} • {(doc.fileSize / 1024).toFixed(1)} KB • {doc.documentType}
                    </p>
                    {doc.description && (
                      <p className="text-xs text-slate-600 mt-1 max-w-xl">{doc.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setReplacingDoc(doc)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-2xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    title="Upload replacement version"
                  >
                    <RefreshCw className="h-3 w-3 text-sky-600" /> New Version
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteDoc(doc.id, doc.title)}
                    className="rounded-xl border border-slate-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Replace Version Modal */}
      {replacingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-[#0F172A]">Upload New Version</h3>
                <p className="text-2xs text-slate-500">
                  Replacing "{replacingDoc.title}" (currently v{replacingDoc.currentVersion})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplacingDoc(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Select Updated File *
                </label>
                <input
                  type="file"
                  accept={SUPPORTED_DOCUMENT_EXTENSIONS.join(',')}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setVersionFile(e.target.files[0])
                    }
                  }}
                  className="w-full text-xs font-semibold text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#0F766E] file:text-white hover:file:bg-[#0D655E]"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Changelog / Release Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Updated slide numbers and revenue forecast"
                  value={versionChangelog}
                  onChange={(e) => setVersionChangelog(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0F766E] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReplacingDoc(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!versionFile || replacing}
                onClick={handleReplaceVersion}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {replacing ? 'Updating...' : `Promote to v${replacingDoc.currentVersion + 1}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
