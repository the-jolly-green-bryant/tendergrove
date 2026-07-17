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

export interface ParsedAnswers {
  checked: string[]
  events: string[]
}

export const parseAnswers = (answersJson: unknown): ParsedAnswers => {
  let value = answersJson

  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return {
        checked: [],
        events: [],
      }
    }
  }

  if (!value || typeof value !== 'object') {
    return {
      checked: [],
      events: [],
    }
  }

  const answers = value as {
    checked?: unknown
    events?: unknown
  }

  const parseStringIds = (val: unknown): string[] =>
    Array.isArray(val) ? val.filter((id): id is string => typeof id === 'string') : []

  return {
    checked: parseStringIds(answers.checked),
    events: parseStringIds(answers.events),
  }
}
import { buildCalendar } from './calendarHeatmap'
import { findCorrelations } from './correlations'
import { buildDateWindow, formatRangeLabel } from './dateUtils'
import { buildGeneratedInsights } from './generatedInsights'
import { findRelationships } from './relationships'
import { buildDailyScores } from './scoring'
import { buildOverview } from './summaries'
import { buildTiming } from './timing'
import { computeTrend, type ScoredDay } from './trends'
import { findTurningPoints } from './turningPoints'
import { buildAnomalyPatterns } from './anomalyPatterns'
import type {
  AnalyticsInput,
  AnalyticsLifeEvent,
  AnalyticsPerson,
  AnalyticsPersonRef,
  AnalyticsResult,
  DataQuality,
  GeneratedInsight,
  Polarity,
  PersonRole,
} from './types'
import { buildEventImpacts } from './eventImpacts'
import { isoToDateKey } from './dateUtils'

export * from './types'
export { scorePersonDay, aggregateHouseholdDay, buildDailyScores } from './scoring'
export { computeTrend, rollingAverage } from './trends'
export { buildCalendar, wellbeingLevel } from './calendarHeatmap'
export { findCorrelations } from './correlations'
export { findRelationships, pearson } from './relationships'
export { findTurningPoints } from './turningPoints'
export { buildOverview } from './summaries'
export { buildTiming, buildDayOfWeek, buildTimeOfDay } from './timing'
export { buildGeneratedInsights } from './generatedInsights'
export { buildAnomalyPatterns } from './anomalyPatterns'
export {
  buildPersonView,
  buildScopedView,
  type PersonAnalyticsView,
  type ScopedPatternsView,
} from './personView'

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
  name: string
  polarity: string | null
  active?: boolean | null
  createdAt?: string | null
  updatedAt?: string | null
}

/** Loose shape of a `CheckIn` record as fetched from the API. */
export interface RawCheckIn {
  id: string
  occurredAt: string
  updatedAt?: string
  createdAt?: string
  answersJson?: unknown
  note?: string
}

/** Loose shape of an `Event` record as fetched from the API. */
export interface RawEvent {
  occurredAt: string
  type?: string | null
  title?: string | null
}

/**
 *
 */
export interface RawLifeEvent {
  id: string
  label?: string | null
  archived?: boolean | null
}

