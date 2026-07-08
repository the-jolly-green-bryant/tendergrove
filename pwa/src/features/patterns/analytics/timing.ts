/**
 * Timing analytics: *when* things tend to happen, plus signed indicator↔
 * well-being relationships.
 *
 *  - Day of week: derived from daily well-being scores (fully supported by
 *    check-ins). "Which weekdays tend to be harder?"
 *  - Time of day: derived ONLY from incident clock-times, because check-ins are
 *    logged at the day level (stamped noon) and carry no meaningful hour. When
 *    there aren't enough incidents this is simply empty.
 *  - Heatmap: per indicator × weekday, the chance the indicator occurred.
 *  - Indicator correlations: how each indicator's presence lines up with the
 *    day's overall well-being (a signed, transparent Pearson correlation).
 *
 * Everything is correlation, never causation.
 */

import { dateKeyToDate, isoToDateKey } from './dateUtils'
import { pearson } from './relationships'
import type {
  AnalyticsPerson,
  Confidence,
  DailyPersonScore,
  DayOfWeekBucket,
  HeatmapCell,
  IndicatorOutcomeCorrelation,
  TimeOfDayBucket,
  TimingAnalysis,
} from './types'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** A day scores as "challenging" below this and "positive" at/above POSITIVE_MIN. */
export const CHALLENGING_BELOW = 50
export const POSITIVE_MIN = 70

/** Fewest incidents before the time-of-day view is worth showing. */
export const MIN_INCIDENTS_FOR_TIME = 5

/** Fewest aligned days before an indicator↔outcome correlation is trusted. */
export const MIN_CORRELATION_SAMPLE = 6

/** Only surface indicator correlations at least this strong. */
export const MIN_ABS_CORRELATION = 0.35

const CORRELATION_BANDS = { high: 0.6, moderate: 0.45 } as const

/** Cap on surfaced indicator↔outcome correlations. */
export const MAX_INDICATOR_CORRELATIONS = 12

interface ScoredDay {
  date: string
  score: number | null
}

/* ------------------------------------------------------------------ */
/*  Day of week                                                        */
/* ------------------------------------------------------------------ */

/** Per-weekday likelihood of a challenging / positive day, from daily scores. */
export function buildDayOfWeek(scores: ScoredDay[]): DayOfWeekBucket[] {
  const challenging = new Array(7).fill(0)
  const positive = new Array(7).fill(0)
  const sample = new Array(7).fill(0)

  for (const day of scores) {
    if (day.score === null) continue
    const weekday = dateKeyToDate(day.date).getDay()
    sample[weekday]++
    if (day.score < CHALLENGING_BELOW) challenging[weekday]++
    if (day.score >= POSITIVE_MIN) positive[weekday]++
  }

  return WEEKDAY_LABELS.map((label, weekday) => ({
    weekday,
    label,
    challengingRate:
      sample[weekday] === 0 ? null : (challenging[weekday] / sample[weekday]) * 100,
    positiveRate:
      sample[weekday] === 0 ? null : (positive[weekday] / sample[weekday]) * 100,
    sampleSize: sample[weekday],
  }))
}

/* ------------------------------------------------------------------ */
/*  Time of day (incidents only)                                       */
/* ------------------------------------------------------------------ */

/** Distribution of incidents across the 24 hours of the day. */
export function buildTimeOfDay(incidents: { occurredAt: string }[]): {
  buckets: TimeOfDayBucket[]
  total: number
} {
  const counts = new Array(24).fill(0)
  for (const incident of incidents) {
    counts[new Date(incident.occurredAt).getHours()]++
  }
  const total = incidents.length
  const buckets = counts.map((count, hour) => ({
    hour,
    count,
    percentage: total === 0 ? 0 : (count / total) * 100,
  }))
  return { buckets, total }
}

/* ------------------------------------------------------------------ */
/*  Per-person indicator day maps                                      */
/* ------------------------------------------------------------------ */

interface IndicatorDays {
  /** Local day keys on which the person checked in at all. */
  checkInDays: Set<string>
  /** For each active indicator id, the day keys on which it occurred. */
  byIndicator: Map<string, Set<string>>
}

function activeIndicators(person: AnalyticsPerson): AnalyticsPerson['indicators'] {
  return person.indicators.filter((i) => i.active !== false && i.polarity !== null)
}

function collectIndicatorDays(person: AnalyticsPerson): IndicatorDays {
  const checkInDays = new Set<string>()
  const byIndicator = new Map<string, Set<string>>()
  for (const indicator of activeIndicators(person)) {
    byIndicator.set(indicator.id, new Set())
  }
  for (const checkIn of person.checkIns) {
    const day = isoToDateKey(checkIn.occurredAt)
    checkInDays.add(day)
    for (const id of checkIn.checkedIndicatorIds) {
      byIndicator.get(id)?.add(day)
    }
  }
  return { checkInDays, byIndicator }
}

