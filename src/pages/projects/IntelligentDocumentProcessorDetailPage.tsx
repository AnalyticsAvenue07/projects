import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import ProjectDetailCard from '@/components/projects/ProjectDetailCard'

const project = {
  title: 'Intelligent Document Processor (IDP)',
  description:
    'AI-powered document triage and extraction engine for invoices, contracts, identity documents, and signature verification. Supports file upload, OCR processing, structured JSON output, and internal demo mode for rapid evaluation.',
  date: 'Updated May 2026',
  client: 'Analytics Avenue',
  industry: 'Gen AI',
  function: 'Document Triage & Extraction',
  tech: 'FastAPI, OpenCV, OCR, LLM, Python',
  contact: 'idp@example.com',
  tags: ['Gen AI', 'OCR', 'Signature Verification', 'Automation'],
  viewRoute: '/projects/intelligent-document-processor/full',
}

export function IntelligentDocumentProcessorDetailPage() {
  const navigate = useNavigate()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* ── Redesigned Standalone Back Button ── */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#475569] shadow-sm transition hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:text-[#0F172A] hover:shadow-md active:translate-y-0"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      <ProjectDetailCard project={project} />
    </div>
  )
}
