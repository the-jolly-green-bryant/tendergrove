import { addDaysToKey, dateKeyToDate, isoToDateKey, safeRound } from './dateUtils'

import type {
  AnalyticsLifeEvent,
  AnalyticsPerson,
  AnomalyEventPattern,
  AnomalyOtherPeoplePattern,
  AnomalyOtherPersonItem,
  AnomalyPatterns,
  AnomalyRateItem,
  AnomalyWeekdayBucket,
  AnomalyWeekdayPattern,
  DailyPersonScore,
  DateKey,
} from './types'

const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

const MIN_SCORED_DAYS = 7
const MIN_ANOMALOUS_DAYS = 2

const MIN_WEEKDAY_SAMPLE = 2
const MIN_SIGNAL_ANOMALY_OCCURRENCES = 2
const MIN_TYPICAL_OPPORTUNITIES = 3

const MIN_RATE_DIFFERENCE = 15
const MIN_RATE_RATIO = 1.35
const EVENT_LOOKBACK_DAYS = 90

const eventAnalyticsGroup = (label: string): { id: string; label: string } | null => {
  const normalized = label.trim().toLowerCase()

  if (normalized.startsWith('pass -') || normalized === 'pass') {
    return { id: 'analytics-group:passes', label: 'Passes' }
  }

  if (normalized.startsWith('family therapy')) {
    return { id: 'analytics-group:family-therapy', label: 'Family therapy' }
  }

  if (normalized.startsWith('call -') || normalized === 'call') {
    return { id: 'analytics-group:calls', label: 'Calls' }
  }

  return null
}

interface BaselineResult {
  medianScore: number
  thresholdScore: number
  anomalyDates: Set<DateKey>
  typicalDates: Set<DateKey>
  scoredDates: Set<DateKey>
}

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }

  return sorted[middle]
}

/**
 * Pattern discovery intentionally uses explicit behavioral evidence rather than
 * the wellness score used by the graph. A missed desired indicator can lower
 * overall well-being, but it should not by itself become evidence of an
 * escalation or create an event/household behavior association.
 */
const findBehaviorBaseline = (
  scores: readonly DailyPersonScore[],
): BaselineResult | null => {
  const measurable = scores.filter((day) => day.hasData)
  if (measurable.length < MIN_SCORED_DAYS) return null

  const behaviorBurden = measurable.map(
    (day) => day.negativeCount + day.incidentCount * 2,
  )
  const usualBurden = median(behaviorBurden)
  const hardDayBurden = Math.max(1, Math.floor(usualBurden) + 1)

  const anomalyDates = new Set(
    measurable
      .filter((day) => day.negativeCount + day.incidentCount * 2 >= hardDayBurden)
      .map((day) => day.date),
  )
  if (anomalyDates.size < MIN_ANOMALOUS_DAYS) return null

  const scoredDates = new Set(measurable.map((day) => day.date))
  const typicalDates = new Set(
    measurable.filter((day) => !anomalyDates.has(day.date)).map((day) => day.date),
  )
  const wellnessScores = measurable
    .map((day) => day.score)
    .filter((score): score is number => score !== null)

  return {
    medianScore: wellnessScores.length > 0 ? safeRound(median(wellnessScores)) : 0,
    thresholdScore: hardDayBurden,
    anomalyDates,
    typicalDates,
    scoredDates,
  }
}

const percentage = (occurrences: number, opportunities: number): number => {
  if (opportunities === 0) return 0

  return Math.round((occurrences / opportunities) * 100)
}

const countOverlap = (
  signalDates: ReadonlySet<DateKey>,
  eligibleDates: ReadonlySet<DateKey>,
): number => {
  let count = 0

  for (const date of eligibleDates) {
    if (signalDates.has(date)) count++
  }

  return count
}

const isNotable = (
  anomalyOccurrences: number,
  anomalyOpportunities: number,
  anomalyRate: number,
  typicalRate: number,
  typicalOpportunities: number,
): boolean =>
  !(
    anomalyOccurrences < MIN_SIGNAL_ANOMALY_OCCURRENCES ||
    anomalyOpportunities < MIN_ANOMALOUS_DAYS ||
    typicalOpportunities < MIN_TYPICAL_OPPORTUNITIES
  ) &&
  (() => {
    if (anomalyRate - typicalRate < MIN_RATE_DIFFERENCE) return false
    if (typicalRate !== 0) return anomalyRate / typicalRate >= MIN_RATE_RATIO

    const ratio = anomalyRate > 0 ? Number.POSITIVE_INFINITY : 0
    return ratio >= MIN_RATE_RATIO
  })()

