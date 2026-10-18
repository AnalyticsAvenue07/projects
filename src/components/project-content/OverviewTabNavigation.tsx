import { Plus } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip'
import type { ProjectTabItem } from '@/types/projectContent'

export interface OverviewTabNavigationProps {
  tabs: ProjectTabItem[]
  activeTab: string
  onTabChange: (tabKey: string) => void
  onAddTabClick: () => void
  className?: string
}

export function OverviewTabNavigation({
  tabs,
  activeTab,
  onTabChange,
  onAddTabClick,
  className = '',
}: OverviewTabNavigationProps) {
  return (
    <div
      className={`rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] mb-6 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* ── Pill Tabs List ── */}
        <div className="inline-flex max-w-full overflow-x-auto rounded-3xl border border-[#CBD5E1] bg-[#F8FAFC] p-1 shadow-sm scrollbar-none">
          {tabs.map(({ key, label, isCustom }) => {
            const isActive = activeTab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => onTabChange(key)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-3xl px-5 py-2.5 text-sm font-semibold transition shrink-0 ${
                  isActive
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
                aria-selected={isActive}
                role="tab"
              >
                <span>{label}</span>
                {isCustom && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isActive ? 'bg-[#0F766E]' : 'bg-slate-300'
                    }`}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* ── Add New Tab Action ── */}
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={onAddTabClick}
                variant="outline"
                className="gap-2 rounded-3xl border-[#CBD5E1] bg-white px-4 py-2.5 text-xs font-semibold text-[#0F766E] shadow-sm hover:border-[#0F766E] hover:bg-[#F0FDFA] hover:text-[#0D5F58]"
                aria-label="Add new overview tab"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add New Tab</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Create a custom tab for this project</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
