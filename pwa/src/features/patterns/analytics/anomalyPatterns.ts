import { dateKeyToDate, isoToDateKey, safeRound } from './dateUtils'

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

const percentile = (values: readonly number[], fraction: number): number => {
  const sorted = [...values].sort((a, b) => a - b)

  if (sorted.length === 1) return sorted[0]

  const position = (sorted.length - 1) * fraction
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  const weight = position - lower

  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

const findBaseline = (scores: readonly DailyPersonScore[]): BaselineResult | null => {
  const scored = scores.filter(
    (
      day,
    ): day is DailyPersonScore & {
      score: number
    } => day.score !== null,
  )

  if (scored.length < MIN_SCORED_DAYS) return null

  const values = scored.map((day) => day.score)
  const medianScore = median(values)
  const lowerQuartile = percentile(values, 0.25)

  // Require the day to be at least five points below the person's median.
  const thresholdScore = Math.min(lowerQuartile, medianScore - 5)

  const anomalyDates = new Set<DateKey>()
  const typicalDates = new Set<DateKey>()
  const scoredDates = new Set<DateKey>()

  for (const day of scored) {
    scoredDates.add(day.date)

    if (day.score <= thresholdScore) {
      anomalyDates.add(day.date)
    } else {
      typicalDates.add(day.date)
    }
  }

  if (anomalyDates.size < MIN_ANOMALOUS_DAYS) {
    return null
  }

  return {
    medianScore: safeRound(medianScore),
    thresholdScore: safeRound(thresholdScore),
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
): boolean => {
  if (anomalyOccurrences < MIN_SIGNAL_ANOMALY_OCCURRENCES) {
    return false
  }

  if (
    anomalyOpportunities < MIN_ANOMALOUS_DAYS ||
    typicalOpportunities < MIN_TYPICAL_OPPORTUNITIES
  ) {
    return false
  }

  const difference = anomalyRate - typicalRate
  const ratio =
    typicalRate === 0
      ? anomalyRate > 0
        ? Number.POSITIVE_INFINITY
        : 0
      : anomalyRate / typicalRate

  return difference >= MIN_RATE_DIFFERENCE && ratio >= MIN_RATE_RATIO
}

const buildRateItem = (params: {
  id: string
  label: string
  signalDates: ReadonlySet<DateKey>
  anomalyDates: ReadonlySet<DateKey>
  typicalDates: ReadonlySet<DateKey>
}): AnomalyRateItem | null => {
  const { id, label, signalDates, anomalyDates, typicalDates } = params

  const anomalyOccurrences = countOverlap(signalDates, anomalyDates)

  const typicalOccurrences = countOverlap(signalDates, typicalDates)

  const anomalyOpportunities = anomalyDates.size
  const typicalOpportunities = typicalDates.size

  const anomalyRate = percentage(anomalyOccurrences, anomalyOpportunities)

  const typicalRate = percentage(typicalOccurrences, typicalOpportunities)

  if (
    !isNotable(
      anomalyOccurrences,
      anomalyOpportunities,
      anomalyRate,
      typicalRate,
      typicalOpportunities,
    )
  ) {
    return null
  }

  return {
    id,
    label,
    anomalyRate,
    typicalRate,
    anomalyOccurrences,
    anomalyOpportunities,
    typicalOccurrences,
    typicalOpportunities,
  }
}

const compareRateItems = (a: AnomalyRateItem, b: AnomalyRateItem): number => {
  const aDifference = a.anomalyRate - a.typicalRate
  const bDifference = b.anomalyRate - b.typicalRate

  return (
    bDifference - aDifference ||
    b.anomalyOccurrences - a.anomalyOccurrences ||
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
      const dates = eventDates.get(eventId) ?? new Set<DateKey>()

      dates.add(date)
      eventDates.set(eventId, dates)
    }
  }

  const items = [...eventDates]
    .map(([eventId, dates]) =>
      buildRateItem({
        id: eventId,
        label: labelById.get(eventId) ?? 'Tracked event',
        signalDates: dates,
        anomalyDates: measurableAnomalyDates,
        typicalDates: measurableTypicalDates,
      }),
    )
    .filter((item): item is AnomalyRateItem => item !== null)
    .sort(compareRateItems)
    .slice(0, 3)

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

  for (const other of people.filter((o) => o.id !== target.id)) {
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
      continue
    }

    const undesiredIndicators = new Map(
      other.indicators
        .filter(
          (indicator) =>
            indicator.active !== false && indicator.polarity === 'undesired',
        )
        .map((indicator) => [indicator.id, indicator.name]),
    )

    const datesByIndicator = new Map<string, Set<DateKey>>()

    for (const checkIn of other.checkIns) {
      const date = isoToDateKey(checkIn.occurredAt)

      if (!otherMeasurableDates.has(date)) {
        continue
      }

      for (const indicatorId of new Set(
        checkIn.checkedIndicatorIds.filter((i) => !undesiredIndicators.has(i)),
      )) {
        const dates = datesByIndicator.get(indicatorId) ?? new Set<DateKey>()
        dates.add(date)
        datesByIndicator.set(indicatorId, dates)
      }
    }

    for (const [indicatorId, dates] of datesByIndicator) {
      const base = buildRateItem({
        id: `${other.id}:indicator:${indicatorId}`,
        label: undesiredIndicators.get(indicatorId) ?? 'Challenge',
        signalDates: dates,
        anomalyDates: measurableAnomalyDates,
        typicalDates: measurableTypicalDates,
      })

      base &&
        items.push({
          ...base,
          personId: other.id,
          personName: other.displayName,
          kind: 'behavior',
        })
    }

    const incidentDates = new Set(
      other.incidents.map((incident) => isoToDateKey(incident.occurredAt)),
    )

    const incidentBase = buildRateItem({
      id: `${other.id}:incidents`,
      label: 'Incidents',
      signalDates: incidentDates,
      anomalyDates: measurableAnomalyDates,
      typicalDates: measurableTypicalDates,
    })

    incidentBase &&
      items.push({
        ...incidentBase,
        personId: other.id,
        personName: other.displayName,
        kind: 'incident',
      })
  }

  items.sort(compareRateItems)

  const strongest = items.slice(0, 3)

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

  const baseline = findBaseline(dailyScores)

  if (!baseline) {
    return {
      baseline: null,
      weekday: null,
      events: null,
      otherPeople: null,
    }
  }

  return {
    baseline: {
      medianScore: baseline.medianScore,
      thresholdScore: baseline.thresholdScore,
      anomalousDays: baseline.anomalyDates.size,
      scoredDays: baseline.scoredDates.size,
    },

    weekday: buildWeekdayPattern(baseline),

    events: buildEventPattern(person, lifeEvents, baseline),

    otherPeople: buildOtherPeoplePattern(person, people, personDailyScores, baseline),
  }
}
