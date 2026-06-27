import { IonSpinner } from '@ionic/react'
import { useMemo, useState } from 'react'
import { useHistory } from 'react-router-dom'

import { Page } from '../../components/Page'
import { PersonAvatar } from '../../components/PersonAvatar'
import { PersonFilterChips, usePersonFilter } from '../../components/PersonFilterChips'
import { usePeople } from '../people/usePeople'
import { computeScore, statusFromScore } from '../../lib/status'

import './TimelinePage.css'
import { StatusChip } from '../../components/StatusChip'

type EventType = 'check-in'

interface TimelineEvent {
  id: string
  personId: string
  personName: string
  personAvatar: string | null
  personRole: string | null
  occurredAt: string
  timestamp: string
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

const EMPTY_TIMELINE_STATE = (
  <div className="timeline-empty">
    <p>No events to show.</p>
    <p className="timeline-empty__hint">Check-ins will appear here once recorded.</p>
  </div>
)

const LOADING_STATE = (
  <div className="timeline-loading">
    <IonSpinner />
  </div>
)

const renderEventButton = (event: TimelineEvent) => {
  const history = useHistory()
  return (
    <button
      key={event.id}
      className="timeline-event"
      onClick={() =>
        history.push(
          `/person/${event.personId}?viewDate=${toDateKey(event.occurredAt)}`,
        )
      }
    >
      <div className="timeline-event__time">{formatTime(event.timestamp)}</div>

      <div className="timeline-event__line">
        <span
          className={`timeline-event__dot timeline-event__dot--${event.statusColor}`}
        />
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
        <StatusChip label={event.statusLabel} />
      </div>
    </button>
  )
}

const checkInToEvent = (person, ci): TimelineEvent => {
  const score = computeScore(person.indicators ?? [], ci)
  const status = statusFromScore(score)

  return {
    id: ci.id,
    personId: person.id,
    personName: person.displayName,
    personAvatar: person.avatarUrl,
    personRole: person.role,
    occurredAt: ci.occurredAt,
    timestamp: ci.updatedAt ?? ci.createdAt ?? ci.occurredAt,
    type: 'check-in',
    statusLabel: status.label,
    statusColor: status.color,
  }
}

/**
 * Depicts check-ins as a timeseries bar chart to help users visualize distress over
 * time.
 * @returns {React.JSX.Element}
 * @constructor
 */
export default function TimelinePage() {
  const people = usePeople()
  const { selectedPeople, togglePerson, clearSelection } = usePersonFilter()
  const [selectedTypes] = useState<Set<EventType>>(new Set(['check-in']))

  const activePeople = useMemo(
    () => (people.data ?? []).filter((p) => !p.archived),
    [people.data],
  )

  const allEvents: TimelineEvent[] = useMemo(() => {
    const events: TimelineEvent[] = activePeople.flatMap((person) =>
      (person.checkIns ?? []).map((ci) => checkInToEvent(person, ci)),
    )

    events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    return events
  }, [activePeople])

  const filteredEvents = useMemo(
    () =>
      allEvents.filter((e) => {
        if (selectedPeople.size > 0 && !selectedPeople.has(e.personId)) return false
        return !(selectedTypes.size > 0 && !selectedTypes.has(e.type))
      }),
    [allEvents, selectedPeople, selectedTypes],
  )

  const groupedEvents = useMemo(() => {
    const groups: Map<string, TimelineEvent[]> = new Map()
    for (const event of filteredEvents) {
      const key = toDateKey(event.occurredAt)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(event)
    }
    return groups
  }, [filteredEvents])

  return (
    <Page title="Timeline">
      {people.isLoading && LOADING_STATE}
      {people.error && <p>Failed to load timeline.</p>}
      {!people.isLoading && !people.error && (
        <>
          {/* Person filter chips */}
          <div className="timeline-filters">
            <PersonFilterChips
              people={activePeople}
              selectedPeople={selectedPeople}
              onToggle={togglePerson}
              onClear={clearSelection}
              className="timeline-person-chips"
            />
          </div>

          {/* Timeline events grouped by day */}
          {filteredEvents.length === 0 ? (
            EMPTY_TIMELINE_STATE
          ) : (
            <div className="timeline-groups">
              {Array.from(groupedEvents.entries()).map(([dateKey, events]) => (
                <div
                  key={dateKey}
                  className="timeline-day"
                >
                  <h3 className="timeline-day__heading">{formatDayHeading(dateKey)}</h3>

                  <div className="timeline-day__events">
                    {events.map(renderEventButton)}
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
