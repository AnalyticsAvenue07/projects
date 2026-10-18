import { getSupabase, tryGetSupabase } from '@/lib/supabase/client'
import type { AppUser, UserRole, UserStatus } from '@/types/domain'

function mapUser(row: Record<string, unknown>): AppUser {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    company: row.company != null ? String(row.company) : null,
    phone: row.phone != null ? String(row.phone) : null,
    designation: row.designation != null ? String(row.designation) : null,
    industry: row.industry != null ? String(row.industry) : null,
    use_case: row.use_case != null ? String(row.use_case) : null,
    role: row.role as AppUser['role'],
    status: row.status as AppUser['status'],
    created_at: String(row.created_at),
  }
}

export async function fetchAllUsers(): Promise<AppUser[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => mapUser(r as Record<string, unknown>))
}

export async function updateUserStatus(id: string, status: UserStatus): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('users').update({ status }).eq('id', id)
  if (error) throw error
}

export async function updateUserRole(id: string, role: UserRole): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('users').update({ role }).eq('id', id)
  if (error) throw error
}

export async function deleteUserRow(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) throw error
}

export async function updateMyProfile(
  id: string,
  patch: Partial<Pick<AppUser, 'name' | 'phone' | 'company' | 'designation' | 'industry' | 'use_case'>>
): Promise<void> {
  const supabase = tryGetSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('users').update(patch).eq('id', id)
  if (error) throw error
}

export async function countUsersByStatus(): Promise<{ total: number; pending: number; approved: number }> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('users').select('status')
  if (error) throw error
  const rows = data ?? []
  let pending = 0
  let approved = 0
  for (const r of rows) {
    if (r.status === 'pending') pending++
    if (r.status === 'approved') approved++
  }
  return { total: rows.length, pending, approved }
}
