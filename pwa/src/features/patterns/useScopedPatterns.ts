import { useMemo } from 'react'

import { buildScopedView, type ScopedPatternsView } from './analytics'
import { usePatternsAnalytics } from './usePatternsAnalytics'
import { usePatternsFilterStore } from './patternsFilterStore'

/** Result of `useScopedPatterns`: the scoped view plus query/view state. */
export interface ScopedPatterns {
  /** Analytics scoped to the current filter (Everyone or one person). */
  view: ScopedPatternsView | null
  isLoading: boolean
  hasError: boolean
  /** Whether the delta ("show change") toggle is on. */
  showDelta: boolean
}

/**
 * The one hook every Patterns page uses. It computes the full household
 * analytics once (memoized, shared cache) and narrows it to the person picked
 * in the shared filter — so the selection carries across pages and dictates
 * exactly what each page shows.
 */
export function useScopedPatterns(): ScopedPatterns {
  const { result, isLoading, hasError } = usePatternsAnalytics()
  const selectedPersonId = usePatternsFilterStore((s) => s.selectedPersonId)
  const showDelta = usePatternsFilterStore((s) => s.showDelta)

  const view = useMemo(
    () => (result ? buildScopedView(result, selectedPersonId) : null),
    [result, selectedPersonId],
  )

  return { view, isLoading, hasError, showDelta }
}
