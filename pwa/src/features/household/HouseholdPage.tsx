import { IonChip, IonIcon } from '@ionic/react'
import { chevronForwardOutline } from 'ionicons/icons'
import { useMemo } from 'react'
import { useHistory } from 'react-router-dom'

import { LoadingState } from '../../components/LoadingState'
import { Page } from '../../components/Page'
import { useDateNavigator } from '../../components/DateNavigator'
import { PersonAvatar } from '../../components/PersonAvatar'
import {
  HouseholdTree,
  type HouseholdRecap,
  type HouseholdRecapPerson,
} from '../../components/HouseholdTree'
import { useAppAuth } from '../../auth/AuthContext'
import { useSelectedDate } from '../../context/SelectedDateContext'
import { usePeople } from '../people/usePeople'
import {
  computeScore,
  derivePersonStatus,
  statusFromScore,
  todayEmoji,
} from '../../lib/status'

interface HouseholdCheckIn {
  occurredAt: string
  answersJson?: unknown
}

interface HouseholdIndicator {
  id: string
  polarity: string | null
  active?: boolean | null
}

interface HouseholdPerson {
  id: string
  displayName: string
  avatarUrl?: string | null
  role?: string | null
  archived?: boolean | null
  indicators?: HouseholdIndicator[] | null
  checkIns?: HouseholdCheckIn[] | null
}

/** True when an ISO datetime string falls on the given local calendar date. */
function isSameDay(occurredAt: string, date: Date): boolean {
  const d = new Date(occurredAt)
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  )
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
  person: HouseholdPerson,
  dateKey: string,
): HouseholdCheckIn | undefined {
  return (person.checkIns ?? [])
    .filter((checkIn) => dateKeyFromIso(checkIn.occurredAt) === dateKey)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
}

function scorePersonForDate(
  person: HouseholdPerson,
  dateKey: string,
): HouseholdRecapPerson {
  const checkIn = latestCheckInForDate(person, dateKey)
  const score = checkIn
    ? computeScore(person.indicators ?? [], {
        occurredAt: checkIn.occurredAt,
        answersJson: checkIn.answersJson,
      })
    : null
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
  }
}

function chooseRecapDateKey(people: HouseholdPerson[], now = new Date()): string {
  const todayKey = toDateKey(now)
  const hasCompleteToday =
    people.length > 0 &&
    people.every((person) => scorePersonForDate(person, todayKey).score !== null)

  if (hasCompleteToday) {
    return todayKey
  }

  const previousDateKeys = new Set<string>()
  for (const person of people) {
    for (const checkIn of person.checkIns ?? []) {
      const dateKey = dateKeyFromIso(checkIn.occurredAt)
      if (dateKey < todayKey) {
        previousDateKeys.add(dateKey)
      }
    }
  }

  return Array.from(previousDateKeys).sort((a, b) => b.localeCompare(a))[0] ?? todayKey
}

function createHouseholdRecap(people: HouseholdPerson[]): HouseholdRecap | undefined {
  if (people.length === 0) return undefined

  const dateKey = chooseRecapDateKey(people)
  const recapPeople = people.map((person) => scorePersonForDate(person, dateKey))
  const doingWell = recapPeople.filter((person) => person.level === 'good')
  const needsCare = recapPeople.filter(
    (person) => person.level === 'trouble' || person.level === 'at-risk',
  )
  const noData = recapPeople.filter((person) => person.level === 'unknown')
  const featuredPerson =
    [...needsCare].sort((a, b) => (a.score ?? 101) - (b.score ?? 101))[0] ??
    noData[0] ??
    [...doingWell].sort((a, b) => (a.score ?? 101) - (b.score ?? 101))[0]
  const selfPerson = people.find((person) => person.role === 'self')

  return {
    eyebrow: selfPerson ? `Hi, ${selfPerson.displayName}` : 'Your household',
    title: "Today's Household Recap",
    dateLabel: formatRecapDateLabel(dateKey),
    summary: `${doingWell.length} doing well. ${needsCare.length} need care. ${noData.length} missing check-ins.`,
    featuredPerson,
    doingWell,
    needsCare,
    noData,
  }
}

