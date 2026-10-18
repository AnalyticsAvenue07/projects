import { useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowRight,
  CloudUpload,
  FileText,
  Zap,
  ShieldCheck,
  ChevronLeft,
  Calculator,
  Scale,
} from 'lucide-react'
import {
  ProjectOverviewManager,
  EditableOverviewSection,
} from '@/components/project-content'

function ApplicationTab() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showSummary, setShowSummary] = useState(false)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
    setShowSummary(false)
  }

  return (
    <div className="space-y-6">
      <div className="aa-card bg-white p-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#F59E0B] mb-3">
              Upload Buyer RFQ
            </p>
            <p className="text-[15px] text-[#334155] leading-relaxed mb-5">
              Upload the buyer's request for quotation as TXT, DOCX, or PDF to begin automated parsing, product matching, and pricing.
            </p>
            <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6">
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[#CBD5E1] bg-white px-5 py-4 text-sm font-semibold text-[#334155] hover:border-[#94A3B8]">
                <span className="flex items-center gap-3">
                  <CloudUpload className="w-5 h-5 text-[#0F766E]" />
                  {selectedFile ? selectedFile.name : 'Choose file'}
                </span>
                <input
                  type="file"
                  accept=".txt,.docx,.pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <p className="mt-3 text-sm text-[#64748B]">200MB per file • TXT, DOCX, PDF</p>
            </div>

            <button
              type="button"
              onClick={() => setShowSummary(true)}
              disabled={!selectedFile}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-6 py-3 text-white font-semibold transition hover:bg-[#0D5F58] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight className="w-4 h-4" />
              Run AI Pipeline
            </button>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-[#FEF3C7] p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[#92400E] mb-4">What happens when you click Run?</h3>
            <ol className="space-y-3 text-[14px] text-[#92400E] leading-relaxed list-decimal list-inside">
              <li>File read — buyer info extracted.</li>
              <li>Groq LLaMA classifies and extracts items.</li>
              <li>Products matched from gold catalogue.</li>
              <li>Live MCX price fetched and quote calculated.</li>
              <li>Review pricing — Generate PDF — Send Email.</li>
            </ol>
          </div>
        </div>
      </div>

      {showSummary && selectedFile && (
        <div className="aa-card bg-white p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
                <p className="text-sm font-semibold text-[#0F766E] mb-3">Live Pricing Results</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 text-center">
                    <p className="text-[13px] text-[#64748B]">LIVE GOLD 24K / GRAM</p>
                    <p className="mt-2 text-2xl font-bold text-[#0F172A]">Rs. 13,999.77</p>
                  </div>
                  <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 text-center">
                    <p className="text-[13px] text-[#64748B]">USD / INR</p>
                    <p className="mt-2 text-2xl font-bold text-[#0F172A]">96.81</p>
                  </div>
                  <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 text-center">
                    <p className="text-[13px] text-[#64748B]">PRICE SOURCE</p>
                    <p className="mt-2 text-2xl font-bold text-[#0F766E]">LIVE</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#0F766E]" />
                    <p className="font-semibold text-[#0F172A]">Parsed RFQ</p>
                  </div>
                  <p className="text-sm text-[#475569]">
                    {selectedFile.name} was analysed and line items were matched to the gold catalogue. Continue to quote generation and email drafting.
                  </p>
                </div>
              </div>
            </div>

            <div className="aa-card bg-white p-6">
              <p className="text-sm font-semibold text-[#475569] mb-3">Suggested next actions</p>
              <div className="space-y-3">
                <button className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3 text-left text-[#0F172A] font-semibold">
                  Generate Quote PDF
                </button>
                <button className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3 text-left text-[#0F172A] font-semibold">
                  Prepare Quote Email
                </button>
                <button className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3 text-left text-[#0F172A] font-semibold">
                  Review Negotiation Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="aa-surface-muted p-6">
        <p className="text-[13px] font-semibold uppercase tracking-[0.24em] text-[#0F766E] mb-4">
          Sample file for testing
        </p>
        <div className="rounded-2xl border border-[#CBD5E1] bg-white px-5 py-4 text-sm text-[#0F172A]">
          input_folder/sample_rfq.txt
        </div>
      </div>
    </div>
  )
}

export function AiGoldNegotiationProjectPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')

  const systemTabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'application', label: 'Application' },
  ]

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* ── Standalone Back Button ── */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#475569] shadow-sm transition hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:text-[#0F172A] hover:shadow-md active:translate-y-0"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      {/* ── Premium Hero Banner ── */}
      <div className="mb-8 rounded-[32px] bg-[linear-gradient(135deg,#F0FDFA_0%,#FFFFFF_40%,#EFF6FF_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#0F766E]">
            <span>Gold Intelligence</span>
            <span className="text-slate-300">•</span>
            <span>AI Gold Negotiation Orchestrator</span>
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">
            Enterprise RFQ-to-Quote pricing and negotiation automation for gold buyers.
          </h1>
          <p className="mt-4 max-w-4xl text-[16px] leading-7 text-[#334155]">
            A complete workflow for reading buyer RFQs, matching gold products, pricing using live MCX data, generating branded quote PDFs, drafting buyer emails, and managing multi-round negotiations with acceptance, counteroffer, or reject logic.
          </p>
        </div>
      </div>

      {/* ── Content Management & Tab Navigation ── */}
      <ProjectOverviewManager
        projectSlug="ai-gold-negotiation"
        projectTitle="AI Gold Negotiation Orchestrator"
        systemTabs={systemTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        renderOverviewContent={(sections, onEdit, onDelete) => {
          const purposeSec = sections.find((s) => s.id === 'purpose')
          const capabilitiesSec = sections.find((s) => s.id === 'capabilities')
          const businessImpactSec = sections.find((s) => s.id === 'business-impact')
          const pricingSec = sections.find((s) => s.id === 'pricing-equation')
          const negotiationSec = sections.find((s) => s.id === 'negotiation-logic')
          const customSections = sections.filter((s) => s.isCustom)

          return (
            <div className="space-y-8">
              {/* Top Row: Purpose & Capabilities */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.9fr]">
                {purposeSec && (
                  <EditableOverviewSection
                    section={purposeSec}
                    onEdit={onEdit}
                    accentColor="#0F766E"
                  />
                )}

                {capabilitiesSec && (
                  <EditableOverviewSection
                    section={capabilitiesSec}
                    onEdit={onEdit}
                    icon={<Zap className="w-5 h-5 text-[#F59E0B]" />}
                    accentColor="#0F766E"
                  />
                )}
              </div>

              {/* Second Row: Business Impact & Pricing Equation */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {businessImpactSec && (
                  <EditableOverviewSection
                    section={businessImpactSec}
                    onEdit={onEdit}
                    icon={<ShieldCheck className="w-5 h-5 text-[#0F766E]" />}
                    accentColor="#F59E0B"
                  />
                )}

                {pricingSec && (
                  <EditableOverviewSection
                    section={pricingSec}
                    onEdit={onEdit}
                    icon={<Calculator className="w-5 h-5 text-[#0F766E]" />}
                    accentColor="#0F766E"
                  />
                )}
              </div>

              {/* Third Row: Negotiation Logic */}
              {negotiationSec && (
                <EditableOverviewSection
                  section={negotiationSec}
                  onEdit={onEdit}
                  icon={<Scale className="w-5 h-5 text-[#0F766E]" />}
                  accentColor="#0F766E"
                />
              )}

              {/* User-created custom sections within Overview */}
              {customSections.length > 0 && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
              )}
            </div>
          )
        }}
      >
        {activeTab === 'application' && <ApplicationTab />}
      </ProjectOverviewManager>
    </div>
  )
}
export default AiGoldNegotiationProjectPage
