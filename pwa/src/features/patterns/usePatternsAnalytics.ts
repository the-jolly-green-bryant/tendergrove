import { useMemo } from 'react'

import { analyzeHousehold, type AnalyticsResult } from './analytics'
import { usePatternsData } from './usePatternsData'
import { toLocalDateKey } from '../../lib/dateKeys'

/**
 * Keep enough history for baselines and rolling calculations while avoiding an
 * ever-growing client-side analytics pass. Charts can render a smaller slice.
 */
export const ANALYTICS_LOOKBACK_DAYS = 730

/** The computed analytics plus the query's loading/error state. */
export interface PatternsAnalytics {
  result: AnalyticsResult | null
  isLoading: boolean
  hasError: boolean
}

export const usePatternsAnalytics = (endDate?: Date): PatternsAnalytics => {
  const { data, isLoading, error } = usePatternsData()
  const endDateKey = toLocalDateKey(endDate ?? new Date())

  const result = useMemo(() => {
    if (!data) return null

    return analyzeHousehold(data.people, {
      // Historical person pages need an analytics window ending on the date
      // being viewed. The data query still fetches the complete dataset; this
      // only bounds the client-side calculation.
      now: new Date(`${endDateKey}T12:00:00`),
      windowDays: ANALYTICS_LOOKBACK_DAYS,
      lifeEvents: data.lifeEvents,
    })
  }, [data, endDateKey])

  return { result, isLoading, hasError: Boolean(error) }
}
