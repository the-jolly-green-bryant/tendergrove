import { computeScore, statusFromScore } from './status'
import { householdGreetingText } from './greeting'
import { isSameLocalDay, toLocalDateKey } from './dateKeys'
import { RawPerson } from '../features/patterns/analytics'

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

const latestCheckInForDate = (
  person: RawPerson,
  dateKey: string,
): HouseholdRecapCheckIn | undefined =>
  (person.checkIns ?? [])
    .filter((checkIn) => dateKeyFromIso(checkIn.occurredAt) === dateKey)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]

const scoreForCheckIn = (
  person: RawPerson,
  checkIn: HouseholdRecapCheckIn | undefined,
): number | null => {
  if (!checkIn) return null
  return computeScore(person.indicators ?? [], {
    occurredAt: checkIn.occurredAt,
    answersJson: checkIn.answersJson,
  })
}

const latestScoreableCheckIn = (
  person: RawPerson,
  dateKey: string,
): HouseholdRecapCheckIn | undefined =>
  [...(person.checkIns ?? [])]
    .filter((checkIn) => dateKeyFromIso(checkIn.occurredAt) <= dateKey)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .find((checkIn) => scoreForCheckIn(person, checkIn) !== null)

const recapPersonFromScore = (
  person: RawPerson,
  score: number | null,
  requiresCheckIn: boolean,
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
  }
}

const scorePersonForRecap = (
  person: RawPerson,
  dateKey: string,
): HouseholdRecapPerson => {
  const todayScore = scoreForCheckIn(person, latestCheckInForDate(person, dateKey))
  const requiresCheckIn = todayScore === null
  const latestScore = requiresCheckIn
    ? scoreForCheckIn(person, latestScoreableCheckIn(person, dateKey))
    : todayScore

  return recapPersonFromScore(person, latestScore, requiresCheckIn)
}

const byLowestKnownScore = (a: HouseholdRecapPerson, b: HouseholdRecapPerson) =>
  (a.score ?? 101) - (b.score ?? 101)

const byHighestKnownScore = (a: HouseholdRecapPerson, b: HouseholdRecapPerson) =>
  (b.score ?? -1) - (a.score ?? -1)

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
    .filter((person) => person.level === 'good')
    .sort(byHighestKnownScore)
  const needsCare = recapPeople
    .filter((person) => person.level === 'trouble' || person.level === 'at-risk')
    .sort(byLowestKnownScore)
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