/* ------------------------------------------------------------------ */
/*  Heatmap                                                            */
/* ------------------------------------------------------------------ */

function buildPersonHeatmap(
  person: AnalyticsPerson,
  days: IndicatorDays,
): HeatmapCell[] {
  const checkInsByWeekday = new Array(7).fill(0)
  for (const day of days.checkInDays) {
    checkInsByWeekday[dateKeyToDate(day).getDay()]++
  }

  const cells: HeatmapCell[] = []
  for (const indicator of activeIndicators(person)) {
    const firedByWeekday = new Array(7).fill(0)
    for (const day of days.byIndicator.get(indicator.id) ?? []) {
      firedByWeekday[dateKeyToDate(day).getDay()]++
    }
    for (let weekday = 0; weekday < 7; weekday++) {
      const denom = checkInsByWeekday[weekday]
      cells.push({
        indicatorId: indicator.id,
        label: indicator.name,
        personName: person.displayName,
        polarity: indicator.polarity!,
        weekday,
        probability: denom === 0 ? null : (firedByWeekday[weekday] / denom) * 100,
        sampleSize: denom,
      })
    }
  }
  return cells
}

/* ------------------------------------------------------------------ */
/*  Indicator ↔ well-being correlations                                */
/* ------------------------------------------------------------------ */

function confidenceFromR(r: number): Confidence {
  const abs = Math.abs(r)
  if (abs >= CORRELATION_BANDS.high) return 'high'
  if (abs >= CORRELATION_BANDS.moderate) return 'moderate'
  return 'low'
}

function correlationSummary(
  label: string,
  personName: string,
  correlation: number,
): string {
  const direction = correlation > 0 ? 'better' : 'harder'
  const nudge =
    correlation > 0 ? 'a habit worth encouraging' : 'something worth gently watching'
  return `${label} (${personName}) tends to appear on ${direction} days. These appear related — ${nudge}.`
}

function buildPersonIndicatorCorrelations(
  person: AnalyticsPerson,
  scores: DailyPersonScore[],
  days: IndicatorDays,
): IndicatorOutcomeCorrelation[] {
  const scoredDays = scores.filter((d) => d.score !== null && d.checkInCount > 0)
  const results: IndicatorOutcomeCorrelation[] = []

  for (const indicator of activeIndicators(person)) {
    const fired = days.byIndicator.get(indicator.id) ?? new Set<string>()
    const pairs = scoredDays.map((d): [number, number] => [
      fired.has(d.date) ? 1 : 0,
      d.score as number,
    ])
    if (pairs.length < MIN_CORRELATION_SAMPLE) continue

    const r = pearson(pairs)
    if (r === null || Math.abs(r) < MIN_ABS_CORRELATION) continue

    results.push({
      indicatorId: indicator.id,
      label: indicator.name,
      personName: person.displayName,
      polarity: indicator.polarity!,
      correlation: Math.round(r * 100) / 100,
      confidence: confidenceFromR(r),
      sampleSize: pairs.length,
      summary: correlationSummary(indicator.name, person.displayName, r),
    })
  }
  return results
}

/* ------------------------------------------------------------------ */
/*  Orchestration                                                      */
/* ------------------------------------------------------------------ */

function buildPersonTiming(
  person: AnalyticsPerson,
  scores: DailyPersonScore[],
): TimingAnalysis {
  const days = collectIndicatorDays(person)
  const { buckets, total } = buildTimeOfDay(person.incidents)
  return {
    dayOfWeek: buildDayOfWeek(scores),
    timeOfDay: buckets,
    totalIncidents: total,
    heatmap: buildPersonHeatmap(person, days),
    indicatorCorrelations: buildPersonIndicatorCorrelations(person, scores, days),
  }
}

/**
 * Build timing analytics for the whole household and for each person. The
 * household heatmap and correlations are the union of every person's (each row
 * carries the person's name); household day-of-week and time-of-day aggregate
 * across everyone.
 */
export function buildTiming(
  people: AnalyticsPerson[],
  personDailyScores: Record<string, DailyPersonScore[]>,
  householdDailyScores: ScoredDay[],
): { household: TimingAnalysis; perPerson: Record<string, TimingAnalysis> } {
  const perPerson: Record<string, TimingAnalysis> = {}
  for (const person of people) {
    perPerson[person.id] = buildPersonTiming(person, personDailyScores[person.id] ?? [])
  }

  const allIncidents = people.flatMap((p) => p.incidents)
  const { buckets, total } = buildTimeOfDay(allIncidents)
  const heatmap = people.flatMap((p) => perPerson[p.id].heatmap)
  const indicatorCorrelations = people
    .flatMap((p) => perPerson[p.id].indicatorCorrelations)
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    .slice(0, MAX_INDICATOR_CORRELATIONS)

  return {
    household: {
      dayOfWeek: buildDayOfWeek(householdDailyScores),
      timeOfDay: buckets,
      totalIncidents: total,
      heatmap,
      indicatorCorrelations,
    },
    perPerson,
  }
}
