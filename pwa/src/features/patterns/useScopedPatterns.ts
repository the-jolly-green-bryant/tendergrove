import { useMemo } from 'react'

import { analyzeHousehold, buildScopedView, type ScopedPatternsView } from './analytics'
import { daysBetween, dateKeyToDate } from './analytics/dateUtils'
import { usePatternsData } from './usePatternsData'
import {
  usePatternsFilterStore,
  type AnalyticsType,
  type CustomRange,
} from './patternsFilterStore'

/** Display filters a page may apply on top of the scoped analytics. */
export interface DisplayFilters {
  type: AnalyticsType
  indicatorMode: 'all' | 'custom'
  indicatorIds: string[]
}

export interface ScopedPatterns {
  view: ScopedPatternsView | null
  isLoading: boolean
  hasError: boolean
  showDelta: boolean
  filters: DisplayFilters
}

const deriveWindow = (rangeDays: number, customRange: CustomRange | null): {
  now: Date
  windowDays: number
} => {
  if (customRange) {
    const span = daysBetween(customRange.end, customRange.start) + 1

    return {
      now: dateKeyToDate(customRange.end),
      windowDays: Math.max(1, span),
    }
  }

  return {
    now: new Date(),
    windowDays: rangeDays,
  }
}

export const useScopedPatterns = (): ScopedPatterns => {
  const { data, isLoading, error } = usePatternsData()

  const personIds = usePatternsFilterStore((state) => state.personIds)
  const rangeDays = usePatternsFilterStore((state) => state.rangeDays)
  const customRange = usePatternsFilterStore((state) => state.customRange)
  const showDelta = usePatternsFilterStore((state) => state.showDelta)
  const type = usePatternsFilterStore((state) => state.type)
  const indicatorMode = usePatternsFilterStore((state) => state.indicatorMode)
  const indicatorIds = usePatternsFilterStore((state) => state.indicatorIds)

  const result = useMemo(() => {
    if (!data) return null

    const { now, windowDays } = deriveWindow(rangeDays, customRange)

    /*
     * Keep the entire household available when viewing one person.
     * The anomaly analysis needs other people's check-ins to find
     * cross-person patterns.
     *
     * For an explicit multi-person subset, analyze only that subset.
     */
    const analysisPeople =
      personIds.length === 0 || personIds.length === 1
        ? data.people
        : data.people.filter((person) => personIds.includes(person.id))

    return analyzeHousehold(analysisPeople, {
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
    filters: {
      type,
      indicatorMode,
      indicatorIds,
    },
  }
}
