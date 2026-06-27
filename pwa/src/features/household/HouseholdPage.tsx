import { IonChip, IonIcon, IonSpinner } from '@ionic/react'
import { chevronForwardOutline } from 'ionicons/icons'
import { useMemo } from 'react'
import { useHistory } from 'react-router-dom'

import { Page } from '../../components/Page'
import { useDateNavigator } from '../../components/DateNavigator'
import { PersonAvatar } from '../../components/PersonAvatar'
import { HouseholdRadar } from '../../components/HouseholdRadar'
import { Greeting } from '../../components/Greeting'
import { useAppAuth } from '../../auth/AuthContext'
import { useSelectedDate } from '../../context/SelectedDateContext'
import { usePeople } from '../people/usePeople'
import { derivePersonStatus, todayEmoji } from '../../lib/status'

/** True when an ISO datetime string falls on the given local calendar date. */
function isSameDay(occurredAt: string, date: Date): boolean {
  const d = new Date(occurredAt)
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
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
    >
      <Greeting />

      {people.isLoading && <IonSpinner />}

      {people.error && <p>Failed to load people.</p>}

      {/* Household Radar */}
      {activePeople.length > 0 && (
        <HouseholdRadar
          people={activePeople.map((person) => ({
            id: person.id,
            displayName: person.displayName,
            avatarUrl: person.avatarUrl,
            status: derivePersonStatus(person.indicators ?? [], person.checkIns ?? []),
          }))}
        />
      )}

      <div className="household-list">
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
