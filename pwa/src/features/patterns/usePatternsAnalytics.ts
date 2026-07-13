import { useMemo } from 'react'

import { analyzeHousehold, type AnalyticsResult } from './analytics'
import { usePatternsData } from './usePatternsData'

/** The computed analytics plus the query's loading/error state. */
export interface PatternsAnalytics {
  result: AnalyticsResult | null
  isLoading: boolean
  hasError: boolean
}

export const usePatternsAnalytics = (windowDays?: number): PatternsAnalytics => {
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
