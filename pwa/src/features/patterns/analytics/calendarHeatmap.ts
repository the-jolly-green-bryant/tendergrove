/**
 * Calendar heatmap: one gentle, glanceable summary per day.
 *
 * The bands match the mockup legend. Copy is intentionally soft and never
 * medical — a caregiver scanning the month should feel informed, not judged.
 */

import type { CalendarDayPattern, DailyHouseholdScore, DistressLevel } from './types'

/**
 * Score → band thresholds (upper bound of each band, inclusive).
 * low: 0–25, moderate: 26–60, high: 61–80, veryHigh: 81–100.
 */
export const DISTRESS_LEVEL_THRESHOLDS = {
  low: 25,
  moderate: 60,
  high: 80,
} as const

/** Map a 0–100 distress score to a band. */
export function distressLevel(score: number): DistressLevel {
  if (score <= DISTRESS_LEVEL_THRESHOLDS.low) return 'low'
  if (score <= DISTRESS_LEVEL_THRESHOLDS.moderate) return 'moderate'
  if (score <= DISTRESS_LEVEL_THRESHOLDS.high) return 'high'
  return 'veryHigh'
}

/** Non-clinical adjective for each band. */
const LEVEL_WORD: Record<DistressLevel, string> = {
  low: 'Calmer day',
  moderate: 'Some ups and downs',
  high: 'Harder day',
  veryHigh: 'A very hard day',
}

/** Build a short, human summary for a day cell. */
function buildShortSummary(day: DailyHouseholdScore): string {
  if (day.score === null) {
    return day.checkInCount === 0 && day.incidentCount === 0
      ? 'No check-ins yet'
      : 'Not enough to summarize'
  }

  const parts: string[] = [LEVEL_WORD[distressLevel(day.score)]]
  if (day.incidentCount > 0) {
    parts.push(`${day.incidentCount} incident${day.incidentCount === 1 ? '' : 's'}`)
  }
  if (day.positiveCount > 0) {
    parts.push(`${day.positiveCount} positive`)
  }
  return parts.join(' · ')
}

/** Turn household daily scores into calendar day patterns. */
export function buildCalendar(
  householdDailyScores: DailyHouseholdScore[],
): CalendarDayPattern[] {
  return householdDailyScores.map((day) => ({
    date: day.date,
    score: day.score,
    level: day.score === null ? null : distressLevel(day.score),
    checkInCount: day.checkInCount,
    incidentCount: day.incidentCount,
    positiveCount: day.positiveCount,
    negativeCount: day.negativeCount,
    shortSummary: buildShortSummary(day),
  }))
}
