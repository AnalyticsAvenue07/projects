import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import ProjectDetailCard from '@/components/projects/ProjectDetailCard'

const project = {
  title: 'Real Estate Intelligence Suite',
  description:
    'AI-powered real estate analytics platform for property valuation, market insights, and predictive investment recommendations. Designed to turn location, property, and pricing data into investor-ready visualizations and forecasts.',
  date: 'Updated May 2026',
  client: 'Analytics Avenue Real Estate',
  industry: 'PropTech',
  function: 'Real Estate Analytics',
  tech: 'FastAPI, Python, Pandas, scikit-learn, Plotly, React',
  contact: 'realestate@analyticsavenue.com',
  tags: ['Gen AI', 'Analytics', 'Real Estate', 'Automation', 'AI'],
  viewRoute: '/projects/real-estate-intelligence-suite/section',
  secondaryLabel: 'Streamlit',
  secondaryHref: 'https://analytics-avenue.streamlit.app/usecase_real_estate_1',
}

export function RealEstateIntelligenceSuiteDetailPage() {
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
