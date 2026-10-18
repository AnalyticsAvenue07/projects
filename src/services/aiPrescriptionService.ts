/**
 * AI Prescription Generator Domain Service
 */

import { isDemoMode } from './dataMode'
import { requestJson } from './apiClient'

const API_BASE_URL =
  import.meta.env.VITE_AI_PRESCRIPTION_API_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8001'

export interface PrescriptionGeneratePayload {
  name: string
  status: string
  domains: string[]
  technologies: string[]
  program: string
  consultation_note: string
}

export class AiPrescriptionService {
  static async getOptions() {
    if (isDemoMode()) {
      return {
        valid_programs: [
          'Nationwide Data Analytics Training and Placement Program 2026',
          'Nationwide Data Engineering and Gen AI Program 2026',
          'Nationwide Data Analytics and Business Intelligence Program 2026',
        ],
        valid_techs: [
          'SQL', 'Python', 'Statistics', 'Power BI', 'Machine Learning',
          'Gen AI', 'Cloud', 'ETL', 'Data Engineering', 'Tableau', 'Visualization',
        ],
        program_tiers: [
          'Standard – Total ₹25,000 (₹20,000 + ₹5,000)',
          'Executive – Total ₹35,000 (₹25,000 + ₹10,000)',
          'Custom',
        ],
        consultants: ['VETRISELVAN G', 'PRIYA SHARMA', 'ARUN KUMAR', 'Other'],
      }
    }
    return requestJson(`${API_BASE_URL}/`)
  }

