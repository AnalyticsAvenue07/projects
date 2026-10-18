import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import ProjectDetailCard from '@/components/projects/ProjectDetailCard'

const project = {
  title: 'Inventory Pileup & Shortage Analytics Lab',
  description:
    'Track demand vs supply, predict stock risks, and simulate inventory policies to balance working capital with service levels across your manufacturing supply chain.',
  date: 'Updated Jun 2026',
  client: 'Analytics Avenue',
  industry: 'Manufacturing',
  function: 'Supply Chain / Inventory Management',
  tech: 'Python, Pandas, NumPy, Scikit-learn, RandomForest, GradientBoosting, Linear Regression, FastAPI',
  contact: 'manufacturing@example.com',
  tags: ['Manufacturing', 'Supply Chain', 'Inventory', 'AutoML'],
  viewRoute: '/projects/inventory-pileup-shortage-analytics-lab/full',
}

export function InventoryPileupShortageAnalyticsLabDetailPage() {
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
