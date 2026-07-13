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

const formatHour = (hour: number): string => {
  const period = hour < 12 ? 'AM' : 'PM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12} ${period}`
}

const withWho = (text: string, personName: string | null): string =>
  personName ? `${text} for ${personName}` : text

/* ------------------------------------------------------------------ */
/*  Individual insight builders (each returns one insight or null)     */
/* ------------------------------------------------------------------ */

const hardestWeekdayInsight = (
  dayOfWeek: DayOfWeekBucket[],
  personName: string | null,
): GeneratedInsight | null => {
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
      `${WEEKDAY_PLURAL[hardest.weekday]} tend to be the toughest`,
      personName,
    ),
    description: `Building a little breathing room into ${WEEKDAY_PLURAL[hardest.weekday].toLowerCase()} — a lighter schedule, an extra hand — can take the edge off.`,
    priority: 2,
    icon: 'calendar',
    tone: 'watch',
    confidence: hardest.sampleSize >= 4 ? 'high' : 'moderate',
  }
}

const calmestWeekdayInsight = (
  dayOfWeek: DayOfWeekBucket[],
  personName: string | null,
): GeneratedInsight | null => {
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
    title: withWho(
      `${WEEKDAY_PLURAL[best.weekday]} are usually the easiest`,
      personName,
    ),
    description: `Whatever’s working on ${WEEKDAY_PLURAL[best.weekday].toLowerCase()}, it’s worth leaning into — even a small version of it on other days might help.`,
    priority: 5,
    icon: 'sparkle',
    tone: 'positive',
    confidence: best.sampleSize >= 4 ? 'high' : 'moderate',
  }
}

const timeOfDayInsight = (
  timeOfDay: TimeOfDayBucket[],
  totalIncidents: number,
): GeneratedInsight | null => {
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
    title: `The hardest stretch is around ${formatHour(bestStart)}–${formatHour(bestStart + 4)}`,
    description: `That’s when incidents tend to bunch up. A bit of extra support through that window can really take the pressure off.`,
    priority: 3,
    icon: 'moon',
    tone: 'watch',
    confidence: totalIncidents >= 12 ? 'high' : 'moderate',
  }
}

const correlationInsight = (
  correlations: IndicatorOutcomeCorrelation[],
  wantPositive: boolean,
): GeneratedInsight | null => {
  const match = correlations.find(
    (c) =>
      c.confidence !== 'low' && (wantPositive ? c.correlation > 0 : c.correlation < 0),
  )
  if (!match) return null

  return {
    id: `corr-${wantPositive ? 'positive' : 'negative'}-${match.indicatorId}`,
    title: wantPositive
      ? `${match.label} really seems to help`
      : `${match.label} tends to land on the harder days`,
    description: wantPositive
      ? `On days with ${match.label.toLowerCase()}, things tend to go better. Keep it up where you can — it looks like it’s making a difference.`
      : `When ${match.label.toLowerCase()} shows up, the day’s often tougher. It’s just a pattern, not a cause — but worth keeping a gentle eye on.`,
    priority: wantPositive ? 2 : 1,
    icon: wantPositive ? 'leaf' : 'alert',
    tone: wantPositive ? 'positive' : 'watch',
    confidence: match.confidence,
  }
}

const trendInsight = (
  trend: TrendResult,
  personName: string | null,
): GeneratedInsight | null => {
  if (trend.direction === 'improving') {
    return {
      id: 'trend',
      title: withWho('This week has felt a little brighter', personName),
      description:
        'Well-being’s been trending up from last week — a hopeful sign, and worth a quiet moment of credit to yourself.',
      priority: 4,
      icon: 'heart',
      tone: 'positive',
      confidence: trend.confidence,
    }
  }
  if (trend.direction === 'worsening') {
    return {
      id: 'trend',
      title: withWho('This week has been heavier than last', personName),
      description:
        'Things have been trending down. Be gentle with yourself — and notice what tends to help, even the small things.',
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

export const buildGeneratedInsights = (params: {
  timing: TimingAnalysis
  trend: TrendResult
  personName?: string | null
}): GeneratedInsight[] => {
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
