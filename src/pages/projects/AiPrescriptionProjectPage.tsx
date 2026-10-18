import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'

import {
  ChevronLeft,
  ChevronRight,
  Zap,
  Target,
  TrendingUp,
  ChevronDown,
  X,
  CircleHelp,
  Rocket,
  XCircle,
  Loader2,
  CheckCircle2,
  FileText,
  Trash2,
  Mail,
  Download,
  Brain,
  Send,
  RotateCcw,
} from 'lucide-react'
import { AiPrescriptionService } from '@/services/aiPrescriptionService'
import { ProjectOverviewManager, EditableOverviewSection } from '@/components/project-content'

export const AI_PRESCRIPTION_STREAMLIT_ORIGIN = 'https://6jqgsyupocbatrzmhjz9am.streamlit.app/'

/* ─── Static data ────────────────────────────────────────────── */
const capabilities = [
  'Supports 9 domains — Finance, Healthcare, Supply Chain, E-Commerce, HR Analytics, Automobile, Manufacturing, Retail, and Cyber Security.',
  'AI generates personalised prescription text with domain-specific bullets using Groq LLaMA 3.3 70B.',
  'Download as PDF (3 pages) or editable Word (.docx) document.',
  "Send the prescription directly to the candidate's email with CC support.",
  'Career table includes roles, challenges, key skills, and targeted companies per domain.',
]

const businessImpact = [
  'Replace manual prescription writing — generate tailored career documents in seconds.',
  'Deliver consistent, professional-grade prescriptions to every prospective student.',
  'Send directly to candidates via email without leaving the app.',
  'Word export lets consultants make last-minute edits before sharing.',
  'Scale across hundreds of consultations without additional effort.',
]

const DEFAULT_PROGRAMS = [
  'Nationwide Data Analytics Training and Placement Program 2026',
  'Nationwide Data Engineering and Gen AI Program 2026',
  'Nationwide Data Analytics and Business Intelligence Program 2026',
]

const DEFAULT_TECHS = [
  'SQL', 'Python', 'Statistics', 'Power BI', 'Machine Learning',
  'Gen AI', 'Cloud', 'ETL', 'Data Engineering', 'Tableau', 'Visualization',
]

const DOMAINS = [
  'Finance', 'Supply Chain', 'Healthcare', 'HR Analytics', 'E-Commerce',
  'Automobile', 'Manufacturing', 'Retail', 'Cyber Security', 'Marketing Analytics',
]

const STATUSES = ['Working Professional', 'Student', 'Job Seeker']

const DEFAULT_CONSULTATION_NOTE_EXAMPLE =
  'As per our discussion, you completed B.Com and have two years of experience in accounts. You cannot directly become a Data Analyst at this stage, but this programme will bridge that gap and help you transition into a data-driven role with the right skills and projects.'

/* ─── Shared style tokens (matching PatientFlow) ─────────────── */
const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0F766E] transition'
const selectCls =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#0F766E] transition cursor-pointer'
const cardCls =
  'rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]'
const btnPrimaryCls =
  'inline-flex items-center gap-2 rounded-full bg-[#0F766E] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,118,110,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,118,110,0.26)] active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none'
const btnSecondaryCls =
  'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed'

/* ─── SectionHeading (matches PatientFlow pattern exactly) ─────── */
function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">{title}</h2>
      {description && <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#475569]">{description}</p>}
    </div>
  )
}

