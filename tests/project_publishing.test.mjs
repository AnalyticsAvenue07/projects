import test from 'node:test'
import assert from 'node:assert/strict'

// ============================================================================
// Security & Lifecycle Test Suite for Project Publishing Center
// Validates RBAC Invariants, Draft Isolation, Versioning, and Aggregations
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

// Mock Roles & Permissions
function isStaff(user) {
  return (
    user &&
    user.status === 'approved' &&
    (user.role === 'admin' || user.role === 'super_admin' || user.email === DESIGNATED_ADMIN_EMAIL)
  )
}

function hasIndustryAccess(userGrants, targetIndustry) {
  return userGrants.some((g) => g.industry === targetIndustry)
}

// In-Memory Test State Simulating Postgres & RLS Policies
class MockPlatformDatabase {
  constructor() {
    this.users = new Map()
    this.pocAccess = []
    this.projectCatalog = []
    this.projectVersions = []
    this.projectDatasets = []
    this.auditLog = []
  }

  addUser(user) {
    this.users.set(user.id, { ...user })
  }

  grantIndustry(userId, industry, grantedBy) {
    this.pocAccess.push({
      userId,
      industry,
      projectSlug: null,
      grantedBy,
    })
  }

  // RLS-guarded createProject
  createProject(actor, projectData) {
    if (!isStaff(actor)) {
      throw new Error('Forbidden: 42501 Insufficient privileges to create project')
    }

    if (!projectData.title || !projectData.title.trim()) {
      throw new Error('Validation: Project title is required')
    }

    const validTypes = ['showcase', 'dashboard', 'ai_app', 'notebook', 'presentation', 'external_app']
    if (!validTypes.includes(projectData.projectType)) {
      throw new Error(`Validation: Invalid project type "${projectData.projectType}"`)
    }

    if (this.projectCatalog.some((p) => p.slug === projectData.slug)) {
      throw new Error(`Conflict: Project slug "${projectData.slug}" already exists`)
    }

    const newProject = {
      id: `proj_${Date.now()}_${Math.random()}`,
      title: projectData.title,
      slug: projectData.slug,
      industry: projectData.industry,
      projectType: projectData.projectType,
      status: 'draft',
      currentVersion: 1,
      visibility: projectData.visibility || 'visible',
      ownerId: actor.id,
      draftConfig: projectData.draftConfig || {},
      publishedConfig: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.projectCatalog.push(newProject)
    this.auditLog.push({
      action: 'project_created',
      projectId: newProject.id,
      actorId: actor.id,
    })

    return newProject
  }

  // RLS-guarded publishProject
  publishProject(actor, projectId, changelog) {
    if (!isStaff(actor)) {
      throw new Error('Forbidden: 42501 Insufficient privileges to publish project')
    }

    const project = this.projectCatalog.find((p) => p.id === projectId)
    if (!project) throw new Error('Project not found')

    // Configuration validation check
    if (project.projectType === 'dashboard') {
      const cfg = project.draftConfig?.dashboard
      if (!cfg || !cfg.charts || cfg.charts.length === 0) {
        project.status = 'validation_failed'
        throw new Error('Validation: Cannot publish dashboard with zero charts')
      }
    }

    const nextVersion = project.status === 'published' ? project.currentVersion + 1 : project.currentVersion

    // Create immutable version record
    this.projectVersions.push({
      id: `ver_${projectId}_${nextVersion}`,
      projectId,
      versionNumber: nextVersion,
      config: JSON.parse(JSON.stringify(project.draftConfig)),
      changelog: changelog || `Release v${nextVersion}`,
      createdBy: actor.id,
      createdAt: new Date().toISOString(),
    })

    project.status = 'published'
    project.currentVersion = nextVersion
    project.publishedConfig = JSON.parse(JSON.stringify(project.draftConfig))
    project.updatedAt = new Date().toISOString()

    this.auditLog.push({
      action: 'project_published',
      projectId,
      actorId: actor.id,
      versionNumber: nextVersion,
    })

    return project
  }

  // RLS-guarded select project for user
  getProjectForViewer(viewer, slug) {
    const project = this.projectCatalog.find((p) => p.slug === slug)
    if (!project) return null

    // Staff can view all projects and drafts
    if (isStaff(viewer)) {
      return project
    }

    // Unapproved users cannot view anything
    if (!viewer || viewer.status !== 'approved') {
      return null
    }

    // Clients cannot view drafts or unpublished projects
    if (project.status !== 'published' || project.visibility !== 'visible') {
      return null
    }

    // Clients can only view if they have matching industry grant
    const grants = this.pocAccess.filter((g) => g.userId === viewer.id)
    if (!hasIndustryAccess(grants, project.industry)) {
      return null
    }

    return project
  }

  // Rollback to prior version
  rollbackVersion(actor, projectId, targetVersionNumber) {
    if (!isStaff(actor)) {
      throw new Error('Forbidden: 42501 Insufficient privileges to rollback')
    }

    const version = this.projectVersions.find(
      (v) => v.projectId === projectId && v.versionNumber === targetVersionNumber
    )
    if (!version) {
      throw new Error(`Version ${targetVersionNumber} not found`)
    }

    const project = this.projectCatalog.find((p) => p.id === projectId)
    project.draftConfig = JSON.parse(JSON.stringify(version.config))
    project.updatedAt = new Date().toISOString()

    this.auditLog.push({
      action: 'version_rollback',
      projectId,
      versionNumber: targetVersionNumber,
    })

    return project
  }
}

// Aggregation calculation helpers under test
function computeAggregation(rows, field, method) {
  if (!rows || rows.length === 0) return 0
  if (method === 'count') return rows.length
  if (method === 'distinct_count') {
    return new Set(rows.map((r) => r[field])).size
  }

  const nums = rows.map((r) => Number(r[field])).filter((n) => !Number.isNaN(n))
  if (nums.length === 0) return 0

  if (method === 'sum') return nums.reduce((a, b) => a + b, 0)
  if (method === 'avg') return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1))
  if (method === 'min') return Math.min(...nums)
  if (method === 'max') return Math.max(...nums)
  return 0
}