const buildRateItem = (params: {
  id: string
  label: string
  signalDates: ReadonlySet<DateKey>
  anomalyDates: ReadonlySet<DateKey>
  typicalDates: ReadonlySet<DateKey>
  includeEarly?: boolean
}): AnomalyRateItem | null => {
  const { id, label, signalDates, anomalyDates, typicalDates, includeEarly } = params

  const anomalyOccurrences = countOverlap(signalDates, anomalyDates)

  const typicalOccurrences = countOverlap(signalDates, typicalDates)

  const anomalyOpportunities = anomalyDates.size
  const typicalOpportunities = typicalDates.size

  const anomalyRate = percentage(anomalyOccurrences, anomalyOpportunities)

  const typicalRate = percentage(typicalOccurrences, typicalOpportunities)

  const notable = isNotable(
    anomalyOccurrences,
    anomalyOpportunities,
    anomalyRate,
    typicalRate,
    typicalOpportunities,
  )

  if (!notable && (!includeEarly || anomalyOccurrences + typicalOccurrences < 2)) {
    return null
  }

  return {
    id,
    label,
    evidence: notable ? 'repeated' : 'early',
    anomalyRate,
    typicalRate,
    anomalyOccurrences,
    anomalyOpportunities,
    typicalOccurrences,
    typicalOpportunities,
  }
}

/** Compare P(hard day | signal present) with P(hard day | signal absent). */
const buildConditionalSignalRateItem = (params: {
  id: string
  label: string
  signalDates: ReadonlySet<DateKey>
  anomalyDates: ReadonlySet<DateKey>
  scoredDates: ReadonlySet<DateKey>
  includeEarly?: boolean
}): AnomalyRateItem | null => {
  const { id, label, signalDates, anomalyDates, scoredDates, includeEarly } = params
  const presentDates = new Set([...scoredDates].filter((date) => signalDates.has(date)))
  const absentDates = new Set([...scoredDates].filter((date) => !signalDates.has(date)))
  const presentHardDays = countOverlap(anomalyDates, presentDates)
  const absentHardDays = countOverlap(anomalyDates, absentDates)
  const presentRate = percentage(presentHardDays, presentDates.size)
  const absentRate = percentage(absentHardDays, absentDates.size)

  const notable = isNotable(
    presentHardDays,
    presentDates.size,
    presentRate,
    absentRate,
    absentDates.size,
  )

  if (!notable && (!includeEarly || presentDates.size < 2 || absentDates.size < 3)) {
    return null
  }

  return {
    id,
    label,
    evidence: notable ? 'repeated' : 'early',
    anomalyRate: presentRate,
    typicalRate: absentRate,
    anomalyOccurrences: presentHardDays,
    anomalyOpportunities: presentDates.size,
    typicalOccurrences: absentHardDays,
    typicalOpportunities: absentDates.size,
  }
}

const compareRateItems = (a: AnomalyRateItem, b: AnomalyRateItem): number => {
  const aDifference = a.anomalyRate - a.typicalRate
  const bDifference = b.anomalyRate - b.typicalRate

  return (
    Number(b.evidence === 'repeated') - Number(a.evidence === 'repeated') ||
    bDifference - aDifference ||
    b.anomalyOccurrences - a.anomalyOccurrences ||
    Number(b.id.startsWith('analytics-group:')) -
      Number(a.id.startsWith('analytics-group:')) ||
    a.label.localeCompare(b.label)
  )
}

