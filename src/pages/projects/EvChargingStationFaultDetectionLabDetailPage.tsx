import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import ProjectDetailCard from '@/components/projects/ProjectDetailCard'

const project = {
  title: 'EV Charging Station Fault Detection Lab',
  description:
    'EV charging station analytics for charger health monitoring, silent failure detection, thermal risk tracking, anomaly detection, and fault classification. It helps operations teams spot electrical instability early and plan preventive maintenance with ML-driven diagnostics.',
  date: 'Updated Jun 2026',
  client: 'Analytics Avenue EV',
  industry: 'EV',
  function: 'Fault Detection / Predictive Maintenance',
  tech: 'FastAPI, Pandas, NumPy, Scikit-learn, RandomForest, IsolationForest, Plotly, React',
  contact: 'ev-fault@example.com',
  tags: ['EV', 'Predictive Maintenance', 'Fault Detection', 'Anomaly Detection', 'AI'],
  viewRoute: '/projects/ev-charging-station-fault-detection-lab/full',
}

const howWeCreated = [
  'Translated the backend contract into a charger telemetry schema with the exact required columns, default loading, CSV upload, and validation handling.',
  'Built the application flow around charger and fault filters, KPI cards, Plotly diagnostics, RandomForest fault classification, IsolationForest anomaly detection, and automated insights.',
  'Wrapped the lab in a project detail card plus a full application page so the EV fault story can be reviewed first and then opened as an interactive dashboard.',
]

export function EvChargingStationFaultDetectionLabDetailPage() {
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

      <section className="mt-6 rounded-[28px] border border-[#E2E8F0] bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0F766E]">How we created it</p>
        <h3 className="mt-2 text-2xl font-bold tracking-tight text-[#0F172A] md:text-3xl">From backend fault logic to a live EV charging fault dashboard</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {howWeCreated.map((item, index) => (
            <div key={item} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ECFDF5] text-sm font-bold text-[#0F766E]">{index + 1}</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default EvChargingStationFaultDetectionLabDetailPage
