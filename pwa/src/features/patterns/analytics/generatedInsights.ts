/**
 * Generated insights: plain-language conclusions a caregiver can act on, built
 * from the timing analytics and the trend. No graphs — just calm, non-clinical
 * sentences, most actionable first. Everything is correlation, never causation.
 */

import type {
  DayOfWeekBucket,
  GeneratedInsight,
  IndicatorOutcomeCorrelation,
  TimeOfDayBucket,
  TimingAnalysis,
  TrendResult,
} from './types'

const WEEKDAY_PLURAL = [
  'Sundays',
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
]

/** Fewest scored days of a weekday before we'll call it out. */
const MIN_WEEKDAY_SAMPLE = 2

/** A weekday must be at least this challenging/positive to be worth mentioning. */
const NOTABLE_RATE = 40

/** Format an hour (0–23) as a friendly label, e.g. 17 → "5 PM". */
function formatHour(hour: number): string {
  const period = hour < 12 ? 'AM' : 'PM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12} ${period}`
}

function withWho(text: string, personName: string | null): string {
  return personName ? `${text} for ${personName}` : text
}

/* ------------------------------------------------------------------ */
/*  Individual insight builders (each returns one insight or null)     */
/* ------------------------------------------------------------------ */

function hardestWeekdayInsight(
  dayOfWeek: DayOfWeekBucket[],
  personName: string | null,
): GeneratedInsight | null {
  const eligible = dayOfWeek.filter(
    (d) => d.sampleSize >= MIN_WEEKDAY_SAMPLE && d.challengingRate !== null,
  )
  if (eligible.length === 0) return null
  const hardest = eligible.reduce(
    (a, b) => ((b.challengingRate ?? 0) > (a.challengingRate ?? 0) ? b : a),
    eligible[0],
  )
  if ((hardest.challengingRate ?? 0) < NOTABLE_RATE) return null

  return {
    id: 'hardest-weekday',
    title: withWho(
      `${WEEKDAY_PLURAL[hardest.weekday]} tend to be more difficult`,
      personName,
    ),
    description: 'Planning a little extra support ahead of these days may help.',
    priority: 2,
    icon: 'calendar',
    tone: 'watch',
    confidence: hardest.sampleSize >= 4 ? 'high' : 'moderate',
  }
}

function calmestWeekdayInsight(
  dayOfWeek: DayOfWeekBucket[],
  personName: string | null,
): GeneratedInsight | null {
  const eligible = dayOfWeek.filter(
    (d) => d.sampleSize >= MIN_WEEKDAY_SAMPLE && d.positiveRate !== null,
  )
  if (eligible.length === 0) return null
  const best = eligible.reduce(
    (a, b) => ((b.positiveRate ?? 0) > (a.positiveRate ?? 0) ? b : a),
    eligible[0],
  )
  if ((best.positiveRate ?? 0) < 50) return null

  return {
    id: 'calmest-weekday',
    title: withWho(`${WEEKDAY_PLURAL[best.weekday]} tend to be calmer`, personName),
    description: 'Whatever is working on these days may be worth leaning into.',
    priority: 5,
    icon: 'sparkle',
    tone: 'positive',
    confidence: best.sampleSize >= 4 ? 'high' : 'moderate',
  }
}

/** The strongest 4-hour incident window, if incidents cluster. */
function timeOfDayInsight(
  timeOfDay: TimeOfDayBucket[],
  totalIncidents: number,
): GeneratedInsight | null {
  if (totalIncidents < 5) return null
  let bestStart = 0
  let bestShare = 0
  for (let start = 0; start <= 20; start++) {
    const share = timeOfDay
      .slice(start, start + 4)
      .reduce((sum, b) => sum + b.percentage, 0)
    if (share > bestShare) {
      bestShare = share
      bestStart = start
    }
  }
  if (bestShare < 40) return null

  return {
    id: 'time-of-day',
    title: `Incidents cluster around ${formatHour(bestStart)}–${formatHour(bestStart + 4)}`,
    description: 'A little extra support in this window may ease the hardest hours.',
    priority: 3,
    icon: 'moon',
    tone: 'watch',
    confidence: totalIncidents >= 12 ? 'high' : 'moderate',
  }
}

function correlationInsight(
  correlations: IndicatorOutcomeCorrelation[],
  wantPositive: boolean,
): GeneratedInsight | null {
  const match = correlations.find(
    (c) =>
      c.confidence !== 'low' && (wantPositive ? c.correlation > 0 : c.correlation < 0),
  )
  if (!match) return null

  return {
    id: `corr-${wantPositive ? 'positive' : 'negative'}-${match.indicatorId}`,
    title: wantPositive
      ? `${match.label} lines up with better days`
      : `${match.label} often shows up on harder days`,
    description: wantPositive
      ? 'Keep encouraging this — it appears connected with your better days.'
      : 'Worth watching gently; it appears connected with harder days.',
    priority: wantPositive ? 2 : 1,
    icon: wantPositive ? 'leaf' : 'alert',
    tone: wantPositive ? 'positive' : 'watch',
    confidence: match.confidence,
  }
}

function trendInsight(
  trend: TrendResult,
  personName: string | null,
): GeneratedInsight | null {
  if (trend.direction === 'improving') {
    return {
      id: 'trend',
      title: withWho('Things have been looking up this week', personName),
      description: 'Well-being is trending higher than last week. A hopeful sign.',
      priority: 4,
      icon: 'heart',
      tone: 'positive',
      confidence: trend.confidence,
    }
  }
  if (trend.direction === 'worsening') {
    return {
      id: 'trend',
      title: withWho('This week has been harder than last', personName),
      description:
        'Well-being is trending lower. Be gentle with yourself, and watch for what helps.',
      priority: 1,
      icon: 'alert',
      tone: 'watch',
      confidence: trend.confidence,
    }
  }
  return null
}

/* ------------------------------------------------------------------ */
/*  Public entry point                                                 */
/* ------------------------------------------------------------------ */

/**
 * Build the ordered set of generated insights for a scope. `personName` is
 * non-null when scoped to one person, so copy can address them directly.
 */
export function buildGeneratedInsights(params: {
  timing: TimingAnalysis
  trend: TrendResult
  personName?: string | null
}): GeneratedInsight[] {
  const { timing, trend } = params
  const personName = params.personName ?? null

  const candidates: (GeneratedInsight | null)[] = [
    trendInsight(trend, personName),
    correlationInsight(timing.indicatorCorrelations, false),
    correlationInsight(timing.indicatorCorrelations, true),
    hardestWeekdayInsight(timing.dayOfWeek, personName),
    timeOfDayInsight(timing.timeOfDay, timing.totalIncidents),
    calmestWeekdayInsight(timing.dayOfWeek, personName),
  ]

  return candidates
    .filter((c): c is GeneratedInsight => c !== null)
    .sort((a, b) => a.priority - b.priority)
}
