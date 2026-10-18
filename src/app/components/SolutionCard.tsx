import { Star } from 'lucide-react'
import { tagColors } from '@/utils/tagColors'

interface SolutionCardProps {
  rank: number
  title: string
  description: string
  tags: string[]
  date: string
  featured?: boolean
  onClick: () => void
  onMouseEnter?: () => void
}

export function SolutionCard({
  rank,
  title,
  description,
  tags,
  date,
  featured,
  onClick,
  onMouseEnter,
}: SolutionCardProps) {
  const visibleTags = tags.slice(0, 4)
  const remainingCount = tags.length - visibleTags.length

  return (
    <article
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      role="button"
      tabIndex={0}
      className="aa-card group cursor-pointer p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[#0F766E]/40 hover:shadow-[0_24px_48px_rgba(15,23,42,0.16)]"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[#475569]">
          <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-bold tracking-[0.18em] text-[#0F766E]">POC #{rank}</span>
          <Star className="h-4 w-4 text-[#0284C7] fill-[#0284C7]" />
        </div>
        {featured && (
          <span className="rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#047857] border border-[#A7F3D0]">
            Featured
          </span>
        )}
      </div>

      <div className="mb-3 flex items-start gap-3">
        <h3 className="text-xl font-semibold text-[#0F172A] leading-tight">{title}</h3>
      </div>

      <p className="mb-4 text-[15px] leading-6 text-[#475569] line-clamp-3">{description}</p>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                tagColors[tag] || 'bg-[#E5E7EB] text-[#374151] border-[#D1D5DB]'
              }`}
            >
              {tag}
            </span>
          ))}
          {remainingCount > 0 && (
            <span className="px-2.5 py-1 text-xs font-bold bg-[#E5E7EB] text-[#374151] rounded-md border border-[#D1D5DB]">
              +{remainingCount} more
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#E2E8F0] pt-3 text-xs text-[#475569]">
        <span className="font-semibold">{date}</span>
        <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1 font-semibold text-[#0F766E] group-hover:bg-[#ECFDF5] transition-colors">Open details →</span>
      </div>
    </article>
  )
}