/** Loose shape of a `Person` record (with related records) from the API. */
export interface RawPerson {
  id: string
  householdId?: string
  displayName: string
  role: string | null
  avatarUrl: string | null
  archived: boolean | null
  indicators?: RawIndicator[] | null
  checkIns: RawCheckIn[]
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

const normalizePolarity = (polarity: string | null | undefined): Polarity | null =>
  VALID_POLARITIES.includes(polarity as Polarity) ? (polarity as Polarity) : null

const normalizeRole = (role: string | null | undefined): PersonRole | null =>
  VALID_ROLES.includes(role as PersonRole) ? (role as PersonRole) : null

const normalizePerson = (raw: RawPerson): AnalyticsPerson => {
  const indicators = (raw.indicators ?? [])
    .filter((i): i is RawIndicator => i !== null)
    .map((i) => ({
      id: i.id,
      name: i.name ?? 'Indicator',
      polarity: normalizePolarity(i.polarity),
      active: i.active !== false,
      activeFrom: i.createdAt ? isoToDateKey(i.createdAt) : undefined,
      activeUntil:
        i.active === false && i.updatedAt ? isoToDateKey(i.updatedAt) : undefined,
    }))

  const checkIns = (raw.checkIns ?? [])
    .filter((checkIn): checkIn is RawCheckIn => checkIn !== null)
    .map((checkIn) => {
      const answers = parseAnswers(checkIn.answersJson)

      return {
        occurredAt: checkIn.occurredAt,
        checkedIndicatorIds: answers.checked,
        eventIds: answers.events,
      }
    })

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
 *
 */
export interface NormalizeHouseholdOptions {
  now?: Date
  windowDays?: number
  includeArchived?: boolean
  lifeEvents?: RawLifeEvent[]
}

export const normalizeHousehold = (
  rawPeople: RawPerson[],
  options: NormalizeHouseholdOptions = {},
): AnalyticsInput => {
  const {
    now = new Date(),
    windowDays = DEFAULT_WINDOW_DAYS,
    includeArchived = false,
    lifeEvents: rawLifeEvents = [],
  } = options

  const people = rawPeople
    .filter((person) => includeArchived || person.archived !== true)
    .map(normalizePerson)

  const lifeEvents: AnalyticsLifeEvent[] = rawLifeEvents
    .filter((event) => event.archived !== true)
    .map((event) => ({
      id: event.id,
      label: event.label?.trim() || 'Event',
    }))

  return {
    people,
    lifeEvents,
    now,
    windowDays,
  }
}

/* ------------------------------------------------------------------ */
/*  Data quality                                                       */
/* ------------------------------------------------------------------ */

const readyMessage = (scoredDays: number, peopleWithData: number): string => {
  const dayWord = scoredDays === 1 ? 'day' : 'days'
  const personWord = peopleWithData === 1 ? 'person' : 'people'
  return `Based on ${scoredDays} ${dayWord} of check-ins across ${peopleWithData} ${personWord}.`
}

const GATHERING_MESSAGE =
  'We’re still gathering data. Keep logging daily check-ins and patterns will start to appear here — usually within a week or so.'

const buildDataQuality = (
  people: AnalyticsPerson[],
  scoredDays: number,
  peopleWithData: number,
): DataQuality => {
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

const toScoredDays = (
  scores: {
    date: string
    score: number | null
    eventCount: number
  }[],
): ScoredDay[] =>
  scores.map((score) => ({
    date: score.date,
    score: score.score,
    eventCount: score.eventCount,
  }))

export const runAnalytics = (input: AnalyticsInput): AnalyticsResult => {
  const window = buildDateWindow(input.now, input.windowDays)

  const people: AnalyticsPersonRef[] = input.people.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    role: p.role,
  }))

  const { personDailyScores, householdDailyScores } = buildDailyScores(
    input.people,
    window,
  )

  const { household: eventImpacts, perPerson: personEventImpacts } = buildEventImpacts(
    input.people,
    personDailyScores,
  )

  const personAnomalyPatterns = Object.fromEntries(
    input.people.map((person) => [
      person.id,
      buildAnomalyPatterns({
        person,
        people: input.people,
        dailyScores: personDailyScores[person.id] ?? [],
        personDailyScores,
        lifeEvents: input.lifeEvents,
      }),
    ]),
  )

  const householdTrend = computeTrend(toScoredDays(householdDailyScores))
  const personTrends = Object.fromEntries(
    input.people.map((p) => [
      p.id,
      computeTrend(toScoredDays(personDailyScores[p.id])),
    ]),
  )

  const timing = buildTiming(
    input.people,
    personDailyScores,
    toScoredDays(householdDailyScores),
  )
  const personGeneratedInsights: Record<string, GeneratedInsight[]> = {}
  for (const person of input.people) {
    personGeneratedInsights[person.id] = buildGeneratedInsights({
      timing: timing.perPerson[person.id],
      trend: personTrends[person.id],
      personName: person.displayName,
    })
  }

  const scoredDays = householdDailyScores.filter((d) => d.score !== null).length
  const peopleWithData = input.people.filter((p) =>
    personDailyScores[p.id].some((d) => d.hasData),
  ).length

  const turningPoints = findTurningPoints(householdDailyScores)
  const correlations = findCorrelations(input.people)

  return {
    window: {
      startDate: window[0],
      endDate: window[window.length - 1],
      days: input.windowDays,
    },
    dataQuality: buildDataQuality(input.people, scoredDays, peopleWithData),
    people,
    householdDailyScores,
    personDailyScores,
    householdTrend,
    personTrends,
    calendar: buildCalendar(householdDailyScores),
    correlations,
    relationships: findRelationships(people, personDailyScores),
    turningPoints,
    overview: buildOverview({
      householdTrend,
      householdDailyScores,
      turningPoints,
      correlations,
    }),
    timing: timing.household,
    personTiming: timing.perPerson,
    eventImpacts,
    personEventImpacts,
    generatedInsights: buildGeneratedInsights({
      timing: timing.household,
      trend: householdTrend,
    }),
    personGeneratedInsights,
    personAnomalyPatterns,
  }
}

export const analyzeHousehold = (
  rawPeople: RawPerson[],
  options?: NormalizeHouseholdOptions,
): AnalyticsResult => runAnalytics(normalizeHousehold(rawPeople, options))

export const windowRangeLabel = (result: AnalyticsResult): string =>
  formatRangeLabel(result.window.startDate, result.window.endDate)

export const parseCheckedIds = (answersJson: unknown): string[] =>
  parseAnswers(answersJson).checked
