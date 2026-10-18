import { X } from 'lucide-react'
import type { Poc } from '@/types/domain'
import { tagColors } from '@/utils/tagColors'

export interface PocDetailBodyProps {
  poc: Poc
  readOnly?: boolean
  onClose?: () => void
  showClose?: boolean
}

export function PocDetailBody({ poc, readOnly, onClose, showClose }: PocDetailBodyProps) {
  const date = poc.date_label ?? new Date(poc.created_at).toLocaleDateString()
  const fn = poc.solution_function ?? '—'

  return (
    <div className="aa-card relative mx-auto max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-lg">
      {showClose && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-[#475569]" />
        </button>
      )}

      <div className="p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-3xl font-bold text-[#1E293B] mb-5 leading-tight pr-8">{poc.title}</h2>

            <p className="text-[16px] font-medium text-[#475569] mb-8 leading-relaxed">{poc.description}</p>

            {!readOnly && (
              <button
                type="button"
                className="aa-button aa-button-primary px-8 py-3.5 text-[15px]"
              >
                View Full Details
              </button>
            )}
          </div>

          <div>
            <h3 className="font-bold text-[#1E293B] text-lg mb-5">Solution Details</h3>

            <div className="space-y-4">
              <div className="flex border-b-[1.5px] border-[#CBD5E1] pb-3">
                <span className="text-[15px] font-bold text-[#475569] w-32">Updated</span>
                <span className="text-[15px] font-semibold text-[#1E293B]">{date}</span>
              </div>

              <div className="flex border-b-[1.5px] border-[#CBD5E1] pb-3">
                <span className="text-[15px] font-bold text-[#475569] w-32">Industry</span>
                <span className="text-[15px] font-semibold text-[#1E293B]">{poc.industry ?? '—'}</span>
              </div>

              <div className="flex border-b-[1.5px] border-[#CBD5E1] pb-3">
                <span className="text-[15px] font-bold text-[#475569] w-32">Function</span>
                <span className="text-[15px] font-semibold text-[#1E293B]">{fn}</span>
              </div>

              <div className="flex border-b-[1.5px] border-[#CBD5E1] pb-3">
                <span className="text-[15px] font-bold text-[#475569] w-32">Tech</span>
                <span className="text-[15px] font-semibold text-[#1E293B]">{poc.tech ?? '—'}</span>
              </div>
            </div>

            <div className="mt-7">
              <h4 className="font-bold text-[#1E293B] mb-3 text-[15px]">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {poc.tags.map((tag) => (
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
  )
}
