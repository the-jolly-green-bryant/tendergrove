/**
 * Calendar heatmap: one gentle, glanceable summary per day.
 *
 * Days are scored on well-being (0–100, higher = better), so a warmer/greener
 * day is a good day and a cooler/redder day is a harder one. Copy is
 * intentionally soft and never medical.
 */

import type { CalendarDayPattern, DailyHouseholdScore, WellbeingLevel } from './types'

/**
 * Lower bound (inclusive) of each well-being band:
 *   struggling 0–34 · mixed 35–59 · good 60–79 · thriving 80–100.
 */
export const WELLBEING_LEVEL_THRESHOLDS = {
  thriving: 80,
  good: 60,
  mixed: 35,
} as const

export const wellbeingLevel = (score: number): WellbeingLevel => {
  if (score >= WELLBEING_LEVEL_THRESHOLDS.thriving) return 'thriving'
  if (score >= WELLBEING_LEVEL_THRESHOLDS.good) return 'good'
  if (score >= WELLBEING_LEVEL_THRESHOLDS.mixed) return 'mixed'
  return 'struggling'
}

/** Non-clinical adjective for each band. */
const LEVEL_WORD: Record<WellbeingLevel, string> = {
  thriving: 'A really good day',
  good: 'A good day',
  mixed: 'Some ups and downs',
  struggling: 'A harder day',
}

const buildShortSummary = (day: DailyHouseholdScore): string => {
  if (day.score === null) {
    return day.checkInCount === 0 && day.incidentCount === 0
      ? 'No check-ins yet'
      : 'Not enough to summarize'
  }

  const parts: string[] = [LEVEL_WORD[wellbeingLevel(day.score)]]
  if (day.incidentCount > 0) {
    parts.push(`${day.incidentCount} incident${day.incidentCount === 1 ? '' : 's'}`)
  }
  if (day.positiveCount > 0) {
    parts.push(`${day.positiveCount} positive`)
  }
  return parts.join(' · ')
}

export const buildCalendar = (
  householdDailyScores: DailyHouseholdScore[],
): CalendarDayPattern[] =>
  householdDailyScores.map((day) => ({
    date: day.date,
    score: day.score,
    level: day.score === null ? null : wellbeingLevel(day.score),
    checkInCount: day.checkInCount,
    incidentCount: day.incidentCount,
    positiveCount: day.positiveCount,
    negativeCount: day.negativeCount,
    shortSummary: buildShortSummary(day),
  }))
