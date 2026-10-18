import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import ProjectDetailCard from '@/components/projects/ProjectDetailCard'

const project = {
  title: 'Real Estate Price vs Property Features Analyzer',
  description:
    'A real estate valuation workspace that explores pricing across area, BHK count, bathrooms, amenities, age, parking, city-level factors, and property type, while supporting ML-driven price prediction and automated market insights.',
  date: 'Updated Jun 2026',
  client: 'Analytics Avenue Real Estate',
  industry: 'Real Estate',
  function: 'Property Valuation & Feature Analysis',
  tech: 'FastAPI, Pandas, Scikit-learn, Plotly, React',
  contact: 'realestate@example.com',
  tags: ['Real Estate', 'Property Valuation', 'Price Analysis', 'Analytics', 'ML'],
  viewRoute: '/projects/real-estate-price-vs-property-features-analyzer/full',
}

export function RealEstatePriceVsPropertyFeaturesAnalyzerDetailPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-5xl p-6">
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

export default RealEstatePriceVsPropertyFeaturesAnalyzerDetailPage