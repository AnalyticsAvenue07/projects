import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import ProjectDetailCard from '@/components/projects/ProjectDetailCard'

const project = {
  title: 'AI Gold Negotiation Orchestrator',
  description:
    'Automated RFQ-to-quote gold pricing and negotiation system that reads buyer RFQs, matches product SKUs, fetches live MCX gold pricing, calculates transparent quotes, generates branded PDFs, and manages multi-stage buyer negotiation workflows.',
  date: 'Updated May 2026',
  client: 'Analytics Avenue',
  industry: 'Gen AI',
  function: 'AI Negotiation Automation',
  tech: 'Python, Gen AI, ChromaDB, Live MCX',
  contact: 'gold-ai@example.com',
  tags: ['Gen AI', 'Negotiation', 'PDF', 'Pricing'],
  viewRoute: '/projects/ai-gold-negotiation/full',
  secondaryLabel: 'Streamlit',
  secondaryHref: 'https://aigold-gjdv9gbdfzvgbupq7z5qju.streamlit.app/',
}

export function AiGoldNegotiationDetailPage() {
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
