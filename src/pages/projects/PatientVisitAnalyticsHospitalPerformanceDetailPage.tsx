import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import ProjectDetailCard from '@/components/projects/ProjectDetailCard'

const project = {
  title: 'Patient Visit Analytics & Hospital Performance',
  description:
    'Healthcare analytics workspace for hospital visits, department performance, admission trends, revenue, and patient load forecasting.',
  date: 'Updated Jun 2026',
  client: 'Analytics Avenue',
  industry: 'Healthcare',
  function: 'Patient Visit Analytics & Admission Prediction',
  tech: 'FastAPI, Pandas, Scikit-learn, Plotly, React',
  contact: 'healthcare@example.com',
  tags: ['Healthcare', 'Patient Analytics', 'Hospital Operations', 'Admission Forecasting'],
  viewRoute: '/projects/patient-visit-analytics-hospital-performance/full',
}

export function PatientVisitAnalyticsHospitalPerformanceDetailPage() {
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
