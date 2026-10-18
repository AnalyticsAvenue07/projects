import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import ProjectDetailCard from '@/components/projects/ProjectDetailCard'

const poc = {
  title: 'Offer Letter Generator',
  description:
    'Intelligent HR automation platform for generating professional pre-offer letters, offer letters, internship completion certificates, and downloadable HR documents with dynamic compensation structures and customizable templates.',
  date: 'Updated May 2026',
  client: 'Internal HR Automation',
  industry: 'HR',
  function: 'Automation & Document Generation',
  tech: 'Streamlit, Python, Gen AI',
  contact: 'hr-automation@example.com',
  tags: ['HR', 'AI', 'Documents', 'Automation'],
  viewRoute: '/projects/offerletter-generator/full',
  secondaryLabel: 'Streamlit',
  secondaryHref: 'https://offerletter.streamlit.app/',
}

export function OfferLetterDetailPage() {
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

      <ProjectDetailCard project={poc} />
    </div>
  )
}
