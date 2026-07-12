import { useMemo } from 'react'

import { analyzeHousehold, type AnalyticsResult } from './analytics'
import { usePatternsData } from './usePatternsData'

/** The computed analytics plus the query's loading/error state. */
export interface PatternsAnalytics {
  result: AnalyticsResult | null
  isLoading: boolean
  hasError: boolean
}

/**
 * Fetch household data and compute the full analytics result.
 *
 * The computation is memoized on the fetched data, so it only re-runs when the
 * underlying records change (not on every render). `now` is captured at compute
 * time; because analytics is deterministic, the same data always yields the
 * same result within a given day.
 */
export function usePatternsAnalytics(windowDays?: number): PatternsAnalytics {
  const { data, isLoading, error } = usePatternsData()

  const result = useMemo(() => {
    if (!data) return null

    return analyzeHousehold(data.people, {
      now: new Date(),
      windowDays,
      lifeEvents: data.lifeEvents,
    })
  }, [data, windowDays])

  return { result, isLoading, hasError: Boolean(error) }
}
