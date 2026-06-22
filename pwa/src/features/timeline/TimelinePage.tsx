import {
  IonChip,
  IonIcon,
  IonLabel,
  IonSpinner,
} from '@ionic/react'
import { filterOutline, peopleOutline } from 'ionicons/icons'
import { useMemo, useState } from 'react'
import { useHistory } from 'react-router-dom'

import { Page } from '../../components/Page'
import { PersonAvatar } from '../../components/PersonAvatar'
import { usePeople } from '../people/usePeople'
import { computeScore, statusFromScore } from '../../lib/status'

import './TimelinePage.css'

type EventType = 'check-in'

interface TimelineEvent {
  id: string
  personId: string
  personName: string
  personAvatar: string | null
  personRole: string | null
  occurredAt: string
  type: EventType
  statusLabel: string
  statusColor: 'success' | 'warning' | 'danger' | 'medium'
}

function formatDayHeading(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return 'Today'
  }
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return 'Yesterday'
  }
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function toDateKey(isoString: string): string {
  const d = new Date(isoString)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function TimelinePage() {
  const people = usePeople()
  const history = useHistory()

  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set())
  const [selectedTypes, setSelectedTypes] = useState<Set<EventType>>(
    new Set(['check-in']),
  )

  const activePeople = useMemo(
    () => (people.data ?? []).filter((p) => !p.archived),
    [people.data],
  )

  const allEvents: TimelineEvent[] = useMemo(() => {
    const events: TimelineEvent[] = []

    for (const person of activePeople) {
      const indicators = person.indicators ?? []

      for (const ci of person.checkIns ?? []) {
        const score = computeScore(indicators, ci)
        const status = statusFromScore(score)

        events.push({
          id: ci.id,
          personId: person.id,
          personName: person.displayName,
          personAvatar: person.avatarUrl,
          personRole: person.role,
          occurredAt: ci.occurredAt,
          type: 'check-in',
          statusLabel: status.label,
          statusColor: status.color,
        })
      }
    }

    events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    return events
  }, [activePeople])

  const filteredEvents = useMemo(() => {
    return allEvents.filter((e) => {
      if (selectedPeople.size > 0 && !selectedPeople.has(e.personId)) return false
      if (selectedTypes.size > 0 && !selectedTypes.has(e.type)) return false
      return true
    })
  }, [allEvents, selectedPeople, selectedTypes])

  const groupedEvents = useMemo(() => {
    const groups: Map<string, TimelineEvent[]> = new Map()
    for (const event of filteredEvents) {
      const key = toDateKey(event.occurredAt)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(event)
    }
    return groups
  }, [filteredEvents])

  const togglePerson = (personId: string) => {
    setSelectedPeople((prev) => {
      const next = new Set(prev)
      if (next.has(personId)) {
        next.delete(personId)
      } else {
        next.add(personId)
      }
      return next
    })
  }

  const toggleType = (type: EventType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const showAll = selectedPeople.size === 0

  return (
    <Page title="Timeline">
      {people.isLoading && (
        <div className="timeline-loading">
          <IonSpinner />
        </div>
      )}

      {people.error && <p>Failed to load timeline.</p>}

      {!people.isLoading && !people.error && (
        <>
          {/* Person filter chips */}
          <div className="timeline-filters">
            <div className="timeline-person-chips">
              <IonChip
                className={`timeline-chip ${showAll ? 'timeline-chip--active' : ''}`}
                onClick={() => setSelectedPeople(new Set())}
              >
                <IonIcon icon={peopleOutline} />
                <IonLabel>All People</IonLabel>
              </IonChip>

              {activePeople.map((person) => {
                const isSelected = selectedPeople.has(person.id)
                return (
                  <IonChip
                    key={person.id}
                    className={`timeline-chip ${isSelected ? 'timeline-chip--active' : ''}`}
                    onClick={() => togglePerson(person.id)}
                  >
                    <PersonAvatar
                      name={person.displayName}
                      src={person.avatarUrl}
                      className="timeline-chip__avatar"
                    />
                    <IonLabel>{person.displayName}</IonLabel>
                  </IonChip>
                )
              })}
            </div>
          </div>

          {/* Timeline events grouped by day */}
          {filteredEvents.length === 0 ? (
            <div className="timeline-empty">
              <p>No events to show.</p>
              <p className="timeline-empty__hint">
                Check-ins will appear here once recorded.
              </p>
            </div>
          ) : (
            <div className="timeline-groups">
              {Array.from(groupedEvents.entries()).map(([dateKey, events]) => (
                <div key={dateKey} className="timeline-day">
                  <h3 className="timeline-day__heading">{formatDayHeading(dateKey)}</h3>

                  <div className="timeline-day__events">
                    {events.map((event) => (
                      <button
                        key={event.id}
                        className="timeline-event"
                        onClick={() => history.push(`/person/${event.personId}?viewDate=${toDateKey(event.occurredAt)}`)}
                      >
                        <div className="timeline-event__time">
                          {formatTime(event.occurredAt)}
                        </div>

                        <div className="timeline-event__line">
                          <span className={`timeline-event__dot timeline-event__dot--${event.statusColor}`} />
                        </div>

                        <div className="timeline-event__card">
                          <div className="timeline-event__header">
                            <PersonAvatar
                              name={event.personName}
                              src={event.personAvatar}
                              className="timeline-event__avatar"
                            />
                            <div className="timeline-event__info">
                              <span className="timeline-event__name">
                                {event.personName}
                                {event.personRole === 'self' && ' (You)'}
                              </span>
                              <span className="timeline-event__type">Daily Check-In</span>
                            </div>
                          </div>
                          <IonChip className={`timeline-status-chip timeline-status-chip--${event.statusColor}`}>
                            {event.statusLabel}
                          </IonChip>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Page>
  )
}
