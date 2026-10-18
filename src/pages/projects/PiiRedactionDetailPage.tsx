import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import ProjectDetailCard from '@/components/projects/ProjectDetailCard'

const poc = {
  title: 'Automated PII Redaction Solution (Gen AI)',
  description: 'Redact Personal Identifiable Information from Documents using Generative AI',
  date: 'Updated May 2026',
  client: 'Data Privacy & Compliance',
  industry: 'Gen AI',
  function: 'Document Redaction & Compliance',
  tech: 'GPT-4o Vision, Python, OCR, Pydantic',
  contact: 'pii-redaction@example.com',
  tags: ['Gen AI', 'Data Privacy', 'Compliance', 'Documents', 'Vision'],
}

export function PiiRedactionDetailPage() {
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

      <ProjectDetailCard project={{ ...poc, viewRoute: '/projects/pii-redaction/full' }} />
    </div>
  )
}
