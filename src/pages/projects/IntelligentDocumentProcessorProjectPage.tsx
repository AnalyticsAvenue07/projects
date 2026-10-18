import { type ChangeEvent, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowRight,
  CloudUpload,
  FileText,
  ShieldCheck,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react'
import {
  processFiles,
  runDemo,
  type IdpProcessResponse,
  type IdpProcessResult,
} from '@/services/idpApi'
import { ProjectOverviewManager, EditableOverviewSection } from '@/components/project-content'

const overviewPurpose =
  'Analyze documents with AI-driven OCR, signature detection, and structured extraction — enabling rapid processing of invoices, contracts, identity documents, and other enterprise files with searchable JSON output.'

const overviewCapabilities = [
  'Supports multi-file upload for PDF, JPG, PNG, GIF and other common document formats.',
  'Extracts document type, fields, signature presence, raw text, and structured JSON payloads.',
  'Signature verification highlights detected signatures and returns base64 preview images.',
  'Demo mode runs on internal sample documents for fast evaluation without upload.',
  'Backend integration with FastAPI and OpenCV-based document triage.',
  'Designed for enterprise document automation and compliance workflows.',
]

const overviewImpact = [
  'Reduce manual document triage and OCR effort across finance, legal, and operations.',
  'Automate signature detection for contracts and compliance documents.',
  'Generate structured output ready for ingestion into downstream analytics systems.',
  'Enable faster document review and validation with AI-assisted summaries.',
  'Deliver consistent results across scanned and digital documents using hybrid OCR + LLM logic.',
]

type Tab = 'overview' | 'application'

export function IntelligentDocumentProcessorProjectPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [mode, setMode] = useState<'upload' | 'demo'>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [summary, setSummary] = useState<IdpProcessResponse | null>(null)
  const [results, setResults] = useState<IdpProcessResult[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const totalSizeMB = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024,
    [files],
  )

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    setFiles((current) => [...current, ...selected].slice(0, 8))
    setErrorMessage(null)
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, idx) => idx !== index))
  }

  async function handleProcess() {
    if (mode === 'upload' && files.length === 0) {
      setErrorMessage('Please select at least one document to process.')
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)
    setResults([])
    setSummary(null)
    setExpandedIndex(null)

    try {
      const response = mode === 'demo' ? await runDemo() : await processFiles(files)
      setSummary(response)
      setResults(response.results)
    } catch (error: any) {
      setErrorMessage(error?.message || 'Document processing failed.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F8FBFF_100%)] p-6 max-w-7xl mx-auto space-y-6">
      <div className="mb-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#475569] hover:text-[#0F172A]"
        >
          ← Back
        </button>
      </div>
      <div className="aa-card p-8 bg-white">
        <h1 className="text-3xl font-bold text-[#0F172A] mb-4">Intelligent Document Processor (IDP)</h1>
        <p className="text-[16px] text-[#475569] leading-relaxed max-w-3xl">
          {overviewPurpose}
        </p>
      </div>

      <ProjectOverviewManager
        projectSlug="intelligent-document-processor"
        projectTitle="Intelligent Document Processor"
        systemTabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'application', label: 'Application' },
        ]}
        activeTab={tab}
        onTabChange={(t) => setTab(t as Tab)}
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

              <div className="grid gap-6 lg:grid-cols-2">
                {capabilitiesSec && (
                  <EditableOverviewSection
                    section={capabilitiesSec}
                    onEdit={onEdit}
                    accentColor="#0284C7"
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
        {tab === 'application' && (
        <div className="space-y-6">
          <div className="aa-card bg-white p-6">
            <p className="text-sm font-semibold text-[#475569] mb-3">Input mode</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode('upload')}
                className={`aa-button ${mode === 'upload' ? 'aa-button-primary' : 'aa-button-secondary'} px-4 py-3 text-left`}
              >
                Upload Your Documents
              </button>
              <button
                type="button"
                onClick={() => setMode('demo')}
                className={`aa-button ${mode === 'demo' ? 'aa-button-primary' : 'aa-button-secondary'} px-4 py-3 text-left`}
              >
                Run Demo (Internal Samples)
              </button>
            </div>
          </div>

          {mode === 'upload' ? (
            <div className="aa-surface-muted p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-[#0F172A]">Upload documents to analyze</p>
                  <p className="text-sm text-[#64748B] mt-1">
                    Supported formats: PDF, JPG, PNG, GIF, DOCX, XLSX, TXT.
                  </p>
                </div>
                <label className="aa-button aa-button-secondary cursor-pointer px-4 py-3">
                  Browse files
                  <input type="file" multiple className="hidden" onChange={handleFileChange} />
                </label>
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-8 text-center text-[#64748B]">
                <CloudUpload className="mx-auto mb-4 h-10 w-10 text-[#0F766E]" />
                <p className="font-semibold text-[#1E293B]">Drop files here or browse to upload</p>
                <p className="text-sm mt-2">You can upload multiple documents in one batch.</p>
              </div>

              {files.length > 0 && (
                <div className="mt-6 rounded-2xl border border-[#CBD5E1] bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <span className="font-semibold text-[#0F172A]">Selected documents ({files.length})</span>
                    <span className="text-sm text-[#64748B]">{totalSizeMB.toFixed(1)} MB total</span>
                  </div>
                  <div className="space-y-3">
                    {files.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-[#0F766E]" />
                          <div>
                            <p className="font-semibold text-[#0F172A]">{file.name}</p>
                            <p className="text-sm text-[#64748B]">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="rounded-full p-2 text-[#7C8187] hover:bg-[#E2E8F0]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#CBD5E1] bg-white p-6 shadow-sm">
              <p className="text-[16px] font-medium text-[#475569] mb-5">
                Run the internal demo to preview IDP results without uploading files.
              </p>
              <button
                type="button"
                onClick={handleProcess}
                disabled={isProcessing}
                className="aa-button aa-button-primary px-6 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run Demo on Internal Samples'}
              </button>
            </div>
          )}

          <div className="aa-card bg-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#475569]">Execution</p>
                <h2 className="text-xl font-bold text-[#0F172A]">Process Documents</h2>
              </div>
              <button
                type="button"
                onClick={handleProcess}
                disabled={isProcessing || (mode === 'upload' && files.length === 0)}
                className="aa-button aa-button-primary px-6 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Start Processing'}
              </button>
            </div>

            {errorMessage && (
              <div className="mt-6 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
                {errorMessage}
              </div>
            )}

            {summary && (
              <div className="mt-6 rounded-2xl border border-[#D1FAE5] bg-[#ECFDF5] p-4 text-sm text-[#166534]">
                <div className="font-semibold mb-2">Run summary</div>
                <div className="flex flex-wrap gap-4">
                  <span>Total files: {summary.total_files}</span>
                  <span>Successful: {summary.successful}</span>
                  <span>Failed: {summary.failed}</span>
                </div>
              </div>
            )}

            {results.length > 0 && (
              <div className="mt-6 space-y-4">
                {results.map((result, index) => (
                  <div key={`${result.file_name}-${index}`} className="rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] shadow-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedIndex((prev) => (prev === index ? null : index))}
                      className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">{result.file_name}</p>
                        <p className="text-sm text-[#64748B]">
                          {result.document_type || 'Unknown document type'} • {result.signature_present ? 'Signature found' : 'Signature not found'}
                        </p>
                      </div>
                      <span className="text-[#7C3AED] font-semibold">{expandedIndex === index ? 'Hide details' : 'View details'}</span>
                    </button>
                    {expandedIndex === index && (
                      <div className="border-t border-[#E2E8F0] bg-white p-5 space-y-4">
                        {result.error ? (
                          <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
                            {result.error}
                          </div>
                        ) : (
                          <>
                            {result.signature_image ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm font-semibold text-[#0F172A] mb-2">Detected signature</p>
                                  <img
                                    src={`data:image/png;base64,${result.signature_image}`}
                                    alt="Detected signature"
                                    className="h-44 w-full max-w-xs rounded-xl border border-[#E2E8F0] object-contain"
                                  />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-[#0F172A] mb-2">Extracted fields</p>
                                  <pre className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#334155] overflow-x-auto">
                                    {JSON.stringify(result.extracted_data ?? {}, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm font-semibold text-[#0F172A] mb-2">Extracted data</p>
                                <pre className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#334155] overflow-x-auto">
                                  {JSON.stringify(result.extracted_data ?? {}, null, 2)}
                                </pre>
                              </div>
                            )}

                            <div>
                              <p className="text-sm font-semibold text-[#0F172A] mb-2">Raw extracted text</p>
                              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#334155] max-h-40 overflow-y-auto">
                                {result.raw_text || 'No raw text available.'}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      </ProjectOverviewManager>
    </div>
  )
}
