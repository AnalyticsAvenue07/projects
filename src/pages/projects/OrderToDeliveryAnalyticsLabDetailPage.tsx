import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import ProjectDetailCard from '@/components/projects/ProjectDetailCard'

const project = {
  title: 'Order-to-Delivery Analytics Lab',
  description:
    'Analyze the complete order lifecycle from order creation to delivery, pinpoint bottlenecks, and predict lead-time outcomes with ML-driven insights.',
  date: 'Updated Jun 2026',
  client: 'Analytics Avenue',
  industry: 'Manufacturing',
  function: 'Order-to-Delivery Analytics & Lead Time Prediction',
  tech: 'FastAPI, Pandas, Scikit-learn, Plotly, React',
  contact: 'manufacturing@example.com',
  tags: ['Manufacturing', 'Order-to-Delivery', 'Lead Time', 'AutoML'],
  viewRoute: '/projects/order-to-delivery-analytics-lab/full',
}

export function OrderToDeliveryAnalyticsLabDetailPage() {
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
