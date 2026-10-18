import type { ReactNode } from 'react'
import { ArrowRight, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip'
import type { OverviewSection } from '@/types/projectContent'

export interface EditableOverviewSectionProps {
  section: OverviewSection
  onEdit: (section: OverviewSection) => void
  onDelete?: (section: OverviewSection) => void
  icon?: ReactNode
  accentColor?: string
  className?: string
  children?: ReactNode
}

export function EditableOverviewSection({
  section,
  onEdit,
  onDelete,
  icon,
  accentColor = '#0F766E',
  className = '',
  children,
}: EditableOverviewSectionProps) {
  const isCustom = Boolean(section.isCustom)
  const isOverridden = Boolean(section.isOverridden)

  return (
    <article
      className={`aa-card relative bg-white p-6 transition-all duration-200 hover:shadow-md ${className}`}
    >
      {/* ── Section Header ── */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {section.eyebrow && (
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#0F766E] mb-1.5">
              {section.eyebrow}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            {icon && <span className="shrink-0">{icon}</span>}
            <h3 className="text-lg font-bold text-[#0F172A] tracking-tight truncate">
              {section.title}
            </h3>

            {isOverridden && (
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 text-[10px] font-semibold text-amber-700"
              >
                Customized
              </Badge>
            )}

            {isCustom && (
              <Badge
                variant="outline"
                className="border-teal-200 bg-teal-50 text-[10px] font-semibold text-[#0F766E]"
              >
                Custom Section
              </Badge>
            )}
          </div>

          {section.description && (
            <p className="mt-1 text-sm text-[#475569] leading-relaxed">
              {section.description}
            </p>
          )}
        </div>

        {/* ── Edit & Delete Controls ── */}
        <div className="flex items-center gap-1 shrink-0">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(section)}
                  className="h-8 w-8 rounded-lg border border-transparent text-[#64748B] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  aria-label="Edit section"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Edit section</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {isCustom && onDelete && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(section)}
                    className="h-8 w-8 rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete section"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Delete section</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* ── Section Body Content ── */}
      {children ? (
        children
      ) : (
        <div className="space-y-4 text-[14px] text-[#334155] leading-relaxed">
          {section.content && (
            <div className="whitespace-pre-line text-[15px] text-[#334155] leading-relaxed">
              {section.content}
            </div>
          )}

          {section.bullets && section.bullets.length > 0 && (
            <ul className="space-y-3 pt-1">
              {section.bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <ArrowRight
                    className="w-4 h-4 shrink-0 mt-1"
                    style={{ color: accentColor }}
                  />
                  <span className="leading-relaxed">{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  )
}