const buildWeekdayPattern = (
  baseline: BaselineResult,
): AnomalyWeekdayPattern | null => {
  const buckets: AnomalyWeekdayBucket[] = WEEKDAY_LABELS.map((label, weekday) => {
    const scoredForWeekday = [...baseline.scoredDates].filter(
      (date) => dateKeyToDate(date).getDay() === weekday,
    )

    const anomalousDays = scoredForWeekday.filter((date) =>
      baseline.anomalyDates.has(date),
    ).length

    return {
      weekday,
      label,
      anomalyRate:
        scoredForWeekday.length > 0
          ? percentage(anomalousDays, scoredForWeekday.length)
          : null,
      anomalousDays,
      scoredDays: scoredForWeekday.length,
    }
  })

  const candidates = buckets
    .filter(
      (
        bucket,
      ): bucket is AnomalyWeekdayBucket & {
        anomalyRate: number
      } =>
        bucket.anomalyRate !== null &&
        bucket.scoredDays >= MIN_WEEKDAY_SAMPLE &&
        bucket.anomalousDays >= 2,
    )
    .map((bucket) => {
      const otherScored = [...baseline.scoredDates].filter(
        (date) => dateKeyToDate(date).getDay() !== bucket.weekday,
      )

      const otherAnomalous = otherScored.filter((date) =>
        baseline.anomalyDates.has(date),
      ).length

      const otherDaysRate = percentage(otherAnomalous, otherScored.length)

      return {
        bucket,
        otherDaysRate,
        difference: bucket.anomalyRate - otherDaysRate,
      }
    })
    .filter(
      ({ bucket, otherDaysRate }) =>
        bucket.anomalyRate - otherDaysRate >= MIN_RATE_DIFFERENCE &&
        (otherDaysRate === 0 || bucket.anomalyRate / otherDaysRate >= MIN_RATE_RATIO),
    )
    .sort(
      (a, b) =>
        b.difference - a.difference || b.bucket.anomalousDays - a.bucket.anomalousDays,
    )

  const strongest = candidates[0]

  if (!strongest) return null

  return {
    weekday: strongest.bucket.weekday,
    label: strongest.bucket.label,
    anomalyRate: strongest.bucket.anomalyRate,
    otherDaysRate: strongest.otherDaysRate,
    sampleSize: strongest.bucket.scoredDays,
    buckets,
  }
}

const buildEventPattern = (
  person: AnalyticsPerson,
  lifeEvents: readonly AnalyticsLifeEvent[],
  baseline: BaselineResult,
): AnomalyEventPattern | null => {
  const labelById = new Map(lifeEvents.map((event) => [event.id, event.label]))
  const groupByEventId = new Map(
    lifeEvents
      .map((event) => [event.id, eventAnalyticsGroup(event.label)] as const)
      .filter(
        (entry): entry is readonly [string, { id: string; label: string }] =>
          entry[1] !== null,
      ),
  )

  const eventDates = new Map<string, Set<DateKey>>()

  const measurableAnomalyDates = new Set<DateKey>()
  const measurableTypicalDates = new Set<DateKey>()

  for (const checkIn of person.checkIns) {
    const date = isoToDateKey(checkIn.occurredAt)

    if (!baseline.scoredDates.has(date)) continue

    if (baseline.anomalyDates.has(date)) {
      measurableAnomalyDates.add(date)
    } else {
      measurableTypicalDates.add(date)
    }

    for (const eventId of new Set(checkIn.eventIds)) {
      const analyticsSignals = [
        { id: eventId, label: labelById.get(eventId) ?? 'Tracked event' },
        groupByEventId.get(eventId),
      ].filter((signal): signal is { id: string; label: string } => Boolean(signal))

      for (const signal of analyticsSignals) {
        const dates = eventDates.get(signal.id) ?? new Set<DateKey>()
        dates.add(date)
        eventDates.set(signal.id, dates)
        labelById.set(signal.id, signal.label)
      }
    }
  }

  const items = [...eventDates]
    .map(([eventId, dates]) =>
      buildConditionalSignalRateItem({
        id: eventId,
        label: labelById.get(eventId) ?? 'Tracked event',
        signalDates: dates,
        anomalyDates: measurableAnomalyDates,
        scoredDates: new Set([...measurableAnomalyDates, ...measurableTypicalDates]),
        includeEarly: true,
      }),
    )
    .filter((item): item is AnomalyRateItem => item !== null)
    .sort(compareRateItems)
    // Keep room for both an event family and its discrete event types.
    .slice(0, 6)

  if (items.length === 0) return null

  return {
    top: items[0],
    items,
  }
}

