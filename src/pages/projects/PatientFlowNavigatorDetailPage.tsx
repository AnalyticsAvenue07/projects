import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import ProjectDetailCard from '@/components/projects/ProjectDetailCard'

const project = {
  title: 'PatientFlow Navigator',
  description:
    'Healthcare analytics workspace for patient journeys, readmission risk, treatment cost dynamics, and hospital capacity planning. It combines cohort profiling, filtering, charting, and model-driven insights in one tabbed experience.',
  date: 'Updated Jun 2026',
  client: 'Analytics Avenue',
  industry: 'Healthcare',
  function: 'Patient Journey Analytics & Capacity Planning',
  tech: 'React, FastAPI, Pandas, Plotly, Scikit-learn',
  contact: 'healthcare@example.com',
  tags: ['Healthcare', 'Patient Flow', 'Clinical Intelligence', 'Readmission Risk', 'Predictive Analytics'],
  viewRoute: '/projects/patientflow-navigator/full',
}

export function PatientFlowNavigatorDetailPage() {
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

      {/* ── Redesigned Project Build Path Section ── */}
      <section className="mt-8 rounded-[32px] border border-[#E2E8F0] bg-white p-6 shadow-[0_24px_50px_rgba(15,23,42,0.06)] md:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#0F766E]">How it was created</p>
        <h3 className="mt-2 text-3xl font-black tracking-tight text-[#0F172A]">Project build path</h3>
        
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {/* Stage 1: Step 1 */}
          <div className="rounded-[24px] border border-[#CCFBF1] bg-[#F0FDFA] p-5 shadow-sm transition hover:shadow-md">
            <span className="inline-block rounded-full bg-[#E6FDF9] px-3.5 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#0F766E]">
              Step 1
            </span>
            <p className="mt-4 text-[15px] font-medium leading-relaxed text-[#115E59]">
              Connected the frontend to the healthcare3 FastAPI backend and added the environment key.
            </p>
          </div>

          {/* Stage 2: Step 2 */}
          <div className="rounded-[24px] border border-[#DBEAFE] bg-[#EFF6FF] p-5 shadow-sm transition hover:shadow-md">
            <span className="inline-block rounded-full bg-[#E0F2FE] px-3.5 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#1D4ED8]">
              Step 2
            </span>
            <p className="mt-4 text-[15px] font-medium leading-relaxed text-[#1E40AF]">
              Built the project card and detail card to match the existing analytics marketplace UI.
            </p>
          </div>

          {/* Stage 3: Step 3 */}
          <div className="rounded-[24px] border border-[#EDE9FE] bg-[#F5F3FF] p-5 shadow-sm transition hover:shadow-md">
            <span className="inline-block rounded-full bg-[#F3E8FF] px-3.5 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#7C3AED]">
              Step 3
            </span>
            <p className="mt-4 text-[15px] font-medium leading-relaxed text-[#5B21B6]">
              Created a three-tab application for overview, required attributes, and dataset workflow.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PatientFlowNavigatorDetailPage