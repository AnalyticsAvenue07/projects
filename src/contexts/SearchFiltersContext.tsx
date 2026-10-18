import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export interface SearchFiltersContextValue {
  headerQuery: string
  setHeaderQuery: (q: string) => void
  resultsQuery: string
  setResultsQuery: (q: string) => void
  selectedFilters: Set<string>
  setSelectedFilters: (next: Set<string>) => void
}

const SearchFiltersContext = createContext<SearchFiltersContextValue | null>(null)

export function SearchFiltersProvider({ children }: { children: ReactNode }) {
  const [headerQuery, setHeaderQueryState] = useState(() => {
    return sessionStorage.getItem('aa_headerQuery') || ''
  })
  const [resultsQuery, setResultsQueryState] = useState(() => {
    return sessionStorage.getItem('aa_resultsQuery') || ''
  })
  const [selectedFilters, setSelectedFiltersState] = useState<Set<string>>(() => {
    const saved = sessionStorage.getItem('aa_selectedFilters')
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })

  const setHeaderQuery = (q: string) => {
    sessionStorage.setItem('aa_headerQuery', q)
    setHeaderQueryState(q)
  }

  const setResultsQuery = (q: string) => {
    sessionStorage.setItem('aa_resultsQuery', q)
    setResultsQueryState(q)
  }

  const setSelectedFilters = (next: Set<string>) => {
    sessionStorage.setItem('aa_selectedFilters', JSON.stringify(Array.from(next)))
    setSelectedFiltersState(next)
  }

  const value = useMemo(
    () => ({
      headerQuery,
      setHeaderQuery,
      resultsQuery,
      setResultsQuery,
      selectedFilters,
      setSelectedFilters,
    }),
    [headerQuery, resultsQuery, selectedFilters]
  )

  return <SearchFiltersContext.Provider value={value}>{children}</SearchFiltersContext.Provider>
}

export function useSearchFilters(): SearchFiltersContextValue {
  const ctx = useContext(SearchFiltersContext)
  if (!ctx) throw new Error('useSearchFilters must be used within SearchFiltersProvider')
  return ctx
}
