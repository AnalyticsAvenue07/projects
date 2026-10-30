import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart2, CheckCircle2, Clock, Cpu, Layers } from 'lucide-react'
import type { ComputedKpiResult } from '@/services/dashboardRendererService'

const THEME_STYLES = {
  teal: {
    bg: 'bg-[#ECFDF5]',
    border: 'border-[#A7F3D0]',
    text: 'text-[#0F766E]',
    iconBg: 'bg-[#0F766E]/10',
    iconText: 'text-[#0F766E]',
  },
  blue: {
    bg: 'bg-[#EFF6FF]',
    border: 'border-[#BFDBFE]',
    text: 'text-[#1D4ED8]',
    iconBg: 'bg-[#1D4ED8]/10',
    iconText: 'text-[#1D4ED8]',
  },
  emerald: {
    bg: 'bg-[#ECFDF5]',
    border: 'border-[#A7F3D0]',
    text: 'text-[#047857]',
    iconBg: 'bg-[#047857]/10',
    iconText: 'text-[#047857]',
  },
  amber: {
    bg: 'bg-[#FFFBEB]',
    border: 'border-[#FDE68A]',
    text: 'text-[#B45309]',
    iconBg: 'bg-[#B45309]/10',
    iconText: 'text-[#B45309]',
  },
  rose: {
    bg: 'bg-[#FFF1F2]',
    border: 'border-[#FECDD3]',
    text: 'text-[#BE123C]',
    iconBg: 'bg-[#BE123C]/10',
    iconText: 'text-[#BE123C]',
  },
  slate: {
    bg: 'bg-[#F8FAFC]',
    border: 'border-[#E2E8F0]',
    text: 'text-[#334155]',
    iconBg: 'bg-[#334155]/10',
    iconText: 'text-[#334155]',
  },
}

function getIcon(name?: string) {
  switch (name) {
    case 'activity':
      return Activity
    case 'alert':
      return AlertTriangle
    case 'check':
      return CheckCircle2
    case 'clock':
      return Clock
    case 'cpu':
      return Cpu
    case 'layers':
      return Layers
    default:
      return BarChart2
  }
}

export function KpiCardRenderer({ kpi }: { kpi: ComputedKpiResult }) {
  const theme = THEME_STYLES[kpi.colorTheme || 'teal'] || THEME_STYLES.teal
  const IconComponent = getIcon(kpi.icon)

  let formattedValue = String(kpi.value)
  if (typeof kpi.value === 'number') {
    if (kpi.format === 'currency') {
      formattedValue = `$${kpi.value.toLocaleString()}`
    } else if (kpi.format === 'percent') {
      formattedValue = `${kpi.value}%`
    } else {
      formattedValue = kpi.value.toLocaleString()
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-[#0F766E]/40 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{kpi.title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-[#0F172A]">{formattedValue}</span>
            {kpi.unit && <span className="text-sm font-semibold text-slate-500">{kpi.unit}</span>}
          </div>
        </div>
        <div className={`rounded-2xl p-3 ${theme.iconBg} ${theme.iconText}`}>
          <IconComponent className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="line-clamp-1">{kpi.description || 'Descriptive fleet aggregate'}</span>
        {kpi.targetComparison && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-bold ${
              kpi.targetComparison.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {kpi.targetComparison.isPositive ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {Math.abs(kpi.targetComparison.diffPct)}%
          </span>
        )}
      </div>
    </div>
  )
}
