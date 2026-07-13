/**
 * Turning points: meaningful, sustained shifts in household well-being.
 *
 * Scores are well-being (higher = better), so a sustained RISE is a positive
 * change and a sustained DROP is worth watching. The method is deliberately
 * simple and explainable — no change-point models. For each candidate day we
 * compare the rolling average of the days just BEFORE it to the rolling average
 * of the days from it onward. A large enough, sustained gap is a turning point.
 * Tiny wobble is ignored, and a change must persist for several days to count
 * (so a single hard day doesn't masquerade as a lasting shift — that is
 * reported separately as a "spike": one unusually hard day that bounced back).
 */

import { addDaysToKey, daysBetween, mean, safeRound } from './dateUtils'
import type {
  Confidence,
  DailyHouseholdScore,
  DateKey,
  TurningPointInsight,
  TurningPointType,
} from './types'

/* ------------------------------------------------------------------ */
/*  Tunable constants                                                  */
/* ------------------------------------------------------------------ */

/** Days on each side used to compare "before" vs "after". */
export const COMPARE_WINDOW = 3

/** Smallest before→after change (points) worth reporting as sustained. */
export const MIN_SUSTAINED_DELTA = 15

/** A sustained change must stay on its new side for at least this many days. */
export const MIN_PERSIST_DAYS = 3

/** A single day this far BELOW both neighbours (and low) reads as a hard-day spike. */
export const SPIKE_DELTA = 22

/** Well-being at/below this counts as "low" (used for spike / recovery). */
export const LOW_WELLBEING = 40

/**
 * Drift detection (gradual, sustained trends). A slow slide over many days is
 * noteworthy even when no single day jumps — and even if one good day interrupts
 * it. We smooth first, then follow a run as long as it doesn't retrace by more
 * than DRIFT_TOLERANCE from its running extreme.
 */
export const DRIFT_SMOOTH_WINDOW = 3
export const DRIFT_MIN_DAYS = 5
export const DRIFT_MIN_DELTA = 12
export const DRIFT_TOLERANCE = 8

/** |delta| → severity bands. */
const SEVERITY_BANDS = { high: 30, moderate: 20 } as const

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface ScoredPoint {
  date: DateKey
  score: number
}

const severityFromDelta = (delta: number): Confidence => {
  const abs = Math.abs(delta)
  if (abs >= SEVERITY_BANDS.high) return 'high'
  if (abs >= SEVERITY_BANDS.moderate) return 'moderate'
  return 'low'
}

const measurePersistence = (scored: ScoredPoint[], startIndex: number, before: number, after: number): { durationDays: number; reachedEnd: boolean } => {
  const midpoint = (before + after) / 2
  const rising = after > before
  let lastIndex = startIndex
  for (let i = startIndex; i < scored.length; i++) {
    const onNewSide = rising ? scored[i].score >= midpoint : scored[i].score <= midpoint
    if (!onNewSide) break
    lastIndex = i
  }
  const durationDays = daysBetween(scored[lastIndex].date, scored[startIndex].date) + 1
  return { durationDays, reachedEnd: lastIndex === scored.length - 1 }
}

const classifySustained = (before: number, delta: number): TurningPointType => {
  // A drop in well-being is worth watching.
  if (delta < 0) return 'sustainedDecrease'
  // A rise from a low level is a recovery; otherwise a plain improvement.
  return before <= LOW_WELLBEING ? 'recovery' : 'sustainedIncrease'
}

const days = (count: number): string => {
  return `${count} day${count === 1 ? '' : 's'}`
}

const buildSustainedSummary = (type: TurningPointType, before: number, after: number, durationDays: number, reachedEnd: boolean): string => {
  const tail = reachedEnd
    ? `and has held there for ${days(durationDays)}`
    : `for about ${days(durationDays)}`
  if (type === 'sustainedDecrease') {
    return `Well-being dipped from around ${before} to ${after} ${tail}. Worth watching.`
  }
  if (type === 'recovery') {
    return `Well-being bounced back from around ${before} to ${after} ${tail}. A hopeful change.`
  }
  return `Well-being improved from around ${before} to ${after} ${tail}. A hopeful change.`
}