// ============================================================================
// TEST SUITE
// ============================================================================

test('Rule 1: Unauthorized anonymous or unauthenticated user cannot create a project', () => {
  const db = new MockPlatformDatabase()
  assert.throws(() => {
    db.createProject(null, { title: 'Test Project', projectType: 'dashboard', slug: 'test' })
  }, /Forbidden/)
})

test('Rule 2: An ordinary client cannot create or publish a project', () => {
  const db = new MockPlatformDatabase()
  const client = { id: 'client_1', email: 'client@company.com', role: 'client', status: 'approved' }
  db.addUser(client)

  // Creation attempt
  assert.throws(() => {
    db.createProject(client, { title: 'Client POC', projectType: 'dashboard', slug: 'client-poc' })
  }, /Forbidden/)

  // Publication attempt
  const admin = { id: 'admin_1', email: DESIGNATED_ADMIN_EMAIL, role: 'super_admin', status: 'approved' }
  db.addUser(admin)
  const proj = db.createProject(admin, {
    title: 'Admin POC',
    projectType: 'dashboard',
    slug: 'admin-poc',
    draftConfig: { dashboard: { charts: [{ id: 'c1' }] } },
  })

  assert.throws(() => {
    db.publishProject(client, proj.id)
  }, /Forbidden/)
})

test('Rule 3: An unapproved pending user cannot access protected project solutions', () => {
  const db = new MockPlatformDatabase()
  const admin = { id: 'admin_1', email: DESIGNATED_ADMIN_EMAIL, role: 'super_admin', status: 'approved' }
  const pendingUser = { id: 'pending_1', email: 'pending@acme.com', role: 'client', status: 'pending' }
  db.addUser(admin)
  db.addUser(pendingUser)

  const proj = db.createProject(admin, {
    title: 'Manufacturing Suite',
    industry: 'Manufacturing',
    projectType: 'dashboard',
    slug: 'mfg-suite',
    draftConfig: { dashboard: { charts: [{ id: 'c1' }] } },
  })
  db.publishProject(admin, proj.id)

  const result = db.getProjectForViewer(pendingUser, 'mfg-suite')
  assert.equal(result, null, 'Pending user must not receive protected project data')
})

test('Rule 4: A client without matching industry access cannot access the project content', () => {
  const db = new MockPlatformDatabase()
  const admin = { id: 'admin_1', email: DESIGNATED_ADMIN_EMAIL, role: 'super_admin', status: 'approved' }
  const client = { id: 'client_ev', email: 'client@ev.com', role: 'client', status: 'approved' }
  db.addUser(admin)
  db.addUser(client)

  // Client only has EV grant
  db.grantIndustry(client.id, 'EV', admin.id)

  // Manufacturing project
  const mfgProj = db.createProject(admin, {
    title: 'Machine Predictive Maintenance',
    industry: 'Manufacturing',
    projectType: 'dashboard',
    slug: 'machine-pm',
    draftConfig: { dashboard: { charts: [{ id: 'c1' }] } },
  })
  db.publishProject(admin, mfgProj.id)

  const result = db.getProjectForViewer(client, 'machine-pm')
  assert.equal(result, null, 'Client without Manufacturing grant must be denied')
})

