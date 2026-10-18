/**
 * Offer Letter Generator API Service
 * Supports Dual-Mode: Demo Mode (browser-native) & API Mode.
 */

import { isDemoMode } from './dataMode'
import { DEMO_OFFER_LETTER_TEMPLATES } from './demoData/hrAndGenAiData'

const API_BASE_URL =
  import.meta.env.VITE_OFFERLETTER_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000'

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface PreOfferRequest {
  candidate_name: string
  salutation: string
  role: string
  joining_date: string
  letter_date?: string
  stipend?: string
  incentive?: string
  ctc_range?: string
  training_period?: string
  probation_start?: string
  probation_dur?: string
  has_probation?: boolean
  custom_rr?: string[]
}

export interface SalaryParseRequest {
  prompt: string
}

export interface SalaryParseResponse {
  ctc_annual: number
  basic_annual: number
  hra_annual: number
  pf_annual: number
  variable_annual: number
  special_allowance_annual: number
  gross_monthly: number
  hra_percent_of_basic: number
  basic_percent: number
  hra_percent: number
  pf_percent: number
  variable_percent: number
  pf_description: string
  ctcAnnual: number
  basicAnnual: number
  hraAnnual: number
  pfAnnual: number
  variableAnnual: number
  specialAllowanceAnnual: number
  grossMonthly: number
  hraPercentOfBasic: number
  basicPercent: number
  hraPercent: number
  pfPercent: number
  variablePercent: number
  ctcAnnualStr?: string
  basicMonthlyStr?: string
  hraMonthlyStr?: string
  pfMonthlyStr?: string
  specialAllowanceMonthlyStr?: string
  variableAnnualStr?: string
  grossMonthlyStr?: string
  ctcLpa?: string
  pfOpted?: boolean
  [key: string]: any
}

function normalizeSalaryParseResponse(response: any): SalaryParseResponse {
  return {
    ...response,
    ctcAnnual: response.ctc_annual ?? response.ctcAnnual ?? 0,
    basicAnnual: response.basic_annual ?? response.basicAnnual ?? 0,
    hraAnnual: response.hra_annual ?? response.hraAnnual ?? 0,
    pfAnnual: response.pf_annual ?? response.pfAnnual ?? 0,
    variableAnnual: response.variable_annual ?? response.variableAnnual ?? 0,
    specialAllowanceAnnual: response.special_allowance_annual ?? response.specialAllowanceAnnual ?? 0,
    grossMonthly: response.gross_monthly ?? response.grossMonthly ?? 0,
    basicPercent: response.base_percent ?? response.basic_percent ?? response.basicPercent ?? 0,
    hraPercent: response.hra_percent ?? response.hraPercent ?? 0,
    hraPercentOfBasic: response.hra_percent ?? response.hraPercent ?? response.hraPercentOfBasic ?? 0,
    pfPercent: response.pf_percent ?? response.pfPercent ?? 0,
    variablePercent: response.variable_percent ?? response.variablePercent ?? 0,
    base_percent: response.base_percent ?? response.basic_percent ?? response.basicPercent ?? 0,
    hra_percent: response.hra_percent ?? response.hraPercent ?? response.hraPercentOfBasic ?? 0,
    pf_percent: response.pf_percent ?? response.pfPercent ?? 0,
    variable_percent: response.variable_percent ?? response.variablePercent ?? 0,
    pfDescription: response.pf_description ?? response.pfDescription ?? 'Not applicable',
    ctcAnnualStr: response.ctc_annual_str ?? response.ctcAnnualStr ?? '',
    basicMonthlyStr: response.basic_monthly_str ?? response.basicMonthlyStr ?? '',
    hraMonthlyStr: response.hra_monthly_str ?? response.hraMonthlyStr ?? '',
    pfMonthlyStr: response.pf_monthly_str ?? response.pfMonthlyStr ?? '',
    specialAllowanceMonthlyStr: response.special_allowance_monthly_str ?? response.specialAllowanceMonthlyStr ?? '',
    variableAnnualStr: response.variable_annual_str ?? response.variableAnnualStr ?? '',
    grossMonthlyStr: response.gross_monthly_str ?? response.grossMonthlyStr ?? '',
    ctcLpa: response.ctc_lpa ?? response.ctcLpa ?? '',
    pfOpted: response.pf_opted ?? response.pfOpted ?? false,
  }
}

export interface OfferLetterRequest {
  candidate_name: string
  salutation: string
  role: string
  department: string
  joining_date: string
  letter_date?: string
  salary_data: SalaryParseResponse
  custom_rr?: string[]
}

export interface InternshipRequest {
  intern_name: string
  salutation: string
  reg_no?: string
  college?: string
  department?: string
  role: string
  start_date: string
  end_date: string
  duration?: string
  responsibilities?: string[]
  letter_date?: string
}

