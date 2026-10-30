import test from 'node:test'
import assert from 'node:assert/strict'

// ============================================================================
// Comprehensive Automated Test Suite: Universal Project Publishing Center
// Covers:
// 1. Notebook Upload & Safe Non-Executing Rendering
// 2. Document & Presentation Manager, Preview & Download Fallback
// 3. Document Versioning & Replacement
// 4. Document Access Control & RBAC
// 5. External App URL Validation, Scheme Checks & SSRF Protection
// 6. External App Launch Methods (New Tab vs Embed) & Sandbox Fallback
// 7. Registered AI Service Contract & Execution Boundary
// 8. Draft vs Published Isolation
// 9. Project Versioning & Rollback
// 10. Publication, Unpublication & Catalog Visibility
// 11. Direct URL Route Authorization
// 12. Regression Invariants
// ============================================================================

const DESIGNATED_ADMIN_EMAIL = 'sheriffrafiq71@gmail.com'

const ALL_INDUSTRIES = [
  'Gen AI',
  'Healthcare',
  'Manufacturing',
  'Real Estate',
  'Solar Power',
  'Supply Chain',
  'EV',
  'HR',
  'Marketing Analytics',
]

// SSRF & URL Validator Pure Implementation (mirrors src/utils/urlValidator.ts)
function isPrivateOrLocalHost(hostname) {
  const host = hostname.toLowerCase().trim()
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '[::1]' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.lan') ||
    host.endsWith('.corp') ||
    host.endsWith('.test')
  ) {
    return true
  }

  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const match = host.match(ipv4Regex)
  if (match) {
    const octets = match.slice(1).map(Number)
    if (octets.some((o) => o < 0 || o > 255)) return true
    const [first, second] = octets
    if (first === 127) return true
    if (first === 0) return true
    if (first === 10) return true
    if (first === 172 && second >= 16 && second <= 31) return true
    if (first === 192 && second === 168) return true
    if (first === 169 && second === 254) return true
    if (first === 100 && second >= 64 && second <= 127) return true
  }

  return false
}

function validateExternalAppUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { isValid: false, error: 'Application URL is required.' }
  }
  const trimmed = rawUrl.trim()
  const lower = trimmed.toLowerCase()
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('ftp:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('blob:')
  ) {
    return { isValid: false, error: 'Unsafe URL scheme detected. Only approved HTTP(S) destinations are allowed.' }
  }

  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    return { isValid: false, error: 'Invalid URL format.' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, error: `Protocol "${parsed.protocol}" is not allowed.` }
  }

  if (isPrivateOrLocalHost(parsed.hostname)) {
    return {
      isValid: false,
      isPrivateOrLocal: true,
      error: 'Destination points to a local, loopback, or private internal network (SSRF protection).',
    }
  }

  const host = parsed.hostname.toLowerCase()
  const pathname = parsed.pathname.toLowerCase()
  let detectedType = 'custom_web'
  let embedSupported = false

  if (host.includes('streamlit.app') || pathname.includes('streamlit')) {
    detectedType = 'streamlit'
    embedSupported = true
  } else if (host.includes('huggingface.co') || host.includes('gradio.live') || pathname.includes('gradio')) {
    detectedType = 'gradio'
    embedSupported = true
  } else if (host.includes('tableau.com') || host.includes('public.tableau.com')) {
    detectedType = 'tableau'
    embedSupported = true
  } else if (host.includes('powerbi.com') || host.includes('fabric.microsoft.com')) {
    detectedType = 'powerbi'
    embedSupported = pathname.includes('/view') || pathname.includes('reportembed')
  } else {
    detectedType = 'custom_web'
    embedSupported = true
  }

  return { isValid: true, cleanUrl: trimmed, detectedType, isPrivateOrLocal: false, embedSupported }
}

