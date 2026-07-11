/**
 * Trend analysis over a daily distress series.
 *
 * We compare the most recent 7 days to the 7 days before that, plus a trailing
 * rolling average for a smooth chart line. Everything is deterministic and
 * explainable: no smoothing that hides real movement, no model to tune.
 */

import { daysBetween, mean, safeRound } from './dateUtils'
import type {
  Confidence,
  DateKey,
  TrendDirection,
  TrendPoint,
  TrendResult,
  TrendStatus,
  TrendStatusState,
} from './types'

/** A minimal daily point — both household and person scores satisfy this. */
export interface ScoredDay {
  date: DateKey
  score: number | null
  eventCount: number
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

/** Direction from a delta. Well-being: score going UP = improving. */
function directionFromDelta(delta: number): TrendDirection {
  if (delta > STABLE_BAND) return 'improving'
  if (delta < -STABLE_BAND) return 'worsening'
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
 * Calculates an asymmetric rolling weighted average that accounts for anomalous
 *  results.
 * @param {TrendResult} trend
 * @param {{negativeAlpha?: number, positiveAlpha?: number}} param1
 * @param {number} param1.negativeAlpha
 * @param {number} param1.positiveAlpha
 * @returns {TrendResult}
 */
const calculateTrend = (
  trend: TrendResult,
  {
    negativeAlpha = 0.55,
    positiveAlpha = 0.1,
  }: {
    negativeAlpha?: number
    positiveAlpha?: number
  } = {},
): TrendResult => {
  let weightedAverage: number | null = null

  const points = trend.points.map((point) => {
    if (point.score !== null) {
      if (weightedAverage === null) {
        weightedAverage = point.score
      } else {
        const isNegativeResult = point.score < weightedAverage
        const alpha = isNegativeResult ? negativeAlpha : positiveAlpha

        weightedAverage = alpha * point.score + (1 - alpha) * weightedAverage
      }
    }

    return {
      ...point,
      rollingAverage: weightedAverage === null ? null : Math.round(weightedAverage),
    }
  })

  return {
    ...trend,
    points,
  }
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
    eventCount: day.eventCount,
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
  const currentTrend = points.at(-1)?.rollingAverage ?? null

  const historicalAverage = mean(
    points
      .slice(0, -TREND_WINDOW_DAYS)
      .map((p) => p.rollingAverage)
      .filter((v): v is number => v !== null),
  )

  const direction: TrendDirection =
    currentTrend !== null &&
    historicalAverage !== null &&
    currentTrend >= historicalAverage
      ? 'improving'
      : 'worsening'

  return calculateTrend({
    current7DayAverage,
    previous7DayAverage,
    delta,
    direction,
    points,
    confidence: trendConfidence(currentScores.length, previousScores.length),
  })
}

/* ------------------------------------------------------------------ */
/*  Trend status: which way, and for how long                          */
/* ------------------------------------------------------------------ */

/** Change (points) below which the current stretch reads as "steady". */
export const STATUS_STEADY_BAND = 6
/** Allowed retrace from a run's extreme before the run is considered over. */
export const STATUS_RETRACE_TOLERANCE = 8
/** Well-being at/above this is "good"; at/below HARD it's "hard". */
export const STATUS_GOOD_LEVEL = 60
export const STATUS_HARD_LEVEL = 45
/** Fewest scored days before we'll call a direction at all. */
const MIN_STATUS_DAYS = 4

/** Trailing rolling mean over a plain number series. */
function smoothSeries(values: number[], windowSize: number): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - windowSize + 1), i + 1)
    return slice.reduce((sum, v) => sum + v, 0) / slice.length
  })
}

/** Direction of the most recent stretch, from a short trailing comparison. */
function recentDirection(smooth: number[]): -1 | 0 | 1 {
  const end = smooth.length - 1
  const delta = smooth[end] - smooth[Math.max(0, end - 3)]
  if (Math.abs(delta) < STATUS_STEADY_BAND) return 0
  return delta > 0 ? 1 : -1
}

/** How far back (start index) the current stretch extends on the smoothed line. */
function runStartIndex(smooth: number[], direction: -1 | 0 | 1): number {
  const end = smooth.length - 1
  let start = end
  let extreme = smooth[end]
  for (let j = end - 1; j >= 0; j--) {
    let holds: boolean
    if (direction === 0) {
      holds = Math.abs(smooth[end] - smooth[j]) <= STATUS_STEADY_BAND
    } else if (direction === 1) {
      holds = smooth[j] <= extreme + STATUS_RETRACE_TOLERANCE
      extreme = Math.min(extreme, smooth[j])
    } else {
      holds = smooth[j] >= extreme - STATUS_RETRACE_TOLERANCE
      extreme = Math.max(extreme, smooth[j])
    }
    if (!holds) break
    start = j
  }
  return start
}

function steadyState(currentAverage: number): TrendStatusState {
  if (currentAverage >= STATUS_GOOD_LEVEL) return 'steady-good'
  if (currentAverage <= STATUS_HARD_LEVEL) return 'steady-hard'
  return 'steady-mixed'
}

function statusSummary(state: TrendStatusState, days: number): string {
  const span = `about ${days} day${days === 1 ? '' : 's'}`
  switch (state) {
    case 'improving':
      return `Well-being has been climbing for ${span} — a hopeful direction.`
    case 'worsening':
      return `Well-being has been sliding for ${span}. Worth watching, gently.`
    case 'steady-good':
      return `Well-being has held steady and strong for ${span}.`
    case 'steady-hard':
      return `Well-being has stayed low but steady for ${span} — a stretch worth extra support.`
    default:
      return `Well-being has held fairly steady for ${span}.`
  }
}

/**
 * Read the current trend: which way well-being is going (or that it's steady,
 * good or hard), and how long that has held. Smooths first so a single off day
 * doesn't reset the count.
 */
export function buildTrendStatus(points: TrendPoint[]): TrendStatus {
  const scored = points.filter((p) => p.score !== null) as {
    date: DateKey
    score: number
  }[]
  if (scored.length < MIN_STATUS_DAYS) {
    return {
      state: 'insufficient',
      days: 0,
      currentAverage: null,
      summary: 'Not enough check-ins yet to tell which way things are heading.',
    }
  }

  const smooth = smoothSeries(
    scored.map((s) => s.score),
    3,
  )
  const direction = recentDirection(smooth)
  const start = runStartIndex(smooth, direction)
  const currentAverage = safeRound(smooth[smooth.length - 1])
  const days = daysBetween(scored[scored.length - 1].date, scored[start].date) + 1

  let state: TrendStatusState
  if (direction === 1) state = 'improving'
  else if (direction === -1) state = 'worsening'
  else state = steadyState(currentAverage)

  return { state, days, currentAverage, summary: statusSummary(state, days) }
}
