import { useMemo } from 'react'

import { analyzeHousehold, buildScopedView, type ScopedPatternsView } from './analytics'
import { daysBetween, dateKeyToDate } from './analytics/dateUtils'
import { usePatternsData } from './usePatternsData'
import {
  usePatternsFilterStore,
  type AnalyticsType,
  type CustomRange,
} from './patternsFilterStore'

/** The display filters a page may apply on top of the scoped data. */
export interface DisplayFilters {
  type: AnalyticsType
  indicatorMode: 'all' | 'custom'
  indicatorIds: string[]
}

/** Result of `useScopedPatterns`: the scoped view plus query/view state. */
export interface ScopedPatterns {
  /** Analytics scoped to the current filter (Everyone, a subset, or one person). */
  view: ScopedPatternsView | null
  isLoading: boolean
  hasError: boolean
  /** Whether the delta ("show change") toggle is on. */
  showDelta: boolean
  /** Display-only filters (type / indicator subset) for pages to honour. */
  filters: DisplayFilters
}

/** Derive the analysis window (`now` + day count) from the range filter. */
function deriveWindow(
  rangeDays: number,
  customRange: CustomRange | null,
): { now: Date; windowDays: number } {
  if (customRange) {
    const span = daysBetween(customRange.end, customRange.start) + 1
    return { now: dateKeyToDate(customRange.end), windowDays: Math.max(1, span) }
  }
  return { now: new Date(), windowDays: rangeDays }
}

/**
 * The hook every Patterns page uses. It recomputes analytics over the filtered
 * dataset (selected people + date range) and narrows the result to the chosen
 * scope — so the shared filter carries across pages and dictates the values.
 */
export function useScopedPatterns(): ScopedPatterns {
  const { data, isLoading, error } = usePatternsData()
  const personIds = usePatternsFilterStore((s) => s.personIds)
  const rangeDays = usePatternsFilterStore((s) => s.rangeDays)
  const customRange = usePatternsFilterStore((s) => s.customRange)
  const showDelta = usePatternsFilterStore((s) => s.showDelta)
  const type = usePatternsFilterStore((s) => s.type)
  const indicatorMode = usePatternsFilterStore((s) => s.indicatorMode)
  const indicatorIds = usePatternsFilterStore((s) => s.indicatorIds)

  const result = useMemo(() => {
    if (!data) return null
    const subset = personIds.length
      ? data.people.filter((person) => personIds.includes(person.id))
      : data.people
    const { now, windowDays } = deriveWindow(rangeDays, customRange)
    return analyzeHousehold(subset, {
      now,
      windowDays,
      lifeEvents: data.lifeEvents,
    })
  }, [data, personIds, rangeDays, customRange])

  const view = useMemo(() => {
    if (!result) return null
    const scopePersonId = personIds.length === 1 ? personIds[0] : null
    return buildScopedView(result, scopePersonId)
  }, [result, personIds])

  return {
    view,
    isLoading,
    hasError: Boolean(error),
    showDelta,
    filters: { type, indicatorMode, indicatorIds },
  }
}
