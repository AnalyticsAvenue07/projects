import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { X, Star } from 'lucide-react'
import { tagColors } from '@/utils/tagColors'

interface Solution {
  id: number
  rank: number
  title: string
  description: string
  tags: string[]
  date: string
  featured?: boolean
  client: string
  industry: string
  function: string
  tech: string
  contact: string
  projectRoute?: string
}

interface SolutionModalProps {
  solution: Solution | null
  onClose: () => void
}

export function SolutionModal({ solution, onClose }: SolutionModalProps) {
  const navigate = useNavigate()

  useEffect(() => {
    if (solution) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [solution])

  if (!solution) return null

  const handleViewFullDetails = () => {
    if (solution.projectRoute) {
      onClose()
      navigate(solution.projectRoute)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      <div
        className="relative max-w-4xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-white rounded-2xl max-w-4xl w-full mx-auto max-h-[90vh] overflow-y-auto border-[1.5px] border-[#CBD5E1] shadow-lg">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-[#475569]" />
          </button>

          <div className="p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Left column */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base font-bold text-[#475569]">#{solution.rank}</span>
                  <Star className="w-5 h-5 text-[#0284C7] fill-[#0284C7]" />
                  {solution.featured && (
                    <span className="px-2.5 py-1 text-xs font-bold bg-[#0F766E] text-white rounded-md shadow-sm">
                      Featured
                    </span>
                  )}
                </div>

                <h2 className="text-3xl font-bold text-[#1E293B] mb-5 leading-tight pr-8">
                  {solution.title}
                </h2>

                <p className="text-[16px] font-medium text-[#475569] mb-8 leading-relaxed">
                  {solution.description}
                </p>

                {solution.projectRoute && (
                  <button
                    type="button"
                    onClick={handleViewFullDetails}
                    className="px-8 py-3.5 bg-[#0F766E] text-white rounded-lg hover:bg-[#0D5F58] transition-all font-bold text-[15px] shadow-md hover:shadow-lg"
                  >
                    View Full Details
                  </button>
                )}
              </div>

              {/* Right column */}
              <div>
                <h3 className="font-bold text-[#1E293B] text-lg mb-5">Solution Details</h3>

                <div className="space-y-4">
                  <div className="flex border-b-[1.5px] border-[#CBD5E1] pb-3">
                    <span className="text-[15px] font-bold text-[#475569] w-32">Updated</span>
                    <span className="text-[15px] font-semibold text-[#1E293B]">{solution.date}</span>
                  </div>
                  <div className="flex border-b-[1.5px] border-[#CBD5E1] pb-3">
                    <span className="text-[15px] font-bold text-[#475569] w-32">Industry</span>
                    <span className="text-[15px] font-semibold text-[#1E293B]">{solution.industry || '—'}</span>
                  </div>
                  <div className="flex border-b-[1.5px] border-[#CBD5E1] pb-3">
                    <span className="text-[15px] font-bold text-[#475569] w-32">Function</span>
                    <span className="text-[15px] font-semibold text-[#1E293B]">{solution.function || '—'}</span>
                  </div>
                  <div className="flex border-b-[1.5px] border-[#CBD5E1] pb-3">
                    <span className="text-[15px] font-bold text-[#475569] w-32">Tech</span>
                    <span className="text-[15px] font-semibold text-[#1E293B]">{solution.tech || '—'}</span>
                  </div>
                </div>

                <div className="mt-7">
                  <h4 className="font-bold text-[#1E293B] mb-3 text-[15px]">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {solution.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`px-3 py-1.5 text-sm font-bold rounded-md border ${
                          tagColors[tag] || 'bg-[#E5E7EB] text-[#374151] border-[#D1D5DB]'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
