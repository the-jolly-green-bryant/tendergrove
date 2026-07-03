import { computeScore, statusFromScore } from './status'
import { householdGreetingText } from './greeting'

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

/** Person data needed to build the household recap. */
export interface HouseholdRecapSourcePerson {
  id: string
  displayName: string
  avatarUrl?: string | null
  role?: string | null
  archived?: boolean | null
  indicators?: HouseholdRecapIndicator[] | null
  checkIns?: HouseholdRecapCheckIn[] | null
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

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateKeyFromIso(iso: string): string {
  return toDateKey(new Date(iso))
}

function formatRecapDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function latestCheckInForDate(
  person: HouseholdRecapSourcePerson,
  dateKey: string,
): HouseholdRecapCheckIn | undefined {
  return (person.checkIns ?? [])
    .filter((checkIn) => dateKeyFromIso(checkIn.occurredAt) === dateKey)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
}

function scoreForCheckIn(
  person: HouseholdRecapSourcePerson,
  checkIn: HouseholdRecapCheckIn | undefined,
): number | null {
  if (!checkIn) return null
  return computeScore(person.indicators ?? [], {
    occurredAt: checkIn.occurredAt,
    answersJson: checkIn.answersJson,
  })
}

function latestScoreableCheckIn(
  person: HouseholdRecapSourcePerson,
): HouseholdRecapCheckIn | undefined {
  return [...(person.checkIns ?? [])]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .find((checkIn) => scoreForCheckIn(person, checkIn) !== null)
}

function recapPersonFromScore(
  person: HouseholdRecapSourcePerson,
  score: number | null,
  requiresCheckIn: boolean,
): HouseholdRecapPerson {
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

function scorePersonForRecap(
  person: HouseholdRecapSourcePerson,
  todayKey: string,
): HouseholdRecapPerson {
  const todayScore = scoreForCheckIn(person, latestCheckInForDate(person, todayKey))
  const requiresCheckIn = todayScore === null
  const latestScore = requiresCheckIn
    ? scoreForCheckIn(person, latestScoreableCheckIn(person))
    : todayScore

  return recapPersonFromScore(person, latestScore, requiresCheckIn)
}

const byLowestKnownScore = (a: HouseholdRecapPerson, b: HouseholdRecapPerson) =>
  (a.score ?? 101) - (b.score ?? 101)

const byHighestKnownScore = (a: HouseholdRecapPerson, b: HouseholdRecapPerson) =>
  (b.score ?? -1) - (a.score ?? -1)

/**
 * Builds a household recap from today's check-in requirements and latest statuses.
 * @param people Active household members to include.
 * @returns Recap data, or undefined when there are no people.
 */
export function createHouseholdRecap(
  people: HouseholdRecapSourcePerson[],
): HouseholdRecap | undefined {
  if (people.length === 0) return undefined

  const todayKey = toDateKey(new Date())
  const recapPeople = people.map((person) => scorePersonForRecap(person, todayKey))
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
    eyebrow: householdGreetingText(selfPerson?.displayName),
    title: checkInsRequired.length > 0 ? "Today's Check-In" : "Today's Recap",
    dateLabel: 'Latest status',
    requiredDateLabel: formatRecapDateLabel(todayKey),
    summary: `${doingWell.length} doing well. ${needsCare.length} need care. ${checkInsRequired.length} check-ins required.`,
    featuredPerson,
    doingWell,
    needsCare,
    noData,
    checkInsRequired,
  }
}
