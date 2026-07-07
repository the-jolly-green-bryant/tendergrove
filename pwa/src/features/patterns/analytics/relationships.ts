/**
 * Relationships: how two people's distress trends move relative to each other.
 *
 * We correlate each pair of people's daily distress series (Pearson) at lag 0
 * (same day) and lag 1 (one person a day ahead of the other). This can surface
 * gentle observations like "when your fatigue rises, Child A's distress tends
 * to rise within a day".
 *
 * Wording is chosen with great care: these are patterns that "appear related"
 * or "seem to coincide". No one is ever framed as the cause of another's hard
 * day.
 */

import type {
  AnalyticsPersonRef,
  Confidence,
  DailyPersonScore,
  RelationshipChartPoint,
  RelationshipInsight,
} from './types'

/* ------------------------------------------------------------------ */
/*  Conservative thresholds                                            */
/* ------------------------------------------------------------------ */

/** Need this many overlapping scored day-pairs before trusting a correlation. */
export const MIN_PAIRS = 6

/**
 * Each series needs at least this much spread (standard deviation, in distress
 * points) before we trust a correlation. A nearly-flat line has no real trend
 * to relate to another, and correlating one against noise produces spurious,
 * unhelpful links. This guard keeps us honest with quiet data.
 */
export const MIN_VARIATION_SD = 6

/** |r| bands for confidence; anything below moderate is dropped. */
export const CORRELATION_BANDS = { high: 0.6, moderate: 0.4 } as const

/** Cap on surfaced relationships, strongest first. */
export const MAX_RELATIONSHIPS = 8

/* ------------------------------------------------------------------ */
/*  Math                                                               */
/* ------------------------------------------------------------------ */

/** Pearson correlation of paired samples, or `null` with too few / no variance. */
export function pearson(pairs: Array<[number, number]>): number | null {
  const n = pairs.length
  if (n < 2) return null

  let sumA = 0
  let sumB = 0
  for (const [a, b] of pairs) {
    sumA += a
    sumB += b
  }
  const meanA = sumA / n
  const meanB = sumB / n

  let cov = 0
  let varA = 0
  let varB = 0
  for (const [a, b] of pairs) {
    const da = a - meanA
    const db = b - meanB
    cov += da * db
    varA += da * da
    varB += db * db
  }

  // No variance in one series → correlation is undefined (a flat line has no trend).
  if (varA === 0 || varB === 0) return null
  return cov / Math.sqrt(varA * varB)
}