/* ------------------------------------------------------------------ */
/*  Detection                                                          */
/* ------------------------------------------------------------------ */

const detectSustained = (scored: ScoredPoint[]): TurningPointInsight[] => {
  const W = COMPARE_WINDOW
  if (scored.length < 2 * W) return []

  // Compute the before/after delta at each candidate boundary.
  interface Candidate {
    index: number
    before: number
    after: number
    delta: number
  }
  const candidates: Candidate[] = []
  for (let k = W; k <= scored.length - W; k++) {
    const before = mean(scored.slice(k - W, k).map((p) => p.score))!
    const after = mean(scored.slice(k, k + W).map((p) => p.score))!
    candidates.push({ index: k, before, after, delta: after - before })
  }

  // Group consecutive above-threshold candidates of the same sign into runs,
  // then keep the strongest boundary in each run (non-maximum suppression).
  const insights: TurningPointInsight[] = []
  let run: Candidate[] = []

  const flush = () => {
    if (run.length === 0) return
    const rep = run.reduce(
      (best, c) => (Math.abs(c.delta) > Math.abs(best.delta) ? c : best),
      run[0],
    )
    const before = safeRound(rep.before)
    const after = safeRound(rep.after)
    const { durationDays, reachedEnd } = measurePersistence(
      scored,
      rep.index,
      rep.before,
      rep.after,
    )
    if (durationDays >= MIN_PERSIST_DAYS) {
      const type = classifySustained(before, rep.delta)
      insights.push({
        date: scored[rep.index].date,
        type,
        beforeAverage: before,
        afterAverage: after,
        durationDays,
        severity: severityFromDelta(rep.delta),
        summary: buildSustainedSummary(type, before, after, durationDays, reachedEnd),
      })
    }
    run = []
  }

  for (const c of candidates) {
    const strong = Math.abs(c.delta) >= MIN_SUSTAINED_DELTA
    const sameSign = run.length > 0 && Math.sign(c.delta) === Math.sign(run[0].delta)
    if (strong && (run.length === 0 || sameSign)) {
      run.push(c)
    } else {
      flush()
      if (strong) run.push(c)
    }
  }
  flush()

  return insights
}

const detectSpikes = (scored: ScoredPoint[], covered: Set<DateKey>): TurningPointInsight[] => {
  const spikes: TurningPointInsight[] = []
  for (let m = 1; m < scored.length - 1; m++) {
    const day = scored[m]
    if (covered.has(day.date)) continue
    const prev = scored[m - 1].score
    const next = scored[m + 1].score
    const dip = Math.min(prev, next) - day.score
    if (dip >= SPIKE_DELTA && day.score <= LOW_WELLBEING) {
      const baseline = safeRound((prev + next) / 2)
      spikes.push({
        date: day.date,
        type: 'spike',
        beforeAverage: baseline,
        afterAverage: day.score,
        durationDays: 1,
        severity: severityFromDelta(dip),
        summary: `Well-being dipped to ${day.score} for a single day and bounced back toward its usual level. A hard day rather than a lasting shift.`,
      })
    }
  }
  return spikes
}

/* ------------------------------------------------------------------ */
/*  Drift: gradual, sustained trends                                   */
/* ------------------------------------------------------------------ */

const smoothScores = (scored: ScoredPoint[], window: number): number[] => {
  return scored.map((_, i) => {
    const slice = scored.slice(Math.max(0, i - window + 1), i + 1)
    return slice.reduce((sum, p) => sum + p.score, 0) / slice.length
  })
}

