/**
 * Turning points: meaningful, sustained shifts in household distress.
 *
 * The method is deliberately simple and explainable — no change-point models.
 * For each candidate day we compare the rolling average of the days just BEFORE
 * it to the rolling average of the days from it onward. A large enough,
 * sustained gap is a turning point. Tiny wobble is ignored, and a change must
 * persist for several days to count (so a single loud day doesn't masquerade as
 * a lasting shift — that is reported separately as a "spike").
 */

import { daysBetween, mean, safeRound } from './dateUtils'
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

/** A single day this far above BOTH neighbours (and high) reads as a spike. */
export const SPIKE_DELTA = 22

/** Distress at/above this counts as "elevated" (used for spike / recovery). */
export const ELEVATED = 61

/** |delta| → severity bands. */
const SEVERITY_BANDS = { high: 30, moderate: 20 } as const

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface ScoredPoint {
  date: DateKey
  score: number
}

function severityFromDelta(delta: number): Confidence {
  const abs = Math.abs(delta)
  if (abs >= SEVERITY_BANDS.high) return 'high'
  if (abs >= SEVERITY_BANDS.moderate) return 'moderate'
  return 'low'
}

/**
 * How many days the new level persists from `startIndex`, counting only while
 * scores stay on the new side of the midpoint between before and after.
 * Returns both the calendar-day span and whether it ran to the end of the data.
 */
function measurePersistence(
  scored: ScoredPoint[],
  startIndex: number,
  before: number,
  after: number,
): { durationDays: number; reachedEnd: boolean } {
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

function classifySustained(before: number, delta: number): TurningPointType {
  if (delta > 0) return 'sustainedIncrease'
  // A decrease from an elevated level is a recovery; otherwise a plain decrease.
  return before >= ELEVATED ? 'recovery' : 'sustainedDecrease'
}

/** Pluralize "day"/"days" for a count. */
function days(count: number): string {
  return `${count} day${count === 1 ? '' : 's'}`
}

function buildSustainedSummary(
  type: TurningPointType,
  before: number,
  after: number,
  durationDays: number,
  reachedEnd: boolean,
): string {
  const tail = reachedEnd
    ? `and has stayed there for ${days(durationDays)}`
    : `for about ${days(durationDays)}`
  if (type === 'sustainedIncrease') {
    return `Distress rose from around ${before} to ${after} ${tail}. Worth watching.`
  }
  if (type === 'recovery') {
    return `Distress eased from around ${before} to ${after} ${tail}. A hopeful change.`
  }
  return `Distress drifted down from around ${before} to ${after} ${tail}.`
}

/* ------------------------------------------------------------------ */
/*  Detection                                                          */
/* ------------------------------------------------------------------ */

/** Detect sustained increases/decreases via before/after rolling averages. */
function detectSustained(scored: ScoredPoint[]): TurningPointInsight[] {
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

/** Detect one-day spikes that jump above both neighbours and return. */
function detectSpikes(
  scored: ScoredPoint[],
  covered: Set<DateKey>,
): TurningPointInsight[] {
  const spikes: TurningPointInsight[] = []
  for (let m = 1; m < scored.length - 1; m++) {
    const day = scored[m]
    if (covered.has(day.date)) continue
    const prev = scored[m - 1].score
    const next = scored[m + 1].score
    const jump = day.score - Math.max(prev, next)
    if (jump >= SPIKE_DELTA && day.score >= ELEVATED) {
      const baseline = safeRound((prev + next) / 2)
      spikes.push({
        date: day.date,
        type: 'spike',
        beforeAverage: baseline,
        afterAverage: day.score,
        durationDays: 1,
        severity: severityFromDelta(jump),
        summary: `Distress spiked to ${day.score} for a day (unusually high) and returned toward its usual level. A rough day rather than a lasting shift.`,
      })
    }
  }
  return spikes
}

/* ------------------------------------------------------------------ */
/*  Public entry point                                                 */
/* ------------------------------------------------------------------ */

/**
 * Find turning points in the household distress series. Returns them in
 * chronological order. Sustained shifts take priority; spikes are only reported
 * for days not already inside a sustained change.
 */
export function findTurningPoints(
  householdDailyScores: DailyHouseholdScore[],
): TurningPointInsight[] {
  const scored: ScoredPoint[] = householdDailyScores
    .filter((d): d is DailyHouseholdScore & { score: number } => d.score !== null)
    .map((d) => ({ date: d.date, score: d.score }))

  const sustained = detectSustained(scored)
  const covered = new Set(sustained.map((s) => s.date))
  const spikes = detectSpikes(scored, covered)

  return [...sustained, ...spikes].sort((a, b) => a.date.localeCompare(b.date))
}
