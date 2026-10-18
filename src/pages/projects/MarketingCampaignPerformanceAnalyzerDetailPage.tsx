import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import ProjectDetailCard from '@/components/projects/ProjectDetailCard'

const poc = {
  title: 'Marketing Campaign Performance Analyzer',
  description:
    'A marketing analytics workspace for measuring campaign reach, engagement, lead generation, conversion efficiency, and ROI across channels using a FastAPI + Pandas pipeline.',
  date: 'Updated Jun 18, 2026',
  client: 'Marketing Analytics',
  industry: 'Marketing Analytics',
  function: 'Campaign Performance / ROI Analytics',
  tech: 'Python, Pandas, NumPy, FastAPI',
  contact: 'marketing-analytics@example.com',
  tags: ['Marketing Analytics', 'ROI', 'Campaign Performance', 'FastAPI'],
  viewRoute: '/projects/marketing-campaign-performance-analyzer/full',
}

export function MarketingCampaignPerformanceAnalyzerDetailPage() {
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

      <ProjectDetailCard project={poc} />
    </div>
  )
}
