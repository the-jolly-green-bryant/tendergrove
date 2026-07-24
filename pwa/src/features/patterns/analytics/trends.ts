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

export const rollingAverage = (
  series: ScoredDay[],
  windowSize: number = ROLLING_WINDOW_DAYS,
): (number | null)[] =>
  series.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1)
    const scores = series
      .slice(start, index + 1)
      .map((d) => d.score)
      .filter((s): s is number => s !== null)
    const avg = mean(scores)
    return avg === null ? null : safeRound(avg)
  })

const trendConfidence = (currentDays: number, previousDays: number): Confidence => {
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
    negativeAlpha = 0.45,
    positiveAlpha = 0.03,
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
        // Setbacks register promptly, while improvement must accumulate over
        // several check-ins. This keeps one good day from visually erasing a
        // sustained difficult stretch.
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

export const computeTrend = (series: ScoredDay[]): TrendResult => {
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

  const delta =
    current7DayAverage === null || previous7DayAverage === null
      ? null
      : current7DayAverage - previous7DayAverage
  const confidence = trendConfidence(currentScores.length, previousScores.length)

  let direction: TrendDirection
  if (delta === null || confidence === 'low') direction = 'insufficient'
  else if (Math.abs(delta) < STABLE_BAND) direction = 'stable'
  else direction = delta > 0 ? 'improving' : 'worsening'

  return calculateTrend({
    current7DayAverage,
    previous7DayAverage,
    delta,
    direction,
    points,
    confidence,
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

const smoothSeries = (values: number[], windowSize: number): number[] =>
  values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - windowSize + 1), i + 1)
    return slice.reduce((sum, v) => sum + v, 0) / slice.length
  })

const recentDirection = (smooth: number[]): -1 | 0 | 1 => {
  const end = smooth.length - 1
  const delta = smooth[end] - smooth[Math.max(0, end - 3)]
  if (Math.abs(delta) < STATUS_STEADY_BAND) return 0
  return delta > 0 ? 1 : -1
}

const runStartIndex = (smooth: number[], direction: -1 | 0 | 1): number => {
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

const steadyState = (currentAverage: number): TrendStatusState => {
  if (currentAverage >= STATUS_GOOD_LEVEL) return 'steady-good'
  if (currentAverage <= STATUS_HARD_LEVEL) return 'steady-hard'
  return 'steady-mixed'
}

const statusSummary = (state: TrendStatusState, days: number): string => {
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

export const buildTrendStatus = (points: TrendPoint[]): TrendStatus => {
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