/** Population standard deviation of a sample. */
function stdev(values: number[]): number {
  if (values.length === 0) return 0
  const m = values.reduce((sum, v) => sum + v, 0) / values.length
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/** True when both columns of the paired samples vary enough to be meaningful. */
function hasEnoughVariation(pairs: Array<[number, number]>): boolean {
  return (
    stdev(pairs.map((p) => p[0])) >= MIN_VARIATION_SD &&
    stdev(pairs.map((p) => p[1])) >= MIN_VARIATION_SD
  )
}

function confidenceFromR(r: number): Confidence | null {
  const abs = Math.abs(r)
  if (abs >= CORRELATION_BANDS.high) return 'high'
  if (abs >= CORRELATION_BANDS.moderate) return 'moderate'
  return null
}

/* ------------------------------------------------------------------ */
/*  Pairing                                                            */
/* ------------------------------------------------------------------ */

/**
 * Build aligned score pairs for "B lagged by `lag` days behind A": pair A[i]
 * with B[i + lag], keeping only pairs where both scores exist.
 */
function alignedPairs(
  a: DailyPersonScore[],
  b: DailyPersonScore[],
  lag: number,
): Array<[number, number]> {
  const pairs: Array<[number, number]> = []
  for (let i = 0; i + lag < a.length; i++) {
    const aScore = a[i].score
    const bScore = b[i + lag].score
    if (aScore !== null && bScore !== null) pairs.push([aScore, bScore])
  }
  return pairs
}

/** Two raw series aligned by day index for side-by-side charting. */
function buildChartData(
  a: DailyPersonScore[],
  b: DailyPersonScore[],
): RelationshipChartPoint[] {
  return a.map((day, index) => ({
    date: day.date,
    aScore: day.score,
    bScore: b[index]?.score ?? null,
  }))
}

interface Candidate {
  personA: AnalyticsPersonRef
  personB: AnalyticsPersonRef
  seriesA: DailyPersonScore[]
  seriesB: DailyPersonScore[]
  lagDays: 0 | 1
  correlation: number
  confidence: Confidence
}

/** Gentle, non-blaming summary for a relationship. */
function buildSummary(c: Candidate): string {
  const a = c.personA.displayName
  const b = c.personB.displayName
  const positive = c.correlation > 0

  if (c.lagDays === 0) {
    return positive
      ? `${a} and ${b} often seem to have harder days around the same time. Their patterns appear related.`
      : `${a} and ${b}'s harder days often seem to fall on different days — their patterns seem to move in opposite directions.`
  }

  // lag 1: A leads B by a day.
  return positive
    ? `When ${a}'s distress rises, ${b}'s distress tends to rise within a day. These appear related — worth watching, gently.`
    : `When ${a} has a harder day, ${b} often seems a little steadier the next day. Their patterns seem to move in opposite directions.`
}

/** One direction/lag we try when relating two people. */
interface Attempt {
  lag: 0 | 1
  lead: AnalyticsPersonRef
  follow: AnalyticsPersonRef
  leadSeries: DailyPersonScore[]
  followSeries: DailyPersonScore[]
}

/**
 * The directions to test for a pair: same day, then each person leading the
 * other by a day. (Same-day is symmetric, so it's only tried once.)
 */
function buildAttempts(
  personA: AnalyticsPersonRef,
  personB: AnalyticsPersonRef,
  seriesA: DailyPersonScore[],
  seriesB: DailyPersonScore[],
): Attempt[] {
  return [
    {
      lag: 0,
      lead: personA,
      follow: personB,
      leadSeries: seriesA,
      followSeries: seriesB,
    },
    {
      lag: 1,
      lead: personA,
      follow: personB,
      leadSeries: seriesA,
      followSeries: seriesB,
    },
    {
      lag: 1,
      lead: personB,
      follow: personA,
      leadSeries: seriesB,
      followSeries: seriesA,
    },
  ]
}

/** Score one attempt, returning a candidate only if it clears every gate. */
function evaluateAttempt(attempt: Attempt): Candidate | null {
  const pairs = alignedPairs(attempt.leadSeries, attempt.followSeries, attempt.lag)
  if (pairs.length < MIN_PAIRS || !hasEnoughVariation(pairs)) return null

  const r = pearson(pairs)
  if (r === null) return null

  const confidence = confidenceFromR(r)
  if (confidence === null) return null

  return {
    personA: attempt.lead,
    personB: attempt.follow,
    seriesA: attempt.leadSeries,
    seriesB: attempt.followSeries,
    lagDays: attempt.lag,
    correlation: r,
    confidence,
  }
}

/** The strongest (largest |r|) candidate among a pair's attempts, if any. */
function strongestCandidate(attempts: Attempt[]): Candidate | null {
  let best: Candidate | null = null
  for (const attempt of attempts) {
    const candidate = evaluateAttempt(attempt)
    if (
      candidate &&
      (best === null || Math.abs(candidate.correlation) > Math.abs(best.correlation))
    ) {
      best = candidate
    }
  }
  return best
}

/** Convert a winning candidate into the surfaced insight shape. */
function candidateToInsight(best: Candidate): RelationshipInsight {
  return {
    personAId: best.personA.id,
    personAName: best.personA.displayName,
    personBId: best.personB.id,
    personBName: best.personB.displayName,
    metric: 'distress',
    lagDays: best.lagDays,
    correlation: Math.round(best.correlation * 100) / 100,
    confidence: best.confidence,
    summary: buildSummary(best),
    chartData: buildChartData(best.seriesA, best.seriesB),
  }
}

/* ------------------------------------------------------------------ */
/*  Public entry point                                                 */
/* ------------------------------------------------------------------ */

/**
 * Find relationships between people's distress trends.
 *
 * For every unordered pair we test lag 0 (same day) and lag 1 in both
 * directions (A leads B, B leads A), then keep the single strongest result that
 * clears the confidence bar. This avoids flooding the caregiver with every
 * variation of the same relationship.
 */
export function findRelationships(
  people: AnalyticsPersonRef[],
  personDailyScores: Record<string, DailyPersonScore[]>,
): RelationshipInsight[] {
  const results: RelationshipInsight[] = []

  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const seriesA = personDailyScores[people[i].id] ?? []
      const seriesB = personDailyScores[people[j].id] ?? []
      if (seriesA.length === 0 || seriesB.length === 0) continue

      const attempts = buildAttempts(people[i], people[j], seriesA, seriesB)
      const best = strongestCandidate(attempts)
      if (best !== null) results.push(candidateToInsight(best))
    }
  }

  results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
  return results.slice(0, MAX_RELATIONSHIPS)
}