  static async generatePrescription(payload: PrescriptionGeneratePayload) {
    if (isDemoMode()) {
      const jobId = `JOB-RX-${Date.now().toString(36).toUpperCase()}`
      const domainList = payload.domains.join(', ')
      const techList = payload.technologies.join(', ')

      const ai_content = `Career Transformation Prescription for ${payload.name}

1. EXECUTIVE DIAGNOSTIC SUMMARY
Based on your background as a ${payload.status}, you possess transferable analytical instincts that can be bridged into full-scale data roles. While your immediate profile does not yet fulfill all enterprise data engineering requirements, enrolling in the ${payload.program} creates an accelerated pathway toward high-growth opportunities across ${domainList}.

2. TAILORED UPSKILLING ROADMAP
- Foundation Milestone: Advanced SQL querying, relational database modeling, and exploratory analytics.
- Core Engineering: Python data pipelines, Pandas transformation, and statistical hypothesis testing.
- Business Intelligence: Production dashboards in Power BI/Tableau with automated data refreshes.
- Domain Specialization: Focused problem statements in ${domainList} using modern tech stack (${techList}).

3. RECOMMENDED NEXT STEPS
- Complete the onboarding orientation module within 48 hours.
- Schedule your 1-on-1 industry mentor alignment call.
- Start Sprint 1 capstone project development.`

      const table_rows = payload.domains.map((dom) => ({
        domain: dom,
        target_role: `${dom} Analytics Specialist`,
        key_skills: techList || 'SQL, Python, Power BI',
        target_companies: 'TCS, Infosys, Accenture, Deloitte, Amazon, Flipkart, HDFC Bank',
        hiring_trends: 'High Demand (+24% YoY growth)',
      }))

      const domain_map = Object.fromEntries(
        payload.domains.map((dom) => [
          dom,
          [
            `Analyze domain-specific telemetry for ${dom}.`,
            `Build real-time executive reporting suites in Power BI.`,
            `Develop predictive scoring algorithms for business operational decisions.`,
          ],
        ]),
      )

      return {
        job_id: jobId,
        ai_content,
        table_rows,
        domain_map,
        success: true,
      }
    }

    return requestJson(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  static async composeEmail(payload: { candidate_name: string; total?: number | string; onboarding?: number | string; remaining?: number | string; consultant_name?: string }) {
    if (isDemoMode()) {
      const subject = `Career Prescription & Onboarding Roadmap — ${payload.candidate_name}`
      const textBody = `Dear ${payload.candidate_name},

Thank you for consulting with Analytics Avenue.

We are pleased to provide your customized Career Prescription prepared by ${payload.consultant_name || 'Analytics Avenue Mentorship Team'}. This document defines your structured roadmap, skill gap analysis, and tailored career targets.

Fee Overview:
- Total Program Investment: ₹${payload.total || '25,000'}
- Onboarding Advance: ₹${payload.onboarding || '20,000'}
- Remaining Schedule: ₹${payload.remaining || '5,000'}

Please review the prescription attached and reply to this email to confirm your enrollment batch.

Warm regards,
${payload.consultant_name || 'VETRISELVAN G'}
Analytics Avenue`

      const htmlBody = `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
        <h2 style="color: #0f766e;">Career Prescription & Onboarding Roadmap</h2>
        <p>Dear <strong>${payload.candidate_name}</strong>,</p>
        <p>Thank you for consulting with Analytics Avenue.</p>
        <p>We are pleased to provide your customized Career Prescription prepared by <strong>${payload.consultant_name || 'Analytics Avenue Mentorship Team'}</strong>.</p>
        <div style="background: #f8fafc; border-left: 4px solid #0f766e; padding: 12px; margin: 16px 0;">
          <h4 style="margin: 0 0 8px 0;">Fee Overview</h4>
          <p style="margin: 4px 0;">• Total Program Investment: <strong>₹${payload.total || '25,000'}</strong></p>
          <p style="margin: 4px 0;">• Onboarding Advance: <strong>₹${payload.onboarding || '20,000'}</strong></p>
          <p style="margin: 4px 0;">• Remaining Schedule: <strong>₹${payload.remaining || '5,000'}</strong></p>
        </div>
        <p>Please review the prescription attached and reply to this email to confirm your enrollment batch.</p>
        <p>Warm regards,<br/><strong>${payload.consultant_name || 'VETRISELVAN G'}</strong><br/>Analytics Avenue</p>
      </div>`

      return {
        subject,
        text_body: textBody,
        html_body: htmlBody,
        email_subject: subject,
        email_body: textBody,
      }
    }

    return requestJson(`${API_BASE_URL}/compose-email-body`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  static async sendEmail(payload: { job_id: string; to_email: string; cc_emails?: string[]; subject: string; body: string }) {
    if (isDemoMode()) {
      return { success: true, message: 'Email dispatched successfully (Demo Mode simulated).' }
    }
    return requestJson(`${API_BASE_URL}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  static async resendEmail(payload: { job_id: string; to_email: string; cc_emails?: string[]; subject: string; body: string }) {
    if (isDemoMode()) {
      return { success: true, message: 'Email resent successfully (Demo Mode simulated).' }
    }
    return requestJson(`${API_BASE_URL}/resend-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  static async downloadPdf(jobId: string, candidateName?: string, content?: any): Promise<void> {
    if (isDemoMode()) {
      const text = `ANALYTICS AVENUE - CAREER PRESCRIPTION\nJob ID: ${jobId}\nCandidate: ${candidateName || 'Candidate'}\nGenerated Date: ${new Date().toLocaleDateString()}\n\n${typeof content === 'string' ? content : JSON.stringify(content, null, 2) || 'Prescription Details'}`
      const blob = new Blob([text], { type: 'application/pdf' })
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `Career_Prescription_${jobId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
      return
    }

    window.open(`${API_BASE_URL}/download/pdf/${jobId}`, '_blank')
  }

  static async downloadDocx(jobId: string, candidateName?: string, content?: any): Promise<void> {
    if (isDemoMode()) {
      const text = `ANALYTICS AVENUE - CAREER PRESCRIPTION\nJob ID: ${jobId}\nCandidate: ${candidateName || 'Candidate'}\nGenerated Date: ${new Date().toLocaleDateString()}\n\n${typeof content === 'string' ? content : JSON.stringify(content, null, 2) || 'Prescription Details'}`
      const blob = new Blob([text], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `Career_Prescription_${jobId}.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
      return
    }

    window.open(`${API_BASE_URL}/download/docx/${jobId}`, '_blank')
  }
}
