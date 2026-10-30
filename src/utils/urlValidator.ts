import type { ExternalAppType } from '@/types/projectManagement'

export interface UrlValidationResult {
  isValid: boolean
  error?: string
  cleanUrl?: string
  detectedType?: ExternalAppType
  isPrivateOrLocal?: boolean
  embedSupported?: boolean
  embedUrl?: string
  embedNotice?: string
}

/**
 * Checks if a hostname or IP represents a private, loopback, or internal address (SSRF guard)
 */
export function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim()

  // Loopback & host aliases
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

  // IPv4 regex check
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const match = host.match(ipv4Regex)
  if (match) {
    const octets = match.slice(1).map(Number)
    if (octets.some((o) => o < 0 || o > 255)) return true

    const [first, second] = octets

    // 127.0.0.0/8 (Loopback)
    if (first === 127) return true
    // 0.0.0.0/8 (Current network)
    if (first === 0) return true
    // 10.0.0.0/8 (Private)
    if (first === 10) return true
    // 172.16.0.0/12 (Private: 172.16.x.x - 172.31.x.x)
    if (first === 172 && second >= 16 && second <= 31) return true
    // 192.168.0.0/16 (Private)
    if (first === 192 && second === 168) return true
    // 169.254.0.0/16 (Link-local & Cloud Metadata endpoint 169.254.169.254)
    if (first === 169 && second === 254) return true
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (first === 100 && second >= 64 && second <= 127) return true
  }

  return false
}

/**
 * Validates a user-supplied external application URL.
 * Enforces http/https protocol, rejects malicious schemes (javascript:, data:, etc.),
 * and checks for SSRF risks (private networks / cloud metadata).
 */
export function validateExternalAppUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return {
      isValid: false,
      error: 'Application URL is required.',
    }
  }

  const trimmed = rawUrl.trim()

  // Prohibit dangerous URI schemes
  const lower = trimmed.toLowerCase()
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('ftp:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('blob:')
  ) {
    return {
      isValid: false,
      error: 'Unsafe URL scheme detected. Only approved HTTP(S) destinations are allowed.',
    }
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format. Please provide a full URL including https:// or http://',
    }
  }

  // Must be http or https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isValid: false,
      error: `Protocol "${parsed.protocol}" is not allowed. Only HTTP or HTTPS destinations are supported.`,
    }
  }

  // SSRF and private IP / localhost guard
  if (isPrivateOrLocalHost(parsed.hostname)) {
    return {
      isValid: false,
      isPrivateOrLocal: true,
      error: 'Destination points to a local, loopback, or private internal network (SSRF protection). Only accessible public or enterprise SaaS endpoints are allowed.',
    }
  }

  // Platform detection & Embed recommendations
  const host = parsed.hostname.toLowerCase()
  const pathname = parsed.pathname.toLowerCase()
  let detectedType: ExternalAppType = 'custom_web'
  let embedSupported = false
  let embedUrl = trimmed
  let embedNotice = ''

  if (host.includes('streamlit.app') || pathname.includes('streamlit')) {
    detectedType = 'streamlit'
    embedSupported = true
    // Streamlit cloud embed parameter
    if (!parsed.searchParams.has('embed')) {
      parsed.searchParams.set('embed', 'true')
      embedUrl = parsed.toString()
    }
    embedNotice = 'Streamlit application detected. Appended ?embed=true for optimal iframe rendering.'
  } else if (host.includes('huggingface.co') || host.includes('gradio.live') || pathname.includes('gradio')) {
    detectedType = 'gradio'
    embedSupported = true
    embedNotice = 'Gradio / HuggingFace space detected. Responsive interactive iframe supported.'
  } else if (host.includes('tableau.com') || host.includes('public.tableau.com')) {
    detectedType = 'tableau'
    embedSupported = true
    if (!parsed.searchParams.has(':showVizHome')) {
      parsed.searchParams.set(':showVizHome', 'no')
      parsed.searchParams.set(':embed', 'true')
      embedUrl = parsed.toString()
    }
    embedNotice = 'Tableau visualization detected. Applied embed parameters (:showVizHome=no&:embed=true).'
  } else if (host.includes('powerbi.com') || host.includes('fabric.microsoft.com')) {
    detectedType = 'powerbi'
    // Power BI web reports may restrict embedding without Power BI Embedded token or publish-to-web URL
    if (pathname.includes('/view') || pathname.includes('reportembed')) {
      embedSupported = true
      embedNotice = 'Power BI embed link recognized.'
    } else {
      embedSupported = false
      embedNotice = 'Standard Power BI report URLs may restrict iframe embedding via X-Frame-Options. Use official Power BI Embed / Publish-to-Web URL or choose "Open in New Tab".'
    }
  } else {
    // Custom web applications
    detectedType = 'custom_web'
    embedSupported = true
    embedNotice = 'Custom web application. Note that target server must allow framing (no X-Frame-Options: DENY).'
  }

  return {
    isValid: true,
    cleanUrl: trimmed,
    detectedType,
    isPrivateOrLocal: false,
    embedSupported,
    embedUrl,
    embedNotice,
  }
}
