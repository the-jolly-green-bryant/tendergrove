/**
 * Correlations: which tracked signals tend to appear near each other.
 *
 * We measure a simple, transparent conditional frequency:
 *
 *   "On days when the SOURCE happened, how often did the TARGET happen
 *    within `lagDays`?"   ratio = occurrences / opportunities
 *
 * This is NOT causation and we never present it as such. The copy always uses
 * "appears", "often occurs near", "seems to coincide". Thresholds are
 * deliberately conservative so we don't surface coincidences from tiny data.
 */

import { addDaysToKey, isoToDateKey } from './dateUtils'
import type { AnalyticsPerson, Confidence, CorrelationInsight, DateKey } from './types'

/* ------------------------------------------------------------------ */
/*  Conservative thresholds (documented — tune here, not inline)       */
/* ------------------------------------------------------------------ */

/** A source must have happened at least this many times to be considered. */
export const MIN_OPPORTUNITIES = 4

/** The target must have followed at least this many times. */
export const MIN_OCCURRENCES = 3

/** Below this hit ratio we treat the link as noise and drop it. */
export const MIN_RATIO = 0.5

/** Ratios at/above these are labelled with the matching confidence. */
export const CONFIDENCE_RATIO = { high: 0.7, moderate: 0.5 } as const

/** Cap on how many correlations we surface, strongest first. */
export const MAX_CORRELATIONS = 12

/* ------------------------------------------------------------------ */
/*  Signals                                                            */
/* ------------------------------------------------------------------ */

type SignalKind = 'undesired' | 'desired' | 'incident'

/** A time series of "this thing happened on these days" for one person. */
interface Signal {
  key: string
  label: string
  personId: string
  personName: string
  kind: SignalKind
  /** Days on which the signal fired. */
  days: Set<DateKey>
}

const signalsForPerson = (person: AnalyticsPerson): Signal[] => {
  const signals: Signal[] = []

  const activeIndicators = person.indicators.filter(
    (i) => i.active !== false && i.polarity !== null,
  )

  // Precompute the set of days each indicator was checked.
  const daysByIndicator = new Map<string, Set<DateKey>>()
  for (const indicator of activeIndicators) {
    daysByIndicator.set(indicator.id, new Set())
  }
  for (const checkIn of person.checkIns) {
    const dateKey = isoToDateKey(checkIn.occurredAt)
    for (const id of checkIn.checkedIndicatorIds) {
      daysByIndicator.get(id)?.add(dateKey)
    }
  }

  for (const indicator of activeIndicators) {
    const days = daysByIndicator.get(indicator.id)!
    if (days.size === 0) continue
    signals.push({
      key: `ind:${indicator.id}`,
      label: indicator.name,
      personId: person.id,
      personName: person.displayName,
      kind: indicator.polarity === 'desired' ? 'desired' : 'undesired',
      days,
    })
  }

  const incidentDays = new Set<DateKey>()
  for (const incident of person.incidents) {
    incidentDays.add(isoToDateKey(incident.occurredAt))
  }
  if (incidentDays.size > 0) {
    signals.push({
      key: `inc:${person.id}`,
      label: 'incidents',
      personId: person.id,
      personName: person.displayName,
      kind: 'incident',
      days: incidentDays,
    })
  }

  return signals
}

/* ------------------------------------------------------------------ */
/*  Pair scoring                                                       */
/* ------------------------------------------------------------------ */

const confidenceFromRatio = (ratio: number, opportunities: number): Confidence => {
  if (ratio >= CONFIDENCE_RATIO.high && opportunities >= MIN_OPPORTUNITIES + 1) {
    return 'high'
  }
  if (ratio >= CONFIDENCE_RATIO.moderate) return 'moderate'
  return 'low'
}

const scorePair = (
  source: Signal,
  target: Signal,
  lag: 0 | 1,
): { opportunities: number; occurrences: number } => {
  let occurrences = 0
  for (const day of source.days) {
    const targetDay = lag === 0 ? day : addDaysToKey(day, lag)
    if (target.days.has(targetDay)) occurrences++
  }
  return { opportunities: source.days.size, occurrences }
}

const buildSummary = (
  source: Signal,
  target: Signal,
  insight: CorrelationInsight,
): string => {
  const src = phraseFor(source)
  const tgt = phraseFor(target)
  const timing =
    insight.lagDays === 0
      ? 'often appears alongside'
      : 'often appears about a day before'
  return `${capitalize(src)} ${timing} ${tgt} — happened ${insight.occurrences} of the last ${insight.opportunities} times. This appears related; it may be worth watching.`
}

/** Turn a signal into a readable phrase including the person when helpful. */
const phraseFor = (signal: Signal): string =>
  signal.kind === 'incident'
    ? `${signal.personName}'s incidents`
    : `${signal.label} (${signal.personName})`

const capitalize = (text: string): string =>
  text.length === 0 ? text : text[0].toUpperCase() + text.slice(1)

/* ------------------------------------------------------------------ */
/*  Public entry point                                                 */
/* ------------------------------------------------------------------ */

const evaluatePair = (
  source: Signal,
  target: Signal,
  lag: 0 | 1,
): CorrelationInsight | null => {
  if (source.key === target.key) return null
  if (lag === 0 && source.key >= target.key) return null

  const { opportunities, occurrences } = scorePair(source, target, lag)
  if (opportunities < MIN_OPPORTUNITIES || occurrences < MIN_OCCURRENCES) return null

  const ratio = occurrences / opportunities
  if (ratio < MIN_RATIO) return null

  const insight: CorrelationInsight = {
    sourceLabel: source.label,
    sourcePersonId: source.personId,
    sourcePersonName: source.personName,
    targetLabel: target.label,
    targetPersonId: target.personId,
    targetPersonName: target.personName,
    lagDays: lag,
    occurrences,
    opportunities,
    ratio,
    confidence: confidenceFromRatio(ratio, opportunities),
    summary: '',
  }
  insight.summary = buildSummary(source, target, insight)
  return insight
}

export const findCorrelations = (people: AnalyticsPerson[]): CorrelationInsight[] => {
  const signals = people.flatMap(signalsForPerson)
  const results: CorrelationInsight[] = []

  for (const source of signals) {
    for (const target of signals) {
      for (const lag of [0, 1] as const) {
        const insight = evaluatePair(source, target, lag)
        if (insight) results.push(insight)
      }
    }
  }

  // Strongest first: higher ratio, then more supporting occurrences.
  results.sort((a, b) => b.ratio - a.ratio || b.occurrences - a.occurrences)
  return results.slice(0, MAX_CORRELATIONS)
}
