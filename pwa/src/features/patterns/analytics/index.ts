/**
 * TenderGrove Patterns — analytics engine (public entry point).
 *
 * This module is intentionally frontend-first and 100% deterministic: given the
 * same normalized input it always returns the same `AnalyticsResult`. There is
 * no ML, no network, and no hidden state — every number can be traced back to a
 * documented formula in one of the sibling files.
 *
 *
 * ── How this could become a backend endpoint later ──────────────────────────
 *
 * Nothing here depends on React, the Amplify client, or the browser. To move
 * analytics server-side you would:
 *
 *   1. Expose `runAnalytics(input)` behind an endpoint, e.g.
 *        GET /households/:id/patterns?windowDays=30
 *      returning the exact `AnalyticsResult` JSON the UI already consumes.
 *   2. Do the `normalizeHousehold(...)` step (parsing `answersJson`, filtering
 *      incidents out of events) on the server from the same DynamoDB records.
 *   3. Have the frontend hook fetch that JSON instead of computing it locally.
 *
 * Because the UI only ever reads `AnalyticsResult`, that swap is invisible to
 * the pages. Keeping it in the frontend for now means we can iterate on the
 * analytics quickly without deploying backend changes — the right call while
 * we're still learning which insights are actually useful.
 */

import { buildCalendar } from './calendarHeatmap'
import { findCorrelations } from './correlations'
import { buildDateWindow, formatRangeLabel } from './dateUtils'
import { findRelationships } from './relationships'
import { buildDailyScores } from './scoring'
import { buildOverview } from './summaries'
import { computeTrend, type ScoredDay } from './trends'
import { findTurningPoints } from './turningPoints'
import type {
  AnalyticsInput,
  AnalyticsPerson,
  AnalyticsPersonRef,
  AnalyticsResult,
  DataQuality,
  Polarity,
  PersonRole,
  TrendResult,
} from './types'

export * from './types'
export { scorePersonDay, aggregateHouseholdDay, buildDailyScores } from './scoring'
export { computeTrend, rollingAverage } from './trends'
export { buildCalendar, distressLevel } from './calendarHeatmap'
export { findCorrelations } from './correlations'
export { findRelationships, pearson } from './relationships'
export { findTurningPoints } from './turningPoints'
export { buildOverview } from './summaries'
export { buildPersonView, type PersonAnalyticsView } from './personView'

/** Default look-back window for the daily score series. */
export const DEFAULT_WINDOW_DAYS = 30

/** Fewest scored days before we consider the analytics trustworthy to show. */
export const MIN_SCORED_DAYS_FOR_CONFIDENCE = 4

/* ------------------------------------------------------------------ */
/*  Normalization: app data shape → analytics input                    */
/* ------------------------------------------------------------------ */
/*
 * These "Raw*" types mirror the shape returned by `usePeople`-style queries
 * (indicators, check-ins with answersJson, events). Kept loose (optionals /
 * nullables) because Amplify selection sets and AWSJSON round-trips can surface
 * partial data. Normalization is the ONLY place that knows about `answersJson`
 * and the `incident` event type, keeping the rest of the engine schema-neutral.
 */

/** Loose shape of an `Indicator` record as fetched from the API. */
export interface RawIndicator {
  id: string
  name?: string | null
  polarity?: string | null
  active?: boolean | null
}

/** Loose shape of a `CheckIn` record as fetched from the API. */
export interface RawCheckIn {
  occurredAt: string
  answersJson?: unknown
}

/** Loose shape of an `Event` record as fetched from the API. */
export interface RawEvent {
  occurredAt: string
  type?: string | null
  title?: string | null
}

/** Loose shape of a `Person` record (with related records) from the API. */
export interface RawPerson {
  id: string
  displayName: string
  role?: string | null
  archived?: boolean | null
  indicators?: (RawIndicator | null)[] | null
  checkIns?: (RawCheckIn | null)[] | null
  events?: (RawEvent | null)[] | null
}

const VALID_POLARITIES: Polarity[] = ['desired', 'undesired']
const VALID_ROLES: PersonRole[] = [
  'child',
  'parent',
  'spouse',
  'self',
  'caregiver',
  'other',
]

/**
 * Read the checked indicator ids out of a check-in's answers blob. Mirrors
 * `features/people/checkin/checkInUtils.parseAnswers` but inlined so the
 * analytics engine has zero app imports (and can move to a backend as-is).
 */
export function parseCheckedIds(answersJson: unknown): string[] {
  let value = answersJson
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return []
    }
  }
  if (value && typeof value === 'object' && 'checked' in value) {
    const checked = (value as { checked: unknown }).checked
    if (Array.isArray(checked)) {
      return checked.filter((id): id is string => typeof id === 'string')
    }
  }
  return []
}

function normalizePolarity(polarity: string | null | undefined): Polarity | null {
  return VALID_POLARITIES.includes(polarity as Polarity) ? (polarity as Polarity) : null
}

function normalizeRole(role: string | null | undefined): PersonRole | null {
  return VALID_ROLES.includes(role as PersonRole) ? (role as PersonRole) : null
}

