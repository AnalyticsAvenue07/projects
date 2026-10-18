import { ArrowRight, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip'
import type { CustomOverviewTab } from '@/types/projectContent'

export interface CustomTabContentViewProps {
  tab: CustomOverviewTab
  onEdit: (tab: CustomOverviewTab) => void
  onDelete: (tab: CustomOverviewTab) => void
}

export function CustomTabContentView({
  tab,
  onEdit,
  onDelete,
}: CustomTabContentViewProps) {
  const formattedCreated = new Date(tab.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const formattedUpdated = new Date(tab.updatedAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* ── Main Tab Card ── */}
      <div className="aa-card bg-white p-6 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#0F766E]">
                {tab.eyebrow || 'Custom Tab'}
              </p>
              <Badge
                variant="outline"
                className="border-teal-200 bg-teal-50 text-[10px] font-semibold text-[#0F766E]"
              >
                Project Custom
              </Badge>
            </div>
            <h2 className="text-2xl font-bold text-[#0F172A] md:text-3xl">
              {tab.title}
            </h2>
            {tab.description && (
              <p className="text-base text-[#475569] leading-relaxed max-w-3xl">
                {tab.description}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onEdit(tab)}
                    className="gap-2 rounded-xl border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
                    aria-label="Edit section"
                  >
                    <Pencil className="h-4 w-4" />
                    <span>Edit</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Edit section</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onDelete(tab)}
                    className="gap-2 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
                    aria-label="Delete custom tab"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Delete custom tab</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Content Body */}
        <div className="pt-6 space-y-6">
          {tab.content ? (
            <div className="whitespace-pre-line text-[15px] text-[#334155] leading-relaxed">
              {tab.content}
            </div>
          ) : (
            !tab.bullets?.length && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No detailed text provided for this tab yet. Click <strong>Edit</strong> to add content or bullet points.
              </div>
            )
          )}

          {tab.bullets && tab.bullets.length > 0 && (
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[#0F766E]" />
                <h4 className="text-base font-bold text-[#0F172A]">Key Details</h4>
              </div>
              <ul className="space-y-3 text-[14px] text-[#334155] leading-relaxed">
                {tab.bullets.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <ArrowRight className="w-4 h-4 text-[#0F766E] shrink-0 mt-1" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-8 border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>Created on {formattedCreated}</span>
          <span>Last modified at {formattedUpdated}</span>
        </div>
      </div>
    </div>
  )
}
