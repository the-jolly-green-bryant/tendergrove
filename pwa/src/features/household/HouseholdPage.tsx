import { IonChip, IonIcon, IonSkeletonText } from '@ionic/react'
import { chevronForwardOutline } from 'ionicons/icons'
import { useMemo } from 'react'
import { useHistory } from 'react-router-dom'
import { LoadErrorState } from '../../components/LoadErrorState'

import { IllustratedHeaderTitle, Page } from '../../components/Page'
import { useDateNavigator } from '../../components/DateNavigator'
import { PastDataNotice } from '../../components/PastDataNotice'
import { PersonAvatar } from '../../components/PersonAvatar'
import { HouseholdRecapTeaser, HouseholdTree } from '../../components/HouseholdTree'
import { useAppAuth } from '../../auth/AuthContext'
import { useSelectedDate } from '../../context/SelectedDateContext'
import { usePeople } from '../people/usePeople'
import { derivePersonStatus, todayEmoji } from '../../lib/status'
import { createHouseholdRecap, type HouseholdRecap } from '../../lib/householdRecap'
import { isSameLocalDay, toLocalDateKey } from '../../lib/dateKeys'
import './HouseholdPage.scss'
import { RawPerson } from '../patterns/analytics'

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

const randomQuoteIndex = (): number => {
  const values = new Uint32Array(1)
  window.crypto.getRandomValues(values)
  return values[0] % SELF_CARE_QUOTES.length
}

const HouseholdDashboardLoading = () => (
  <div
    className="household-dashboard-loading"
    aria-label="Loading household"
  >
    <section className="household-dashboard-loading__hero">
      <IonSkeletonText
        animated
        className="household-dashboard-loading__eyebrow"
      />
      <IonSkeletonText
        animated
        className="household-dashboard-loading__title"
      />
      <IonSkeletonText
        animated
        className="household-dashboard-loading__tree"
      />
    </section>
    <IonSkeletonText
      animated
      className="household-dashboard-loading__action"
    />
    <IonSkeletonText
      animated
      className="household-dashboard-loading__quote"
    />
    <IonSkeletonText
      animated
      className="household-dashboard-loading__heading"
    />
    {[0, 1, 2].map((item) => (
      <IonSkeletonText
        animated
        className="household-dashboard-loading__person"
        key={item}
      />
    ))}
  </div>
)

const renderTree = (
  people: RawPerson[],
  recap: HouseholdRecap | undefined,
  selectedDate: Date,
  isTimeTravel: boolean,
  selectedDateHasData: boolean,
  onPersonClick: (personId: string) => void,
  onRecapClick: () => void,
) =>
  people.length > 0 && (
    <HouseholdTree
      recap={recap}
      showFooter={false}
      isTimeTravel={isTimeTravel}
      selectedDateHasData={selectedDateHasData}
      onPersonClick={onPersonClick}
      onRecapClick={onRecapClick}
      people={people.map((person) => ({
        id: person.id,
        displayName: person.displayName,
        avatarUrl: person.avatarUrl,
        energy:
          derivePersonStatus(
            person.indicators ?? [],
            person.checkIns ?? [],
            selectedDate,
          ).score ?? 100,
        isSelf: person.role === 'self',
      }))}
    />
  )

