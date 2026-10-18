import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import ProjectDetailCard from '@/components/projects/ProjectDetailCard'

const poc = {
  title: 'AI Prescription Generator',
  description:
    'Intelligent prescription generation platform powered by generative AI that assists clinicians and career counsellors in producing accurate, personalised data-career prescriptions — with real-time domain-specific content, PDF/Word export, and direct email delivery.',
  date: 'Updated May 15, 2026',
  client: 'MedTech Innovations',
  industry: 'Gen AI',
  function: 'AI & Automation',
  tech: 'Gen AI, Python, LLM',
  contact: 'health-ai@example.com',
  tags: ['Gen AI', 'AI', 'Automation'],
  viewRoute: '/projects/ai-prescription',
}

export function AiPrescriptionDetailPage() {
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
