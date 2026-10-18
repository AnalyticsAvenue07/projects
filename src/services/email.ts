import { isDemoMode } from './dataMode'

const base = import.meta.env.VITE_EMAIL_SERVICE_URL || ''

async function post(path: string, body: any) {
  if (isDemoMode() || !base) {
    // In demo mode or when no email server URL is defined, gracefully log and return success
    return { success: true, message: 'Email queued successfully (demo mode)', details: body }
  }

  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Email service error: ${res.status} ${text}`)
  }
  return res.json()
}

export async function sendWelcome(recipient: string, name?: string) {
  return post('/api/email/send-welcome', { recipient, name })
}

export async function sendAdminAlert(adminEmail: string, userEmail: string, userName?: string, details?: any) {
  return post('/api/email/send-admin-alert', { admin_email: adminEmail, user_email: userEmail, user_name: userName, details })
}

export async function sendApproval(recipient: string, name?: string, approvedBy?: string) {
  return post('/api/email/send-approval', { recipient, name, approved_by: approvedBy })
}

export async function sendRejection(recipient: string, name?: string, reason?: string) {
  return post('/api/email/send-rejection', { recipient, name, reason })
}

export async function sendAccess(recipient: string, name?: string, assigned_pocs?: string[]) {
  return post('/api/email/send-access', { recipient, name, assigned_pocs })
}

export async function sendFullAccess(recipient: string, name?: string, areas?: string[]) {
  return post('/api/email/send-full-access', { recipient, name, areas })
}
