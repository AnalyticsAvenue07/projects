import type { Poc } from '@/types/domain'

const norm = (s: string) => s.toLowerCase().trim()

function parseFilterId(filterId: string): { section: string; label: string } {
  const i = filterId.indexOf('-')
  if (i === -1) return { section: filterId, label: '' }
  return { section: filterId.slice(0, i), label: filterId.slice(i + 1) }
}

function matchFilterId(poc: Poc, filterId: string): boolean {
  const { section, label } = parseFilterId(filterId)
  if (!label) return true

  const hay = norm(
    [poc.title, poc.description, poc.tags.join(' '), poc.industry ?? '', poc.tech ?? '', poc.solution_function ?? ''].join(
      ' '
    )
  )

  switch (section) {
    case 'Industry':
      return norm(poc.industry ?? '') === norm(label)
    case 'Tech':
      return (
        poc.tags.some((t) => norm(t) === norm(label)) ||
        norm(poc.tech ?? '').includes(norm(label))
      )
    case 'Type':
      if (label === 'Dashboard') return hay.includes('dashboard')
      if (label === 'AI Tool') return hay.includes('ai') && hay.includes('tool')
      if (label === 'Analytics') return hay.includes('analytics')
      if (label === 'Automation') return hay.includes('automation')
      return hay.includes(norm(label))
    case 'Function':
      return (
        norm(poc.solution_function ?? '').includes(norm(label)) ||
        hay.includes(norm(label))
      )
    case 'Solution':
      if (label === 'AI-Powered') return poc.tags.some((t) => norm(t).includes('ai'))
      if (label === 'Real-time') return hay.includes('real-time') || hay.includes('real time')
      if (label === 'Predictive') return hay.includes('predict')
      if (label === 'Custom') return hay.includes('custom')
      return hay.includes(norm(label))
    default:
      return hay.includes(norm(label))
  }
}

/**
 * Filters POC cards by header search, in-result search, and sidebar selections (AND across selected filters).
 */
export function filterPocs(
  pocs: Poc[],
  opts: { headerQuery: string; resultsQuery: string; selectedFilters: Set<string> }
): Poc[] {
  const hq = norm(opts.headerQuery)
  const rq = norm(opts.resultsQuery)

  return pocs.filter((p) => {
    const hay = norm(
      [p.title, p.description, p.tags.join(' '), p.industry ?? '', p.tech ?? '', p.solution_function ?? ''].join(' ')
    )
    if (hq && !hay.includes(hq)) return false
    if (rq && !hay.includes(rq)) return false

    for (const id of opts.selectedFilters) {
      if (!matchFilterId(p, id)) return false
    }
    return true
  })
}
