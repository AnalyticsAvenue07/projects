export type UserRole = 'super_admin' | 'admin' | 'client'

export type UserStatus = 'pending' | 'approved' | 'rejected'

export interface AppUser {
  id: string
  name: string
  email: string
  company: string | null
  phone: string | null
  designation: string | null
  industry: string | null
  use_case: string | null
  role: UserRole
  status: UserStatus
  created_at: string
}

export interface Poc {
  id: string
  title: string
  description: string
  industry: string | null
  slug: string
  thumbnail: string | null
  visibility: 'visible' | 'hidden'
  created_at: string
  tags: string[]
  client: string | null
  solution_function: string | null
  tech: string | null
  contact: string | null
  featured: boolean
  sort_rank: number
  date_label: string | null
}

export interface ProjectRegistryItem {
  id: string
  title: string
  slug: string
  route: string
  category: string
  description: string
  visible: boolean
  icon?: string
  featured?: boolean
}

export interface ProjectAccess {
  id: string
  user_id: string
  project_slug: string | null
  industry: string | null
  granted_by: string | null
  created_at: string
}

export interface NotificationRow {
  id: string
  title: string
  message: string
  user_id: string
  is_read: boolean
  created_at: string
}

export function isStaffRole(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin'
}

export function canWritePoc(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin'
}

export function canAssignSuperAdmin(actor: UserRole): boolean {
  return actor === 'super_admin'
}

export function isApproved(user: AppUser | null): boolean {
  return user?.status === 'approved'
}

export function isPending(user: AppUser | null): boolean {
  return user?.status === 'pending'
}

export function isRejected(user: AppUser | null): boolean {
  return user?.status === 'rejected'
}