/** Convert one raw person into the analytics shape. */
function normalizePerson(raw: RawPerson): AnalyticsPerson {
  const indicators = (raw.indicators ?? [])
    .filter((i): i is RawIndicator => i !== null)
    .map((i) => ({
      id: i.id,
      name: i.name ?? 'Indicator',
      polarity: normalizePolarity(i.polarity),
      active: i.active !== false,
    }))

  const checkIns = (raw.checkIns ?? [])
    .filter((c): c is RawCheckIn => c !== null)
    .map((c) => ({
      occurredAt: c.occurredAt,
      checkedIndicatorIds: parseCheckedIds(c.answersJson),
    }))

  const incidents = (raw.events ?? [])
    .filter((e): e is RawEvent => e !== null && e.type === 'incident')
    .map((e) => ({ occurredAt: e.occurredAt, title: e.title ?? 'Incident' }))

  return {
    id: raw.id,
    displayName: raw.displayName,
    role: normalizeRole(raw.role),
    indicators,
    checkIns,
    incidents,
  }
}

/**
 * Normalize the household's fetched data into a deterministic analytics input.
 * Archived people are excluded by default.
 */
export function normalizeHousehold(
  rawPeople: RawPerson[],
  options: { now?: Date; windowDays?: number; includeArchived?: boolean } = {},
): AnalyticsInput {
  const {
    now = new Date(),
    windowDays = DEFAULT_WINDOW_DAYS,
    includeArchived = false,
  } = options
  const people = rawPeople
    .filter((p) => includeArchived || p.archived !== true)
    .map(normalizePerson)
  return { people, now, windowDays }
}

/* ------------------------------------------------------------------ */
/*  Data quality                                                       */
/* ------------------------------------------------------------------ */

function readyMessage(scoredDays: number, peopleWithData: number): string {
  const dayWord = scoredDays === 1 ? 'day' : 'days'
  const personWord = peopleWithData === 1 ? 'person' : 'people'
  return `Based on ${scoredDays} ${dayWord} of check-ins across ${peopleWithData} ${personWord}.`
}

const GATHERING_MESSAGE =
  'We’re still gathering data. Keep logging daily check-ins and patterns will start to appear here — usually within a week or so.'

function buildDataQuality(
  people: AnalyticsPerson[],
  scoredDays: number,
  peopleWithData: number,
): DataQuality {
  const hasEnoughData = scoredDays >= MIN_SCORED_DAYS_FOR_CONFIDENCE
  const message = hasEnoughData
    ? readyMessage(scoredDays, peopleWithData)
    : GATHERING_MESSAGE
  return {
    hasEnoughData,
    scoredDays,
    totalPeople: people.length,
    peopleWithData,
    message,
  }
}

/* ------------------------------------------------------------------ */
/*  Orchestrator                                                       */
/* ------------------------------------------------------------------ */

const toScoredDays = (scores: { date: string; score: number | null }[]): ScoredDay[] =>
  scores.map((s) => ({ date: s.date, score: s.score }))

/**
 * Run the full analytics pass over normalized input. Pure and deterministic:
 * the same input always yields the same result.
 */
export function runAnalytics(input: AnalyticsInput): AnalyticsResult {
  const window = buildDateWindow(input.now, input.windowDays)
  const startDate = window[0]
  const endDate = window[window.length - 1]

  const people: AnalyticsPersonRef[] = input.people.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    role: p.role,
  }))

  const { personDailyScores, householdDailyScores } = buildDailyScores(
    input.people,
    window,
  )

  const householdTrend = computeTrend(toScoredDays(householdDailyScores))
  const personTrends: Record<string, TrendResult> = {}
  for (const person of input.people) {
    personTrends[person.id] = computeTrend(toScoredDays(personDailyScores[person.id]))
  }

  const calendar = buildCalendar(householdDailyScores)
  const correlations = findCorrelations(input.people)
  const relationships = findRelationships(people, personDailyScores)
  const turningPoints = findTurningPoints(householdDailyScores)
  const overview = buildOverview({
    householdTrend,
    householdDailyScores,
    turningPoints,
    correlations,
  })

  const scoredDays = householdDailyScores.filter((d) => d.score !== null).length
  const peopleWithData = input.people.filter((p) =>
    personDailyScores[p.id].some((d) => d.hasData),
  ).length

  return {
    window: { startDate, endDate, days: input.windowDays },
    dataQuality: buildDataQuality(input.people, scoredDays, peopleWithData),
    people,
    householdDailyScores,
    personDailyScores,
    householdTrend,
    personTrends,
    calendar,
    correlations,
    relationships,
    turningPoints,
    overview,
  }
}

/**
 * Convenience: normalize the app's fetched people and run analytics in one call.
 * This is what the `usePatternsAnalytics` hook uses.
 */
export function analyzeHousehold(
  rawPeople: RawPerson[],
  options?: { now?: Date; windowDays?: number; includeArchived?: boolean },
): AnalyticsResult {
  return runAnalytics(normalizeHousehold(rawPeople, options))
}

/** Range label for the current window, e.g. "May 4 – Jun 2". */
export function windowRangeLabel(result: AnalyticsResult): string {
  return formatRangeLabel(result.window.startDate, result.window.endDate)
}
