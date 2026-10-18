import { Star } from 'lucide-react'
import { useNavigate } from 'react-router'
import { tagColors } from '@/utils/tagColors'

export function RealEstateIntelligenceSuiteCard() {
  const navigate = useNavigate()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate('/projects/real-estate-intelligence-suite')}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          navigate('/projects/real-estate-intelligence-suite')
        }
      }}
      className="bg-white border-[1.5px] border-[#CBD5E1] rounded-xl p-5 hover:shadow-[0_4px_16px_rgba(15,23,42,0.12)] hover:border-[#94A3B8] transition-all cursor-pointer h-full"
      style={{ boxShadow: '0 4px 12px rgba(15,23,42,0.08)' }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-[#475569]">#6</span>
          <Star className="w-5 h-5 text-[#0284C7] fill-[#0284C7]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-[#1E293B] text-lg leading-tight">Real Estate Intelligence Suite</h3>
          </div>
        </div>
      </div>

      <p className="text-[15px] font-medium text-[#475569] mb-4 leading-relaxed">
        Unlock actionable insights for real estate investments, property management, and market analysis with AI-powered tools.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {['Gen AI', 'Analytics', 'Real Estate', 'Streamlit'].map((tag) => (
          <span
            key={tag}
            className={`px-2.5 py-1 text-xs font-bold rounded-md border ${tagColors[tag] || 'bg-[#E5E7EB] text-[#374151] border-[#D1D5DB]'}`}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-3 border-t-[1.5px] border-[#CBD5E1]">
        <span className="text-xs font-semibold text-[#475569]">Updated May 2026</span>
      </div>
    </div>
  )
}

export default RealEstateIntelligenceSuiteCard;
