import { parseAnswers } from '../people/checkin/checkInUtils'
import type { RawLifeEvent, RawPerson } from '../patterns/analytics'
import {
  computeScore,
  derivePersonPatternDynamics,
  STATUS_THRESHOLDS,
} from '../../lib/status'
import {
  buildDailyScores,
  computeTrend,
  normalizeHousehold,
} from '../patterns/analytics'
import {
  PATTERN_STRAIN_LABELS,
  patternDimensionLevel,
} from '../patterns/analytics/patternDynamics'
import {
  RESEARCH_METHODOLOGY_PATH,
  researchReferences,
} from '../about/researchReferences'
import {
  currentPersonGroveScore,
} from '../../lib/groveScore'

export interface ProviderReportInput {
  person: RawPerson
  householdPeople?: RawPerson[]
  reason: string
  questions: string
  days?: number
  pinnedObservations?: string[]
  lifeEvents?: RawLifeEvent[]
}

const frequencyLines = (person: RawPerson, polarity: 'desired' | 'undesired') => {
  const checkIns = person.checkIns ?? []
  return (person.indicators ?? [])
    .filter(
      (indicator) => indicator.active !== false && indicator.polarity === polarity,
    )
    .map((indicator) => ({
      name: indicator.name,
      count: checkIns.filter((checkIn) =>
        new Set(parseAnswers(checkIn.answersJson).checked).has(indicator.id),
      ).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

const compareFrequencies = (
  recentItems: ReturnType<typeof frequencyLines>,
  recentTotal: number,
  references: Array<{
    label: string
    items: ReturnType<typeof frequencyLines>
    total: number
  }>,
  polarity: 'desired' | 'undesired',
) =>
  recentItems.flatMap((item) => {
    const recentRate = percentage(item.count, recentTotal)
    const rates = references.map((reference) => ({
      label: reference.label,
      value: percentage(
        reference.items.find((candidate) => candidate.name === item.name)?.count ??
          0,
        reference.total,
      ),
    }))
    const comparison = preferredComparisonFromReferences(
      recentRate,
      rates,
      polarity === 'undesired' ? 'higher' : 'lower',
    )
    if (!comparison) return []
    return [
      {
        ...item,
        recentRate,
        baselineRate: comparison.reference,
        baselineLabel: 'baseline',
        delta: recentRate - comparison.reference,
        comparison,
      },
    ]
  })

export interface ReportDay {
  date: string
  score: number
  level: 'steady' | 'watch' | 'concern'
  concernSignals: number
  positiveSignals: number
}

export interface ReportCalendarDay {
  date: string
  score: number | null
  weightedScore: number | null
  level: ReportDay['level'] | 'missing'
  concernSignals: number
  positiveSignals: number
}

export interface EventComparison {
  label: string
  eventDays: number
  eventAverage: number
  otherAverage: number
  concernDays: number
  difference: number
}

export interface ReportPeriod {
  kind: 'difficult' | 'positive'
  start: string
  end: string
  days: number
}

export interface HouseholdCorrelation {
  coefficient: number
  pairedDays: number
  concurrentConcernDays: number
  noteworthy: boolean
  strength: 'strong' | 'moderate' | 'slight' | 'little or no'
  direction: 'positive' | 'negative'
}

export const isHouseholdCorrelationNoteworthy = (
  pairedDays: number,
  coefficient: number,
) => pairedDays >= 7 && Math.abs(coefficient) >= 0.4

export const isHouseholdConcernOverlapNoteworthy = (
  concurrentConcernDays: number,
) => concurrentConcernDays >= 3

const dateKey = (value: string) => {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const nextDateKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year, month - 1, day + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatDay = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const percentage = (count: number, total: number) =>
  total ? Math.round((count / total) * 100) : 0
const formatPoints = (value: number) =>
  `${value} ${value === 1 ? 'point' : 'points'}`
export interface ComparisonReference {
  label: string
  value: number | null
}

export const preferredComparisonFromReferences = (
  value: number,
  references: ComparisonReference[],
  adverseDirection: 'higher' | 'lower',
) => {
  const comparisons = references
    .map(({ label, value: reference }) =>
      reference === null ? null : { reference, label },
    )
    .filter(
      (
        comparison,
      ): comparison is { reference: number; label: string } =>
        comparison !== null &&
        comparison.reference !== 0 &&
        comparison.reference !== value,
    )
    .map((comparison) => {
      const delta = value - comparison.reference
      const percent = Math.max(
        1,
        Math.round(
          (Math.abs(delta) / Math.abs(comparison.reference)) * 100,
        ),
      )
      return {
        ...comparison,
        delta,
        adverse:
          adverseDirection === 'lower' ? delta < 0 : delta > 0,
        percent,
        magnitude: percent,
        phrase: `${percent}% ${delta < 0 ? 'below' : 'above'} baseline`,
      }
    })
  const adverse = comparisons
    .filter((comparison) => comparison.adverse)
    .sort(
      (a, b) =>
        b.magnitude - a.magnitude ||
        Number(a.label !== 'baseline') - Number(b.label !== 'baseline'),
    )
  const favorable = comparisons
    .filter((comparison) => !comparison.adverse)
    .sort(
      (a, b) =>
        Number(a.label !== 'baseline') - Number(b.label !== 'baseline') ||
        b.magnitude - a.magnitude,
    )
  return adverse[0] ?? favorable[0] ?? null
}
export const preferredContextualComparison = (
  value: number,
  baseline: number | null,
  recent: number | null,
  adverseDirection: 'higher' | 'lower',
) =>
  preferredComparisonFromReferences(
    value,
    [
      { label: 'baseline', value: baseline },
      { label: 'recent baseline', value: recent },
    ],
    adverseDirection,
  )
export const preferredWellnessComparison = (
  value: number,
  baseline: number | null,
  recent: number | null,
) => preferredContextualComparison(value, baseline, recent, 'lower')
const dateKeysBetween = (start: Date, end: Date) => {
  const keys: string[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12)
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12)
  while (cursor <= last) {
    keys.push(dateKey(cursor.toISOString()))
    cursor.setDate(cursor.getDate() + 1)
  }
  return keys
}

const dailyScores = (
  person: RawPerson,
  checkIns: NonNullable<RawPerson['checkIns']>,
): ReportDay[] => {
  const indicators = (person.indicators ?? []).filter(
    (indicator) => indicator.active !== false,
  )
  const grouped = new Map<
    string,
    { scores: number[]; concernSignals: number; positiveSignals: number }
  >()
  const difficultIds = new Set(
    indicators
      .filter((indicator) => indicator.polarity === 'undesired')
      .map((indicator) => indicator.id),
  )
  const positiveIds = new Set(
    indicators
      .filter((indicator) => indicator.polarity === 'desired')
      .map((indicator) => indicator.id),
  )
  checkIns.forEach((checkIn) => {
    const score = computeScore(indicators, checkIn)
    if (score === null) return
    const key = dateKey(checkIn.occurredAt)
    const checked = parseAnswers(checkIn.answersJson).checked
    const current = grouped.get(key) ?? {
      scores: [],
      concernSignals: 0,
      positiveSignals: 0,
    }
    current.scores.push(score)
    current.concernSignals += checked.filter((id) => difficultIds.has(id)).length
    current.positiveSignals += checked.filter((id) => positiveIds.has(id)).length
    grouped.set(key, current)
  })
  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => {
      const { scores, concernSignals, positiveSignals } = values
      const score = Math.round(
        scores.reduce((sum, value) => sum + value, 0) / scores.length,
      )
      return {
        date,
        score,
        concernSignals,
        positiveSignals,
        level:
          score >= STATUS_THRESHOLDS.good
            ? 'steady'
            : score >= STATUS_THRESHOLDS.trouble
              ? 'watch'
              : 'concern',
      }
    })
}

const householdCorrelation = (
  person: RawPerson,
  householdPeople: RawPerson[],
  cutoff: Date,
): HouseholdCorrelation | null => {
  const others = householdPeople.filter(
    (member) => member.id !== person.id && !member.archived,
  )
  if (!others.length) return null
  const selectedDays = new Map(
    dailyScores(
      person,
      (person.checkIns ?? []).filter((item) => new Date(item.occurredAt) >= cutoff),
    ).map((day) => [day.date, day.score]),
  )
  const otherScoresByDate = new Map<string, number[]>()
  others.forEach((member) => {
    dailyScores(
      member,
      (member.checkIns ?? []).filter((item) => new Date(item.occurredAt) >= cutoff),
    ).forEach((day) => {
      otherScoresByDate.set(day.date, [
        ...(otherScoresByDate.get(day.date) ?? []),
        day.score,
      ])
    })
  })
  const pairs = [...selectedDays].flatMap(([date, selectedScore]) => {
    const otherScores = otherScoresByDate.get(date)
    return otherScores?.length
      ? [
          [
            selectedScore,
            otherScores.reduce((sum, score) => sum + score, 0) / otherScores.length,
          ] as const,
        ]
      : []
  })
  if (pairs.length < 3) return null
  const selectedMean = pairs.reduce((sum, [score]) => sum + score, 0) / pairs.length
  const householdMean = pairs.reduce((sum, [, score]) => sum + score, 0) / pairs.length
  const covariance = pairs.reduce(
    (sum, [selectedScore, householdScore]) =>
      sum + (selectedScore - selectedMean) * (householdScore - householdMean),
    0,
  )
  const selectedSpread = Math.sqrt(
    pairs.reduce((sum, [score]) => sum + (score - selectedMean) ** 2, 0),
  )
  const householdSpread = Math.sqrt(
    pairs.reduce((sum, [, score]) => sum + (score - householdMean) ** 2, 0),
  )
  if (!selectedSpread || !householdSpread) return null
  const coefficient =
    Math.round((covariance / (selectedSpread * householdSpread)) * 100) / 100
  const magnitude = Math.abs(coefficient)
  const strength =
    magnitude >= 0.7
      ? 'strong'
      : magnitude >= 0.4
        ? 'moderate'
        : magnitude >= 0.2
          ? 'slight'
          : 'little or no'
  const concurrentConcernDays = pairs.filter(
    ([selectedScore, householdScore]) =>
      selectedScore < STATUS_THRESHOLDS.trouble &&
      householdScore < STATUS_THRESHOLDS.trouble,
  ).length
  // Concurrent concern-range days provide useful context, but do not by
  // themselves show that this person's scores move with the household.
  // Reserve the higher-level takeaway for a moderate relationship supported
  // by at least a week of shared observations.
  const noteworthy = isHouseholdCorrelationNoteworthy(pairs.length, coefficient)
  return {
    coefficient,
    pairedDays: pairs.length,
    concurrentConcernDays,
    noteworthy,
    strength,
    direction: coefficient >= 0 ? 'positive' : 'negative',
  }
}

const findPeriods = (days: ReportDay[], kind: ReportPeriod['kind']): ReportPeriod[] => {
  const matches = (day: ReportDay) =>
    kind === 'difficult' ? day.level === 'concern' : day.level === 'steady'
  const periods: ReportPeriod[] = []
  let start = ''
  let previous = ''
  for (const day of [
    ...days,
    {
      date: '',
      score: 0,
      concernSignals: 0,
      positiveSignals: 0,
      level: 'watch' as const,
    },
  ]) {
    if (matches(day) && (!previous || day.date === nextDateKey(previous))) {
      start ||= day.date
      previous = day.date
      continue
    }
    if (start)
      periods.push({
        kind,
        start,
        end: previous,
        days:
          Math.round(
            (new Date(`${previous}T12:00:00`).getTime() -
              new Date(`${start}T12:00:00`).getTime()) /
              86_400_000,
          ) + 1,
      })
    start = matches(day) ? day.date : ''
    previous = matches(day) ? day.date : ''
  }
  return periods.sort((a, b) => b.days - a.days || a.start.localeCompare(b.start))
}

export const buildProviderReport = ({
  person,
  householdPeople = [person],
  days = 90,
  pinnedObservations = [],
  lifeEvents = [],
}: ProviderReportInput) => {
  const allCheckIns = [...(person.checkIns ?? [])].sort((a, b) =>
    a.occurredAt.localeCompare(b.occurredAt),
  )
  const historicalDays = 365
  const historicalCutoff = new Date()
  historicalCutoff.setDate(historicalCutoff.getDate() - historicalDays + 1)
  historicalCutoff.setHours(0, 0, 0, 0)
  const historicalCheckIns = allCheckIns.filter(
    (item) => new Date(item.occurredAt) >= historicalCutoff,
  )
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days + 1)
  cutoff.setHours(0, 0, 0, 0)
  const checkIns = [...(person.checkIns ?? [])]
    .filter((item) => new Date(item.occurredAt) >= cutoff)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  const difficult = frequencyLines({ ...person, checkIns }, 'undesired')
  const positive = frequencyLines({ ...person, checkIns }, 'desired')
  const recentCutoff = new Date()
  recentCutoff.setDate(recentCutoff.getDate() - 29)
  recentCutoff.setHours(0, 0, 0, 0)
  const recentCheckIns = checkIns.filter(
    (item) => new Date(item.occurredAt) >= recentCutoff,
  )
  const sixtyDayCutoff = new Date()
  sixtyDayCutoff.setDate(sixtyDayCutoff.getDate() - 59)
  sixtyDayCutoff.setHours(0, 0, 0, 0)
  const sixtyDayCheckIns = checkIns.filter(
    (item) => new Date(item.occurredAt) >= sixtyDayCutoff,
  )
  const frequencyReferences = [
    {
      label: 'historical baseline',
      items: frequencyLines(
        { ...person, checkIns: historicalCheckIns },
        'undesired',
      ),
      positiveItems: frequencyLines(
        { ...person, checkIns: historicalCheckIns },
        'desired',
      ),
      total: historicalCheckIns.length,
    },
    {
      label: 'baseline',
      items: difficult,
      positiveItems: positive,
      total: checkIns.length,
    },
    {
      label: 'relevant baseline',
      items: frequencyLines({ ...person, checkIns: sixtyDayCheckIns }, 'undesired'),
      positiveItems: frequencyLines({ ...person, checkIns: sixtyDayCheckIns }, 'desired'),
      total: sixtyDayCheckIns.length,
    },
  ]
  const recentDifficult = compareFrequencies(
    frequencyLines({ ...person, checkIns: recentCheckIns }, 'undesired'),
    recentCheckIns.length,
    frequencyReferences.map(({ label, items, total }) => ({
      label,
      items,
      total,
    })),
    'undesired',
  )
  const recentPositive = compareFrequencies(
    frequencyLines({ ...person, checkIns: recentCheckIns }, 'desired'),
    recentCheckIns.length,
    frequencyReferences.map(({ label, positiveItems, total }) => ({
      label,
      items: positiveItems,
      total,
    })),
    'desired',
  )
  const notes = checkIns.flatMap((item) =>
    item.note?.trim()
      ? [{ date: dateKey(item.occurredAt), text: item.note.trim() }]
      : [],
  )
  const medicationNotes = notes.filter((item) =>
    /medicat|dose|therapy|hospital|doctor|intervention|appointment/i.test(item.text),
  )
  const difficultIds = new Set(
    (person.indicators ?? [])
      .filter(
        (indicator) => indicator.active !== false && indicator.polarity === 'undesired',
      )
      .map((indicator) => indicator.id),
  )
  const difficultCheckIns = checkIns.filter((checkIn) =>
    parseAnswers(checkIn.answersJson).checked.some((id) => difficultIds.has(id)),
  ).length
  const careDiscussion = difficultCheckIns >= 2 || medicationNotes.length > 0
  const firstDate = checkIns[0]
    ? new Date(checkIns[0].occurredAt).toLocaleDateString()
    : 'No check-ins yet'
  const lastDate = checkIns.at(-1)
    ? new Date(checkIns.at(-1)!.occurredAt).toLocaleDateString()
    : 'No check-ins yet'
  const completeness = Math.round(
    (new Set(checkIns.map((item) => new Date(item.occurredAt).toDateString())).size /
      days) *
      100,
  )
  const recentCompleteness = Math.round(
    (new Set(
      checkIns
        .filter((item) => new Date(item.occurredAt) >= recentCutoff)
        .map((item) => new Date(item.occurredAt).toDateString()),
    ).size /
      30) *
      100,
  )
  const calendarKeys = dateKeysBetween(cutoff, new Date())
  const signalObservations = dailyScores(person, checkIns)
  const signalsByDate = new Map(signalObservations.map((day) => [day.date, day]))
  const normalized = normalizeHousehold([person], {
    now: new Date(),
    windowDays: days,
    lifeEvents,
  })
  const analyticsDays =
    buildDailyScores(normalized.people, calendarKeys).personDailyScores[person.id] ?? []
  const observations: ReportDay[] = analyticsDays
    .filter((day): day is typeof day & { score: number } => day.score !== null)
    .map((day) => {
      const signals = signalsByDate.get(day.date)
      return {
        date: day.date,
        score: day.score,
        level:
          day.score >= STATUS_THRESHOLDS.good
            ? 'steady'
            : day.score >= STATUS_THRESHOLDS.trouble
              ? 'watch'
              : 'concern',
        concernSignals: signals?.concernSignals ?? 0,
        positiveSignals: signals?.positiveSignals ?? 0,
      }
    })
  const mean = (values: ReportDay[]) =>
    values.length
      ? Math.round(values.reduce((sum, day) => sum + day.score, 0) / values.length)
      : null
  const recentKey = dateKey(recentCutoff.toISOString())
  const sixtyDayKey = dateKey(sixtyDayCutoff.toISOString())
  const baseline = mean(observations)
  const recent = mean(observations.filter((day) => day.date >= recentKey))
  const sixtyDayAverage = mean(
    observations.filter((day) => day.date >= sixtyDayKey),
  )
  const allTimeDays = historicalDays
  const allTimeKeys = dateKeysBetween(historicalCutoff, new Date())
  const allTimeNormalized = normalizeHousehold([person], {
    now: new Date(),
    windowDays: allTimeDays,
    lifeEvents,
  })
  const allTimeScores =
    buildDailyScores(allTimeNormalized.people, allTimeKeys).personDailyScores[
      person.id
    ] ?? []
  const allTimeObservations: ReportDay[] = allTimeScores
    .filter((day): day is typeof day & { score: number } => day.score !== null)
    .map((day) => ({
      date: day.date,
      score: day.score,
      level:
        day.score >= STATUS_THRESHOLDS.good
          ? 'steady'
          : day.score >= STATUS_THRESHOLDS.trouble
            ? 'watch'
            : 'concern',
      concernSignals: 0,
      positiveSignals: 0,
    }))
  const allTimeAverage = mean(allTimeObservations)
  const comparisonReferences: ComparisonReference[] = [
    { label: 'historical baseline', value: allTimeAverage },
    { label: 'baseline', value: baseline },
    { label: 'relevant baseline', value: sixtyDayAverage },
    { label: 'recent baseline', value: recent },
  ]
  const wellnessComparison =
    recent === null
      ? null
      : preferredComparisonFromReferences(
          recent,
          comparisonReferences,
          'lower',
        )
  const concernRateFor = (daysToMeasure: ReportDay[]) =>
    daysToMeasure.length
      ? percentage(
          daysToMeasure.filter((day) => day.level === 'concern').length,
          daysToMeasure.length,
        )
      : null
  const sixtyDayObservations = observations.filter(
    (day) => day.date >= sixtyDayKey,
  )
  const recentReferenceObservations = observations.filter(
    (day) => day.date >= recentKey,
  )
  const concernRateReferences: ComparisonReference[] = [
    {
      label: 'historical baseline',
      value: concernRateFor(allTimeObservations),
    },
    {
      label: 'baseline',
      value: concernRateFor(observations),
    },
    {
      label: 'relevant baseline',
      value: concernRateFor(sixtyDayObservations),
    },
    {
      label: 'recent baseline',
      value: concernRateFor(recentReferenceObservations),
    },
  ]
  const observationByDate = new Map(observations.map((day) => [day.date, day]))
  const analyticsByDate = new Map(analyticsDays.map((day) => [day.date, day]))
  const weightedTrend = computeTrend(
    analyticsDays.map((day) => ({
      date: day.date,
      score: day.score,
      eventCount: day.incidentCount,
    })),
  )
  const calendarDays: ReportCalendarDay[] = calendarKeys.map((date, index) => {
    const day = observationByDate.get(date)
    const hasCheckIn = (analyticsByDate.get(date)?.checkInCount ?? 0) > 0
    return day && hasCheckIn
      ? { ...day, weightedScore: weightedTrend.points[index].rollingAverage }
      : {
          date,
          score: null,
          weightedScore: weightedTrend.points[index].rollingAverage,
          level: 'missing',
          concernSignals: 0,
          positiveSignals: 0,
        }
  })
  const difficultPeriods = findPeriods(observations, 'difficult')
  const positivePeriods = findPeriods(observations, 'positive')
  const concernDays = observations.filter((day) => day.level === 'concern').length
  const steadyDays = observations.filter((day) => day.level === 'steady').length
  const recentObservations = observations.filter((day) => day.date >= recentKey)
  const patternDynamics = derivePersonPatternDynamics(person)
  const groveScore = currentPersonGroveScore(person)
  const recentConcernDays = recentObservations.filter(
    (day) => day.level === 'concern',
  ).length
  const fullConcernRate = percentage(concernDays, observations.length)
  const recentConcernRate = percentage(recentConcernDays, recentObservations.length)
  const concernRateComparison = preferredComparisonFromReferences(
    recentConcernRate,
    concernRateReferences,
    'higher',
  )
  const significantPeriods = [
    ...difficultPeriods
      .filter((period) => period.days >= 2)
      .map(
        (period) =>
          `• Concern-range stretch: ${period.days} consecutive scored days, from ${formatDay(period.start)} through ${formatDay(period.end)}. This sustained period remains significant even when behavioral improvements were recorded in the days before or after it.`,
      ),
    ...positivePeriods
      .filter((period) => period.days >= 2)
      .map(
        (period) =>
          `• Steady-range stretch: ${period.days} consecutive scored days, from ${formatDay(period.start)} through ${formatDay(period.end)}.`,
      ),
    `• Baseline: ${concernDays} of ${observations.length} scored days were in the concern range (${fullConcernRate}%); ${observations.length - concernDays - steadyDays} of ${observations.length} were in the watch range (${percentage(observations.length - concernDays - steadyDays, observations.length)}%); and ${steadyDays} of ${observations.length} were steady (${percentage(steadyDays, observations.length)}%).`,
    ...(recentObservations.length
      ? [
          `• Recent: ${recentConcernRate}% of observations were in the concern range${concernRateComparison ? ` (${concernRateComparison.phrase})` : ''}.`,
        ]
      : []),
  ]
  const eventComparisons: EventComparison[] = lifeEvents
    .flatMap((event) => {
      const eventDates = new Set(
        checkIns
          .filter((checkIn) =>
            parseAnswers(checkIn.answersJson).events.includes(event.id),
          )
          .map((checkIn) => dateKey(checkIn.occurredAt)),
      )
      const onEvent = observations.filter((day) => eventDates.has(day.date))
      const offEvent = observations.filter((day) => !eventDates.has(day.date))
      const eventAverage = mean(onEvent)
      const otherAverage = mean(offEvent)
      if (
        onEvent.length < 2 ||
        offEvent.length < 2 ||
        eventAverage === null ||
        otherAverage === null
      )
        return []
      return [
        {
          label: event.label?.trim() || 'Event',
          eventDays: onEvent.length,
          eventAverage,
          otherAverage,
          concernDays: onEvent.filter((day) => day.level === 'concern').length,
          difference: eventAverage - otherAverage,
        },
      ]
    })
    .sort((a, b) => a.difference - b.difference || b.eventDays - a.eventDays)
  const noteworthyEventComparisons = eventComparisons
    .map((event) => ({
      event,
      comparison: preferredComparisonFromReferences(
        event.eventAverage,
        comparisonReferences,
        'lower',
      ),
    }))
    .filter(
      (
        item,
      ): item is {
        event: EventComparison
        comparison: NonNullable<
          ReturnType<typeof preferredWellnessComparison>
        >
      } => item.comparison !== null,
    )
    .sort(
      (a, b) =>
        Number(!a.comparison.adverse) - Number(!b.comparison.adverse) ||
        b.comparison.magnitude - a.comparison.magnitude ||
        b.event.eventDays - a.event.eventDays,
    )
  const eventNarrative = noteworthyEventComparisons.length
    ? noteworthyEventComparisons
        .slice(0, 3)
        .map(
          ({ event, comparison }) =>
            `• “${event.label}” was recorded on ${event.eventDays} scored days. Wellness averaged ${formatPoints(event.eventAverage)} on those days, ${comparison.phrase}. ${event.concernDays} of ${event.eventDays} event days were in the concern range (${percentage(event.concernDays, event.eventDays)}%).`,
        )
    : 'No recorded event showed a noteworthy difference from baseline.'
  const correlation = householdCorrelation(person, householdPeople, cutoff)
  const correlationNarrative = correlation
    ? correlation.strength === 'little or no'
      ? `Across ${correlation.pairedDays} observations, ${person.displayName}’s wellness had little or no correlation with the average wellness of other household members (r = ${correlation.coefficient}). The recorded scores do not show a consistent household wellness relationship; any overlapping concern observations remain descriptive only.`
      : [
        `Across ${correlation.pairedDays} observations, ${person.displayName}’s wellness had a ${correlation.strength} ${correlation.direction} correlation with the average wellness of other household members (r = ${correlation.coefficient}).`,
        correlation.direction === 'positive'
          ? `A positive correlation means their scores tended to rise and fall together.${
              correlation.concurrentConcernDays
                ? correlation.noteworthy &&
                  isHouseholdConcernOverlapNoteworthy(
                    correlation.concurrentConcernDays,
                  )
                  ? ` On ${correlation.concurrentConcernDays} days, both ${person.displayName} and the rest of the household averaged in the concern range, which is concerning household context worth discussing.`
                  : ` On ${correlation.concurrentConcernDays} ${correlation.concurrentConcernDays === 1 ? 'day' : 'days'}, both ${person.displayName} and the rest of the household averaged in the concern range; this isolated overlap is descriptive context rather than a repeated pattern.`
                : ''
            }`
          : 'A negative correlation means their scores tended to move in opposite directions.',
        correlation.noteworthy
          ? `The amount and consistency of overlap suggest ${person.displayName}’s well-being may affect, or be affected by, the broader household.`
          : '',
        'This may reflect shared circumstances or interactions.',
      ]
        .filter(Boolean)
        .join(' ')
    : 'At least 3 observations with changing scores for this person and another household member are needed to estimate household correlation.'
  const lines = [
    `GROVE CARE APPOINTMENT-PREP SUMMARY: ${person.displayName}`,
    'Personal observations only: not a diagnosis, risk assessment, or recommendation for treatment or hospitalization.',
    '',
    'COMPARISON TERMS',
    'Recent means the rolling 30-day period. Wellness points are assigned on Grove’s 0–100 scale; they are scores, not population percentiles.',
    ...(groveScore
      ? [
          'GROVE SCORE V1',
          `${groveScore.score} points. This compound score combines the recent observation-based wellness score with Pattern Strain burden, persistence, recovery difficulty, and instability. Longitudinal weights are reduced when data confidence is limited.`,
        ]
      : []),
    'DATE RANGE AND COMPLETENESS',
    `${firstDate} to ${lastDate} · ${checkIns.length} check-ins · ${completeness}% of the baseline window has recorded data · ${recentCompleteness}% of the recent window has recorded data. Missing or incomplete data is excluded from wellness scoring and trend comparisons rather than interpreted as an observation.`,
    '',
    'PATTERN STRAIN',
    `${PATTERN_STRAIN_LABELS[patternDynamics.band]}. ${patternDynamics.summary}`,
    `• Burden: ${patternDimensionLevel(patternDynamics.burden)}.`,
    `• Instability: ${patternDimensionLevel(patternDynamics.instability)}.`,
    `• Persistence: ${patternDimensionLevel(patternDynamics.persistence)}.`,
    `• Recovery difficulty: ${patternDimensionLevel(patternDynamics.recoveryDifficulty)}.`,
    ...(patternDynamics.largestDecline >= 15
      ? [
            `• Largest recent decline: ${formatPoints(patternDynamics.largestDecline)} across adjacent observed days.`,
        ]
      : []),
    `Based on ${patternDynamics.dataQuality.observedDays} recent observed days with ${patternDynamics.dataQuality.coverage}% coverage and ${patternDynamics.dataQuality.baselineDays} earlier baseline days. Confidence: ${patternDynamics.confidence}%.`,
    '',
    'RECENT COMPARED WITH BASELINE',
    recent === null
      ? 'There are not enough scored observations to compare recent data with baseline.'
      : `Recent wellness averaged ${formatPoints(recent)}${wellnessComparison ? `, ${wellnessComparison.phrase}` : ', unchanged from baseline'}. Grove Care calculates wellness scores using its proprietary weighted scoring algorithm and only the signals recorded for this person.`,
    '',
    'IMPORTANT STRETCHES OF TIME',
    ...(observations.length
      ? significantPeriods
      : [
          'There are not enough scored observations yet to identify a sustained stretch.',
        ]),
    '',
    'EVENTS AND OBSERVED ASSOCIATIONS',
    ...(Array.isArray(eventNarrative) ? eventNarrative : [eventNarrative]),
    '',
    'HOUSEHOLD WELLNESS RELATIONSHIP',
    correlationNarrative,
    '',
    'OBSERVATION SUMMARY',
    checkIns.length === 0
      ? 'No observations were recorded in this range.'
      : careDiscussion
        ? `Difficult observations were noted in ${difficultCheckIns} of ${checkIns.length} check-ins (${percentage(difficultCheckIns, checkIns.length)}%).\n\nReview the sustained periods, event associations, and individual observations with the intended professional or support person.`
        : `Difficult observations were noted in ${difficultCheckIns} of ${checkIns.length} check-ins (${percentage(difficultCheckIns, checkIns.length)}%).\n\nContinue recording meaningful changes and bring new concerns to the intended professional or support person.`,
    '',
    'RECENT CONCERNS NOTICED MOST OFTEN',
    ...(recentDifficult.some((item) => item.delta !== 0)
      ? recentDifficult.filter((item) => item.delta !== 0).map(
          (item) =>
            `• “${item.name}” was noted in ${item.recentRate}% of recent observations (${item.comparison.phrase}).`,
        )
      : ['No difficult signals changed meaningfully from baseline.']),
    '',
    'RECENT POSITIVE SIGNS NOTICED MOST OFTEN',
    ...(recentPositive.some((item) => item.delta !== 0)
      ? recentPositive.filter((item) => item.delta !== 0).map(
          (item) =>
            `• “${item.name}” was noted in ${item.recentRate}% of recent observations (${item.comparison.phrase}).`,
        )
      : ['No positive signals changed meaningfully from baseline.']),
    '',
    'DATED NOTES ABOUT EVENTS, MEDICATION, OR INTERVENTIONS',
    ...(medicationNotes.length
      ? medicationNotes
          .slice(0, 8)
          .map((note) => `• ${formatDay(note.date)}: ${note.text}`)
      : ['None specifically identified. Review the full notes for context.']),
    '',
    'ITEMS ADDED FOR THIS APPOINTMENT',
    ...(pinnedObservations.length
      ? pinnedObservations.map((item) => `• ${item.replaceAll('\n', ': ')}`)
      : ['None added.']),
    'RECENT RAW SCORED OBSERVATIONS',
    ...(recentObservations.length
      ? recentObservations.map(
          (day) =>
            `• ${formatDay(day.date)}: ${day.score} wellness ${day.score === 1 ? 'point' : 'points'} · ${day.concernSignals} concern ${day.concernSignals === 1 ? 'signal' : 'signals'} · ${day.positiveSignals} positive ${day.positiveSignals === 1 ? 'signal' : 'signals'}`,
        )
      : ['No scored observations were recorded recently.']),
    '',
    'HOW PATTERN STRAIN IS INTERPRETED',
    'Pattern Strain is a descriptive analysis of recorded burden, instability, persistence, and recovery relative to the person’s established observations. The approach is informed by longitudinal affect-dynamics and ecological momentary assessment research. It is not a diagnosis, validated risk assessment, or level-of-care recommendation.',
    `Research & Methodology in Grove: ${RESEARCH_METHODOLOGY_PATH}`,
    ...researchReferences
      .slice(0, 3)
      .map(
        (reference) =>
          `• ${reference.authors}. ${reference.title}. ${reference.journal}, ${reference.year}. PMID ${reference.pmid}. DOI ${reference.doi}.`,
      ),
    '',
    'LIMITATIONS',
    'Associations in this report may have other explanations. Entries reflect one caregiver’s observations and may be incomplete. Grove does not determine diagnosis, immediate safety, or the appropriate level of care.',
    '',
    'AI DISCLOSURE',
    'This report includes AI-generated language. Grove verifies the displayed values; the language does not diagnose or determine care.',
  ]
  return {
    text: lines.join('\n'),
    personName: person.displayName,
    checkIns,
    recentCheckIns,
    difficult,
    positive,
    recentDifficult,
    recentPositive,
    completeness,
    baseline,
    recent,
    allTimeAverage,
    sixtyDayAverage,
    comparisonReferences,
    wellnessComparison,
    concernRateReferences,
    concernRateComparison,
    allTimeObservations,
    observations,
    calendarDays,
    difficultPeriods,
    positivePeriods,
    eventNarrative,
    eventComparisons,
    householdCorrelation: correlation,
    householdCorrelationNarrative: correlationNarrative,
    patternDynamics,
    groveScore,
  }
}

export const reportCsv = (person: RawPerson) => {
  const indicators = person.indicators ?? []
  const header = ['date', 'note', ...indicators.map((indicator) => indicator.name)]
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const rows = (person.checkIns ?? []).map((checkIn) => {
    const checked = new Set(parseAnswers(checkIn.answersJson).checked)
    return [
      checkIn.occurredAt,
      checkIn.note ?? '',
      ...indicators.map((indicator) => (checked.has(indicator.id) ? 'yes' : 'no')),
    ]
  })
  return [header, ...rows].map((row) => row.map(quote).join(',')).join('\n')
}
