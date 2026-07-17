/**
 * Person-scoped view of an already-computed household `AnalyticsResult`.
 *
 * The person page reuses the same whole-household analytics pass (so it can
 * also show household context and cross-person relationships) and simply
 * narrows it to one person here. Nothing is recomputed except the person's own
 * calendar and turning points, which are derived from their daily scores.
 */

import { buildCalendar } from './calendarHeatmap'
import { buildOverview } from './summaries'
import { findTurningPoints } from './turningPoints'
import type {
  AnalyticsResult,
  AnomalyPatterns,
  CalendarDayPattern,
  CorrelationInsight,
  DailyHouseholdScore,
  DailyPersonScore,
  GeneratedInsight,
  OverviewSummary,
  RelationshipInsight,
  TimingAnalysis,
  TrendResult,
  TurningPointInsight,
  IndicatorOverlap,
  IndicatorSignal,
} from './types'

/** Everything the person page needs for one person. */
export interface PersonAnalyticsView {
  personId: string
  personName: string
  trend: TrendResult
  dailyScores: DailyPersonScore[]
  calendar: CalendarDayPattern[]
  /** Correlations where this person is the source or the target. */
  correlations: CorrelationInsight[]
  /** Relationships where this person is either party. */
  relationships: RelationshipInsight[]
  turningPoints: TurningPointInsight[]
  /** Person-scoped overview (weekly insight + noteworthy changes). */
  overview: OverviewSummary
  /** Days in the window with a score for this person. */
  scoredDays: number
  anomalyPatterns: AnomalyPatterns
}

const asHouseholdSeries = (scores: DailyPersonScore[]): DailyHouseholdScore[] =>
  scores.map((score) => ({
    date: score.date,
    score: score.score,
    contributingPeople: score.hasData ? 1 : 0,
    checkInCount: score.checkInCount,
    incidentCount: score.incidentCount,
    eventCount: score.eventCount,
    positiveCount: score.positiveCount,
    negativeCount: score.negativeCount,
  }))

const EMPTY_TREND: TrendResult = {
  current7DayAverage: null,
  previous7DayAverage: null,
  delta: null,
  direction: 'insufficient',
  points: [],
  confidence: 'low',
}

export const buildPersonView = (
  result: AnalyticsResult,
  personId: string,
): PersonAnalyticsView => {
  const dailyScores = result.personDailyScores[personId] ?? []
  const householdShaped = asHouseholdSeries(dailyScores)
  const personName =
    result.people.find((p) => p.id === personId)?.displayName ?? 'This person'

  const trend = result.personTrends[personId] ?? EMPTY_TREND
  const correlations = result.correlations.filter(
    (c) => c.sourcePersonId === personId || c.targetPersonId === personId,
  )
  const turningPoints = findTurningPoints(householdShaped)

  return {
    personId,
    personName,
    trend,
    dailyScores,
    calendar: buildCalendar(householdShaped),
    correlations,
    relationships: result.relationships.filter(
      (r) => r.personAId === personId || r.personBId === personId,
    ),
    turningPoints,
    overview: buildOverview({
      householdTrend: trend,
      householdDailyScores: householdShaped,
      turningPoints,
      correlations,
      subjectName: personName,
    }),
    scoredDays: dailyScores.filter((d) => d.score !== null).length,
    anomalyPatterns: result.personAnomalyPatterns[personId] ?? {
      baseline: null,
      weekday: null,
      events: null,
      otherPeople: null,
    },
  }
}

/**
 * A view of the analytics scoped either to the whole household (`personId`
 * null) or to a single person. This is what the shared Patterns filter drives:
 * every page reads from the same shape regardless of scope.
 */
export interface ScopedPatternsView {
  /** null = Everyone / household. */
  personId: string | null
  /** null for household; otherwise the person's display name. */
  personName: string | null
  trend: TrendResult
  calendar: CalendarDayPattern[]
  correlations: CorrelationInsight[]
  relationships: RelationshipInsight[]
  turningPoints: TurningPointInsight[]
  overview: OverviewSummary
  timing: TimingAnalysis
  generatedInsights: GeneratedInsight[]
  scoredDays: number
  anomalyPatterns: AnomalyPatterns | null
  severityOverlaps: HouseholdSeverityOverlap[]
  indicatorOverlaps: IndicatorOverlap[]
  indicatorSignals: IndicatorSignal[]
}

