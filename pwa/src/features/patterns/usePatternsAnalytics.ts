import { useMemo } from 'react'

import { analyzeHousehold, type AnalyticsResult } from './analytics'
import { usePatternsData } from './usePatternsData'

/**
 * Keep enough history for baselines and rolling calculations while avoiding an
 * ever-growing client-side analytics pass. Charts can render a smaller slice.
 */
export const ANALYTICS_LOOKBACK_DAYS = 365

/** The computed analytics plus the query's loading/error state. */
export interface PatternsAnalytics {
  result: AnalyticsResult | null
  isLoading: boolean
  hasError: boolean
}

export const usePatternsAnalytics = (): PatternsAnalytics => {
  const { data, isLoading, error } = usePatternsData()

  const result = useMemo(() => {
    if (!data) return null

    return analyzeHousehold(data.people, {
      now: new Date(),
      windowDays: ANALYTICS_LOOKBACK_DAYS,
      lifeEvents: data.lifeEvents,
    })
  }, [data])

  return { result, isLoading, hasError: Boolean(error) }
}
