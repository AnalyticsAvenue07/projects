import { isDemoMode } from './dataMode'

export const BACKEND_API_BASE_URL =
  import.meta.env.VITE_BACKEND_API_URL ||
  import.meta.env.VITE_EMAIL_SERVICE_URL ||
  'http://127.0.0.1:8000'

async function post(path: string, body: any) {
  if (isDemoMode() || !BACKEND_API_BASE_URL) {
    // In demo mode or when no email server URL is defined, gracefully log and return success
    return { success: true, message: 'Email queued successfully (demo mode)', details: body }
  }

  const res = await fetch(`${BACKEND_API_BASE_URL}${path}`, {
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

export async function checkEmailHealth(): Promise<{
  status: string
  service: string
  resend_configured: boolean
  from_email: string
}> {
  if (isDemoMode() || !BACKEND_API_BASE_URL) {
    return {
      status: 'demo',
      service: 'Email Notifications (Demo Mode)',
      resend_configured: false,
      from_email: 'demo@analyticsavenue.in',
    }
  }

  const res = await fetch(`${BACKEND_API_BASE_URL}/api/email/health`, {
    method: 'GET',
  })
  if (!res.ok) {
    throw new Error(`Email health check failed: HTTP ${res.status}`)
  }
  return res.json()
}

export async function sendWelcome(recipient: string, name?: string, signupSource?: string, variables?: Record<string, any>) {
  return post('/api/email/send-welcome', {
    recipient,
    name,
    signup_source: signupSource,
    variables,
  })
}

export async function sendAdminAlert(
  adminEmail: string | undefined | null,
  userEmail: string,
  userName?: string,
  details?: any
) {
  // If adminEmail is omitted or empty, use the auto-discovery endpoint
  if (!adminEmail || !adminEmail.trim()) {
    return sendAdminAlertAuto(userEmail, userName, details)
  }
  return post('/api/email/send-admin-alert', {
    admin_email: adminEmail,
    user_email: userEmail,
    user_name: userName,
    details,
  })
}

export async function sendAdminAlertAuto(
  userEmail: string,
  userName?: string,
  details?: any
) {
  return post('/api/email/send-admin-alert-auto', {
    user_email: userEmail,
    user_name: userName,
    details,
  })
}

export async function sendApproval(recipient: string, name?: string, approvedBy?: string, variables?: Record<string, any>) {
  return post('/api/email/send-approval', {
    recipient,
    name,
    approved_by: approvedBy,
    variables,
  })
}

export async function sendRejection(recipient: string, name?: string, reason?: string, variables?: Record<string, any>) {
  return post('/api/email/send-rejection', {
    recipient,
    name,
    reason,
    variables,
  })
}

export async function sendAccess(recipient: string, name?: string, assigned_pocs?: string[], variables?: Record<string, any>) {
  return post('/api/email/send-access', {
    recipient,
    name,
    assigned_pocs,
    variables,
  })
}

export async function sendFullAccess(recipient: string, name?: string, areas?: string[], variables?: Record<string, any>) {
  return post('/api/email/send-full-access', {
    recipient,
    name,
    areas,
    variables,
  })
}
