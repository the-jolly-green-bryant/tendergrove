/**
 * Person-scoped view of an already-computed household `AnalyticsResult`.
 *
 * The person page reuses the same whole-household analytics pass (so it can
 * also show household context and cross-person relationships) and simply
 * narrows it to one person here. Nothing is recomputed except the person's own
 * calendar and turning points, which are derived from their daily scores.
 */

import { buildCalendar } from './calendarHeatmap'
import { findTurningPoints } from './turningPoints'
import type {
  AnalyticsResult,
  CalendarDayPattern,
  CorrelationInsight,
  DailyHouseholdScore,
  DailyPersonScore,
  RelationshipInsight,
  TrendResult,
  TurningPointInsight,
} from './types'

/** Everything the person page needs for one person. */
export interface PersonAnalyticsView {
  personId: string
  trend: TrendResult
  dailyScores: DailyPersonScore[]
  calendar: CalendarDayPattern[]
  /** Correlations where this person is the source or the target. */
  correlations: CorrelationInsight[]
  /** Relationships where this person is either party. */
  relationships: RelationshipInsight[]
  turningPoints: TurningPointInsight[]
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

/** Narrow a whole-household result down to a single person's view. */
export function buildPersonView(
  result: AnalyticsResult,
  personId: string,
): PersonAnalyticsView {
  const dailyScores = result.personDailyScores[personId] ?? []
  const householdShaped = asHouseholdSeries(dailyScores)

  return {
    personId,
    trend: result.personTrends[personId] ?? {
      current7DayAverage: null,
      previous7DayAverage: null,
      delta: null,
      direction: 'insufficient',
      points: [],
      confidence: 'low',
    },
    dailyScores,
    calendar: buildCalendar(householdShaped),
    correlations: result.correlations.filter(
      (c) => c.sourcePersonId === personId || c.targetPersonId === personId,
    ),
    relationships: result.relationships.filter(
      (r) => r.personAId === personId || r.personBId === personId,
    ),
    turningPoints: findTurningPoints(householdShaped),
    scoredDays: dailyScores.filter((d) => d.score !== null).length,
  }
}