const buildOtherPeoplePattern = (
  target: AnalyticsPerson,
  people: readonly AnalyticsPerson[],
  personDailyScores: Readonly<Record<string, DailyPersonScore[]>>,
  baseline: BaselineResult,
): AnomalyOtherPeoplePattern | null => {
  const items: AnomalyOtherPersonItem[] = []

  people
    .filter((o) => o.id !== target.id)
    .forEach((other) => {
      const otherScores = personDailyScores[other.id] ?? []

      // Missing data must not count as the signal being absent.
      const otherMeasurableDates = new Set(
        otherScores.filter((day) => day.hasData).map((day) => day.date),
      )

      const measurableAnomalyDates = new Set(
        [...baseline.anomalyDates].filter((date) => otherMeasurableDates.has(date)),
      )

      const measurableTypicalDates = new Set(
        [...baseline.typicalDates].filter((date) => otherMeasurableDates.has(date)),
      )

      if (
        measurableAnomalyDates.size < MIN_ANOMALOUS_DAYS ||
        measurableTypicalDates.size < MIN_TYPICAL_OPPORTUNITIES
      ) {
        return
      }

      const undesiredIndicators = new Map(
        other.indicators
          .filter((i) => i.active !== false && i.polarity === 'undesired')
          .map((indicator) => [indicator.id, indicator.name]),
      )

      const datesByIndicator = new Map<string, Set<DateKey>>()

      other.checkIns.forEach((checkIn) => {
        const date = isoToDateKey(checkIn.occurredAt)

        if (!otherMeasurableDates.has(date)) {
          return
        }

        new Set(
          checkIn.checkedIndicatorIds.filter((i) => undesiredIndicators.has(i)),
        ).forEach((indicatorId) => {
          const dates = datesByIndicator.get(indicatorId) ?? new Set<DateKey>()
          dates.add(date)
          datesByIndicator.set(indicatorId, dates)
        })
      })

      datesByIndicator.forEach((dates, indicatorId) => {
        const base = buildRateItem({
          id: `${other.id}:indicator:${indicatorId}`,
          label: undesiredIndicators.get(indicatorId) ?? 'Challenge',
          signalDates: dates,
          anomalyDates: measurableAnomalyDates,
          typicalDates: measurableTypicalDates,
          includeEarly: true,
        })

        base &&
          items.push({
            ...base,
            personId: other.id,
            personName: other.displayName,
            kind: 'behavior',
          })
      })

      const incidentDates = new Set(
        other.incidents.map((incident) => isoToDateKey(incident.occurredAt)),
      )

      const incidentBase = buildRateItem({
        id: `${other.id}:incidents`,
        label: 'Incidents',
        signalDates: incidentDates,
        anomalyDates: measurableAnomalyDates,
        typicalDates: measurableTypicalDates,
        includeEarly: true,
      })

      incidentBase &&
        items.push({
          ...incidentBase,
          personId: other.id,
          personName: other.displayName,
          kind: 'incident',
        })

      const otherBehaviorBaseline = findBehaviorBaseline(otherScores)
      if (otherBehaviorBaseline) {
        const severityBase = buildRateItem({
          id: `${other.id}:severity`,
          label: 'Higher-severity days',
          signalDates: otherBehaviorBaseline.anomalyDates,
          anomalyDates: measurableAnomalyDates,
          typicalDates: measurableTypicalDates,
          includeEarly: true,
        })

        severityBase &&
          items.push({
            ...severityBase,
            personId: other.id,
            personName: other.displayName,
            kind: 'severity',
          })
      }
    })

  items.sort(
    (a, b) =>
      b.anomalyRate - a.anomalyRate ||
      b.anomalyOccurrences - a.anomalyOccurrences ||
      compareRateItems(a, b),
  )

  const strongest = items.slice(0, 10)

  if (strongest.length === 0) return null

  return {
    top: strongest[0],
    items: strongest,
  }
}

export const buildAnomalyPatterns = (params: {
  person: AnalyticsPerson
  people: readonly AnalyticsPerson[]
  dailyScores: readonly DailyPersonScore[]
  personDailyScores: Readonly<Record<string, DailyPersonScore[]>>
  lifeEvents: readonly AnalyticsLifeEvent[]
}): AnomalyPatterns => {
  const { person, people, dailyScores, personDailyScores, lifeEvents } = params

  const baseline = findBehaviorBaseline(dailyScores)

  if (!baseline) {
    return {
      baseline: null,
      weekday: null,
      events: null,
      otherPeople: null,
    }
  }

  const latestScoredDate = [...baseline.scoredDates].sort().at(-1)
  const recentEventScores = latestScoredDate
    ? dailyScores.filter(
        (day) => day.date >= addDaysToKey(latestScoredDate, -(EVENT_LOOKBACK_DAYS - 1)),
      )
    : []
  const recentEventBaseline = findBehaviorBaseline(recentEventScores)

  return {
    baseline: {
      medianScore: baseline.medianScore,
      thresholdScore: baseline.thresholdScore,
      anomalousDays: baseline.anomalyDates.size,
      scoredDays: baseline.scoredDates.size,
    },

    weekday: buildWeekdayPattern(baseline),

    events: recentEventBaseline
      ? buildEventPattern(person, lifeEvents, recentEventBaseline)
      : null,

    otherPeople: buildOtherPeoplePattern(person, people, personDailyScores, baseline),
  }
}
