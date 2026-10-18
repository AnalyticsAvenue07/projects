import { getSupabase } from '@/lib/supabase/client'
import { getVisibleProjects } from '@/config/projects'
import { invalidateAccessCache } from '@/services/pocAccess'
import { useAuthStore } from '@/stores/authStore'
import type { AppUser, UserStatus } from '@/types/domain'

/**
 * Checks whether an error is due to an RPC function missing in the database.
 */
function isRpcMissingError(err: any): boolean {
  if (!err) return false
  const code = err.code || err.status
  const msg = String(err.message || err.details || '')
  return (
    code === 'PGRST202' ||
    code === 404 ||
    code === '42883' ||
    msg.includes('schema cache') ||
    msg.includes('does not exist')
  )
}

/**
 * Atomically approve a user AND set their industry access.
 * Tries server-side PostgreSQL function approve_and_grant_industries first.
 * If the function is not yet installed in Supabase, falls back seamlessly
 * to direct authoritative table operations against public.users and public.poc_access.
 */
export async function approveAndGrantIndustries(
  targetUserId: string,
  industries: string[]
): Promise<void> {
  const supabase = getSupabase()

  // 1. Try server-side RPC first
  try {
    const { error: rpcError } = await supabase.rpc('approve_and_grant_industries', {
      p_target_user_id: targetUserId,
      p_industries: industries,
    })

    if (!rpcError) {
      invalidateAccessCache(targetUserId)
      return
    }

    // If it's a real business error (e.g. 42501 permission denied), throw it
    if (!isRpcMissingError(rpcError)) {
      throw new Error(rpcError.message || 'Approval failed')
    }
  } catch (err: any) {
    if (!isRpcMissingError(err)) {
      throw err
    }
  }

  // 2. Resilient fallback to direct Supabase table operations
  // Step A: Update user status to 'approved'
  const { error: updateError } = await supabase
    .from('users')
    .update({ status: 'approved' })
    .eq('id', targetUserId)

  if (updateError) {
    throw new Error(updateError.message || 'Failed to update user status to approved')
  }

  // Step B: Sync poc_access
  // Remove existing grants
  await supabase
    .from('poc_access')
    .delete()
    .eq('user_id', targetUserId)

  // Insert grants if any industries were selected
  if (industries.length > 0) {
    const actorId = useAuthStore.getState().profile?.id || null

    // Attempt industry-level insert first
    const industryRows = industries.map((ind) => ({
      user_id: targetUserId,
      industry: ind,
      project_slug: null,
      granted_by: actorId,
    }))

    const { error: indErr } = await supabase.from('poc_access').insert(industryRows)

    if (indErr) {
      // If industry column or null project_slug constraint failed,
      // map each industry to its constituent project slugs from registry
      const visibleProjects = getVisibleProjects()
      const matchingProjects = visibleProjects.filter(
        (p) => p.category && industries.includes(p.category)
      )

      if (matchingProjects.length > 0) {
        // Try with project_slug and industry
        const projectRowsWithIndustry = matchingProjects.map((p) => ({
          user_id: targetUserId,
          project_slug: p.slug,
          industry: p.category,
          granted_by: actorId,
        }))

        const { error: projErr } = await supabase
          .from('poc_access')
          .insert(projectRowsWithIndustry)

        if (projErr) {
          // Fall back to legacy project_slug only
          const legacyRows = matchingProjects.map((p) => ({
            user_id: targetUserId,
            project_slug: p.slug,
            granted_by: actorId,
          }))
          const { error: legacyErr } = await supabase
            .from('poc_access')
            .insert(legacyRows)

          if (legacyErr) {
            throw new Error(legacyErr.message || 'Failed to save industry project grants')
          }
        }
      }
    }
  }

  // Step C: Invalidate access cache
  invalidateAccessCache(targetUserId)

  // Step D: Record in audit log if table exists
  try {
    const actor = useAuthStore.getState().profile
    await supabase.from('admin_audit_log').insert({
      actor_id: actor?.id,
      actor_email: actor?.email || 'admin',
      target_user_id: targetUserId,
      action: 'approve_and_grant',
      new_status: 'approved',
      industries_granted: industries,
    })
  } catch {
    // Non-fatal if audit log table not deployed yet
  }
}

/**
 * Update industry access for an already-approved user.
 * Tries server-side RPC first, with fallback to direct table updates.
 */
