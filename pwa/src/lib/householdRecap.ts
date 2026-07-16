import { computeScore, STATUS_THRESHOLDS, statusFromScore } from './status'
import { householdGreetingText } from './greeting'
import { isSameLocalDay, toLocalDateKey } from './dateKeys'
import {
  normalizeHousehold,
  parseAnswers,
  RawPerson,
  scorePersonDay,
} from '../features/patterns/analytics'

/** Raw check-in data needed to score a recap person. */
export interface HouseholdRecapCheckIn {
  occurredAt: string
  answersJson?: unknown
}

/** Indicator metadata used by check-in scoring. */
export interface HouseholdRecapIndicator {
  id: string
  polarity: string | null
  active?: boolean | null
}

/** A single person's status inside the household recap. */
export interface HouseholdRecapPerson {
  id: string
  displayName: string
  avatarUrl?: string | null
  score: number | null
  label: string
  level: 'good' | 'trouble' | 'at-risk' | 'unknown'
  emoji: string
  requiresCheckIn?: boolean
  /** Higher means this person may benefit from attention sooner. */
  attentionPriority: number | null
  attentionReason?: string
  needsAttention: boolean
}

/** Data used to render the compact household recap and its wrapped page. */
export interface HouseholdRecap {
  eyebrow: string
  title: string
  dateLabel: string
  requiredDateLabel: string
  summary: string
  featuredPerson?: HouseholdRecapPerson
  doingWell: HouseholdRecapPerson[]
  needsCare: HouseholdRecapPerson[]
  noData: HouseholdRecapPerson[]
  checkInsRequired: HouseholdRecapPerson[]
}

const dateKeyFromIso = (iso: string): string => toLocalDateKey(new Date(iso))

const formatRecapDateLabel = (dateKey: string): string => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

const scoreForCheckIns = (
  person: RawPerson,
  checkIns: HouseholdRecapCheckIn[],
): number | null => {
  if (checkIns.length === 0) return null
  const checked = new Set(
    checkIns.flatMap((checkIn) => parseAnswers(checkIn.answersJson).checked),
  )
  return computeScore(person.indicators ?? [], {
    occurredAt: checkIns[0].occurredAt,
    answersJson: { checked: [...checked] },
  })
}

const scoreForDate = (person: RawPerson, dateKey: string): number | null =>
  scorePersonDay(normalizeHousehold([person]).people[0], dateKey).score

interface ScoredCheckInDay {
  dateKey: string
  score: number
}

const AFTERCARE_DAYS = 14

const scoredHistoryThroughDate = (
  person: RawPerson,
  dateKey: string,
): ScoredCheckInDay[] => {
  const seenDays = new Set<string>()
  const history: ScoredCheckInDay[] = []
  const dataDays = new Set<string>()

  for (const checkIn of person.checkIns ?? []) {
    const checkInDateKey = dateKeyFromIso(checkIn.occurredAt)
    if (checkInDateKey > dateKey) continue
    dataDays.add(checkInDateKey)
  }
  for (const event of person.events ?? []) {
    if (!event || event.type !== 'incident') continue
    const eventDateKey = dateKeyFromIso(event.occurredAt)
    if (eventDateKey <= dateKey) {
      dataDays.add(eventDateKey)
    }
  }

  for (const checkInDateKey of [...dataDays].sort((a, b) => b.localeCompare(a))) {
    if (seenDays.has(checkInDateKey)) continue
    const score = scoreForDate(person, checkInDateKey)
    if (score !== null) {
      seenDays.add(checkInDateKey)
      history.push({ dateKey: checkInDateKey, score })
    }
  }

  return history
}

const average = (values: number[]): number =>
  Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle]
}

const attentionForPerson = (
  person: RawPerson,
  dateKey: string,
  currentScore: number | null,
): Pick<
  HouseholdRecapPerson,
  'attentionPriority' | 'attentionReason' | 'needsAttention'
> => {
  if (currentScore === null) {
    return { attentionPriority: null, needsAttention: false }
  }

  const history = scoredHistoryThroughDate(person, dateKey)
  const selectedDate = new Date(`${dateKey}T12:00:00`)
  const daysBeforeSelectedDate = (historyDateKey: string): number => {
    const historyDate = new Date(`${historyDateKey}T12:00:00`)
    return Math.round(
      (selectedDate.getTime() - historyDate.getTime()) / (1000 * 60 * 60 * 24),
    )
  }
  const recentHistory = history.filter(
    ({ dateKey: historyDateKey }) =>
      daysBeforeSelectedDate(historyDateKey) < AFTERCARE_DAYS,
  )
  // A median resists being pulled down by one or two unusually hard days,
  // making it a better representation of this person's personal norm.
  const baselineScores = history.slice(1, 31).map(({ score }) => score)
  const baseline = baselineScores.length >= 3 ? median(baselineScores) : null
  const drop = baseline === null ? 0 : Math.max(0, baseline - currentScore)
  const recentAverage =
    recentHistory.length === 0
      ? currentScore
      : average(recentHistory.map(({ score }) => score))
  const recentDecline =
    baseline === null ? 0 : Math.max(0, baseline - recentAverage)

  let needsCareStreak = 0
  for (const { score } of history) {
    if (score >= STATUS_THRESHOLDS.good) break
    needsCareStreak++
  }

  const currentDistress = 100 - currentScore
  const streakPressure = Math.min(needsCareStreak / 3, 1) * 100
  const recentAftercare =
    baseline === null
      ? 0
      : Math.max(
          0,
          ...recentHistory.map(({ dateKey: historyDateKey, score }) => {
            const recency =
              (AFTERCARE_DAYS - daysBeforeSelectedDate(historyDateKey)) /
              AFTERCARE_DAYS
            const personalDrop = Math.max(0, baseline - score)
            const crisisDepth = Math.max(0, 40 - score)
            return crisisDepth === 0
              ? 0
              : (personalDrop * 0.25 + crisisDepth * 2) * recency
          }),
        )
  const recentPressure =
    (100 - recentAverage) * 0.2 + recentDecline * 0.9
  const attentionPriority = Math.round(
    currentDistress * 0.4 +
      drop * 0.25 +
      streakPressure * 0.1 +
      recentPressure +
      recentAftercare,
  )
  const needsAttention =
    currentScore < STATUS_THRESHOLDS.good ||
    recentAverage < 70 ||
    recentDecline >= 15 ||
    recentAftercare >= 12

  if (
    currentScore >= STATUS_THRESHOLDS.good &&
    (recentAverage < 70 || recentDecline >= 15 || recentAftercare >= 12)
  ) {
    return {
      attentionPriority,
      needsAttention,
      attentionReason: `${person.displayName}'s recent wellness has been well below their usual range, so some follow-up care may help even though the latest check-in improved.`,
    }
  }

  if (drop >= 20) {
    return {
      attentionPriority,
      needsAttention,
      attentionReason: `${person.displayName}'s wellness dropped ${drop} points from their recent baseline.`,
    }
  }
  if (currentScore < STATUS_THRESHOLDS.good && needsCareStreak >= 2) {
    return {
      attentionPriority,
      needsAttention,
      attentionReason: `${person.displayName} has consistently remained in the needs-care range recently.`,
    }
  }
  return {
    attentionPriority,
    needsAttention,
    attentionReason: `${person.displayName}'s latest wellness score suggests some extra care may help.`,
  }
}