/* ─── Overview Tab ──────────────────────────────────────────── */
function OverviewTab() {
  return (
    <div className="space-y-8 pt-6">
      <SectionHeading
        eyebrow="Overview"
        title="What this tool does"
        description="Generate personalised, AI-powered career prescriptions for aspiring data professionals — combining Groq LLaMA 3.3 70B with domain-specific career templates to produce a 3-page PDF and editable Word document."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Capabilities */}
        <div className={cardCls}>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-[#0F766E]" />
            <h3 className="text-xl font-bold text-[#0F172A]">Capabilities</h3>
          </div>
          <ul className="space-y-3 text-sm leading-6 text-slate-600">
            {capabilities.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <ChevronRight className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Business Impact */}
        <div className={cardCls}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#0F766E]" />
            <h3 className="text-xl font-bold text-[#0F172A]">Business Impact</h3>
          </div>
          <ul className="space-y-3 text-sm leading-6 text-slate-600">
            {businessImpact.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <Target className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Brain className="h-5 w-5 text-[#0F766E]" />, label: 'Domains Supported', value: '9+', accent: 'bg-[#ECFDF5]' },
          { icon: <Zap className="h-5 w-5 text-[#1D4ED8]" />, label: 'AI Model', value: 'LLaMA 3.3', accent: 'bg-[#EFF6FF]' },
          { icon: <FileText className="h-5 w-5 text-[#A16207]" />, label: 'Output Formats', value: 'PDF + DOCX', accent: 'bg-[#FFFBEB]' },
          { icon: <Mail className="h-5 w-5 text-[#BE123C]" />, label: 'Email Support', value: 'Built-in', accent: 'bg-[#FFF1F2]' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-3">
              <div className={`rounded-2xl p-3 ${stat.accent}`}>{stat.icon}</div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-1 text-xl font-bold text-[#0F172A]">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Application Tab ─────────────────────────────────────────── */
function ApplicationTab({ consultationNote }: { consultationNote: string; setConsultationNote: (v: string) => void }) {
  const [name, setName] = useState('')
  const [status, setStatus] = useState('Working Professional')
  const [program, setProgram] = useState(DEFAULT_PROGRAMS[0])
  const [selectedDomains, setSelectedDomains] = useState<string[]>([])
  const [selectedTechnologies, setSelectedTechnologies] = useState<string[]>(DEFAULT_TECHS.slice(0, 6))
  const [domainOpen, setDomainOpen] = useState(false)
  const [techOpen, setTechOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [composeLoading, setComposeLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [aiContent, setAiContent] = useState<Record<string, any> | null>(null)
  const [tableRows, setTableRows] = useState<any[]>([])
  const [domainMap, setDomainMap] = useState<Record<string, number>>({})
  const [emailTo, setEmailTo] = useState('')
  const [emailCc, setEmailCc] = useState('')
  const [emailSubject, setEmailSubject] = useState('Your Learning & Internship Journey – Analytics Avenue')
  const [emailBody, setEmailBody] = useState('')
  const [htmlBody, setHtmlBody] = useState('')
  const [emailReady, setEmailReady] = useState(false)
  const [programOptions, setProgramOptions] = useState(DEFAULT_PROGRAMS)
  const [techOptions, setTechOptions] = useState(DEFAULT_TECHS)
  const [tierOptions, setTierOptions] = useState<string[]>(['Standard – Total ₹25,000 (₹20,000 + ₹5,000)'])
  const [consultants, setConsultants] = useState<string[]>(['VETRISELVAN G'])
  const [feeTier, setFeeTier] = useState('Standard – Total ₹25,000 (₹20,000 + ₹5,000)')
  const [consultant, setConsultant] = useState('VETRISELVAN G')
  const [customTotal, setCustomTotal] = useState('25000')
  const [customOnboarding, setCustomOnboarding] = useState('20000')
  const [customRemaining, setCustomRemaining] = useState('5000')
  const [customConsultant, setCustomConsultant] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const techDropdownRef = useRef<HTMLDivElement>(null)

  function getDefaultEmailBody(recipientName: string, domains: string[]) {
    const domainText = domains.length > 0 ? domains.join(', ') : 'E-Commerce'
    return `Dear ${recipientName || 'Candidate'},\n\nThank you for your recent consultation with Analytics Avenue.\n\nAs discussed, please find attached your personalised Career Prescription prepared by our team. This document outlines your tailored roadmap and domain-specific career opportunities in ${domainText}.\n\nPlease review the attached prescription and connect with us for the next steps.\n\nBest regards,\nAnalytics Avenue`
  }

  useEffect(() => {
    async function loadOptions() {
      try {
        const data = await AiPrescriptionService.getOptions()
        if (data) {
          if (Array.isArray(data.valid_programs) && data.valid_programs.length) setProgramOptions(data.valid_programs)
          if (Array.isArray(data.valid_techs) && data.valid_techs.length) setTechOptions(data.valid_techs)
          if (Array.isArray(data.program_tiers) && data.program_tiers.length) setTierOptions(data.program_tiers)
          if (Array.isArray(data.consultants) && data.consultants.length) setConsultants(data.consultants)
        }
      } catch { /* keep static defaults */ }
    }
    loadOptions()
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDomainOpen(false)
      if (techDropdownRef.current && !techDropdownRef.current.contains(e.target as Node)) setTechOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => { setEmailBody(getDefaultEmailBody(name, selectedDomains)) }, [name, selectedDomains])

  function toggleDomain(domain: string) {
    setSelectedDomains((prev) => prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain])
  }
  function selectAllDomains() {
    setSelectedDomains(selectedDomains.length === DOMAINS.length ? [] : [...DOMAINS])
  }
  function toggleTechnology(technology: string) {
    setSelectedTechnologies((prev) => prev.includes(technology) ? prev.filter((item) => item !== technology) : [...prev, technology])
  }

  async function handleGeneratePrescription() {
    setError(null)
    setSuccess(false)
    if (!name.trim()) { setError('Please enter the candidate name.'); return }
    if (selectedDomains.length === 0) { setError('Please select at least one domain.'); return }
    if (selectedDomains.length > 3) { setError('Please select up to 3 domains only.'); return }
    setLoading(true)
    try {
      const data = await AiPrescriptionService.generatePrescription({
        name,
        status,
        domains: selectedDomains,
        technologies: selectedTechnologies,
        program,
        consultation_note: consultationNote,
      })
      setJobId(data.job_id)
      setAiContent(data.ai_content)
      setTableRows(data.table_rows)
      setDomainMap(data.domain_map)
      setSuccess(true)
      setError(null)
    } catch (err: any) {
      setError(err?.message || 'Unable to generate prescription.')
      setSuccess(false)
    } finally { setLoading(false) }
  }

  async function handleDownloadPdf() {
    if (jobId) {
      try {
        await AiPrescriptionService.downloadPdf(jobId, name, aiContent)
      } catch (err: any) {
        setError(err?.message || 'Failed to download PDF.')
      }
    }
  }

  async function handleDownloadDocx() {
    if (jobId) {
      try {
        await AiPrescriptionService.downloadDocx(jobId, name, aiContent)
      } catch (err: any) {
        setError(err?.message || 'Failed to download DOCX.')
      }
    }
  }

  async function handleComposeEmail() {
    setError(null)
    if (!jobId) { setError('Please generate the prescription before composing the email.'); return }
    const total = feeTier === 'Custom' ? Number(customTotal || 0) : 25000
    const onboarding = feeTier === 'Custom' ? Number(customOnboarding || 0) : 20000
    const remaining = feeTier === 'Custom' ? Number(customRemaining || 0) : 5000
    const consultantName = consultant === 'Other' ? customConsultant.trim().toUpperCase() : consultant
    setComposeLoading(true)
    try {
      const data = await AiPrescriptionService.composeEmail({
        candidate_name: name,
        total,
        onboarding,
        remaining,
        consultant_name: consultantName || 'VETRISELVAN G',
      })
      setEmailSubject(data.subject || data.email_subject || emailSubject)
      setEmailBody(data.text_body || data.email_body || '')
      setHtmlBody(data.html_body || '')
      setEmailReady(true)
      setSuccess(true)
    } catch (err: any) { setError(err?.message || 'Unable to compose email body.') }
    finally { setComposeLoading(false) }
  }

  async function handleSendEmail() {
    setError(null)
    if (!jobId) { setError('Please generate the prescription before sending email.'); return }
    if (!emailTo.trim() || !emailTo.includes('@')) { setError('Enter a valid recipient email address.'); return }
    setLoading(true)
    try {
      await AiPrescriptionService.sendEmail({
        job_id: jobId,
        to_email: emailTo,
        cc_emails: emailCc.split(',').map((s) => s.trim()).filter(Boolean),
        subject: emailSubject,
        body: emailBody,
      })
      setSuccess(true)
      setError(null)
    } catch (err: any) { setError(err?.message || 'Unable to send email.') }
    finally { setLoading(false) }
  }

  async function handleResendEmail() {
    setError(null)
    if (!jobId) { setError('Please generate the prescription before resending email.'); return }
    if (!emailTo.trim() || !emailTo.includes('@')) { setError('Enter a valid recipient email address.'); return }
    setLoading(true)
    try {
      await AiPrescriptionService.resendEmail({
        job_id: jobId,
        to_email: emailTo,
        cc_emails: emailCc.split(',').map((s) => s.trim()).filter(Boolean),
        subject: emailSubject,
        body: emailBody,
      })
      setSuccess(true)
      setError(null)
    } catch (err: any) { setError(err?.message || 'Unable to resend email.') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 pt-6">

      {/* ── Candidate Details ── */}
      <div className={cardCls}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0F766E] mb-1">Step 1</p>
        <h3 className="text-xl font-bold text-[#0F172A] mb-5">Candidate Details</h3>

        {/* Name + Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Student Name"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Status <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Program Name */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Program Name</label>
          <div className="relative">
            <select value={program} onChange={(e) => setProgram(e.target.value)} className={selectCls}>
              {programOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Technologies */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-slate-700">Technologies Needed</label>
            <CircleHelp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="relative" ref={techDropdownRef}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setTechOpen((o) => !o)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setTechOpen((o) => !o) }}
              className="min-h-[48px] w-full flex flex-wrap items-center gap-1.5 px-4 py-2.5 border border-slate-200 rounded-2xl bg-white cursor-pointer focus:outline-none focus:border-[#0F766E] transition"
            >
              {selectedTechnologies.length === 0
                ? <span className="text-sm text-slate-400 flex-1">Choose options</span>
                : selectedTechnologies.map((tech) => (
                  <span key={tech} className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-3 py-1 text-sm font-semibold text-[#0F766E]">
                    {tech}
                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleTechnology(tech) }} className="hover:opacity-70" aria-label={`Remove ${tech}`}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              }
              <div className="ml-auto flex items-center gap-1">
                {selectedTechnologies.length > 0 && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedTechnologies([]) }} className="text-slate-400 hover:text-slate-600" aria-label="Clear all technologies">
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${techOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
            {techOpen && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setSelectedTechnologies(selectedTechnologies.length === techOptions.length ? [] : [...techOptions])}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 border-b border-slate-200 transition"
                >
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${selectedTechnologies.length === techOptions.length ? 'bg-[#0F766E] border-[#0F766E]' : 'border-slate-300'}`}>
                    {selectedTechnologies.length === techOptions.length && <span className="text-white text-[10px] font-bold">✓</span>}
                  </span>
                  Select all
                </button>
                {techOptions.map((item) => {
                  const checked = selectedTechnologies.includes(item)
                  return (
                    <button key={item} type="button" onClick={() => toggleTechnology(item)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition">
                      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-[#0F766E] border-[#0F766E]' : 'border-slate-300'}`}>
                        {checked && <span className="text-white text-[10px] font-bold">✓</span>}
                      </span>
                      {item}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Target Domains */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-slate-700">Target Domains <span className="text-rose-500">*</span></label>
            <CircleHelp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="relative" ref={dropdownRef}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setDomainOpen((o) => !o)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDomainOpen((o) => !o) }}
              className="min-h-[48px] w-full flex flex-wrap items-center gap-1.5 px-4 py-2.5 border border-slate-200 rounded-2xl bg-white cursor-pointer focus:outline-none focus:border-[#0F766E] transition"
            >
              {selectedDomains.length === 0
                ? <span className="text-sm text-slate-400 flex-1">Choose options</span>
                : selectedDomains.map((d) => (
                  <span key={d} className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-3 py-1 text-sm font-semibold text-[#0F766E]">
                    {d}
                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedDomains((prev) => prev.filter((x) => x !== d)) }} className="hover:opacity-70" aria-label={`Remove ${d}`}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              }
              <div className="ml-auto flex items-center gap-1">
                {selectedDomains.length > 0 && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedDomains([]) }} className="text-slate-400 hover:text-slate-600" aria-label="Clear all">
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${domainOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
            {domainOpen && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
                <button type="button" onClick={selectAllDomains} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 border-b border-slate-200 transition">
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${selectedDomains.length === DOMAINS.length ? 'bg-[#0F766E] border-[#0F766E]' : 'border-slate-300'}`}>
                    {selectedDomains.length === DOMAINS.length && <span className="text-white text-[10px] font-bold">✓</span>}
                  </span>
                  Select all
                </button>
                <div className="max-h-56 overflow-y-auto">
                  {DOMAINS.map((d) => {
                    const checked = selectedDomains.includes(d)
                    return (
                      <button key={d} type="button" onClick={() => toggleDomain(d)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition">
                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-[#0F766E] border-[#0F766E]' : 'border-slate-300'}`}>
                          {checked && <span className="text-white text-[10px] font-bold">✓</span>}
                        </span>
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Generate button */}
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={handleGeneratePrescription} disabled={loading} className={btnPrimaryCls}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            {loading ? 'Generating...' : 'Generate Prescription'}
          </button>
        </div>

        {/* Feedback */}
        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>
        )}
        {success && jobId && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            Prescription generated successfully! You can download the file or send it by email.
          </div>
        )}

        {/* Download actions */}
        {jobId && (
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={handleDownloadPdf} className={btnPrimaryCls}>
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button type="button" onClick={handleDownloadDocx} className={btnSecondaryCls}>
              <FileText className="w-4 h-4" />
              Download Word (.docx)
            </button>
          </div>
        )}
      </div>

      {/* ── Compose & Send Email ── */}
      {jobId && (
        <div className={cardCls}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0F766E] mb-1">Step 2</p>
          <h3 className="text-xl font-bold text-[#0F172A] mb-5">Compose &amp; Send Email</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fee Tier</label>
              <div className="relative">
                <select value={feeTier} onChange={(e) => setFeeTier(e.target.value)} className={selectCls}>
                  {tierOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                  <option value="Custom">Custom</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Consultant</label>
              <div className="relative">
                <select value={consultant} onChange={(e) => setConsultant(e.target.value)} className={selectCls}>
                  {consultants.map((item) => <option key={item} value={item}>{item}</option>)}
                  <option value="Other">Other</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {consultant === 'Other' && (
            <input
              value={customConsultant}
              onChange={(e) => setCustomConsultant(e.target.value.toUpperCase())}
              placeholder="Enter consultant name"
              className={`${inputCls} mb-4`}
            />
          )}

          {feeTier === 'Custom' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Total</label>
                <input type="number" value={customTotal} onChange={(e) => setCustomTotal(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Onboarding</label>
                <input type="number" value={customOnboarding} onChange={(e) => setCustomOnboarding(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Remaining</label>
                <input type="number" value={customRemaining} onChange={(e) => setCustomRemaining(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 mb-5">
            <button type="button" onClick={handleComposeEmail} disabled={composeLoading} className={btnPrimaryCls}>
              {composeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {composeLoading ? 'Composing...' : 'Compose Email Body'}
            </button>
          </div>

          {emailReady && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">To *</label>
                <input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="candidate@email.com" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">CC (comma-separated)</label>
                <input type="text" value={emailCc} onChange={(e) => setEmailCc(e.target.value)} placeholder="cc1@email.com, cc2@email.com" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subject</label>
                <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Body</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={10}
                  className={`${inputCls} resize-none`}
                />
              </div>
              {htmlBody && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Preview Formatted Email</label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: htmlBody }} />
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button type="button" onClick={handleSendEmail} disabled={loading} className={btnPrimaryCls}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {loading ? 'Sending...' : 'Send Mail'}
                </button>
                <button type="button" onClick={handleResendEmail} disabled={loading} className={btnSecondaryCls}>
                  <RotateCcw className="w-4 h-4" />
                  Resend Mail
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AI Content ── */}
      {aiContent && (
        <div className={cardCls}>
          <h3 className="text-xl font-bold text-[#0F172A] mb-4">AI Generated Content</h3>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl p-4 overflow-x-auto">
            {JSON.stringify(aiContent, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

/* ─── Special Consultation Tab ────────────────────────────────── */
function SpecialConsultationTab({
  consultationNote,
  setConsultationNote,
}: {
  consultationNote: string
  setConsultationNote: (v: string) => void
}) {
  const [draft, setDraft] = useState(consultationNote)
  const [saveSuccess, setSaveSuccess] = useState(false)

  return (
    <div className="space-y-6 pt-6">
      <SectionHeading
        eyebrow="Special Consultation"
        title="Special Consultation Note"
        description="Type your custom consultation note below. This will appear directly under the Prescription heading in the generated PDF and Word document, followed by the AI-generated domain-specific content as usual."
      />

      {/* Example box */}
      <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
        <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0F766E]">Example</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Use the textarea below to write your own consultation note. The example text is shown only for guidance and will not be saved unless you type it yourself and click <span className="font-semibold">Save Note</span>.
        </p>
      </div>

      {/* Note textarea */}
      <div className={cardCls}>
        <div className="space-y-1.5 mb-4">
          <label className="block text-sm font-semibold text-slate-700">
            Consultation Note <span className="text-rose-500">*</span>
          </label>
          <p className="text-sm text-slate-500">Add your personalised notes here. The saved value will continue to flow into the existing prescription generation request.</p>
        </div>
        <textarea
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setSaveSuccess(false) }}
          rows={10}
          placeholder="e.g. As per our discussion, you completed B.Com and have two years of experience in accounts. You cannot directly become a Data Analyst at this stage, but this programme will bridge that gap and help you transition into a data-driven role with the right skills and projects."
          className={`${inputCls} resize-y min-h-[180px]`}
        />

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              const nextNote = draft.trim()
              localStorage.setItem('ai-prescription-consultation-note', nextNote)
              setConsultationNote(nextNote)
              setSaveSuccess(true)
            }}
            className={btnPrimaryCls}
          >
            <FileText className="w-4 h-4" />
            Save Note
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft('')
              setConsultationNote('')
              localStorage.setItem('ai-prescription-consultation-note', '')
              setSaveSuccess(false)
            }}
            className={btnSecondaryCls}
          >
            <Trash2 className="w-4 h-4" />
            Clear Note
          </button>
        </div>

        {saveSuccess && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            Consultation note saved. Go to the <strong>&nbsp;Application&nbsp;</strong> tab and generate the prescription — your note will appear under the Prescription heading.
          </div>
        )}

        {consultationNote.trim() && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800 mb-3">Currently saved note (will appear in next generated PDF):</p>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {consultationNote}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

type ActiveTab = 'overview' | 'application' | 'special-consultation'

/* ─── Main Page ───────────────────────────────────────────────── */
export function AiPrescriptionProjectPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [consultationNote, setConsultationNote] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('ai-prescription-consultation-note') || ''
    const sanitized = saved.trim() === DEFAULT_CONSULTATION_NOTE_EXAMPLE.trim() ? '' : saved
    setConsultationNote(sanitized)
  }, [])

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'application', label: 'Application' },
    { key: 'special-consultation', label: 'Special Consultation' },
  ]

  return (
    <div className="mx-auto max-w-7xl p-6">

      {/* ── Back button ── */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#475569] shadow-sm transition hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:text-[#0F172A] hover:shadow-md active:translate-y-0"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      {/* ── Hero banner ── */}
      <div className="mb-8 rounded-[32px] bg-[linear-gradient(135deg,#F0FDFA_0%,#FFFFFF_40%,#EFF6FF_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#0F766E]">AI Tools project</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">AI Prescription Generator</h1>
          <p className="mt-4 max-w-3xl text-[16px] leading-7 text-[#334155]">
            Generate personalised, AI-powered career prescriptions for aspiring data professionals. Supports 9 domains with LLaMA 3.3 70B, PDF &amp; DOCX export, and direct email delivery.
          </p>
        </div>
      </div>


      <ProjectOverviewManager
        projectSlug="ai-prescription"
        projectTitle="AI Prescription Generator"
        systemTabs={tabs}
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t as ActiveTab)}
        renderOverviewContent={(sections, onEdit, onDelete) => {
          const purposeSec = sections.find((s) => s.id === 'purpose') || {
            id: 'purpose',
            projectSlug: 'ai-prescription',
            title: 'What this tool does',
            eyebrow: 'Overview',
            description:
              'Generate personalised, AI-powered career prescriptions for aspiring data professionals — combining Groq LLaMA 3.3 70B with domain-specific career templates to produce a 3-page PDF and editable Word document.',
          }
          const capabilitiesSec = sections.find((s) => s.id === 'capabilities')
          const businessImpactSec = sections.find((s) => s.id === 'business-impact')
          const customSections = sections.filter((s) => s.isCustom)

          return (
            <div className="space-y-8 pt-2">
              <EditableOverviewSection
                section={purposeSec}
                onEdit={onEdit}
                accentColor="#0F766E"
              />

              <div className="grid gap-6 lg:grid-cols-2">
                {capabilitiesSec && (
                  <EditableOverviewSection
                    section={capabilitiesSec}
                    onEdit={onEdit}
                    accentColor="#0F766E"
                  />
                )}
                {businessImpactSec && (
                  <EditableOverviewSection
                    section={businessImpactSec}
                    onEdit={onEdit}
                    accentColor="#0F766E"
                  />
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: <Brain className="h-5 w-5 text-[#0F766E]" />, label: 'Domains Supported', value: '9+', accent: 'bg-[#ECFDF5]' },
                  { icon: <Zap className="h-5 w-5 text-[#1D4ED8]" />, label: 'AI Model', value: 'LLaMA 3.3', accent: 'bg-[#EFF6FF]' },
                  { icon: <FileText className="h-5 w-5 text-[#A16207]" />, label: 'Output Formats', value: 'PDF + DOCX', accent: 'bg-[#FFFBEB]' },
                  { icon: <Mail className="h-5 w-5 text-[#BE123C]" />, label: 'Email Support', value: 'Built-in', accent: 'bg-[#FFF1F2]' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-2xl p-3 ${stat.accent}`}>{stat.icon}</div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
                        <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {customSections.map((sec) => (
                <EditableOverviewSection
                  key={sec.id}
                  section={sec}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  accentColor="#0F766E"
                />
              ))}
            </div>
          )
        }}
      >
        {activeTab === 'application' && (
          <ApplicationTab
            consultationNote={consultationNote}
            setConsultationNote={setConsultationNote}
          />
        )}
        {activeTab === 'special-consultation' && (
          <SpecialConsultationTab
            consultationNote={consultationNote}
            setConsultationNote={setConsultationNote}
          />
        )}
      </ProjectOverviewManager>
    </div>
  )
}
