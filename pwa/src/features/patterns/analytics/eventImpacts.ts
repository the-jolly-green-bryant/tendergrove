/**
 * Event impacts: how each life event (School, Therapy, …) lines up with a
 * person's well-being. We correlate the event's daily presence (1/0, only on
 * days that had a check-in) with that day's well-being score.
 *
 *   negative correlation → the event tends to fall on HARDER days
 *   positive correlation → it tends to fall on BETTER days
 *
 * This is correlation, never causation. Event labels live in the LifeEvent
 * pool, so callers map `eventId` → label for display.
 */

import { isoToDateKey } from './dateUtils'
import { pearson } from './relationships'
import type {
  AnalyticsPerson,
  Confidence,
  DailyPersonScore,
  EventImpact,
} from './types'

/** Fewest measurable days (with a check-in) before we trust a correlation. */
export const MIN_EVENT_SAMPLE = 6

/** Only surface events at least this strongly related to well-being. */
export const MIN_ABS_EVENT_CORRELATION = 0.35

const CONFIDENCE_BANDS = { high: 0.55, moderate: 0.4 } as const

type Pairs = Map<string, Array<[number, number]>>

const confidenceFromR = (r: number): Confidence => {
  const abs = Math.abs(r)
  if (abs >= CONFIDENCE_BANDS.high) return 'high'
  if (abs >= CONFIDENCE_BANDS.moderate) return 'moderate'
  return 'low'
}

const pairsForPerson = (person: AnalyticsPerson, scores: DailyPersonScore[]): Pairs => {
  const scoreByDate = new Map<string, number>()
  for (const day of scores) {
    if (day.score !== null && day.checkInCount > 0) scoreByDate.set(day.date, day.score)
  }

  const measurableDays: string[] = []
  const eventDays = new Map<string, Set<string>>()
  for (const checkIn of person.checkIns) {
    const day = isoToDateKey(checkIn.occurredAt)
    if (!scoreByDate.has(day)) continue
    measurableDays.push(day)
    for (const eventId of checkIn.eventIds) {
      if (!eventDays.has(eventId)) eventDays.set(eventId, new Set())
      eventDays.get(eventId)!.add(day)
    }
  }

  const pairs: Pairs = new Map()
  for (const [eventId, present] of eventDays) {
    pairs.set(
      eventId,
      measurableDays.map((day) => [present.has(day) ? 1 : 0, scoreByDate.get(day)!]),
    )
  }
  return pairs
}

const mergePairs = (sets: Pairs[]): Pairs => {
  const merged: Pairs = new Map()
  for (const set of sets) {
    for (const [eventId, samples] of set) {
      merged.set(eventId, [...(merged.get(eventId) ?? []), ...samples])
    }
  }
  return merged
}

const impactsFromPairs = (byEvent: Pairs): EventImpact[] => {
  const impacts: EventImpact[] = []
  for (const [eventId, samples] of byEvent) {
    if (samples.length < MIN_EVENT_SAMPLE) continue
    const r = pearson(samples)
    if (r === null || Math.abs(r) < MIN_ABS_EVENT_CORRELATION) continue
    impacts.push({
      eventId,
      correlation: Math.round(r * 100) / 100,
      confidence: confidenceFromR(r),
      sampleSize: samples.length,
    })
  }
  // Most negative (hardest-day) first; ties broken by more supporting days.
  return impacts.sort(
    (a, b) => a.correlation - b.correlation || b.sampleSize - a.sampleSize,
  )
}

export const buildEventImpacts = (
  people: AnalyticsPerson[],
  personDailyScores: Record<string, DailyPersonScore[]>,
): { household: EventImpact[]; perPerson: Record<string, EventImpact[]> } => {
  const perPersonPairs = people.map(
    (p) => [p.id, pairsForPerson(p, personDailyScores[p.id] ?? [])] as const,
  )
  const perPerson: Record<string, EventImpact[]> = {}
  for (const [id, pairs] of perPersonPairs) {
    perPerson[id] = impactsFromPairs(pairs)
  }
  const household = impactsFromPairs(
    mergePairs(perPersonPairs.map(([, pairs]) => pairs)),
  )
  return { household, perPerson }
}
