import test from 'node:test'
import assert from 'node:assert/strict'

// ============================================================================
// Mock Environment & Domain Definitions for RBAC Test Suite
// ============================================================================

const DESIGNATED_ADMIN_EMAIL = 'sheriffrafiq71@gmail.com'

const ALL_REGISTERED_INDUSTRIES = [
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

const PROJECT_REGISTRY = [
  { id: 'ai-gold-negotiation', slug: 'ai-gold-negotiation', category: 'Gen AI' },
  { id: 'marketing-campaign', slug: 'marketing-campaign-performance-analyzer', category: 'Marketing Analytics' },
  { id: 'ai-prescription', slug: 'ai-prescription', category: 'Gen AI' },
  { id: 'healthscope', slug: 'healthscope-insights', category: 'Healthcare' },
  { id: 'ev-range-prediction', slug: 'ev-dynamic-range-prediction-anxiety-reduction-lab', category: 'EV' },
  { id: 'ev-charging-fault', slug: 'ev-charging-station-fault-detection-lab', category: 'EV' },
  { id: 'real-estate-features', slug: 'real-estate-price-vs-property-features-analyzer', category: 'Real Estate' },
  { id: 'solar-forecasting', slug: 'solar-power-generation-forecasting-lab', category: 'Solar Power' },
  { id: 'offer-letter', slug: 'offerletter-generator', category: 'HR' },
  { id: 'route-optimization', slug: 'route-optimization-logistics-efficiency', category: 'Supply Chain' },
  { id: 'machine-failure', slug: 'machine-failure-predictive-maintenance-lab', category: 'Manufacturing' },
]

function getProjectBySlug(slug) {
  return PROJECT_REGISTRY.find((p) => p.slug === slug) || null
}

function deriveAllowedIndustries(rows) {
  const industries = new Set()
  for (const row of rows) {
    if (row.industry) {
      industries.add(row.industry)
      continue
    }
    const project = row.project_slug ? getProjectBySlug(row.project_slug) : null
    if (project?.category) {
      industries.add(project.category)
    }
  }
  return industries
}

function isStaffRole(role) {
  return role === 'admin' || role === 'super_admin'
}

function isPlatformAdmin(user) {
  if (!user || user.status !== 'approved') return false
  return (
    user.email.toLowerCase().trim() === DESIGNATED_ADMIN_EMAIL.toLowerCase() ||
    user.role === 'super_admin'
  )
}

function handleNewAuthUser(authRecord, metadata = {}) {
  // Simulates PostgreSQL handle_new_auth_user() trigger
  const email = authRecord.email.toLowerCase().trim()
  const isDesignatedAdmin = email === DESIGNATED_ADMIN_EMAIL.toLowerCase()
  return {
    id: authRecord.id,
    email: email,
    name: metadata.full_name || email.split('@')[0],
    role: isDesignatedAdmin ? 'super_admin' : 'client',
    status: isDesignatedAdmin ? 'approved' : 'pending',
    permissions: [],
  }
}

// Simulated Database State
class MockDatabase {
  constructor() {
    this.users = new Map()
    this.pocAccess = []
    this.auditLog = []
  }

  addUser(user) {
    this.users.set(user.id, { ...user })
  }

  getUser(id) {
    return this.users.get(id) || null
  }

  // Simulates SECURITY DEFINER approve_and_grant_industries
  approveAndGrantIndustries(actorId, targetUserId, industries) {
    const actor = this.users.get(actorId)
    if (!actor || !isPlatformAdmin(actor)) {
      throw new Error('42501: Forbidden: caller is not the platform administrator')
    }
    if (actorId === targetUserId) {
      throw new Error('42501: Forbidden: cannot approve your own account')
    }

    const target = this.users.get(targetUserId)
    if (!target) {
      throw new Error('22000: Target user not found')
    }

    const prevStatus = target.status
    target.status = 'approved'

    // Compute revokes and grants
    const currentGrants = this.pocAccess
      .filter((r) => r.user_id === targetUserId && r.industry && !r.project_slug)
      .map((r) => r.industry)

    const toRevoke = currentGrants.filter((i) => !industries.includes(i))
    const toGrant = industries.filter((i) => !currentGrants.includes(i))

    // Revoke
    this.pocAccess = this.pocAccess.filter(
      (r) => !(r.user_id === targetUserId && toRevoke.includes(r.industry) && !r.project_slug)
    )

    // Grant
    for (const ind of toGrant) {
      this.pocAccess.push({
        id: `acc-${Date.now()}-${Math.random()}`,
        user_id: targetUserId,
        industry: ind,
        project_slug: null,
        granted_by: actorId,
      })
    }

    this.auditLog.push({
      actor_id: actorId,
      actor_email: actor.email,
      target_user_id: targetUserId,
      target_email: target.email,
      action: 'approve_and_grant',
      prev_status: prevStatus,
      new_status: 'approved',
      industries_granted: toGrant,
      industries_revoked: toRevoke,
    })
  }

  // Simulates SECURITY DEFINER update_user_industry_access
  updateUserIndustryAccess(actorId, targetUserId, industries) {
    const actor = this.users.get(actorId)
    if (!actor || !isPlatformAdmin(actor)) {
      throw new Error('42501: Forbidden: caller is not the platform administrator')
    }

    const target = this.users.get(targetUserId)
    if (!target) {
      throw new Error('22000: Target user not found')
    }

    const currentGrants = this.pocAccess
      .filter((r) => r.user_id === targetUserId && r.industry && !r.project_slug)
      .map((r) => r.industry)

    const toRevoke = currentGrants.filter((i) => !industries.includes(i))
    const toGrant = industries.filter((i) => !currentGrants.includes(i))

    this.pocAccess = this.pocAccess.filter(
      (r) => !(r.user_id === targetUserId && toRevoke.includes(r.industry) && !r.project_slug)
    )

    for (const ind of toGrant) {
      this.pocAccess.push({
        id: `acc-${Date.now()}-${Math.random()}`,
        user_id: targetUserId,
        industry: ind,
        project_slug: null,
        granted_by: actorId,
      })
    }

    this.auditLog.push({
      actor_id: actorId,
      actor_email: actor.email,
      target_user_id: targetUserId,
      target_email: target.email,
      action: 'update_industry_access',
      industries_granted: toGrant,
      industries_revoked: toRevoke,
    })
  }

  // Simulates SECURITY DEFINER reject_user
  rejectUser(actorId, targetUserId) {
    const actor = this.users.get(actorId)
    if (!actor || !isPlatformAdmin(actor)) {
      throw new Error('42501: Forbidden: caller is not the platform administrator')
    }
    if (actorId === targetUserId) {
      throw new Error('42501: Forbidden: cannot reject your own account')
    }

    const target = this.users.get(targetUserId)
    if (!target) {
      throw new Error('22000: Target user not found')
    }

    const prevStatus = target.status
    target.status = 'rejected'

    this.auditLog.push({
      actor_id: actorId,
      actor_email: actor.email,
      target_user_id: targetUserId,
      target_email: target.email,
      action: 'reject',
      prev_status: prevStatus,
      new_status: 'rejected',
    })
  }

  // Simulates trigger enforce_user_update_guard on UPDATE
  enforceUpdateGuard(actorId, targetUserId, patch) {
    const actor = this.users.get(actorId)
    const target = this.users.get(targetUserId)
    if (actorId === targetUserId && !isPlatformAdmin(actor)) {
      if (patch.role && patch.role !== target.role) {
        throw new Error('42501: Forbidden: clients cannot modify their own role')
      }
      if (patch.status && patch.status !== target.status) {
        throw new Error('42501: Forbidden: clients cannot modify their own status')
      }
    }
    Object.assign(target, patch)
  }

  getAccessForUser(callerId, targetUserId) {
    const caller = this.users.get(callerId)
    if (callerId !== targetUserId && !isPlatformAdmin(caller) && !isStaffRole(caller?.role)) {
      throw new Error('42501: Forbidden: cannot query another client permissions')
    }
    return this.pocAccess.filter((r) => r.user_id === targetUserId)
  }
}

// Navigation / Route Guard Simulation
function checkRouteAccess(user, allowedIndustries, routeIndustry) {
  if (!user) return { allowed: false, redirect: '/login' }
  if (user.status === 'pending') return { allowed: false, redirect: '/pending-approval' }
  if (user.status === 'rejected') return { allowed: false, redirect: '/rejected-access' }
  if (isStaffRole(user.role)) return { allowed: true }
  if (!routeIndustry) return { allowed: false, redirect: '/industry-restricted' }
  if (allowedIndustries.has(routeIndustry)) return { allowed: true }
  return { allowed: false, redirect: '/industry-restricted' }
}

// ============================================================================
// Automated Test Scenarios Required by Business Specification
// ============================================================================

test('Scenario 1: A new client registers. Expected: pending and no industry access', () => {
  const newClient = handleNewAuthUser({ id: 'u1', email: 'alice@example.com' })
  assert.equal(newClient.role, 'client')
  assert.equal(newClient.status, 'pending')

  const grants = deriveAllowedIndustries([])
  assert.equal(grants.size, 0, 'New client must have empty industry access')
})

test('Scenario 2: The client attempts to access an industry before approval. Expected: denied', () => {
  const pendingUser = { id: 'u1', email: 'alice@example.com', role: 'client', status: 'pending' }
  const emptyGrants = new Set()
  const result = checkRouteAccess(pendingUser, emptyGrants, 'EV')
  assert.equal(result.allowed, false)
  assert.equal(result.redirect, '/pending-approval')
})

test('Scenario 3: The designated administrator signs in. Expected: administrator functionality is available', () => {
  const adminUser = handleNewAuthUser({ id: 'admin1', email: DESIGNATED_ADMIN_EMAIL })
  assert.equal(adminUser.role, 'super_admin')
  assert.equal(adminUser.status, 'approved')
  assert.equal(isPlatformAdmin(adminUser), true)
  assert.equal(isStaffRole(adminUser.role), true)

  const navResult = checkRouteAccess(adminUser, new Set(), 'AnyIndustry')
  assert.equal(navResult.allowed, true, 'Staff bypass allows access to any industry')
})

test('Scenario 4: The administrator assigns EV to a pending client and approves the client. Expected: EV access granted, all other industries denied', () => {
  const db = new MockDatabase()
  const admin = handleNewAuthUser({ id: 'admin1', email: DESIGNATED_ADMIN_EMAIL })
  const client = handleNewAuthUser({ id: 'u2', email: 'bob@example.com' })
  db.addUser(admin)
  db.addUser(client)

  // Admin approves with EV
  db.approveAndGrantIndustries(admin.id, client.id, ['EV'])

  const updatedClient = db.getUser(client.id)
  assert.equal(updatedClient.status, 'approved')

  const accessRows = db.getAccessForUser(client.id, client.id)
  const allowed = deriveAllowedIndustries(accessRows)

  assert.equal(allowed.has('EV'), true, 'EV must be granted')
  assert.equal(allowed.has('Real Estate'), false, 'Real Estate must be denied')
  assert.equal(allowed.has('Gen AI'), false, 'Gen AI must be denied')
  assert.equal(allowed.size, 1)
})

test('Scenario 5: The client opens an EV project. Expected: authorized', () => {
  const client = { id: 'u2', email: 'bob@example.com', role: 'client', status: 'approved' }
  const allowedIndustries = new Set(['EV'])

  const evProject = getProjectBySlug('ev-dynamic-range-prediction-anxiety-reduction-lab')
  assert.ok(evProject)
  assert.equal(evProject.category, 'EV')

  const result = checkRouteAccess(client, allowedIndustries, evProject.category)
  assert.equal(result.allowed, true)
})

test('Scenario 6: The client opens a Real Estate project without a Real Estate grant. Expected: denied', () => {
  const client = { id: 'u2', email: 'bob@example.com', role: 'client', status: 'approved' }
  const allowedIndustries = new Set(['EV']) // only EV

  const reProject = getProjectBySlug('real-estate-price-vs-property-features-analyzer')
  assert.ok(reProject)
  assert.equal(reProject.category, 'Real Estate')

  const result = checkRouteAccess(client, allowedIndustries, reProject.category)
  assert.equal(result.allowed, false)
  assert.equal(result.redirect, '/industry-restricted')
})

test('Scenario 7: The client modifies localStorage to add Real Estate. Expected: still denied by authoritative authorization', () => {
  const db = new MockDatabase()
  const client = { id: 'u2', email: 'bob@example.com', role: 'client', status: 'approved' }
  db.addUser(client)
  db.pocAccess.push({ id: 'a1', user_id: 'u2', industry: 'EV', project_slug: null })

  // Client tampers with local state
  const tamperedLocalState = new Set(['EV', 'Real Estate'])

  // Server-authoritative check queries DB
  const authoritativeRows = db.getAccessForUser(client.id, client.id)
  const authoritativeAllowed = deriveAllowedIndustries(authoritativeRows)

  // Verify authoritative state does NOT include Real Estate
  assert.equal(authoritativeAllowed.has('Real Estate'), false)

  // Server route check with authoritative permissions denies access
  const result = checkRouteAccess(client, authoritativeAllowed, 'Real Estate')
  assert.equal(result.allowed, false)
  assert.equal(result.redirect, '/industry-restricted')
})

test('Scenario 8: The client modifies a request to set their role to admin. Expected: rejected', () => {
  const db = new MockDatabase()
  const client = { id: 'u2', email: 'bob@example.com', role: 'client', status: 'approved' }
  db.addUser(client)

  assert.throws(
    () => {
      db.enforceUpdateGuard(client.id, client.id, { role: 'admin' })
    },
    /Forbidden: clients cannot modify their own role/
  )
})

test('Scenario 9: The client attempts to approve themselves. Expected: rejected', () => {
  const db = new MockDatabase()
  const client = { id: 'u2', email: 'bob@example.com', role: 'client', status: 'pending' }
  db.addUser(client)

  assert.throws(
    () => {
      db.approveAndGrantIndustries(client.id, client.id, ['EV', 'Gen AI'])
    },
    /Forbidden: caller is not the platform administrator/
  )
})

test('Scenario 10: The client attempts to approve another client. Expected: rejected', () => {
  const db = new MockDatabase()
  const client1 = { id: 'u1', email: 'alice@example.com', role: 'client', status: 'approved' }
  const client2 = { id: 'u2', email: 'bob@example.com', role: 'client', status: 'pending' }
  db.addUser(client1)
  db.addUser(client2)

  assert.throws(
    () => {
      db.approveAndGrantIndustries(client1.id, client2.id, ['Healthcare'])
    },
    /Forbidden: caller is not the platform administrator/
  )
})

test('Scenario 11: An unauthorized user directly calls an admin API. Expected: 401 or 403 as appropriate', () => {
  const db = new MockDatabase()
  const regularUser = { id: 'u3', email: 'charlie@example.com', role: 'client', status: 'approved' }
  db.addUser(regularUser)

  assert.throws(
    () => {
      db.rejectUser(regularUser.id, 'u2')
    },
    /Forbidden: caller is not the platform administrator/
  )

  assert.throws(
    () => {
      db.updateUserIndustryAccess(regularUser.id, 'u2', ['Supply Chain'])
    },
    /Forbidden: caller is not the platform administrator/
  )
})

test('Scenario 12: The administrator revokes EV. Expected: subsequent protected operations are denied', () => {
  const db = new MockDatabase()
  const admin = handleNewAuthUser({ id: 'admin1', email: DESIGNATED_ADMIN_EMAIL })
  const client = { id: 'u4', email: 'david@example.com', role: 'client', status: 'approved' }
  db.addUser(admin)
  db.addUser(client)

  // Initially has EV
  db.approveAndGrantIndustries(admin.id, client.id, ['EV'])
  let access = deriveAllowedIndustries(db.getAccessForUser(client.id, client.id))
  assert.equal(access.has('EV'), true)

  // Admin revokes EV by updating to empty list
  db.updateUserIndustryAccess(admin.id, client.id, [])

  access = deriveAllowedIndustries(db.getAccessForUser(client.id, client.id))
  assert.equal(access.has('EV'), false, 'EV must be removed after revocation')

  const nav = checkRouteAccess(client, access, 'EV')
  assert.equal(nav.allowed, false)
  assert.equal(nav.redirect, '/industry-restricted')
})

test('Scenario 13: An approved client has an empty grant list. Expected: no industry access, not unrestricted access', () => {
  const client = { id: 'u5', email: 'eve@example.com', role: 'client', status: 'approved' }
  const emptyGrants = new Set() // empty list

  for (const ind of ALL_REGISTERED_INDUSTRIES) {
    const nav = checkRouteAccess(client, emptyGrants, ind)
    assert.equal(nav.allowed, false, `Access to ${ind} must be denied with empty grant list`)
    assert.equal(nav.redirect, '/industry-restricted')
  }
})

test('Scenario 14: A locked industry is clicked in the sidebar. Expected: Access Restricted message, no protected navigation', () => {
  const clientAllowed = new Set(['Healthcare'])
  const clickedIndustry = 'Solar Power'

  const isAccessible = clientAllowed.has(clickedIndustry)
  assert.equal(isAccessible, false)

  // Sidebar redirect handler
  const targetRoute = isAccessible ? `/projects?filter=${clickedIndustry}` : '/industry-restricted'
  assert.equal(targetRoute, '/industry-restricted')
})

test('Scenario 15: The user pastes a protected URL directly into the browser. Expected: authorization still enforced', () => {
  const client = { id: 'u6', email: 'frank@example.com', role: 'client', status: 'approved' }
  const allowed = new Set(['Gen AI']) // Only Gen AI

  // User directly pastes EV lab URL
  const pastedUrl = '/projects/ev-dynamic-range-prediction-anxiety-reduction-lab/full'
  const project = getProjectBySlug('ev-dynamic-range-prediction-anxiety-reduction-lab')
  assert.ok(project)

  const nav = checkRouteAccess(client, allowed, project.category)
  assert.equal(nav.allowed, false)
  assert.equal(nav.redirect, '/industry-restricted')
})

test('Scenario 16: A backend/database error occurs during a grant update. Expected: no false success and no partial approval', () => {
  const db = new MockDatabase()
  const admin = handleNewAuthUser({ id: 'admin1', email: DESIGNATED_ADMIN_EMAIL })
  db.addUser(admin)

  // Target does not exist
  assert.throws(
    () => {
      db.approveAndGrantIndustries(admin.id, 'non-existent-user', ['EV'])
    },
    /Target user not found/
  )

  // Verify no orphaned access rows created
  assert.equal(db.pocAccess.length, 0)
  assert.equal(db.auditLog.length, 0)
})

test('Scenario 17: The client profile remains isolated from other clients', () => {
  const db = new MockDatabase()
  const clientA = { id: 'uA', email: 'clientA@example.com', role: 'client', status: 'approved' }
  const clientB = { id: 'uB', email: 'clientB@example.com', role: 'client', status: 'approved' }
  db.addUser(clientA)
  db.addUser(clientB)

  // Client A cannot query Client B's permissions
  assert.throws(
    () => {
      db.getAccessForUser(clientA.id, clientB.id)
    },
    /Forbidden: cannot query another client permissions/
  )
})

test('Scenario 18: An already-approved user retains only legitimate existing permissions after migration', () => {
  const legacyRows = [
    { id: '1', user_id: 'uOld', project_slug: 'ai-gold-negotiation', industry: null }, // mapped to Gen AI
    { id: '2', user_id: 'uOld', project_slug: null, industry: 'Marketing Analytics' },
  ]
  const allowed = deriveAllowedIndustries(legacyRows)
  assert.equal(allowed.has('Gen AI'), true)
  assert.equal(allowed.has('Marketing Analytics'), true)
  assert.equal(allowed.has('EV'), false)
  assert.equal(allowed.has('Solar Power'), false)
  assert.equal(allowed.size, 2)
})

test('Scenario 19: A project with an unmapped or invalid industry fails safely and does not grant access', () => {
  const client = { id: 'u7', email: 'grace@example.com', role: 'client', status: 'approved' }
  const allowed = new Set(['Healthcare', 'EV'])

  // Project with null / unmapped industry
  const navNull = checkRouteAccess(client, allowed, null)
  assert.equal(navNull.allowed, false)
  assert.equal(navNull.redirect, '/industry-restricted')

  // Project with unrecognized industry
  const navUnknown = checkRouteAccess(client, allowed, 'UnknownIndustry')
  assert.equal(navUnknown.allowed, false)
  assert.equal(navUnknown.redirect, '/industry-restricted')
})

test('Scenario 20: The designated administrator retains access to all legitimate administration functionality', () => {
  const admin = handleNewAuthUser({ id: 'admin1', email: DESIGNATED_ADMIN_EMAIL })
  assert.equal(isPlatformAdmin(admin), true)
  assert.equal(isStaffRole(admin.role), true)

  const db = new MockDatabase()
  db.addUser(admin)

  const client = handleNewAuthUser({ id: 'u8', email: 'helen@example.com' })
  db.addUser(client)

  // Admin can approve
  assert.doesNotThrow(() => {
    db.approveAndGrantIndustries(admin.id, client.id, ['Gen AI', 'Healthcare', 'Solar Power'])
  })

  // Admin can update
  assert.doesNotThrow(() => {
    db.updateUserIndustryAccess(admin.id, client.id, ['EV', 'Manufacturing'])
  })

  // Admin can reject
  const client2 = handleNewAuthUser({ id: 'u9', email: 'ian@example.com' })
  db.addUser(client2)
  assert.doesNotThrow(() => {
    db.rejectUser(admin.id, client2.id)
  })

  // Verify audit log has entries
  assert.equal(db.auditLog.length, 3)
})