const recapPersonFromScore = (
  person: RawPerson,
  score: number | null,
  requiresCheckIn: boolean,
  dateKey: string,
): HouseholdRecapPerson => {
  const status = statusFromScore(score)
  const emojiByLevel = {
    good: '😎',
    trouble: '🫤',
    'at-risk': '😟',
    unknown: '○',
  } as const

  return {
    id: person.id,
    displayName: person.displayName,
    avatarUrl: person.avatarUrl,
    score,
    label: status.label,
    level: status.level,
    emoji: emojiByLevel[status.level],
    requiresCheckIn,
    ...attentionForPerson(person, dateKey, score),
  }
}

const scorePersonForRecap = (
  person: RawPerson,
  dateKey: string,
): HouseholdRecapPerson => {
  const history = scoredHistoryThroughDate(person, dateKey)
  const todayScore = scoreForDate(person, dateKey)
  const todayCheckIns = (person.checkIns ?? []).filter(
    (checkIn) => dateKeyFromIso(checkIn.occurredAt) === dateKey,
  )
  const requiresCheckIn = scoreForCheckIns(person, todayCheckIns) === null
  const latestScore = requiresCheckIn ? (history[0]?.score ?? null) : todayScore

  return recapPersonFromScore(person, latestScore, requiresCheckIn, dateKey)
}

const byLowestKnownScore = (a: HouseholdRecapPerson, b: HouseholdRecapPerson) =>
  (a.score ?? 101) - (b.score ?? 101)

const byHighestKnownScore = (a: HouseholdRecapPerson, b: HouseholdRecapPerson) =>
  (b.score ?? -1) - (a.score ?? -1)

const byHighestAttentionPriority = (
  a: HouseholdRecapPerson,
  b: HouseholdRecapPerson,
) =>
  (b.attentionPriority ?? -1) - (a.attentionPriority ?? -1) ||
  byLowestKnownScore(a, b)

const datedRecapTitle = (
  selectedDate: Date,
  dateKey: string,
  hasRequiredCheckIns: boolean,
): string => {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const noun = hasRequiredCheckIns ? 'Check-In' : 'Recap'

  if (isSameLocalDay(selectedDate, today)) return `Today's ${noun}`
  if (isSameLocalDay(selectedDate, yesterday)) return `Yesterday's ${noun}`
  return `${formatRecapDateLabel(dateKey)}'s ${noun.toLowerCase()}`
}

export const createHouseholdRecap = (
  people: RawPerson[],
  selectedDate: Date = new Date(),
): HouseholdRecap | undefined => {
  if (people.length === 0) return undefined

  const dateKey = toLocalDateKey(selectedDate)
  const isViewingToday = isSameLocalDay(selectedDate, new Date())
  const recapPeople = people.map((person) => scorePersonForRecap(person, dateKey))
  const doingWell = recapPeople
    .filter((person) => person.level === 'good' && !person.needsAttention)
    .sort(byHighestKnownScore)
  const needsCare = recapPeople
    .filter((person) => person.needsAttention)
    .sort(byHighestAttentionPriority)
  const noData = recapPeople.filter((person) => person.level === 'unknown')
  const checkInsRequired = recapPeople.filter((person) => person.requiresCheckIn)
  const featuredPerson = needsCare[0] ?? [...doingWell].sort(byLowestKnownScore)[0]
  const selfPerson = people.find((person) => person.role === 'self')

  return {
    eyebrow: isViewingToday
      ? householdGreetingText(selfPerson?.displayName)
      : formatRecapDateLabel(dateKey),
    title: datedRecapTitle(selectedDate, dateKey, checkInsRequired.length > 0),
    dateLabel: isViewingToday ? 'Latest status' : formatRecapDateLabel(dateKey),
    requiredDateLabel: formatRecapDateLabel(dateKey),
    summary: `${doingWell.length} doing well. ${needsCare.length} need care. ${checkInsRequired.length} check-ins required.`,
    featuredPerson,
    doingWell,
    needsCare,
    noData,
    checkInsRequired,
  }
}
