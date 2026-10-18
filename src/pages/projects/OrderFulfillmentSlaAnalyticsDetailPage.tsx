import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import ProjectDetailCard from '@/components/projects/ProjectDetailCard'

const project = {
  title: 'Order Fulfillment & SLA Analytics',
  description:
    'Track fulfillment performance, predict SLA breaches, and surface prioritized playbooks for warehouse, logistics, and operations teams using a backend-driven analytics workflow.',
  date: 'Updated Jun 2026',
  client: 'Analytics Avenue',
  industry: 'Supply Chain',
  function: 'Order Fulfillment & SLA Analytics',
  tech: 'FastAPI, Pandas, Scikit-learn, Plotly, React',
  contact: 'supplychain@example.com',
  tags: ['Supply Chain', 'SLA', 'Fulfillment', 'Operations'],
  viewRoute: '/projects/order-fulfillment-sla-analytics/full',
}

export function OrderFulfillmentSlaAnalyticsDetailPage() {
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
