import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import ProjectDetailCard from '@/components/projects/ProjectDetailCard'

const project = {
  title: 'AI Customer Feedback Analyzer',
  description:
    'Sentiment and tone categorization platform for large-scale customer feedback analysis using Gemini 2.5 Pro. It detects sentiment, identifies dominant tones, generates AI explanations, and produces downloadable analysis reports for rapid business action.',
  date: 'Updated May 2026',
  client: 'Analytics Avenue',
  industry: 'Gen AI',
  function: 'Feedback Analytics & AI',
  tech: 'Gen AI, Python, LLM',
  contact: 'feedback-ai@example.com',
  tags: ['Gen AI', 'Customer Feedback', 'Sentiment', 'Tone Analysis', 'Analytics'],
}

export function SentimentAnalyzerDetailPage() {
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

      <ProjectDetailCard project={{ ...project, viewRoute: '/projects/sentiment-analyzer/full' }} />
    </div>
  )
}