export interface HouseholdSeverityOverlap {
  personAId: string
  personAName: string
  personBId: string
  personBName: string
  personASevereDays: number
  personBSevereDays: number
  overlapDays: number
  personAGoodDays: number
  personBGoodDays: number
  goodOverlapDays: number
}

const buildSeverityOverlaps = (
  result: AnalyticsResult,
  focusPersonId: string | null,
): HouseholdSeverityOverlap[] => {
  const people = focusPersonId
    ? result.people.filter((person) => person.id === focusPersonId)
    : result.people
  const pairs: HouseholdSeverityOverlap[] = []

  people.forEach((personA) => {
    result.people.forEach((personB) => {
      if (personA.id === personB.id) return
      if (!focusPersonId && personA.id > personB.id) return

      const severeDates = (personId: string) =>
        new Set(
          (result.personDailyScores[personId] ?? [])
            .filter((day) => day.negativeCount > 0 || day.incidentCount > 0)
            .map((day) => day.date),
        )
      const goodDates = (personId: string) =>
        new Set(
          (result.personDailyScores[personId] ?? [])
            .filter(
              (day) =>
                day.hasData && day.negativeCount === 0 && day.incidentCount === 0,
            )
            .map((day) => day.date),
        )
      const aDates = severeDates(personA.id)
      const bDates = severeDates(personB.id)
      const aGoodDates = goodDates(personA.id)
      const bGoodDates = goodDates(personB.id)
      const overlapDays = [...aDates].filter((date) => bDates.has(date)).length
      const goodOverlapDays = [...aGoodDates].filter((date) =>
        bGoodDates.has(date),
      ).length
      if (aDates.size === 0 && bDates.size === 0 && goodOverlapDays === 0) return

      pairs.push({
        personAId: personA.id,
        personAName: personA.displayName,
        personBId: personB.id,
        personBName: personB.displayName,
        personASevereDays: aDates.size,
        personBSevereDays: bDates.size,
        overlapDays,
        personAGoodDays: aGoodDates.size,
        personBGoodDays: bGoodDates.size,
        goodOverlapDays,
      })
    })
  })

  return pairs.sort((a, b) => b.overlapDays - a.overlapDays)
}

export const buildScopedView = (
  result: AnalyticsResult,
  personId: string | null,
): ScopedPatternsView => {
  const known = personId !== null && result.people.some((p) => p.id === personId)
  if (!known) {
    return {
      personId: null,
      personName: null,
      trend: result.householdTrend,
      calendar: result.calendar,
      correlations: result.correlations,
      relationships: result.relationships,
      turningPoints: result.turningPoints,
      overview: result.overview,
      timing: result.timing,
      generatedInsights: result.generatedInsights,
      scoredDays: result.dataQuality.scoredDays,
      anomalyPatterns: null,
      severityOverlaps: buildSeverityOverlaps(result, null),
      indicatorOverlaps: result.indicatorOverlaps,
      indicatorSignals: result.indicatorSignals,
    }
  }

  const view = buildPersonView(result, personId)
  const personIndicatorOverlaps = result.indicatorOverlaps.filter(
    (overlap) =>
      overlap.sourcePersonId === personId || overlap.targetPersonId === personId,
  )
  return {
    personId,
    personName: view.personName,
    trend: view.trend,
    calendar: view.calendar,
    correlations: view.correlations,
    relationships: view.relationships,
    turningPoints: view.turningPoints,
    overview: view.overview,
    timing: result.personTiming[personId],
    generatedInsights: result.personGeneratedInsights[personId] ?? [],
    scoredDays: view.scoredDays,
    anomalyPatterns: view.anomalyPatterns,
    severityOverlaps: buildSeverityOverlaps(result, null),
    indicatorOverlaps: personIndicatorOverlaps,
    indicatorSignals: result.indicatorSignals,
  }
}
