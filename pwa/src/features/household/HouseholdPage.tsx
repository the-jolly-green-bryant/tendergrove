import { IonChip, IonIcon } from '@ionic/react'
import {
  chevronDownOutline,
  chevronForwardOutline,
  chevronUpOutline,
} from 'ionicons/icons'
import { useMemo } from 'react'
import { useHistory } from 'react-router-dom'

import { LoadingState } from '../../components/LoadingState'
import { Page } from '../../components/Page'
import { useDateNavigator } from '../../components/DateNavigator'
import { PersonAvatar } from '../../components/PersonAvatar'
import { HouseholdTree } from '../../components/HouseholdTree'
import { useAppAuth } from '../../auth/AuthContext'
import { useSelectedDate } from '../../context/SelectedDateContext'
import { usePeople } from '../people/usePeople'
import { derivePersonStatus, todayEmoji } from '../../lib/status'
import {
  createHouseholdRecap,
  type HouseholdRecap,
  type HouseholdRecapSourcePerson,
} from '../../lib/householdRecap'
import './HouseholdPage.css'

type HouseholdPerson = HouseholdRecapSourcePerson

const SELF_CARE_QUOTES: ReadonlyArray<readonly [string, string]> = [
  ['Small steps still move you', 'toward steadier ground.'],
  ['Healing does not ask you to rush,', 'it asks you to return.'],
  ['Care for yourself with the patience', 'you so freely offer others.'],
  ['A quiet breath can become', 'a brave beginning.'],
  ['Rest is not a pause from growth,', 'it is part of growth.'],
  ['You can honor what is hard', 'without carrying it alone.'],
  ['Gentleness is a form', 'of enduring strength.'],
  ['Today only needs', 'one honest next step.'],
] as const

function randomQuoteIndex(): number {
  const values = new Uint32Array(1)
  window.crypto.getRandomValues(values)
  return values[0] % SELF_CARE_QUOTES.length
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

const renderTree = (
  people: HouseholdPerson[],
  recap: HouseholdRecap | undefined,
  onPersonClick: (personId: string) => void,
  onRecapClick: () => void,
) =>
  people.length > 0 && (
    <HouseholdTree
      showGreeting
      recap={recap}
      onPersonClick={onPersonClick}
      onRecapClick={onRecapClick}
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

function SelfCareQuote() {
  const quoteIndex = useMemo(randomQuoteIndex, [])
  const quote = SELF_CARE_QUOTES[quoteIndex]

  return (
    <aside
      className="self-care-quote"
      aria-label={`${quote[0]} ${quote[1]}`}
    >
      <span className="self-care-quote__mark">“</span>
      <p>
        <span>{quote[0]}</span>
        <span>{quote[1]}</span>
      </p>
    </aside>
  )
}

function HouseholdPersonButton({
  person,
  selectedDate,
  onClick,
}: {
  readonly person: HouseholdPerson
  readonly selectedDate: Date
  readonly onClick: () => void
}) {
  const status = derivePersonStatus(person.indicators ?? [], person.checkIns ?? [])
  const score = status.score
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
      className="household-person-btn"
      onClick={onClick}
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
      {score !== null && (
        <span
          className={`household-person-btn__score-ribbon household-person-btn__score-ribbon--${status.color}`}
        >
          {score}%
        </span>
      )}
    </button>
  )
}

function HouseholdList({
  people,
  selectedDate,
  onPersonClick,
  onAddPersonClick,
}: {
  readonly people: HouseholdPerson[]
  readonly selectedDate: Date
  readonly onPersonClick: (personId: string) => void
  readonly onAddPersonClick: () => void
}) {
  return (
    <div className="household-list">
      {people.map((person) => (
        <HouseholdPersonButton
          key={person.id}
          person={person}
          selectedDate={selectedDate}
          onClick={() => onPersonClick(person.id)}
        />
      ))}

      <button
        className="household-add-btn"
        onClick={onAddPersonClick}
        aria-label={people.length === 0 ? 'Add your first person' : 'Add person'}
      >
        <span className="household-add-btn__icon">+</span>
        {people.length === 0 && (
          <span className="household-add-btn__copy">Add your first person</span>
        )}
      </button>
    </div>
  )
}

function scrollToHouseholdList() {
  document
    .getElementById('household-people-panel')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function scrollToHouseholdHero() {
  document
    .getElementById('household-hero-panel')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function HouseholdDashboardBody({
  people,
  recap,
  selectedDate,
  onPersonClick,
  onRecapClick,
  onAddPersonClick,
}: {
  readonly people: HouseholdPerson[]
  readonly recap: HouseholdRecap | undefined
  readonly selectedDate: Date
  readonly onPersonClick: (personId: string) => void
  readonly onRecapClick: () => void
  readonly onAddPersonClick: () => void
}) {
  return (
    <div className="household-snap">
      <section
        id="household-hero-panel"
        className="household-snap-panel household-hero-panel"
      >
        <SelfCareQuote />
        {renderTree(people, recap, onPersonClick, onRecapClick)}
        {people.length > 0 && (
          <button
            type="button"
            className="household-scroll-cue"
            onClick={scrollToHouseholdList}
            aria-label="View household members"
          >
            <IonIcon icon={chevronDownOutline} />
          </button>
        )}
      </section>

      <section
        id="household-people-panel"
        className="household-snap-panel household-people-panel"
      >
        <button
          type="button"
          className="household-scroll-cue household-scroll-cue--up"
          onClick={scrollToHouseholdHero}
          aria-label="View household overview"
        >
          <IonIcon icon={chevronUpOutline} />
        </button>
        <HouseholdList
          people={people}
          selectedDate={selectedDate}
          onPersonClick={onPersonClick}
          onAddPersonClick={onAddPersonClick}
        />
        <footer className="household-legal">
          <p>Copyright 2026 Bryant James. All rights reserved.</p>
          <p>
            App-generated insights are informational only and do not constitute medical,
            clinical, legal, or professional advice.
          </p>
        </footer>
      </section>
    </div>
  )
}

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
      className="household-dashboard-content"
      transparentHeaderUntilScroll
      transparentHeaderMode="snap-panel"
    >
      {people.isLoading && <LoadingState />}
      {people.error && <p className="ion-padding">Failed to load people.</p>}

      <HouseholdDashboardBody
        people={activePeople}
        recap={householdRecap}
        selectedDate={selectedDate}
        onPersonClick={(personId) => history.push(`/person/${personId}`)}
        onRecapClick={() => history.push('/household/recap')}
        onAddPersonClick={() => history.push('/people/new')}
      />
    </Page>
  )
}