export interface DocumentResponse {
  job_id: string
  filename: string
  docx_path: string
  pdf_path: string
  success: boolean
}

export interface HistoryItem {
  [key: string]: any
}

export interface HistoryResponse {
  history: HistoryItem[]
  count: number
}

// In-memory demo history cache
const demoHistory: HistoryItem[] = [
  {
    job_id: 'JOB-DEMO-001',
    doc_type: 'Offer Letter',
    candidate_name: 'Priya Sharma',
    role: 'Senior Data Scientist',
    created_at: '2026-02-14 11:30',
    filename: 'Offer_Letter_Priya_Sharma.pdf',
  },
  {
    job_id: 'JOB-DEMO-002',
    doc_type: 'Pre-Offer Letter',
    candidate_name: 'Rahul Varma',
    role: 'Data Analyst',
    created_at: '2026-02-12 16:45',
    filename: 'Pre_Offer_Rahul_Varma.pdf',
  },
]

// ==========================================
// PRE-OFFER LETTER
// ==========================================

export async function generatePreOffer(data: PreOfferRequest): Promise<DocumentResponse> {
  if (isDemoMode()) {
    const jobId = `pre_offer_${Date.now()}`
    const filename = `Pre_Offer_${data.candidate_name.replace(/\s+/g, '_')}`
    demoHistory.unshift({
      job_id: jobId,
      doc_type: 'Pre-Offer Letter',
      candidate_name: data.candidate_name,
      role: data.role,
      created_at: new Date().toLocaleString(),
      filename: `${filename}.pdf`,
    })
    return {
      job_id: jobId,
      filename,
      docx_path: `/demo/${filename}.docx`,
      pdf_path: `/demo/${filename}.pdf`,
      success: true,
    }
  }

  const response = await fetch(`${API_BASE_URL}/pre-offer/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to generate pre-offer letter')
  }

  return response.json()
}

// ==========================================
// SALARY CALCULATION
// ==========================================

export async function calculateSalaryBreakup(data: SalaryParseRequest): Promise<SalaryParseResponse> {
  if (isDemoMode()) {
    // Deterministic parser for demo mode
    let ctcLakhs = 12
    const match = data.prompt.match(/(\d+(\.\d+)?)\s*(?:lpa|lakh|lac|l)?/i)
    if (match && Number(match[1]) > 0) {
      ctcLakhs = Number(match[1])
      if (ctcLakhs > 1000) ctcLakhs = ctcLakhs / 100000 // if given in full rupees
    }

    const ctcAnnual = Math.round(ctcLakhs * 100000)
    const basicAnnual = Math.round(ctcAnnual * 0.5)
    const hraAnnual = Math.round(basicAnnual * 0.4)
    const pfAnnual = Math.round(basicAnnual * 0.12)
    const variableAnnual = Math.round(ctcAnnual * 0.1)
    const specialAllowanceAnnual = Math.max(0, ctcAnnual - (basicAnnual + hraAnnual + pfAnnual + variableAnnual))
    const grossMonthly = Math.round((basicAnnual + hraAnnual + specialAllowanceAnnual) / 12)

    const rawResult = {
      ctc_annual: ctcAnnual,
      basic_annual: basicAnnual,
      hra_annual: hraAnnual,
      pf_annual: pfAnnual,
      variable_annual: variableAnnual,
      special_allowance_annual: specialAllowanceAnnual,
      gross_monthly: grossMonthly,
      hra_percent_of_basic: 40,
      basic_percent: 50,
      hra_percent: 20,
      pf_percent: 6,
      variable_percent: 10,
      pf_description: '12% of Basic Salary as per statutory norms',
      ctc_annual_str: `₹ ${new Intl.NumberFormat('en-IN').format(ctcAnnual)}`,
      basic_monthly_str: `₹ ${new Intl.NumberFormat('en-IN').format(Math.round(basicAnnual / 12))}`,
      hra_monthly_str: `₹ ${new Intl.NumberFormat('en-IN').format(Math.round(hraAnnual / 12))}`,
      pf_monthly_str: `₹ ${new Intl.NumberFormat('en-IN').format(Math.round(pfAnnual / 12))}`,
      special_allowance_monthly_str: `₹ ${new Intl.NumberFormat('en-IN').format(Math.round(specialAllowanceAnnual / 12))}`,
      variable_annual_str: `₹ ${new Intl.NumberFormat('en-IN').format(variableAnnual)}`,
      gross_monthly_str: `₹ ${new Intl.NumberFormat('en-IN').format(grossMonthly)}`,
      ctc_lpa: `${ctcLakhs} LPA`,
      pf_opted: true,
    }

    return normalizeSalaryParseResponse(rawResult)
  }

  const response = await fetch(`${API_BASE_URL}/offer-letter/calculate-salary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to calculate salary')
  }

  const json = await response.json()
  return normalizeSalaryParseResponse(json)
}

