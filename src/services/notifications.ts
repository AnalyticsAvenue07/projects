import { getSupabase, tryGetSupabase } from '@/lib/supabase/client'
import type { NotificationRow } from '@/types/domain'

let cachedNotifications: { data: NotificationRow[]; timestamp: number } | null = null
const NOTIF_CACHE_TTL = 30_000 // 30 seconds

export async function fetchNotificationsForUser(force = false): Promise<NotificationRow[]> {
  const now = Date.now()
  if (!force && cachedNotifications && (now - cachedNotifications.timestamp < NOTIF_CACHE_TTL)) {
    return cachedNotifications.data
  }
  const supabase = tryGetSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) {
    if (cachedNotifications) return cachedNotifications.data
    throw error
  }
  const rows = (data ?? []) as NotificationRow[]
  cachedNotifications = { data: rows, timestamp: now }
  return rows
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  if (error) throw error
  if (cachedNotifications) {
    cachedNotifications.data = cachedNotifications.data.map((n) =>
      n.id === id ? { ...n, is_read: true } : n
    )
  }
}

export async function notifyUser(userId: string, title: string, message: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('notifications').insert({ user_id: userId, title, message })
  if (error) throw error
  cachedNotifications = null
}