const extendRun = (smooth: number[], start: number): number => {
  let direction = 0
  let extreme = smooth[start]
  let end = start
  for (let j = start + 1; j < smooth.length; j++) {
    if (direction === 0) {
      if (Math.abs(smooth[j] - smooth[start]) >= 1)
        direction = Math.sign(smooth[j] - smooth[start])
      extreme = smooth[j]
      end = j
      continue
    }
    const withinTolerance =
      direction > 0
        ? smooth[j] >= extreme - DRIFT_TOLERANCE
        : smooth[j] <= extreme + DRIFT_TOLERANCE
    if (!withinTolerance) break
    extreme =
      direction > 0 ? Math.max(extreme, smooth[j]) : Math.min(extreme, smooth[j])
    end = j
  }
  return end
}

const driftInsight = (scored: ScoredPoint[], startIndex: number, endIndex: number, smooth: number[]): TurningPointInsight => {
  const before = safeRound(smooth[startIndex])
  const after = safeRound(smooth[endIndex])
  const durationDays = daysBetween(scored[endIndex].date, scored[startIndex].date) + 1
  const reachedEnd = endIndex === scored.length - 1
  const type = classifySustained(before, after - before)
  return {
    date: scored[startIndex].date,
    type,
    beforeAverage: before,
    afterAverage: after,
    durationDays,
    severity: severityFromDelta(after - before),
    summary: buildSustainedSummary(type, before, after, durationDays, reachedEnd),
  }
}

const detectDrift = (scored: ScoredPoint[]): TurningPointInsight[] => {
  if (scored.length < DRIFT_MIN_DAYS) return []
  const smooth = smoothScores(scored, DRIFT_SMOOTH_WINDOW)
  const insights: TurningPointInsight[] = []
  let i = 0
  while (i < smooth.length - 1) {
    const end = extendRun(smooth, i)
    const net = smooth[end] - smooth[i]
    const days = daysBetween(scored[end].date, scored[i].date) + 1
    if (end > i && Math.abs(net) >= DRIFT_MIN_DELTA && days >= DRIFT_MIN_DAYS) {
      insights.push(driftInsight(scored, i, end, smooth))
      i = end
    } else {
      i += 1
    }
  }
  return insights
}

/* ------------------------------------------------------------------ */
/*  Merge helpers                                                      */
/* ------------------------------------------------------------------ */

/** Fewest days apart two sustained shifts must be to both be reported. */
const MERGE_GAP_DAYS = 5

const dedupeByProximity = (items: TurningPointInsight[]): TurningPointInsight[] => {
  const byStrength = [...items].sort(
    (a, b) =>
      Math.abs(b.afterAverage - b.beforeAverage) -
      Math.abs(a.afterAverage - a.beforeAverage),
  )
  const kept: TurningPointInsight[] = []
  for (const item of byStrength) {
    const clashes = kept.some(
      (k) => Math.abs(daysBetween(item.date, k.date)) < MERGE_GAP_DAYS,
    )
    if (!clashes) kept.push(item)
  }
  return kept
}

const coveredDates = (items: TurningPointInsight[]): Set<DateKey> => {
  const set = new Set<DateKey>()
  for (const item of items) {
    for (let d = 0; d < item.durationDays; d++) set.add(addDaysToKey(item.date, d))
  }
  return set
}

/* ------------------------------------------------------------------ */
/*  Public entry point                                                 */
/* ------------------------------------------------------------------ */

export const findTurningPoints = (householdDailyScores: DailyHouseholdScore[]): TurningPointInsight[] => {
  const scored: ScoredPoint[] = householdDailyScores
    .filter((d): d is DailyHouseholdScore & { score: number } => d.score !== null)
    .map((d) => ({ date: d.date, score: d.score }))

  const sustained = dedupeByProximity([
    ...detectSustained(scored),
    ...detectDrift(scored),
  ])
  const spikes = detectSpikes(scored, coveredDates(sustained))

  return [...sustained, ...spikes].sort((a, b) => a.date.localeCompare(b.date))
}
