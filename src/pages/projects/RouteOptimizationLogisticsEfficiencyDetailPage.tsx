import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import ProjectDetailCard from '@/components/projects/ProjectDetailCard'

const project = {
  title: 'Route Optimization & Logistics Efficiency',
  description:
    'FastAPI-backed route optimization and logistics efficiency platform for ML-powered planning, cost simulation, anomaly detection, EDA charts, and action playbooks. The workflow supports loading default datasets, CSV upload, manual column mapping, filtering, clustering, predictive models, insights, and downloadable outputs.',
  date: 'Updated June 2026',
  client: 'Analytics Avenue',
  industry: 'Supply Chain',
  function: 'Route Optimization & Logistics Intelligence',
  tech: 'FastAPI, pandas, scikit-learn, Plotly, Python',
  contact: 'supply-chain@example.com',
  tags: ['Supply Chain', 'Route Optimization', 'Logistics', 'ML', 'FastAPI'],
  viewRoute: '/projects/route-optimization-logistics-efficiency/full',
}

export function RouteOptimizationLogisticsEfficiencyDetailPage() {
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