const SelfCareQuote = () => {
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

const RawPersonButton = ({
  person,
  selectedDate,
  onClick,
}: {
  readonly person: RawPerson
  readonly selectedDate: Date
  readonly onClick: () => void
}) => {
  const status = derivePersonStatus(
    person.indicators ?? [],
    person.checkIns ?? [],
    selectedDate,
  )
  const score = status.score
  const emoji = todayEmoji(
    person.indicators ?? [],
    person.checkIns ?? [],
    selectedDate,
    person.id,
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

const HouseholdList = ({
  people,
  selectedDate,
  onPersonClick,
  onAddPersonClick,
}: {
  readonly people: RawPerson[]
  readonly selectedDate: Date
  readonly onPersonClick: (personId: string) => void
  readonly onAddPersonClick: () => void
}) => (
  <div className="household-list">
    {people.map((person) => (
      <RawPersonButton
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
      <span className="household-add-btn__copy">
        {people.length === 0 ? 'Add your first person' : 'Add another person'}
      </span>
      <IonIcon
        icon={chevronForwardOutline}
        className="household-add-btn__chevron"
      />
    </button>
  </div>
)

const HouseholdHeroPanel = ({
  people,
  recap,
  selectedDate,
  isTimeTravel,
  selectedDateHasData,
  onPersonClick,
  onRecapClick,
  onReturnToToday,
}: {
  readonly people: RawPerson[]
  readonly recap: HouseholdRecap | undefined
  readonly selectedDate: Date
  readonly isTimeTravel: boolean
  readonly selectedDateHasData: boolean
  readonly onPersonClick: (personId: string) => void
  readonly onRecapClick: () => void
  readonly onReturnToToday: () => void
}) => {
  const selectedDateLabel = selectedDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

  return (
    <section
      id="household-hero-panel"
      className="household-snap-panel household-hero-panel"
    >
      {isTimeTravel && (
        <PastDataNotice
          selectedDateLabel={selectedDateLabel}
          onReturnToToday={onReturnToToday}
          className="past-data-notice--page"
        />
      )}
      <div className="household-overview-card">
        <header className="household-overview-heading">
          <div>
            <p>Today at a glance</p>
            <h1>Household wellbeing</h1>
          </div>
          <span className="household-overview-heading__date">
            {selectedDate.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </header>
        {renderTree(
          people,
          recap,
          selectedDate,
          isTimeTravel,
          selectedDateHasData,
          onPersonClick,
          onRecapClick,
        )}
      </div>
      {recap && (
        <HouseholdRecapTeaser
          recap={recap}
          isTimeTravel={isTimeTravel}
          emptyPastDate={isTimeTravel && !selectedDateHasData}
          onRecapClick={onRecapClick}
        />
      )}
      {!isTimeTravel && <SelfCareQuote />}
    </section>
  )
}

const HouseholdDashboardBody = ({
  people,
  recap,
  selectedDate,
  isTimeTravel,
  selectedDateHasData,
  onPersonClick,
  onRecapClick,
  onAddPersonClick,
  onReturnToToday,
}: {
  readonly people: RawPerson[]
  readonly recap: HouseholdRecap | undefined
  readonly selectedDate: Date
  readonly isTimeTravel: boolean
  readonly selectedDateHasData: boolean
  readonly onPersonClick: (personId: string) => void
  readonly onRecapClick: () => void
  readonly onAddPersonClick: () => void
  readonly onReturnToToday: () => void
}) => (
  <div className="household-snap">
    <HouseholdHeroPanel
      people={people}
      recap={recap}
      selectedDate={selectedDate}
      isTimeTravel={isTimeTravel}
      selectedDateHasData={selectedDateHasData}
      onPersonClick={onPersonClick}
      onRecapClick={onRecapClick}
      onReturnToToday={onReturnToToday}
    />

    <section
      id="household-people-panel"
      className="household-snap-panel household-people-panel"
    >
      <header className="household-people-panel__heading">
        <p>Your household</p>
        <h1>People you care for</h1>
      </header>
      <HouseholdList
        people={people}
        selectedDate={selectedDate}
        onPersonClick={onPersonClick}
        onAddPersonClick={onAddPersonClick}
      />
      <footer className="household-legal">
        <p className="household-legal__copyright">
          Copyright 2026 Bryant James. All rights reserved.
        </p>
        <p>
          App-generated insights are informational only and do not constitute medical,
          clinical, legal, or professional advice.
        </p>
      </footer>
    </section>
  </div>
)

const HouseholdPage = () => {
  const { user } = useAppAuth()
  if (!user) {
    throw new Error('Redirect back to login')
  }

  const people = usePeople()
  const history = useHistory()

  const { selectedDate, setSelectedDate } = useSelectedDate()
  const isViewingToday = isSameLocalDay(selectedDate, new Date())
  const isTimeTravel = !isViewingToday
  const selectedDateKey = toLocalDateKey(selectedDate)

  const activePeople: RawPerson[] = useMemo(
    () => (people.data ?? []).filter((p: RawPerson) => !p.archived),
    [people.data],
  )

  const householdRecap = useMemo(
    () => createHouseholdRecap(activePeople, selectedDate),
    [activePeople, selectedDate],
  )

  /** Collect all unique YYYY-MM-DD strings that have any check-in. */
  const eventDates = useMemo(
    () =>
      new Set<string>(
        (people.data ?? []).flatMap((person) =>
          (person.checkIns ?? []).map((ci) => toLocalDateKey(new Date(ci.occurredAt))),
        ),
      ),
    [people.data],
  )
  const selectedDateHasData = eventDates.has(selectedDateKey)
  const goToToday = () => setSelectedDate(new Date())

  const { calendarButtonElement, navigationElement, calendarElement } =
    useDateNavigator({
      date: selectedDate,
      onChange: setSelectedDate,
      eventDates,
    })

  return (
    <Page
      title="Home"
      headerContent={
        <IllustratedHeaderTitle
          title="Home"
          end={calendarButtonElement}
        />
      }
      subHeaderContent={
        <>
          {navigationElement}
          {calendarElement}
        </>
      }
      disablePadding
      illustratedHeader
      className="household-dashboard-content"
      forceOverscroll={false}
    >
      {people.isLoading && <HouseholdDashboardLoading />}
      {people.error && (
        <div className="ion-padding">
          <LoadErrorState
            noun="your household"
            showingSavedCopy={Boolean(people.data)}
            onRetry={() => void people.refetch()}
          />
        </div>
      )}

      {!people.isLoading && (people.data || !people.error) && (
        <HouseholdDashboardBody
          people={activePeople}
          recap={householdRecap}
          selectedDate={selectedDate}
          isTimeTravel={isTimeTravel}
          selectedDateHasData={selectedDateHasData}
          onPersonClick={(personId) => history.push(`/person/${personId}`)}
          onRecapClick={() => history.push('/household/recap')}
          onAddPersonClick={() => history.push(activePeople.length === 0 ? '/onboarding' : '/people/new')}
          onReturnToToday={goToToday}
        />
      )}
    </Page>
  )
}

export default HouseholdPage