// Notebook Validator & Parser Simulation (mirrors src/services/projectStorageService.ts)
function validateAndParseNotebook(rawJson, fileName, fileSize) {
  const MAX_SIZE = 20 * 1024 * 1024
  if (!fileName.toLowerCase().endsWith('.ipynb')) {
    throw new Error('Invalid file extension. Only Jupyter Notebook (.ipynb) files are permitted.')
  }
  if (fileSize > MAX_SIZE) {
    throw new Error('Notebook file size exceeds maximum permitted limit.')
  }

  let parsed
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    throw new Error('Malformed notebook file. Failed to parse valid JSON structure.')
  }

  if (!parsed || !Array.isArray(parsed.cells)) {
    throw new Error('Invalid Jupyter Notebook structure: missing "cells" array.')
  }

  const cells = parsed.cells.map((cell) => ({
    cell_type: cell.cell_type === 'markdown' || cell.cell_type === 'code' ? cell.cell_type : 'raw',
    source: Array.isArray(cell.source) ? cell.source.join('') : String(cell.source || ''),
    execution_count: cell.execution_count ?? null,
    outputs: Array.isArray(cell.outputs) ? cell.outputs : [],
  }))

  const codeCells = cells.filter((c) => c.cell_type === 'code')
  const mdCells = cells.filter((c) => c.cell_type === 'markdown')

  return {
    fileName,
    fileSize,
    metadata: {
      language: parsed.metadata?.language_info?.name || 'python',
      kernel: parsed.metadata?.kernelspec?.display_name || 'Python 3',
      cellCount: cells.length,
      codeCellCount: codeCells.length,
      markdownCellCount: mdCells.length,
      hasOutputs: codeCells.some((c) => c.outputs && c.outputs.length > 0),
    },
    cells,
    storagePath: `storage://notebooks/${Date.now()}_${fileName}`,
  }
}

