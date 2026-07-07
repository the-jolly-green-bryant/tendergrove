/**
 * Trend analysis over a daily distress series.
 *
 * We compare the most recent 7 days to the 7 days before that, plus a trailing
 * rolling average for a smooth chart line. Everything is deterministic and
 * explainable: no smoothing that hides real movement, no model to tune.
 */

import { mean, safeRound } from './dateUtils'
import type {
  Confidence,
  DateKey,
  TrendDirection,
  TrendPoint,
  TrendResult,
} from './types'

/** A minimal daily point — both household and person scores satisfy this. */
export interface ScoredDay {
  date: DateKey
  score: number | null
}

/** Window (in days) used for the "current vs previous" comparison. */
export const TREND_WINDOW_DAYS = 7

/** Window used for the trailing rolling average line. */
export const ROLLING_WINDOW_DAYS = 7

/**
 * Distress deltas smaller than this are treated as noise, not a real change.
 * Keeps day-to-day wobble from being announced as "improving"/"worsening".
 */
export const STABLE_BAND = 4

/** Fewest scored days in the recent window before we trust a direction. */
const MIN_DAYS_FOR_DIRECTION = 3

/**
 * Trailing rolling average: for each day, the mean of the available scores in
 * the trailing `windowSize` days (including that day). Days with no score are
 * skipped in the average; the point is `null` until at least one score exists
 * in its window.
 */
export function rollingAverage(
  series: ScoredDay[],
  windowSize: number = ROLLING_WINDOW_DAYS,
): (number | null)[] {
  return series.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1)
    const scores = series
      .slice(start, index + 1)
      .map((d) => d.score)
      .filter((s): s is number => s !== null)
    const avg = mean(scores)
    return avg === null ? null : safeRound(avg)
  })
}

/** Direction from a delta, framed around distress (up = worsening). */
function directionFromDelta(delta: number): TrendDirection {
  if (delta > STABLE_BAND) return 'worsening'
  if (delta < -STABLE_BAND) return 'improving'
  return 'stable'
}

/**
 * Confidence for the trend. We are more confident when both comparison windows
 * actually contain data. This never claims certainty — at most "high".
 */
function trendConfidence(currentDays: number, previousDays: number): Confidence {
  if (currentDays >= 5 && previousDays >= 5) return 'high'
  if (currentDays >= 3 && previousDays >= 2) return 'moderate'
  return 'low'
}

/**
 * Compute the trend for a daily series.
 *
 * The series is expected to be contiguous and ascending (one entry per day in
 * the window). The last `TREND_WINDOW_DAYS` are "current"; the prior
 * `TREND_WINDOW_DAYS` are "previous". Averages ignore days with no score, so a
 * missing day neither helps nor hurts.
 */
export function computeTrend(series: ScoredDay[]): TrendResult {
  const rolling = rollingAverage(series)
  const points: TrendPoint[] = series.map((day, index) => ({
    date: day.date,
    score: day.score,
    rollingAverage: rolling[index],
  }))

  const currentSlice = series.slice(-TREND_WINDOW_DAYS)
  const previousSlice = series.slice(-2 * TREND_WINDOW_DAYS, -TREND_WINDOW_DAYS)

  const currentScores = currentSlice
    .map((d) => d.score)
    .filter((s): s is number => s !== null)
  const previousScores = previousSlice
    .map((d) => d.score)
    .filter((s): s is number => s !== null)

  const currentAvgRaw = mean(currentScores)
  const previousAvgRaw = mean(previousScores)
  const current7DayAverage = currentAvgRaw === null ? null : safeRound(currentAvgRaw)
  const previous7DayAverage = previousAvgRaw === null ? null : safeRound(previousAvgRaw)

  let delta: number | null = null
  let direction: TrendDirection

  if (currentScores.length < MIN_DAYS_FOR_DIRECTION) {
    // Not enough recent data to responsibly claim any direction.
    direction = 'insufficient'
  } else if (currentAvgRaw === null || previousAvgRaw === null) {
    // We have a current reading but nothing to compare against yet.
    direction = 'insufficient'
  } else {
    delta = safeRound(currentAvgRaw - previousAvgRaw)
    direction = directionFromDelta(delta)
  }

  return {
    current7DayAverage,
    previous7DayAverage,
    delta,
    direction,
    points,
    confidence:
      direction === 'insufficient'
        ? 'low'
        : trendConfidence(currentScores.length, previousScores.length),
  }
}