export async function updateUserIndustryAccess(
  targetUserId: string,
  industries: string[]
): Promise<void> {
  const supabase = getSupabase()

  try {
    const { error: rpcError } = await supabase.rpc('update_user_industry_access', {
      p_target_user_id: targetUserId,
      p_industries: industries,
    })

    if (!rpcError) {
      invalidateAccessCache(targetUserId)
      return
    }

    if (!isRpcMissingError(rpcError)) {
      throw new Error(rpcError.message || 'Failed to update access')
    }
  } catch (err: any) {
    if (!isRpcMissingError(err)) {
      throw err
    }
  }

  // Direct table sync fallback
  await supabase
    .from('poc_access')
    .delete()
    .eq('user_id', targetUserId)

  if (industries.length > 0) {
    const actorId = useAuthStore.getState().profile?.id || null

    const industryRows = industries.map((ind) => ({
      user_id: targetUserId,
      industry: ind,
      project_slug: null,
      granted_by: actorId,
    }))

    const { error: indErr } = await supabase.from('poc_access').insert(industryRows)

    if (indErr) {
      const visibleProjects = getVisibleProjects()
      const matchingProjects = visibleProjects.filter(
        (p) => p.category && industries.includes(p.category)
      )

      if (matchingProjects.length > 0) {
        const projectRowsWithIndustry = matchingProjects.map((p) => ({
          user_id: targetUserId,
          project_slug: p.slug,
          industry: p.category,
          granted_by: actorId,
        }))

        const { error: projErr } = await supabase
          .from('poc_access')
          .insert(projectRowsWithIndustry)

        if (projErr) {
          const legacyRows = matchingProjects.map((p) => ({
            user_id: targetUserId,
            project_slug: p.slug,
            granted_by: actorId,
          }))
          const { error: legacyErr } = await supabase
            .from('poc_access')
            .insert(legacyRows)

          if (legacyErr) {
            throw new Error(legacyErr.message || 'Failed to save industry grants')
          }
        }
      }
    }
  }

  invalidateAccessCache(targetUserId)

  try {
    const actor = useAuthStore.getState().profile
    await supabase.from('admin_audit_log').insert({
      actor_id: actor?.id,
      actor_email: actor?.email || 'admin',
      target_user_id: targetUserId,
      action: 'update_industry_access',
      industries_granted: industries,
    })
  } catch {}
}

/**
 * Reject a user account.
 * Tries server-side RPC first, with fallback to direct table update.
 */
export async function rejectUser(targetUserId: string): Promise<void> {
  const supabase = getSupabase()

  try {
    const { error: rpcError } = await supabase.rpc('reject_user', {
      p_target_user_id: targetUserId,
    })

    if (!rpcError) {
      invalidateAccessCache(targetUserId)
      return
    }

    if (!isRpcMissingError(rpcError)) {
      throw new Error(rpcError.message || 'Failed to reject user')
    }
  } catch (err: any) {
    if (!isRpcMissingError(err)) {
      throw err
    }
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ status: 'rejected' })
    .eq('id', targetUserId)

  if (updateError) {
    throw new Error(updateError.message || 'Failed to reject user')
  }

  invalidateAccessCache(targetUserId)

  try {
    const actor = useAuthStore.getState().profile
    await supabase.from('admin_audit_log').insert({
      actor_id: actor?.id,
      actor_email: actor?.email || 'admin',
      target_user_id: targetUserId,
      action: 'reject',
      new_status: 'rejected',
    })
  } catch {}
}

/**
 * Fetch the industry access list for any user (admin) or self.
 */
export async function fetchIndustryAccessForUser(userId: string): Promise<string[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase.rpc('get_industry_access_for_user', {
    p_user_id: userId,
  })
  if (error) throw error
  return (data as string[]) ?? []
}

/**
 * Fetch all admin audit log entries (staff only).
 */
export interface AuditLogEntry {
  id: string
  actor_id: string
  actor_email: string
  target_user_id: string | null
  target_email: string | null
  action: string
  prev_status: string | null
  new_status: string | null
  prev_role: string | null
  new_role: string | null
  industries_granted: string[]
  industries_revoked: string[]
  metadata: Record<string, unknown>
  created_at: string
}

export async function fetchAdminAuditLog(limit = 50): Promise<AuditLogEntry[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as AuditLogEntry[]
}

export async function adminSetUserStatus(userId: string, status: UserStatus): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('users').update({ status }).eq('id', userId)
  if (error) throw error
}

export async function fetchAllUsersAdmin(): Promise<AppUser[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as AppUser[]
}