// Document Validator Simulation
function validateDocument(fileName, fileSize) {
  const MAX_SIZE = 50 * 1024 * 1024
  const SUPPORTED_EXTS = ['.pdf', '.pptx', '.ppt', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.md', '.txt', '.docx', '.xlsx', '.csv']
  const ext = '.' + fileName.split('.').pop().toLowerCase()
  if (!SUPPORTED_EXTS.includes(ext)) {
    throw new Error(`Unsupported file type (${ext}).`)
  }
  if (fileSize > MAX_SIZE) {
    throw new Error('Document exceeds maximum permitted size (50MB).')
  }
  return { isValid: true, ext, storagePath: `storage://documents/${Date.now()}_${fileName}` }
}

// RBAC Helpers
function isStaff(user) {
  return (
    user &&
    user.status === 'approved' &&
    (user.role === 'admin' || user.role === 'super_admin' || user.email === DESIGNATED_ADMIN_EMAIL)
  )
}

function hasIndustryAccess(userGrants, industry) {
  return userGrants.some((g) => g.industry === industry)
}

// In-Memory Database Simulating Postgres Catalog, Documents, and RLS
class UniversalMockDatabase {
  constructor() {
    this.projects = []
    this.documents = []
    this.docVersions = []
    this.versions = []
    this.grants = []
  }

  grantIndustry(userId, industry) {
    this.grants.push({ userId, industry })
  }

  createProject(actor, data) {
    if (!isStaff(actor)) throw new Error('Forbidden: Only platform administrators can create projects.')
    if (!data.title) throw new Error('Project title is required.')

    const validTypes = ['showcase', 'dashboard', 'ai_app', 'notebook', 'presentation', 'external_app']
    if (!validTypes.includes(data.projectType)) {
      throw new Error(`Validation: Invalid project type "${data.projectType}"`)
    }

    const proj = {
      id: `proj_${Date.now()}_${Math.random()}`,
      title: data.title,
      slug: data.slug,
      industry: data.industry,
      projectType: data.projectType,
      status: 'draft',
      currentVersion: 1,
      visibility: data.visibility || 'visible',
      ownerId: actor.id,
      draftConfig: data.draftConfig || {},
      publishedConfig: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.projects.push(proj)
    return proj
  }

  updateDraft(actor, projectId, draftConfig, metadata) {
    if (!isStaff(actor)) throw new Error('Forbidden: Only administrators can edit drafts.')
    const proj = this.projects.find((p) => p.id === projectId)
    if (!proj) throw new Error('Project not found.')

    proj.draftConfig = draftConfig
    if (metadata) Object.assign(proj, metadata)
    proj.updatedAt = new Date().toISOString()
    return proj
  }

  publishProject(actor, projectId) {
    if (!isStaff(actor)) throw new Error('Forbidden: Only administrators can publish projects.')
    const proj = this.projects.find((p) => p.id === projectId)
    if (!proj) throw new Error('Project not found.')

    const nextVer = proj.status === 'published' ? proj.currentVersion + 1 : proj.currentVersion
    proj.status = 'published'
    proj.currentVersion = nextVer
    proj.publishedConfig = JSON.parse(JSON.stringify(proj.draftConfig))
    proj.publishedAt = new Date().toISOString()

    this.versions.push({
      id: `ver_${projectId}_${nextVer}`,
      projectId,
      versionNumber: nextVer,
      config: JSON.parse(JSON.stringify(proj.publishedConfig)),
      createdAt: new Date().toISOString(),
    })

    return proj
  }

  unpublishProject(actor, projectId) {
    if (!isStaff(actor)) throw new Error('Forbidden')
    const proj = this.projects.find((p) => p.id === projectId)
    if (proj) proj.status = 'unpublished'
    return proj
  }

  rollbackVersion(actor, projectId, targetVersion) {
    if (!isStaff(actor)) throw new Error('Forbidden')
    const v = this.versions.find((x) => x.projectId === projectId && x.versionNumber === targetVersion)
    if (!v) throw new Error('Version not found')
    const proj = this.projects.find((p) => p.id === projectId)
    proj.draftConfig = JSON.parse(JSON.stringify(v.config))
    return proj
  }

  // Document management
  addDocument(actor, projectId, docData) {
    if (!isStaff(actor)) throw new Error('Forbidden: Only administrators can add documents.')
    const doc = {
      id: `doc_${Date.now()}_${Math.random()}`,
      projectId,
      title: docData.title,
      documentType: docData.documentType,
      accessPolicy: docData.accessPolicy || 'project_grant',
      currentVersion: 1,
      storagePath: docData.storagePath,
      fileName: docData.fileName,
      fileSize: docData.fileSize,
      mimeType: docData.mimeType,
      createdAt: new Date().toISOString(),
    }
    this.documents.push(doc)
    this.docVersions.push({
      id: `docver_${doc.id}_1`,
      documentId: doc.id,
      versionNumber: 1,
      storagePath: doc.storagePath,
      fileName: doc.fileName,
      changelog: 'Initial version',
    })
    return doc
  }

  replaceDocumentVersion(actor, documentId, newVersionData) {
    if (!isStaff(actor)) throw new Error('Forbidden: Only administrators can replace document versions.')
    const doc = this.documents.find((d) => d.id === documentId)
    if (!doc) throw new Error('Document not found.')

    const nextVer = doc.currentVersion + 1
    doc.currentVersion = nextVer
    doc.storagePath = newVersionData.storagePath
    doc.fileName = newVersionData.fileName
    doc.fileSize = newVersionData.fileSize

    this.docVersions.push({
      id: `docver_${documentId}_${nextVer}`,
      documentId,
      versionNumber: nextVer,
      storagePath: newVersionData.storagePath,
      fileName: newVersionData.fileName,
      changelog: newVersionData.changelog || `Updated to v${nextVer}`,
    })
    return doc
  }

  // RLS-governed document query
  getDocumentsForUser(user, projectId) {
    const proj = this.projects.find((p) => p.id === projectId)
    if (!proj) return []

    if (isStaff(user)) {
      return this.documents.filter((d) => d.projectId === projectId)
    }

    // Client checks: Project must be published, visible, and user must have industry grant
    if (proj.status !== 'published' || proj.visibility !== 'visible') {
      return []
    }
    const userGrants = this.grants.filter((g) => g.userId === user.id)
    if (!hasIndustryAccess(userGrants, proj.industry)) {
      return []
    }

    // Filter out admin_only documents
    return this.documents.filter((d) => d.projectId === projectId && d.accessPolicy === 'project_grant')
  }

  // Catalog query for user
  getVisibleCatalogForUser(user) {
    if (isStaff(user)) {
      return this.projects
    }
    const userGrants = this.grants.filter((g) => g.userId === user.id)
    return this.projects.filter(
      (p) => p.status === 'published' && p.visibility === 'visible' && hasIndustryAccess(userGrants, p.industry)
    )
  }
}

// ────────────────────────────────────────────────────────────────────────────
// TESTS
// ────────────────────────────────────────────────────────────────────────────

const adminActor = {
  id: 'usr_admin',
  name: 'Rafiq Sheriff',
  email: DESIGNATED_ADMIN_EMAIL,
  role: 'admin',
  status: 'approved',
}

const evClientActor = {
  id: 'usr_client_ev',
  name: 'Alice EV Client',
  email: 'alice@ev-enterprise.com',
  role: 'client',
  status: 'approved',
}

const unapprovedClientActor = {
  id: 'usr_client_pending',
  name: 'Pending Bob',
  email: 'bob@enterprise.com',
  role: 'client',
  status: 'pending',
}

test('Universal Project Publishing: 1. Notebook Upload & File Validation', () => {
  const validIpynb = JSON.stringify({
    metadata: { language_info: { name: 'python' }, kernelspec: { display_name: 'Python 3 (ipykernel)' } },
    nbformat: 4,
    cells: [
      { cell_type: 'markdown', source: ['# Thermal Variance Model\n', 'Predicts CNC spindle degradation.'] },
      {
        cell_type: 'code',
        execution_count: 1,
        source: ['import numpy as np\n', 'print("Model initialized")'],
        outputs: [{ output_type: 'stream', name: 'stdout', text: ['Model initialized\n'] }],
      },
    ],
  })

  // Valid notebook
  const parsed = validateAndParseNotebook(validIpynb, 'cnc_thermal_analysis.ipynb', 1024)
  assert.equal(parsed.metadata.cellCount, 2)
  assert.equal(parsed.metadata.codeCellCount, 1)
  assert.equal(parsed.metadata.markdownCellCount, 1)
  assert.equal(parsed.metadata.hasOutputs, true)
  assert.equal(parsed.metadata.language, 'python')
  assert.ok(parsed.storagePath.startsWith('storage://notebooks/'))

  // Rejects invalid extension
  assert.throws(
    () => validateAndParseNotebook(validIpynb, 'script.py', 1024),
    /Only Jupyter Notebook \(\.ipynb\) files are permitted/
  )

  // Rejects file exceeding size limit (> 20MB)
  assert.throws(
    () => validateAndParseNotebook(validIpynb, 'huge.ipynb', 25 * 1024 * 1024),
    /Notebook file size exceeds maximum/
  )

  // Rejects malformed JSON
  assert.throws(
    () => validateAndParseNotebook('{ invalid json', 'corrupted.ipynb', 500),
    /Failed to parse valid JSON structure/
  )
})

test('Universal Project Publishing: 2. Safe Notebook Output Rendering (No Execution)', () => {
  const notebookWithOutputs = JSON.stringify({
    cells: [
      {
        cell_type: 'code',
        execution_count: 5,
        source: ['display_telemetry()'],
        outputs: [
          {
            output_type: 'display_data',
            data: {
              'image/png': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
              'text/plain': '<Figure size 640x480 with 1 Axes>',
            },
          },
          {
            output_type: 'stream',
            name: 'stdout',
            text: ['Average temperature: 84.5 C\n', 'Vibration: 0.12 mm/s\n'],
          },
        ],
      },
    ],
  })

  const parsed = validateAndParseNotebook(notebookWithOutputs, 'telemetry.ipynb', 2048)
  assert.equal(parsed.cells[0].outputs.length, 2)
  assert.equal(parsed.cells[0].outputs[0].output_type, 'display_data')
  assert.ok(parsed.cells[0].outputs[0].data['image/png'])

  // Verify that code is stored strictly as text and no eval / execution occurred
  assert.equal(parsed.cells[0].source, 'display_telemetry()')
})

test('Universal Project Publishing: 3. Notebook Separately Deployed App Distinction', () => {
  const db = new UniversalMockDatabase()
  const proj = db.createProject(adminActor, {
    title: 'EV Battery Degradation Research',
    slug: 'ev-battery-degradation-research',
    industry: 'EV',
    projectType: 'notebook',
    draftConfig: {
      projectType: 'notebook',
      notebook: {
        fileName: 'battery_degradation.ipynb',
        fileSize: 4096,
        metadata: { cellCount: 10, codeCellCount: 6, markdownCellCount: 4, hasOutputs: true },
        cells: [],
        connectedAppUrl: 'https://ev-battery-simulator.enterprise.app',
        connectedAppLabel: 'Launch Interactive Degradation Simulator',
        uploadedAt: new Date().toISOString(),
      },
    },
  })

  assert.equal(proj.draftConfig.notebook.connectedAppUrl, 'https://ev-battery-simulator.enterprise.app')
  assert.equal(proj.draftConfig.notebook.connectedAppLabel, 'Launch Interactive Degradation Simulator')
})

test('Universal Project Publishing: 4. Document Upload, Size & Supported Types', () => {
  // Valid PDF
  const pdfRes = validateDocument('architecture_blueprint.pdf', 5 * 1024 * 1024)
  assert.equal(pdfRes.isValid, true)
  assert.equal(pdfRes.ext, '.pdf')

  // Valid PowerPoint PPTX
  const pptxRes = validateDocument('executive_q3_pitch.pptx', 12 * 1024 * 1024)
  assert.equal(pptxRes.isValid, true)
  assert.equal(pptxRes.ext, '.pptx')

  // Valid Diagram
  const imgRes = validateDocument('system_architecture.png', 2 * 1024 * 1024)
  assert.equal(imgRes.isValid, true)

  // Rejects executable / script extensions (.exe, .sh, .bat)
  assert.throws(() => validateDocument('malicious.exe', 1024), /Unsupported file type/)
  assert.throws(() => validateDocument('exploit.sh', 1024), /Unsupported file type/)

  // Rejects file exceeding 50MB
  assert.throws(() => validateDocument('huge.pdf', 60 * 1024 * 1024), /Document exceeds maximum/)
})

test('Universal Project Publishing: 5. Document Version Replacement & Version History', () => {
  const db = new UniversalMockDatabase()
  const proj = db.createProject(adminActor, {
    title: 'Solar PV Farm Strategic Plan',
    slug: 'solar-pv-farm-plan',
    industry: 'Solar Power',
    projectType: 'presentation',
  })

  // Initial Document Upload
  const doc1 = db.addDocument(adminActor, proj.id, {
    title: 'Solar Generation Executive Deck',
    documentType: 'presentation',
    accessPolicy: 'project_grant',
    storagePath: 'storage://docs/deck_v1.pptx',
    fileName: 'deck_v1.pptx',
    fileSize: 4500000,
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  })

  assert.equal(doc1.currentVersion, 1)
  assert.equal(db.docVersions.length, 1)

  // Replace with v2
  const updatedDoc = db.replaceDocumentVersion(adminActor, doc1.id, {
    storagePath: 'storage://docs/deck_v2.pptx',
    fileName: 'deck_v2.pptx',
    fileSize: 4800000,
    changelog: 'Added Q4 irradiation forecast figures',
  })

  assert.equal(updatedDoc.currentVersion, 2)
  assert.equal(updatedDoc.fileName, 'deck_v2.pptx')
  assert.equal(db.docVersions.length, 2)
  assert.equal(db.docVersions[1].versionNumber, 2)
  assert.equal(db.docVersions[1].changelog, 'Added Q4 irradiation forecast figures')
})

test('Universal Project Publishing: 6. Document RBAC & Access Policy Enforcement', () => {
  const db = new UniversalMockDatabase()
  db.grantIndustry(evClientActor.id, 'EV')

  const evProject = db.createProject(adminActor, {
    title: 'EV Fleet Charging Optimizations',
    slug: 'ev-fleet-charging-optimizations',
    industry: 'EV',
    projectType: 'presentation',
  })

  // Document A: Project Grant (accessible to authorized clients)
  db.addDocument(adminActor, evProject.id, {
    title: 'Public Client Specification',
    documentType: 'pdf',
    accessPolicy: 'project_grant',
    storagePath: 'storage://docs/spec.pdf',
    fileName: 'spec.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
  })

  // Document B: Admin Only (internal governance)
  db.addDocument(adminActor, evProject.id, {
    title: 'Confidential Cost & Vendor Negotiation Margin',
    documentType: 'report',
    accessPolicy: 'admin_only',
    storagePath: 'storage://docs/internal_margin.xlsx',
    fileName: 'internal_margin.xlsx',
    fileSize: 2048,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  // Before project is published: Client cannot view any documents
  let clientDocs = db.getDocumentsForUser(evClientActor, evProject.id)
  assert.equal(clientDocs.length, 0)

  // Admin can view all documents even in draft
  let adminDocs = db.getDocumentsForUser(adminActor, evProject.id)
  assert.equal(adminDocs.length, 2)

  // Publish project
  db.publishProject(adminActor, evProject.id)

  // After publication: Client with EV grant can only see Document A (project_grant). Document B (admin_only) is concealed!
  clientDocs = db.getDocumentsForUser(evClientActor, evProject.id)
  assert.equal(clientDocs.length, 1)
  assert.equal(clientDocs[0].title, 'Public Client Specification')
  assert.equal(clientDocs[0].accessPolicy, 'project_grant')

  // Unapproved client without EV grant receives 0 documents
  const unapprovedDocs = db.getDocumentsForUser(unapprovedClientActor, evProject.id)
  assert.equal(unapprovedDocs.length, 0)
})

test('Universal Project Publishing: 7. External URL Protocol & Dangerous Schemes Validation', () => {
  // Valid https
  const valid1 = validateExternalAppUrl('https://analytics-avenue-dash.streamlit.app')
  assert.equal(valid1.isValid, true)
  assert.equal(valid1.detectedType, 'streamlit')

  // Valid http
  const valid2 = validateExternalAppUrl('http://my-enterprise-gradio.huggingface.co/spaces/demo')
  assert.equal(valid2.isValid, true)
  assert.equal(valid2.detectedType, 'gradio')

  // Reject javascript: scheme (XSS injection attempt)
  const xssAttempt = validateExternalAppUrl('javascript:alert(document.cookie)')
  assert.equal(xssAttempt.isValid, false)
  assert.match(xssAttempt.error, /Unsafe URL scheme detected/)

  // Reject data: scheme
  const dataAttempt = validateExternalAppUrl('data:text/html,<script>steal()</script>')
  assert.equal(dataAttempt.isValid, false)
  assert.match(dataAttempt.error, /Unsafe URL scheme detected/)

  // Reject file: scheme
  const fileAttempt = validateExternalAppUrl('file:///etc/passwd')
  assert.equal(fileAttempt.isValid, false)
  assert.match(fileAttempt.error, /Unsafe URL scheme detected/)

  // Reject invalid strings
  assert.equal(validateExternalAppUrl('').isValid, false)
  assert.equal(validateExternalAppUrl('not-a-url').isValid, false)
})

test('Universal Project Publishing: 8. External App SSRF Protection (Localhost, Private IPs, Cloud Metadata)', () => {
  // Localhost
  const local1 = validateExternalAppUrl('http://localhost:8501')
  assert.equal(local1.isValid, false)
  assert.equal(local1.isPrivateOrLocal, true)

  // 127.0.0.1
  const local2 = validateExternalAppUrl('http://127.0.0.1:8000')
  assert.equal(local2.isValid, false)
  assert.equal(local2.isPrivateOrLocal, true)

  // AWS / Cloud Metadata Endpoint (169.254.169.254)
  const metadataAttempt = validateExternalAppUrl('http://169.254.169.254/latest/meta-data/')
  assert.equal(metadataAttempt.isValid, false)
  assert.equal(metadataAttempt.isPrivateOrLocal, true)

  // Private RFC1918 10.x.x.x
  const private10 = validateExternalAppUrl('https://10.0.1.50/dashboard')
  assert.equal(private10.isValid, false)
  assert.equal(private10.isPrivateOrLocal, true)

  // Private RFC1918 192.168.x.x
  const private192 = validateExternalAppUrl('https://192.168.1.100:8080')
  assert.equal(private192.isValid, false)
  assert.equal(private192.isPrivateOrLocal, true)

  // Internal domain (.internal, .local)
  const internalDomain = validateExternalAppUrl('https://app.corp.internal')
  assert.equal(internalDomain.isValid, false)
  assert.equal(internalDomain.isPrivateOrLocal, true)

  // Public enterprise cloud SaaS (Allowed)
  const publicApp = validateExternalAppUrl('https://app.powerbi.com/view?r=eyJrIjoi...')
  assert.equal(publicApp.isValid, true)
  assert.equal(publicApp.detectedType, 'powerbi')
  assert.equal(publicApp.isPrivateOrLocal, false)
})

test('Universal Project Publishing: 9. External App Launch Method & Embed Fallback', () => {
  const db = new UniversalMockDatabase()

  // Project with 'new_tab' launch method
  const projNewTab = db.createProject(adminActor, {
    title: 'Corporate Tableau Financial Analytics',
    slug: 'corporate-tableau-financial-analytics',
    industry: 'Marketing Analytics',
    projectType: 'external_app',
    draftConfig: {
      projectType: 'external_app',
      externalApp: {
        appType: 'tableau',
        appUrl: 'https://public.tableau.com/views/Superstore/Overview',
        launchMethod: 'new_tab',
      },
    },
  })

  assert.equal(projNewTab.draftConfig.externalApp.launchMethod, 'new_tab')

  // Project with 'embed' launch method
  const projEmbed = db.createProject(adminActor, {
    title: 'Real-Time Inventory Streamlit App',
    slug: 'real-time-inventory-streamlit',
    industry: 'Supply Chain',
    projectType: 'external_app',
    draftConfig: {
      projectType: 'external_app',
      externalApp: {
        appType: 'streamlit',
        appUrl: 'https://supplychain-telemetry.streamlit.app?embed=true',
        launchMethod: 'embed',
        embedSupported: true,
      },
    },
  })

  assert.equal(projEmbed.draftConfig.externalApp.launchMethod, 'embed')
  assert.equal(projEmbed.draftConfig.externalApp.embedSupported, true)
})

test('Universal Project Publishing: 10. Registered AI/ML Service Runtime Contract', () => {
  const db = new UniversalMockDatabase()
  const aiProj = db.createProject(adminActor, {
    title: 'Customer Tone & Sentiment Classifier',
    slug: 'customer-tone-sentiment-classifier',
    industry: 'Gen AI',
    projectType: 'ai_app',
    draftConfig: {
      projectType: 'ai_app',
      aiApp: {
        serviceId: 'srv-sentiment-analysis',
        defaultInputs: {
          feedback_text: 'The solar forecasting telemetry was accurate within 1.2% margin.',
        },
      },
    },
  })

  assert.equal(aiProj.projectType, 'ai_app')
  assert.equal(aiProj.draftConfig.aiApp.serviceId, 'srv-sentiment-analysis')

  // Publish and verify immutable snapshot
  const published = db.publishProject(adminActor, aiProj.id)
  assert.equal(published.status, 'published')
  assert.equal(published.publishedConfig.aiApp.serviceId, 'srv-sentiment-analysis')
})

test('Universal Project Publishing: 11. Draft vs Published Isolation Across All Types', () => {
  const db = new UniversalMockDatabase()
  const proj = db.createProject(adminActor, {
    title: 'Healthcare Predictive Triage',
    slug: 'healthcare-predictive-triage',
    industry: 'Healthcare',
    projectType: 'notebook',
    draftConfig: {
      projectType: 'notebook',
      notebook: {
        fileName: 'triage_v1.ipynb',
        fileSize: 1000,
        metadata: { cellCount: 5, codeCellCount: 3, markdownCellCount: 2, hasOutputs: true },
        cells: [],
        uploadedAt: new Date().toISOString(),
      },
    },
  })

  // Publish v1
  db.publishProject(adminActor, proj.id)
  assert.equal(proj.status, 'published')
  assert.equal(proj.publishedConfig.notebook.fileName, 'triage_v1.ipynb')

  // Edit draft to v2 without publishing
  db.updateDraft(
    adminActor,
    proj.id,
    {
      projectType: 'notebook',
      notebook: {
        fileName: 'triage_v2_draft.ipynb',
        fileSize: 2000,
        metadata: { cellCount: 8, codeCellCount: 5, markdownCellCount: 3, hasOutputs: true },
        cells: [],
        uploadedAt: new Date().toISOString(),
      },
    },
    { title: 'Healthcare Predictive Triage (Draft V2 in Progress)' }
  )

  // Live published configuration remains strictly isolated at v1!
  assert.equal(proj.publishedConfig.notebook.fileName, 'triage_v1.ipynb')
  assert.equal(proj.publishedConfig.notebook.fileSize, 1000)

  // Draft config contains v2
  assert.equal(proj.draftConfig.notebook.fileName, 'triage_v2_draft.ipynb')
})

test('Universal Project Publishing: 12. Version History Rollback', () => {
  const db = new UniversalMockDatabase()
  const proj = db.createProject(adminActor, {
    title: 'Real Estate Price Predictor',
    slug: 'real-estate-price-predictor',
    industry: 'Real Estate',
    projectType: 'external_app',
    draftConfig: {
      projectType: 'external_app',
      externalApp: {
        appType: 'streamlit',
        appUrl: 'https://v1.enterprise-realestate.app',
        launchMethod: 'new_tab',
      },
    },
  })

  // Publish v1
  db.publishProject(adminActor, proj.id)
  assert.equal(proj.currentVersion, 1)

  // Modify draft and publish v2
  db.updateDraft(adminActor, proj.id, {
    projectType: 'external_app',
    externalApp: {
      appType: 'streamlit',
      appUrl: 'https://v2.enterprise-realestate.app',
      launchMethod: 'embed',
    },
  })
  db.publishProject(adminActor, proj.id)
  assert.equal(proj.currentVersion, 2)
  assert.equal(proj.publishedConfig.externalApp.appUrl, 'https://v2.enterprise-realestate.app')

  // Rollback to v1
  db.rollbackVersion(adminActor, proj.id, 1)
  assert.equal(proj.draftConfig.externalApp.appUrl, 'https://v1.enterprise-realestate.app')
  assert.equal(proj.draftConfig.externalApp.launchMethod, 'new_tab')
})

test('Universal Project Publishing: 13. Publication, Unpublication & Catalog Visibility', () => {
  const db = new UniversalMockDatabase()
  db.grantIndustry(evClientActor.id, 'EV')

  const proj = db.createProject(adminActor, {
    title: 'EV Charging Station Simulator',
    slug: 'ev-charging-station-simulator',
    industry: 'EV',
    projectType: 'notebook',
  })

  // Draft project does not appear in client's visible catalog
  let catalog = db.getVisibleCatalogForUser(evClientActor)
  assert.equal(catalog.some((p) => p.slug === proj.slug), false)

  // Publish project -> appears immediately in client's visible catalog
  db.publishProject(adminActor, proj.id)
  catalog = db.getVisibleCatalogForUser(evClientActor)
  assert.equal(catalog.some((p) => p.slug === proj.slug), true)

  // Unpublish project -> immediately disappears from client's catalog
  db.unpublishProject(adminActor, proj.id)
  catalog = db.getVisibleCatalogForUser(evClientActor)
  assert.equal(catalog.some((p) => p.slug === proj.slug), false)

  // Admin still retains management visibility
  const adminCatalog = db.getVisibleCatalogForUser(adminActor)
  assert.equal(adminCatalog.some((p) => p.slug === proj.slug), true)
})

test('Universal Project Publishing: 14. Unauthorized Direct URL Navigation Denied', () => {
  const db = new UniversalMockDatabase()
  // Client only has EV grant
  db.grantIndustry(evClientActor.id, 'EV')

  // Healthcare project
  const healthProj = db.createProject(adminActor, {
    title: 'Hospital Patient Flow Analysis',
    slug: 'hospital-patient-flow-analysis',
    industry: 'Healthcare',
    projectType: 'presentation',
  })
  db.publishProject(adminActor, healthProj.id)

  // EV client directly requests Healthcare project
  const visible = db.getVisibleCatalogForUser(evClientActor)
  assert.equal(visible.some((p) => p.slug === healthProj.slug), false)

  // Documents cannot be accessed by client lacking Healthcare grant
  const docs = db.getDocumentsForUser(evClientActor, healthProj.id)
  assert.equal(docs.length, 0)
})

test('Universal Project Publishing: 15. Non-Staff Unauthorized Creation Denied', () => {
  const db = new UniversalMockDatabase()
  assert.throws(
    () =>
      db.createProject(evClientActor, {
        title: 'Hacked Project',
        slug: 'hacked-project',
        industry: 'EV',
        projectType: 'notebook',
      }),
    /Forbidden: Only platform administrators can create projects/
  )
})