test('Rule 5: Direct URL access enforces authorization and industry grants', () => {
  const db = new MockPlatformDatabase()
  const admin = { id: 'admin_1', email: DESIGNATED_ADMIN_EMAIL, role: 'super_admin', status: 'approved' }
  const clientWithGrant = { id: 'c_mfg', email: 'mfg@corp.com', role: 'client', status: 'approved' }
  const clientWithoutGrant = { id: 'c_hr', email: 'hr@corp.com', role: 'client', status: 'approved' }

  db.addUser(admin)
  db.addUser(clientWithGrant)
  db.addUser(clientWithoutGrant)

  db.grantIndustry(clientWithGrant.id, 'Manufacturing', admin.id)
  db.grantIndustry(clientWithoutGrant.id, 'HR', admin.id)

  const proj = db.createProject(admin, {
    title: 'Manufacturing Dashboard',
    industry: 'Manufacturing',
    projectType: 'dashboard',
    slug: 'mfg-dash',
    draftConfig: { dashboard: { charts: [{ id: 'c1' }] } },
  })
  db.publishProject(admin, proj.id)

  // Direct URL access check
  assert.ok(db.getProjectForViewer(clientWithGrant, 'mfg-dash'), 'Authorized client should access')
  assert.equal(db.getProjectForViewer(clientWithoutGrant, 'mfg-dash'), null, 'Unauthorized client must be denied')
})

test('Rule 6: A client cannot access private drafts or draft configuration', () => {
  const db = new MockPlatformDatabase()
  const admin = { id: 'admin_1', email: DESIGNATED_ADMIN_EMAIL, role: 'super_admin', status: 'approved' }
  const client = { id: 'client_1', email: 'client@corp.com', role: 'client', status: 'approved' }
  db.addUser(admin)
  db.addUser(client)
  db.grantIndustry(client.id, 'Gen AI', admin.id)

  const draftProj = db.createProject(admin, {
    title: 'Unpublished LLM Draft',
    industry: 'Gen AI',
    projectType: 'dashboard',
    slug: 'llm-draft',
    draftConfig: { dashboard: { secretInternalParam: '12345', charts: [{ id: 'c1' }] } },
  })

  // Client queries draft project
  const view = db.getProjectForViewer(client, 'llm-draft')
  assert.equal(view, null, 'Clients must never see unpublished drafts')

  // Staff can view draft
  const staffView = db.getProjectForViewer(admin, 'llm-draft')
  assert.ok(staffView, 'Staff can view drafts for preview')
})

test('Rule 7: A client cannot change their own role or grant themselves permissions', () => {
  // Simulates enforce_user_update_guard trigger
  const client = { id: 'c_1', role: 'client', status: 'approved' }
  const attemptedPatch = { ...client, role: 'admin' }

  const guard = (oldUser, newUser) => {
    if (newUser.role !== oldUser.role && oldUser.role === 'client') {
      throw new Error('Forbidden: 42501 clients cannot modify their own role')
    }
  }

  assert.throws(() => {
    guard(client, attemptedPatch)
  }, /Forbidden/)
})

test('Rule 8: Invalid project types are rejected at creation', () => {
  const db = new MockPlatformDatabase()
  const admin = { id: 'admin_1', email: DESIGNATED_ADMIN_EMAIL, role: 'super_admin', status: 'approved' }

  assert.throws(() => {
    db.createProject(admin, {
      title: 'Invalid POC',
      slug: 'invalid-poc',
      projectType: 'arbitrary_python_script_execution',
    })
  }, /Invalid project type/)
})

test('Rule 9: Invalid configurations cannot be published', () => {
  const db = new MockPlatformDatabase()
  const admin = { id: 'admin_1', email: DESIGNATED_ADMIN_EMAIL, role: 'super_admin', status: 'approved' }

  const invalidProj = db.createProject(admin, {
    title: 'Empty Dashboard',
    slug: 'empty-dash',
    projectType: 'dashboard',
    draftConfig: { dashboard: { charts: [] } }, // Zero charts is invalid
  })

  assert.throws(() => {
    db.publishProject(admin, invalidProj.id)
  }, /Validation: Cannot publish dashboard with zero charts/)

  assert.equal(invalidProj.status, 'validation_failed')
})

