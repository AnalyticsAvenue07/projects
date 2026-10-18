import { type ChangeEvent, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowRight,
  ChevronLeft,
  CloudUpload,
  FileText,
  ShieldCheck,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react'
import { runDemo, redactFiles, type PiiRedactionResponse, type PiiRedactionResult } from '@/services/piiRedactionApi'
import { ProjectOverviewManager, EditableOverviewSection } from '@/components/project-content'

type Tab = 'overview' | 'application'

type InputMode = 'upload' | 'demo'

const overviewPurpose =
  'Automatically detect and redact Personally Identifiable Information (PII) from enterprise documents using GPT-4o vision and structured AI pipelines — preserving document structure while ensuring full data privacy compliance across PDF, Word, Excel, image, and text file formats.'

const overviewCapabilities = [
  'Supports PDF, DOCX, XLSX, TXT, and image files (JPG, PNG, TIFF, GIF).',
  'Multimodal AI — uses GPT-4o vision to process scanned documents and images.',
  'Detects Names, Dates, ID Numbers, Addresses, Emails, Phone Numbers, and Financial Info.',
  'Structured output via Pydantic — returns redacted text and full PII entity log.',
  'Batch processing — upload and redact multiple files in one run.',
  'Built-in demo mode with internal sample documents for quick evaluation.',
]

const overviewImpact = [
  'Accelerate GDPR, HIPAA, and data privacy compliance across document workflows.',
  'Eliminate manual redaction effort — process hundreds of documents in minutes.',
  'Reduce risk of accidental PII exposure in shared reports and datasets.',
  'Audit-ready PII detection logs for regulatory reporting and traceability.',
  'Scalable to enterprise document volumes with batch upload support.',
]

function OverviewTab() {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-[#CCFBF1] bg-[#F0FDFA]/50 p-8 shadow-sm">
        <p className="text-[11px] font-bold text-[#0F766E] uppercase tracking-[0.24em] mb-3">
          Purpose & Mission
        </p>
        <p className="text-base text-[#334155] leading-relaxed font-semibold">{overviewPurpose}</p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-[32px] border border-[#CCFBF1] bg-[#F0FDFA]/50 p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-[#0F766E]" />
            <h3 className="text-lg font-black text-[#0F172A]">Core Capabilities</h3>
          </div>
          <ul className="space-y-3">
            {overviewCapabilities.map((item, index) => (
              <li
                key={index}
                className="flex items-start gap-3 bg-white rounded-2xl border border-[#CCFBF1]/30 p-4 transition duration-150 hover:bg-slate-50/50 shadow-sm"
              >
                <ArrowRight className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                <span className="text-sm font-semibold text-[#334155]">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[32px] border border-[#DBEAFE] bg-[#EFF6FF]/50 p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="w-5 h-5 text-[#1D4ED8]" />
            <h3 className="text-lg font-black text-[#0F172A]">Business Impact</h3>
          </div>
          <ul className="space-y-3">
            {overviewImpact.map((item, index) => (
              <li
                key={index}
                className="flex items-start gap-3 bg-white rounded-2xl border border-[#DBEAFE]/30 p-4 transition duration-150 hover:bg-[#F0F7FF] shadow-sm"
              >
                <ArrowRight className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5" />
                <span className="text-sm font-semibold text-[#334155]">{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function ApplicationTab() {
  const [mode, setMode] = useState<InputMode>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [isRunningDemo, setIsRunningDemo] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<PiiRedactionResult[]>([])
  const [summary, setSummary] = useState<PiiRedactionResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const fileCount = files.length
  const fileSize = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files],
  )

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    setFiles((current) => [...current, ...selected].slice(0, 6))
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, idx) => idx !== index))
  }

  async function handleStart() {
    if (mode === 'upload' && fileCount === 0) return

    setErrorMessage(null)
    setIsProcessing(true)
    setResults([])
    setSummary(null)
    setExpandedIndex(null)

    try {
      const response = await redactFiles(files)
      setSummary(response)
      setResults(response.results)
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to redact files.')
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleRunDemo() {
    setErrorMessage(null)
    setIsRunningDemo(true)
    setIsProcessing(true)
    setResults([])
    setSummary(null)
    setExpandedIndex(null)

    try {
      const response = await runDemo()
      setSummary(response)
      setResults(response.results)
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to run demo.')
    } finally {
      setIsProcessing(false)
      setIsRunningDemo(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Mode Selection Card ── */}
      <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#0F766E] mb-2">Mode Selection</p>
        <h3 className="text-2xl font-black text-[#0F172A] mb-6">Select processing mode</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {(['upload', 'demo'] as const).map((inputMode) => {
            const title = inputMode === 'upload' ? 'Upload Documents' : 'Run Live Demo'
            const desc = inputMode === 'upload' ? 'Upload your own custom files for redaction' : 'Evaluate with sample documents pre-loaded in the system'
            const isActive = mode === inputMode
            return (
              <button
                key={inputMode}
                type="button"
                onClick={() => setMode(inputMode)}
                className={`rounded-2xl border p-5 text-left transition duration-200 hover:-translate-y-0.5 ${
                  isActive
                    ? 'border-[#0F766E] bg-[#ECFDF5]/30 text-[#0F766E] shadow-sm font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    checked={isActive}
                    readOnly
                    className="accent-[#0F766E] h-4 w-4"
                  />
                  <span className="font-black text-sm text-[#0F172A]">{title}</span>
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-2">{desc}</p>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Mode-specific Sandbox ── */}
      {mode === 'upload' ? (
        <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)] space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div>
              <h4 className="text-lg font-black text-[#0F172A]">Document Upload</h4>
              <p className="text-xs font-semibold text-slate-400 mt-1">PDF, JPG, JPEG, PNG, GIF, TIFF, DOCX, XLSX, TXT</p>
            </div>
            <label className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 text-slate-700 bg-white px-5 py-2.5 text-xs font-bold hover:bg-slate-50 hover:-translate-y-0.5 shadow-sm transition cursor-pointer active:translate-y-0 duration-150">
              Browse Files
              <input type="file" multiple className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC]/30 p-8 text-center text-[#64748B] transition hover:border-[#0F766E] hover:shadow-sm">
            <CloudUpload className="h-10 w-10 text-[#0F766E]" />
            <div>
              <p className="font-bold text-[#1E293B]">Drag and drop files here</p>
              <p className="text-xs text-slate-400 mt-1">Limit 200MB per file • Upload up to 6 files</p>
            </div>
            <input type="file" multiple className="hidden" onChange={handleFileChange} />
          </label>

          {fileCount > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC]/50 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Selected files ({fileCount})</span>
                <span>{(fileSize / 1024 / 1024).toFixed(2)} MB total</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-[#0F766E] shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-[#0F172A] truncate">{file.name}</p>
                        <p className="text-[10px] font-semibold text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="rounded-full p-1.5 text-slate-400 hover:bg-slate-50 hover:text-red-500 transition shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <button
              type="button"
              onClick={handleStart}
              disabled={fileCount === 0 || isProcessing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#0F766E] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#0D5F58] hover:-translate-y-0.5 shadow-md transition active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed duration-150"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Start Redaction
                </>
              )}
            </button>
            <p className="text-xs font-semibold text-slate-400">Please upload documents to start processing.</p>
          </div>
        </section>
      ) : (
        <section className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)] space-y-6">
          <div>
            <h4 className="text-lg font-black text-[#0F172A]">Demo Sandbox</h4>
            <p className="text-xs font-semibold text-slate-400 mt-1">Run a live redaction dry-run using built-in system sample documents.</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC]/50 p-5">
            <p className="text-sm font-medium text-slate-500">
              Demo mode simulates document analysis on scanned and text inputs to highlight names, numbers, email identifiers, and sensitive content.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunDemo}
            disabled={isProcessing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#0F766E] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#0D5F58] hover:-translate-y-0.5 shadow-md transition active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed duration-150"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Running Demo...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Run Demo on Samples
              </>
            )}
          </button>
          {isRunningDemo && (
            <div className="rounded-2xl border border-[#D1FAE5] bg-[#ECFDF5] p-4 text-xs font-semibold text-[#166534]">
              Demo run started. The internal sample documents are being analysed for PII redaction.
            </div>
          )}
        </section>
      )}

      {/* ── Error Notification ── */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
          {errorMessage}
        </div>
      )}

      {/* ── Process Summary Card ── */}
      {summary && (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/50 p-6 text-sm text-[#166534] shadow-sm">
          <p className="font-black uppercase tracking-wider text-xs text-[#166534] mb-3">Redaction Summary</p>
          <div className="flex flex-wrap gap-6 text-sm font-semibold">
            <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Total files: {summary.total_files}</span>
            <span className="text-[#166534]">✓ Successful: {summary.successful}</span>
            <span className="text-rose-600">✗ Failed: {summary.failed}</span>
          </div>
        </div>
      )}

      {/* ── Redaction Results ── */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="text-xl font-black text-[#0F172A] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#0F766E]" />
            <span>Processing Results</span>
          </div>
          <div className="space-y-4">
            {results.map((result, index) => {
              const isExpanded = expandedIndex === index
              return (
                <div key={`${result.file_name}-${index}`} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:shadow-md duration-200">
                  <button
                    type="button"
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left transition bg-slate-50/20 hover:bg-slate-50/50"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-black text-[#0F172A] truncate">Analyzing {result.file_name}</div>
                      <div className="mt-1">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${result.error ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {result.error ? 'Failed' : 'Completed'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#0F766E] hover:underline shrink-0">{isExpanded ? 'Hide Details' : 'View Details'}</span>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-[#F8FAFC]/50 p-6 space-y-5">
                      {result.error ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
                          {result.error}
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detected PII</p>
                              <p className="mt-1 text-xs font-semibold text-[#0F172A]">{result.detected_pii?.join(', ') || 'None'}</p>
                            </div>
                            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PII Count</p>
                              <p className="mt-1 text-xs font-semibold text-[#0F172A]">{result.pii_count ?? 0} entities</p>
                            </div>
                            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PII Types</p>
                              <p className="mt-1 text-xs font-semibold text-[#0F172A]">{result.pii_types?.join(', ') || 'None'}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Redacted Document Output</p>
                            <div className="rounded-xl border border-slate-200 bg-white p-5 font-mono text-xs text-slate-700 shadow-sm leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-96">
                              {result.redacted_text || 'No redacted text available.'}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function PiiRedactionProjectPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F8FBFF_100%)] p-6 max-w-6xl mx-auto">
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
      <header className="relative mb-8 overflow-hidden rounded-[32px] border border-[#E2E8F0] bg-[linear-gradient(135deg,#F0FDFA_0%,#FFFFFF_40%,#EFF6FF_100%)] p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E]/10 px-3 py-1 text-xs font-bold text-[#0F766E]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Enterprise Gen AI Security</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl md:text-5xl leading-none">
              Automated PII Redaction
            </h1>
            <p className="text-sm font-semibold text-[#334155] max-w-xl leading-relaxed">
              Detect and redact Personally Identifiable Information from documents using advanced vision models and secure AI processing.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 self-start md:self-auto">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100">
              <span className="text-3xl">🤖</span>
            </div>
          </div>
        </div>
      </header>

      <ProjectOverviewManager
        projectSlug="pii-redaction"
        projectTitle="Automated PII Redaction"
        systemTabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'application', label: 'Interactive Lab' },
        ]}
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t as Tab)}
        renderOverviewContent={(sections, onEdit, onDelete) => {
          const purposeSec = sections.find((s) => s.id === 'purpose')
          const capabilitiesSec = sections.find((s) => s.id === 'capabilities')
          const businessImpactSec = sections.find((s) => s.id === 'business-impact')
          const customSections = sections.filter((s) => s.isCustom)

          return (
            <div className="space-y-6 pt-2">
              {purposeSec && (
                <EditableOverviewSection
                  section={purposeSec}
                  onEdit={onEdit}
                  accentColor="#0F766E"
                />
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    accentColor="#1D4ED8"
                  />
                )}
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
        {activeTab === 'application' && <ApplicationTab />}
      </ProjectOverviewManager>
    </div>
  )
}