const renderTree = (
  people: HouseholdPerson[],
  recap: HouseholdRecap | undefined,
  onPersonClick: (personId: string) => void,
) =>
  people.length > 0 && (
    <HouseholdTree
      showGreeting
      recap={recap}
      onPersonClick={onPersonClick}
      people={people.map((person) => ({
        id: person.id,
        displayName: person.displayName,
        avatarUrl: person.avatarUrl,
        energy:
          derivePersonStatus(person.indicators ?? [], person.checkIns ?? []).score ??
          100,
        isSelf: person.role === 'self',
      }))}
    />
  )

/**
 * Depicts an overview of the status of all household members. Also indicates to users
 *  if a check-in is required for certain household members.
 * @returns {React.JSX.Element}
 * @constructor
 */
export default function HouseholdPage() {
  const { user } = useAppAuth()
  if (!user) {
    throw new Error('Redirect back to login')
  }

  const people = usePeople()
  const history = useHistory()

  const { selectedDate, setSelectedDate } = useSelectedDate()

  const activePeople = useMemo(
    () => (people.data ?? []).filter((p) => !p.archived),
    [people.data],
  )

  const householdRecap = useMemo(
    () => createHouseholdRecap(activePeople),
    [activePeople],
  )

  /** Collect all unique YYYY-MM-DD strings that have any check-in. */
  const eventDates = useMemo(
    () =>
      new Set<string>(
        ...(people.data ?? []).map((person) =>
          (person.checkIns ?? []).map((ci) =>
            new Date(ci.occurredAt).toISOString().slice(0, 10),
          ),
        ),
      ),
    [people.data],
  )

  const { headerElement, calendarElement } = useDateNavigator({
    date: selectedDate,
    onChange: setSelectedDate,
    eventDates,
  })

  return (
    <Page
      title="Home"
      headerContent={headerElement}
      subHeaderContent={calendarElement}
      disablePadding
    >
      {people.isLoading && <LoadingState />}
      {people.error && <p className="ion-padding">Failed to load people.</p>}

      {/* Household Tree */}
      {renderTree(activePeople, householdRecap, (personId) =>
        history.push(`/person/${personId}`),
      )}

      <div className="household-list ion-padding">
        {activePeople.map((person) => {
          const status = derivePersonStatus(
            person.indicators ?? [],
            person.checkIns ?? [],
          )
          const emoji = todayEmoji(
            person.indicators ?? [],
            person.checkIns ?? [],
            new Date(),
            person.id,
          )
          const hasCheckIn = (person.checkIns ?? []).some((ci) =>
            isSameDay(ci.occurredAt, selectedDate),
          )
          return (
            <button
              key={person.id}
              className="household-person-btn"
              onClick={() => history.push(`/person/${person.id}`)}
            >
              <div className="avatar-emoji-wrapper">
                <PersonAvatar
                  name={person.displayName}
                  src={person.avatarUrl}
                  className="household-person-btn__avatar"
                />
                {emoji && <span className="avatar-emoji-badge">{emoji}</span>}
              </div>
              <div className="household-person-btn__info">
                <span className="household-person-btn__name">
                  {person.displayName}
                  {person.role === 'self' && ' (You)'}
                </span>
                <div className="household-person-btn__chips">
                  <IonChip className={`household-chip household-chip--${status.color}`}>
                    <span
                      className={`household-person-btn__dot household-person-btn__dot--${status.color}`}
                    />
                    {status.label}
                  </IonChip>

                  {!hasCheckIn && (
                    <IonChip className="household-chip household-chip--needs-checkin">
                      Needs Check-In
                    </IonChip>
                  )}
                </div>
              </div>
              <IonIcon
                icon={chevronForwardOutline}
                className="household-person-btn__chevron"
              />
            </button>
          )
        })}

        <button
          className="household-add-btn"
          onClick={() => history.push('/people/new')}
        >
          + Add Person
        </button>
      </div>
    </Page>
  )
}
