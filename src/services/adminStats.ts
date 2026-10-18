import { getSupabase } from '@/lib/supabase/client'
import { getVisibleProjects } from '@/config/projects'
import type { AppUser } from '@/types/domain'

export interface AdminStats {
  totalUsers: number
  pendingUsers: number
  approvedUsers: number
  totalPocs: number
  recentUsers: AppUser[]
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const supabase = getSupabase()

  const [{ count: totalUsers }, { count: pendingUsers }, { count: approvedUsers }, recent] =
    await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('users').select('*').order('created_at', { ascending: false }).limit(6),
    ])

  const recentUsers = (recent.data ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    email: String(r.email),
    company: r.company != null ? String(r.company) : null,
    phone: r.phone != null ? String(r.phone) : null,
    designation: r.designation != null ? String(r.designation) : null,
    industry: r.industry != null ? String(r.industry) : null,
    use_case: r.use_case != null ? String(r.use_case) : null,
    role: r.role as AppUser['role'],
    status: r.status as AppUser['status'],
    created_at: String(r.created_at),
  }))

  return {
    totalUsers: totalUsers ?? 0,
    pendingUsers: pendingUsers ?? 0,
    approvedUsers: approvedUsers ?? 0,
    totalPocs: getVisibleProjects().length,
    recentUsers,
  }
}
