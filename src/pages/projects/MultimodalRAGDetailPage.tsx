import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import ProjectDetailCard from '@/components/projects/ProjectDetailCard'

const poc = {
  title: 'Multimodal RAG System',
  description: 'Advanced Retrieval-Augmented Generation system that processes both text and images for intelligent document understanding.',
  date: 'Updated May 2026',
  client: 'Enterprise AI Solutions',
  industry: 'Gen AI',
  function: 'Multimodal Document Processing & RAG',
  tech: 'Streamlit, Python, LLM, Vision Models',
  contact: 'rag@example.com',
  tags: ['Gen AI', 'RAG', 'Multimodal', 'Streamlit', 'Document Processing'],
}

export function MultimodalRAGDetailPage() {
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

      <ProjectDetailCard
        project={{
          ...poc,
          viewRoute: '/projects/multimodal-rag/full',
          secondaryLabel: 'Streamlit',
          secondaryHref: 'https://multimodalrag-master-qlv3gx8ntcfradnltky7qj.streamlit.app/',
        }}
      />
    </div>
  )
}