// ==========================================
// OFFER LETTER
// ==========================================

export async function generateOfferLetter(data: OfferLetterRequest): Promise<DocumentResponse> {
  if (isDemoMode()) {
    const jobId = `offer_${Date.now()}`
    const filename = `Offer_Letter_${data.candidate_name.replace(/\s+/g, '_')}`
    demoHistory.unshift({
      job_id: jobId,
      doc_type: 'Offer Letter',
      candidate_name: data.candidate_name,
      role: data.role,
      created_at: new Date().toLocaleString(),
      filename: `${filename}.pdf`,
    })
    return {
      job_id: jobId,
      filename,
      docx_path: `/demo/${filename}.docx`,
      pdf_path: `/demo/${filename}.pdf`,
      success: true,
    }
  }

  const response = await fetch(`${API_BASE_URL}/offer-letter/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to generate offer letter')
  }

  return response.json()
}

// ==========================================
// INTERNSHIP CERTIFICATE
// ==========================================

export async function generateInternship(data: InternshipRequest): Promise<DocumentResponse> {
  if (isDemoMode()) {
    const jobId = `intern_${Date.now()}`
    const filename = `Internship_Cert_${data.intern_name.replace(/\s+/g, '_')}`
    demoHistory.unshift({
      job_id: jobId,
      doc_type: 'Internship Certificate',
      candidate_name: data.intern_name,
      role: data.role,
      created_at: new Date().toLocaleString(),
      filename: `${filename}.pdf`,
    })
    return {
      job_id: jobId,
      filename,
      docx_path: `/demo/${filename}.docx`,
      pdf_path: `/demo/${filename}.pdf`,
      success: true,
    }
  }

  const response = await fetch(`${API_BASE_URL}/internship/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to generate internship certificate')
  }

  return response.json()
}

// ==========================================
// HISTORY
// ==========================================

export async function getHistory(): Promise<HistoryResponse> {
  if (isDemoMode()) {
    return {
      history: demoHistory,
      count: demoHistory.length,
    }
  }

  const response = await fetch(`${API_BASE_URL}/history`, { method: 'GET' })
  if (!response.ok) {
    throw new Error('Failed to fetch history')
  }
  return response.json()
}

export async function clearHistory(): Promise<{ message: string }> {
  if (isDemoMode()) {
    demoHistory.length = 0
    return { message: 'History cleared successfully' }
  }

  const response = await fetch(`${API_BASE_URL}/history`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error('Failed to clear history')
  }
  return response.json()
}

// ==========================================
// DOWNLOAD FILES
// ==========================================

export async function downloadPdf(jobId: string, filename: string): Promise<void> {
  if (isDemoMode()) {
    const content = `Analytics Avenue Innovations - Demo Document (${filename})\nGenerated Job ID: ${jobId}\nStatus: Verified and Approved`
    const blob = new Blob([content], { type: 'application/pdf' })
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `${filename}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(downloadUrl)
    document.body.removeChild(a)
    return
  }

  const url = `${API_BASE_URL}/download/pdf/${jobId}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to download PDF')
  }

  const blob = await response.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = `${filename}.pdf`
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(downloadUrl)
  document.body.removeChild(a)
}

export async function downloadDocx(jobId: string, filename: string): Promise<void> {
  if (isDemoMode()) {
    const content = `Analytics Avenue Innovations - Demo Document (${filename})\nGenerated Job ID: ${jobId}`
    const blob = new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `${filename}.docx`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(downloadUrl)
    document.body.removeChild(a)
    return
  }

  const url = `${API_BASE_URL}/download/docx/${jobId}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to download DOCX')
  }

  const blob = await response.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = `${filename}.docx`
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(downloadUrl)
  document.body.removeChild(a)
}

// ==========================================
// ROLES & RESPONSIBILITIES
// ==========================================

export async function getRoleResponsibilities(role: string): Promise<{ role: string; responsibilities: string[] }> {
  if (isDemoMode()) {
    const rMap = DEMO_OFFER_LETTER_TEMPLATES.responsibilities as Record<string, string[]>
    const found = rMap[role] || [
      `Execute day-to-day responsibilities for the ${role} function.`,
      'Collaborate with cross-functional project leads and stakeholders.',
      'Ensure high code quality, documentation, and compliance with data governance standards.',
      'Participate in agile sprints, retrospectives, and knowledge transfer sessions.',
    ]
    return {
      role,
      responsibilities: found,
    }
  }

  const response = await fetch(`${API_BASE_URL}/roles/${encodeURIComponent(role)}/responsibilities`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch responsibilities')
  }

  return response.json()
}
