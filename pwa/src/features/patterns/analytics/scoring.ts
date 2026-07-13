/**
 * Daily well-being scoring.
 *
 * These are the foundation every other analytic builds on, so the math is kept
 * deliberately simple, explainable, and deterministic. A caregiver (or a future
 * support person) should be able to read this file and understand exactly why a
 * day scored the way it did.
 *
 * The scale is 0–100 where **higher = better** (this matches the app's existing
 * wellness score in `lib/status.ts`):
 *   - desired indicators that occurred push the score UP
 *   - undesired indicators that occurred pull the score DOWN
 *   - incidents pull the score DOWN (weighted a little heavier — they matter)
 *   - a day with no check-in and no incident has NO score (null), never 0.
 *     Missing data is absence, not a bad day.
 *
 * Internally we compute a "distress" quantity (how much went wrong) and return
 * its inverse, `100 - distress`, as the well-being score. Keeping the internal
 * math in distress terms makes the incident/indicator weighting easy to reason
 * about; the single inversion happens once, at the end of `scorePersonDay`.
 */

import { clamp, isoToDateKey, safeRound } from './dateUtils'
import type {
  AnalyticsIndicator,
  AnalyticsPerson,
  DailyHouseholdScore,
  DailyPersonScore,
  DateKey,
} from './types'

/* ------------------------------------------------------------------ */
/*  Tunable scoring constants (documented so they can be adjusted)     */
/* ------------------------------------------------------------------ */

/**
 * Distress added per incident on a day, on top of any indicator signal.
 * Incidents are concrete, serious events, so they carry real weight.
 */
export const INCIDENT_POINTS = 20

/** Ceiling on the incident contribution so one very rough day can't run away. */
export const INCIDENT_CAP = 55

/**
 * Baseline distress for a day that has incident(s) but no scoreable check-in.
 * A day with an incident should never read as calm, even absent a check-in.
 * With base 35 + 20/incident, one incident ≈ 55 (moderate), two ≈ 75 (high).
 */
export const INCIDENT_ONLY_BASE = 35

/* ------------------------------------------------------------------ */
/*  Per-day, per-person scoring                                        */
/* ------------------------------------------------------------------ */

const scoreableIndicators = (indicators: AnalyticsIndicator[]): AnalyticsIndicator[] => {
  return indicators.filter((i) => i.active !== false && i.polarity !== null)
}

const indicatorDistress = (indicators: AnalyticsIndicator[], checkedIds: Set<string>): number | null => {
  const active = scoreableIndicators(indicators)
  if (active.length === 0) return null

  let good = 0
  for (const indicator of active) {
    const occurred = checkedIds.has(indicator.id)
    const desired = indicator.polarity === 'desired'
    if ((desired && occurred) || (!desired && !occurred)) good++
  }

  const wellness = (good / active.length) * 100
  return 100 - wellness
}

export const scorePersonDay = (person: AnalyticsPerson, date: DateKey): DailyPersonScore => {
  const dayCheckIns = person.checkIns.filter((c) => isoToDateKey(c.occurredAt) === date)
  const dayIncidents = person.incidents.filter(
    (e) => isoToDateKey(e.occurredAt) === date,
  )

  const checkedIds = new Set<string>()
  for (const checkIn of dayCheckIns) {
    for (const id of checkIn.checkedIndicatorIds) checkedIds.add(id)
  }

  const active = scoreableIndicators(person.indicators)
  const activeIds = new Set(active.map((i) => i.id))
  const desiredIds = new Set(
    active.filter((i) => i.polarity === 'desired').map((i) => i.id),
  )

  let positiveCount = 0
  let negativeCount = 0
  for (const id of checkedIds) {
    if (!activeIds.has(id)) continue // ignore checks for archived/removed indicators
    if (desiredIds.has(id)) positiveCount++
    else negativeCount++
  }

  const hasData = dayCheckIns.length > 0 || dayIncidents.length > 0
  const incidentDistress = Math.min(dayIncidents.length * INCIDENT_POINTS, INCIDENT_CAP)
  const fromIndicators =
    dayCheckIns.length > 0 ? indicatorDistress(person.indicators, checkedIds) : null

  // Compute distress (how much went wrong) internally, then invert to well-being.
  let distress: number | null
  if (fromIndicators !== null) {
    // Indicator signal exists; incidents push distress further up (bounded).
    distress = safeRound(clamp(fromIndicators + incidentDistress, 0, 100))
  } else if (dayIncidents.length > 0) {
    // Incident(s) but no scoreable check-in: anchor to a meaningful baseline.
    distress = safeRound(clamp(INCIDENT_ONLY_BASE + incidentDistress, 0, 100))
  } else {
    // Either no data at all, or a check-in with no scoreable indicators.
    distress = null
  }

  // Higher = better. A day with no data stays null (never 0).
  const score = distress === null ? null : 100 - distress

  const eventIds = new Set<string>()

  for (const checkIn of dayCheckIns) {
    for (const id of checkIn.eventIds) {
      eventIds.add(id)
    }
  }

  return {
    personId: person.id,
    date,
    score,
    checkInCount: dayCheckIns.length,
    incidentCount: dayIncidents.length,
    eventCount: eventIds.size,
    positiveCount,
    negativeCount,
    hasData,
  }
}

export const scorePersonWindow = (person: AnalyticsPerson, window: DateKey[]): DailyPersonScore[] => {
  return window.map((date) => scorePersonDay(person, date))
}

/* ------------------------------------------------------------------ */
/*  Household aggregation                                              */
/* ------------------------------------------------------------------ */

export const aggregateHouseholdDay = (date: DateKey, personScores: DailyPersonScore[]): DailyHouseholdScore => {
  const scored = personScores.filter((p) => p.score !== null)

  const checkInCount = personScores.reduce((sum, p) => sum + p.checkInCount, 0)
  const incidentCount = personScores.reduce((sum, p) => sum + p.incidentCount, 0)
  const positiveCount = personScores.reduce((sum, p) => sum + p.positiveCount, 0)
  const negativeCount = personScores.reduce((sum, p) => sum + p.negativeCount, 0)

  const score =
    scored.length === 0
      ? null
      : safeRound(scored.reduce((sum, p) => sum + (p.score ?? 0), 0) / scored.length)

  const eventCount = personScores.reduce((sum, person) => sum + person.eventCount, 0)

  return {
    date,
    score,
    contributingPeople: scored.length,
    checkInCount,
    incidentCount,
    eventCount,
    positiveCount,
    negativeCount,
  }
}

export const buildDailyScores = (people: AnalyticsPerson[], window: DateKey[]): {
  personDailyScores: Record<string, DailyPersonScore[]>
  householdDailyScores: DailyHouseholdScore[]
} => {
  const personDailyScores: Record<string, DailyPersonScore[]> = {}
  for (const person of people) {
    personDailyScores[person.id] = scorePersonWindow(person, window)
  }

  const householdDailyScores = window.map((date, dayIndex) => {
    const dayScores = people.map((p) => personDailyScores[p.id][dayIndex])
    return aggregateHouseholdDay(date, dayScores)
  })

  return { personDailyScores, householdDailyScores }
}
