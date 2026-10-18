import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import ProjectDetailCard from '@/components/projects/ProjectDetailCard'

const project = {
  title: 'Solar Power Generation Forecasting Lab',
  description:
    'Forecast solar generation, analyze weather impact, compare actual versus forecast output, and track plant-level forecasting accuracy across SCADA-driven datasets.',
  date: 'Updated Jun 2026',
  client: 'Analytics Avenue',
  industry: 'Solar Power',
  function: 'Solar Generation Forecasting and Error Diagnostics',
  tech: 'FastAPI, Pandas, Scikit-learn, Plotly, React',
  contact: 'solar@example.com',
  tags: ['Solar Power', 'Forecasting', 'Weather Analytics', 'ML'],
  viewRoute: '/projects/solar-power-generation-forecasting-lab/full',
}

const howWeCreated = [
  'Mapped the solar backend schema into a 24-column required data dictionary and manual mapping flow.',
  'Built the analytics pipeline around default dataset loading, filters, KPI cards, Plotly charts, ML regression, and insights.',
  'Wrapped the project in a detail card plus a full-lab page so users can review the concept before opening the working dashboard.',
]

export function SolarPowerGenerationForecastingLabDetailPage() {
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

      <section className="mt-6 rounded-[28px] border border-[#E2E8F0] bg-[linear-gradient(135deg,#ffffff_0%,#fffaf0_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#A16207]">How we created it</p>
        <h3 className="mt-2 text-2xl font-bold tracking-tight text-[#0F172A] md:text-3xl">From backend contract to interactive solar dashboard</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {howWeCreated.map((item, index) => (
            <div key={item} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FEF3C7] text-sm font-bold text-[#A16207]">{index + 1}</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