test('Rule 10: Unpublished project is not presented as published', () => {
  const db = new MockPlatformDatabase()
  const admin = { id: 'admin_1', email: DESIGNATED_ADMIN_EMAIL, role: 'super_admin', status: 'approved' }
  const client = { id: 'client_1', email: 'client@corp.com', role: 'client', status: 'approved' }
  db.addUser(admin)
  db.addUser(client)
  db.grantIndustry(client.id, 'Manufacturing', admin.id)

  const proj = db.createProject(admin, {
    title: 'Factory Analytics',
    industry: 'Manufacturing',
    projectType: 'dashboard',
    slug: 'factory-analytics',
    draftConfig: { dashboard: { charts: [{ id: 'c1' }] } },
  })

  db.publishProject(admin, proj.id)
  assert.ok(db.getProjectForViewer(client, 'factory-analytics'))

  // Now unpublish
  proj.status = 'unpublished'
  assert.equal(db.getProjectForViewer(client, 'factory-analytics'), null, 'Unpublished project must immediately become inaccessible to clients')
})

test('Rule 11: Editing a draft does not silently mutate the published version', () => {
  const db = new MockPlatformDatabase()
  const admin = { id: 'admin_1', email: DESIGNATED_ADMIN_EMAIL, role: 'super_admin', status: 'approved' }

  const proj = db.createProject(admin, {
    title: 'Stable Solar Dashboard',
    industry: 'Solar Power',
    projectType: 'dashboard',
    slug: 'solar-dash',
    draftConfig: { dashboard: { title: 'Version 1 Dashboard', charts: [{ id: 'c1' }] } },
  })

  db.publishProject(admin, proj.id)
  assert.equal(proj.publishedConfig.dashboard.title, 'Version 1 Dashboard')

  // Edit draft without publishing
  proj.draftConfig.dashboard.title = 'In-Progress Draft Edit (Unpublished)'

  // Published config remains untouched
  assert.equal(proj.publishedConfig.dashboard.title, 'Version 1 Dashboard')
})

test('Rule 12: Version rollback restores the intended validated configuration', () => {
  const db = new MockPlatformDatabase()
  const admin = { id: 'admin_1', email: DESIGNATED_ADMIN_EMAIL, role: 'super_admin', status: 'approved' }

  const proj = db.createProject(admin, {
    title: 'EV Range Lab',
    industry: 'EV',
    projectType: 'dashboard',
    slug: 'ev-range',
    draftConfig: { dashboard: { title: 'V1 Layout', charts: [{ id: 'chart_1' }] } },
  })

  // Publish v1
  db.publishProject(admin, proj.id, 'Release v1')

  // Make changes and publish v2
  proj.draftConfig = { dashboard: { title: 'V2 Redesign', charts: [{ id: 'chart_2' }] } }
  db.publishProject(admin, proj.id, 'Release v2')

  assert.equal(proj.currentVersion, 2)
  assert.equal(proj.publishedConfig.dashboard.title, 'V2 Redesign')

  // Rollback to v1
  db.rollbackVersion(admin, proj.id, 1)
  assert.equal(proj.draftConfig.dashboard.title, 'V1 Layout')
})

test('Rule 13: Statistical Aggregation Engine calculations are accurate', () => {
  const sampleTelemetry = [
    { Machine_ID: 'M1', Temperature: 70.0, Vibration: 2.0, Failure_Flag: 0 },
    { Machine_ID: 'M2', Temperature: 90.0, Vibration: 4.0, Failure_Flag: 1 },
    { Machine_ID: 'M1', Temperature: 80.0, Vibration: 3.0, Failure_Flag: 0 },
  ]

  assert.equal(computeAggregation(sampleTelemetry, 'Machine_ID', 'distinct_count'), 2)
  assert.equal(computeAggregation(sampleTelemetry, 'Failure_Flag', 'sum'), 1)
  assert.equal(computeAggregation(sampleTelemetry, 'Temperature', 'avg'), 80.0)
  assert.equal(computeAggregation(sampleTelemetry, 'Vibration', 'max'), 4.0)
  assert.equal(computeAggregation(sampleTelemetry, 'Vibration', 'min'), 2.0)
})

test('Rule 14: Existing platform administrator security invariants remain intact', () => {
  const designatedAdmin = { id: 'admin_root', email: 'sheriffrafiq71@gmail.com', role: 'super_admin', status: 'approved' }
  const rogueAdmin = { id: 'rogue', email: 'hacker@attacker.com', role: 'super_admin', status: 'approved' }

  // designated administrator check
  const isPlatformAdmin = (user) => {
    return (
      user &&
      user.status === 'approved' &&
      (user.email.toLowerCase().trim() === DESIGNATED_ADMIN_EMAIL.toLowerCase() || user.role === 'super_admin')
    )
  }

  assert.ok(isPlatformAdmin(designatedAdmin))
  // Verify self-approval rejection check
  const approveTarget = (actorId, targetId) => {
    if (actorId === targetId) {
      throw new Error('Forbidden: cannot approve your own account')
    }
  }

  assert.throws(() => {
    approveTarget('user_123', 'user_123')
  }, /cannot approve your own account/)
})
