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
  CalendarDayPattern,
  CorrelationInsight,
  DailyHouseholdScore,
  DailyPersonScore,
  OverviewSummary,
  RelationshipInsight,
  TrendResult,
  TurningPointInsight,
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
}

/**
 * Adapt a person's daily scores to the household-day shape so the shared
 * `buildCalendar`/`findTurningPoints` helpers can be reused unchanged. For a
 * single person "contributing people" is simply 1 on days with data.
 */
function asHouseholdSeries(scores: DailyPersonScore[]): DailyHouseholdScore[] {
  return scores.map((s) => ({
    date: s.date,
    score: s.score,
    contributingPeople: s.hasData ? 1 : 0,
    checkInCount: s.checkInCount,
    incidentCount: s.incidentCount,
    positiveCount: s.positiveCount,
    negativeCount: s.negativeCount,
  }))
}

const EMPTY_TREND: TrendResult = {
  current7DayAverage: null,
  previous7DayAverage: null,
  delta: null,
  direction: 'insufficient',
  points: [],
  confidence: 'low',
}

/** Narrow a whole-household result down to a single person's view. */
export function buildPersonView(
  result: AnalyticsResult,
  personId: string,
): PersonAnalyticsView {
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
      subjectLabel: `${personName}'s`,
    }),
    scoredDays: dailyScores.filter((d) => d.score !== null).length,
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
  scoredDays: number
}

/**
 * Build the scoped view for the current filter selection. Falls back to the
 * household view when no person is selected (or the selected person is gone).
 */
export function buildScopedView(
  result: AnalyticsResult,
  personId: string | null,
): ScopedPatternsView {
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
      scoredDays: result.dataQuality.scoredDays,
    }
  }

  const view = buildPersonView(result, personId)
  return {
    personId,
    personName: view.personName,
    trend: view.trend,
    calendar: view.calendar,
    correlations: view.correlations,
    relationships: view.relationships,
    turningPoints: view.turningPoints,
    overview: view.overview,
    scoredDays: view.scoredDays,
  }
}
