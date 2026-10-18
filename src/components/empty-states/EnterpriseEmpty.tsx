import type { ReactNode } from 'react'

interface EnterpriseEmptyProps {
  title: string
  description: string
  illustration?: ReactNode
  action?: ReactNode
}

/**
 * Enterprise empty state — matches dashboard background and typography.
 */
export function EnterpriseEmpty({ title, description, illustration, action }: EnterpriseEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16 max-w-lg mx-auto">
      {illustration ?? (
        <div
          className="mb-8 w-28 h-28 rounded-2xl bg-white border-[1.5px] border-[#CBD5E1] flex items-center justify-center shadow-sm"
          aria-hidden
        >
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="12" width="40" height="32" rx="4" stroke="#0F766E" strokeWidth="2" />
            <path d="M16 24h24M16 30h16" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
            <circle cx="40" cy="36" r="6" fill="#0284C7" fillOpacity="0.2" stroke="#0284C7" strokeWidth="1.5" />
          </svg>
        </div>
      )}
      <h2 className="text-xl font-bold text-[#1E293B] mb-3">{title}</h2>
      <p className="text-[15px] font-medium text-[#475569] leading-relaxed mb-6">{description}</p>
      {action}
    </div>
  )
}
