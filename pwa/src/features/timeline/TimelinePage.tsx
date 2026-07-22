import { IonIcon } from '@ionic/react'
import { calendarOutline } from 'ionicons/icons'
import { useEffect, useMemo, useRef } from 'react'
import { useHistory } from 'react-router-dom'

import { useSelectedDate } from '../../context/SelectedDateContext'
import { LoadingState } from '../../components/LoadingState'
import { IllustratedHeaderTitle, Page } from '../../components/Page'
import { PersonAvatar } from '../../components/PersonAvatar'
import { PersonFilterChips, usePersonFilter } from '../../components/PersonFilterChips'
import { StatusChip } from '../../components/StatusChip'
import { formatDateLabel, toLocalDateKey } from '../../lib/dateKeys'
import { computeScore, statusFromScore, type Status } from '../../lib/status'
import { parseAnswers } from '../people/checkin/checkInUtils'
import { useHouseholdLifeEvents } from '../people/events/useLifeEvents'
import { usePeople } from '../people/usePeople'
import type { RawCheckIn, RawPerson } from '../patterns/analytics'

import './TimelinePage.css'

type TimelineEventType = 'check-in' | 'household-event'

interface TimelineEvent {
  id: string
  occurredAt: string
  type: TimelineEventType
  personId?: string
  personName?: string
  personAvatar?: string | null
  personRole?: string | null
  label?: string
  statusLabel?: Status['label']
  statusColor: Status['color'] | 'event'
}

const EMPTY_TIMELINE_STATE = (
  <div className="timeline-empty">
    <p>No activity to show.</p>
    <p className="timeline-empty__hint">
      Check-ins and household events will appear here once recorded.
    </p>
  </div>
)

const LOADING_STATE = (
  <LoadingState
    className="timeline-loading"
    variant="list"
    label="Loading timeline"
    rows={7}
  />
)

const checkInToEvent = (person: RawPerson, checkIn: RawCheckIn): TimelineEvent => {
  const status = statusFromScore(computeScore(person.indicators ?? [], checkIn))
  return {
    id: checkIn.id,
    occurredAt: checkIn.occurredAt,
    type: 'check-in',
    personId: person.id,
    personName: person.displayName,
    personAvatar: person.avatarUrl,
    personRole: person.role,
    statusLabel: status.label,
    statusColor: status.color,
  }
}

const groupEventsByDate = (events: TimelineEvent[]): Map<string, TimelineEvent[]> => {
  const groups = new Map<string, TimelineEvent[]>()
  for (const event of events) {
    const key = toLocalDateKey(new Date(event.occurredAt))
    groups.set(key, [...(groups.get(key) ?? []), event])
  }
  return groups
}

const DayBadge = ({ dateKey }: { readonly dateKey: string }) => {
  const date = new Date(`${dateKey}T12:00:00`)
  return (
    <div
      className="timeline-day__badge"
      aria-label={formatDateLabel(date)}
    >
      <strong>{date.toLocaleDateString(undefined, { weekday: 'short' })}</strong>
      <span>
        {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </span>
    </div>
  )
}

const TimelineEventRow = ({
  event,
  onOpen,
}: {
  readonly event: TimelineEvent
  readonly onOpen: (event: TimelineEvent) => void
}) => {
  const content = (
    <>
      <span
        className={`timeline-event__dot timeline-event__dot--${event.statusColor}`}
      />
      {event.type === 'check-in' ? (
        <PersonAvatar
          name={event.personName ?? 'Person'}
          src={event.personAvatar}
          className="timeline-event__avatar"
        />
      ) : (
        <span className="timeline-event__event-icon">
          <IonIcon
            icon={calendarOutline}
            aria-hidden="true"
          />
        </span>
      )}
      <span className="timeline-event__info">
        <strong>
          {event.type === 'check-in' ? event.personName : event.label}
          {event.personRole === 'self' && ' (You)'}
        </strong>
        <span>{event.type === 'check-in' ? 'Daily Check-in' : 'Event'}</span>
      </span>
      {event.type === 'check-in' && event.statusLabel ? (
        <StatusChip label={event.statusLabel} />
      ) : (
        <span className="timeline-event__audience">Everyone</span>
      )}
    </>
  )

  return event.type === 'check-in' ? (
    <button
      className="timeline-event"
      onClick={() => onOpen(event)}
    >
      {content}
    </button>
  ) : (
    <div className="timeline-event timeline-event--household">{content}</div>
  )
}

const useTimelineDateSync = (
  dateKeys: string[],
  selectedDate: Date,
  setSelectedDate: (date: Date) => void,
) => {
  const dayRefs = useRef(new Map<string, HTMLElement>())
  const scrollDriven = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        const key = (visible?.target as HTMLElement | undefined)?.dataset.date
        if (!key || key === toLocalDateKey(selectedDate)) return
        scrollDriven.current = true
        setSelectedDate(new Date(`${key}T12:00:00`))
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: [0, 0.2, 0.6] },
    )
    for (const element of dayRefs.current.values()) observer.observe(element)
    return () => observer.disconnect()
  }, [dateKeys, selectedDate, setSelectedDate])

  useEffect(() => {
    if (scrollDriven.current) {
      scrollDriven.current = false
      return
    }
    const selectedKey = toLocalDateKey(selectedDate)
    const targetKey = dayRefs.current.has(selectedKey)
      ? selectedKey
      : dateKeys.reduce<string | undefined>((closest, key) => {
          if (!closest) return key
          const target = selectedDate.getTime()
          return Math.abs(new Date(`${key}T12:00:00`).getTime() - target) <
            Math.abs(new Date(`${closest}T12:00:00`).getTime() - target)
            ? key
            : closest
        }, undefined)
    dayRefs.current.get(targetKey ?? '')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [dateKeys, selectedDate])

  return (dateKey: string, element: HTMLElement | null) => {
    if (element) dayRefs.current.set(dateKey, element)
    else dayRefs.current.delete(dateKey)
  }
}

const TimelinePage = () => {
  const history = useHistory()
  const people = usePeople()
  const { selectedDate, setSelectedDate } = useSelectedDate()
  const { selectedPeople, selectOnlyPerson, clearSelection } = usePersonFilter()

  const activePeople = useMemo(
    () => (people.data ?? []).filter((person) => !person.archived),
    [people.data],
  )
  const householdId = activePeople[0]?.householdId
  const lifeEvents = useHouseholdLifeEvents(householdId)
  const eventLabels = useMemo(
    () => new Map((lifeEvents.data ?? []).map((event) => [event.id, event.label])),
    [lifeEvents.data],
  )

  const allEvents = useMemo(() => {
    const checkIns = activePeople.flatMap((person) =>
      (person.checkIns ?? []).map((checkIn) => checkInToEvent(person, checkIn)),
    )
    const householdEvents = new Map<string, TimelineEvent>()
    for (const person of activePeople) {
      for (const checkIn of person.checkIns ?? []) {
        const date = toLocalDateKey(new Date(checkIn.occurredAt))
        for (const eventId of parseAnswers(checkIn.answersJson).events) {
          const key = `${date}:${eventId}`
          if (householdEvents.has(key)) continue
          householdEvents.set(key, {
            id: key,
            occurredAt: `${date}T12:00:00`,
            type: 'household-event',
            label: eventLabels.get(eventId) ?? 'Household event',
            statusColor: 'event',
          })
        }
      }
    }
    return [...checkIns, ...householdEvents.values()].sort((a, b) =>
      b.occurredAt.localeCompare(a.occurredAt),
    )
  }, [activePeople, eventLabels])

  const filteredEvents = useMemo(
    () =>
      allEvents.filter(
        (event) =>
          event.type === 'household-event' ||
          selectedPeople.size === 0 ||
          (event.personId && selectedPeople.has(event.personId)),
      ),
    [allEvents, selectedPeople],
  )
  const groupedEvents = useMemo(
    () => groupEventsByDate(filteredEvents),
    [filteredEvents],
  )
  const dateKeys = useMemo(() => [...groupedEvents.keys()], [groupedEvents])
  const setDayRef = useTimelineDateSync(dateKeys, selectedDate, setSelectedDate)
  return (
    <Page
      title="Timeline"
      headerContent={<IllustratedHeaderTitle title="Timeline" />}
      subHeaderContent={
        <div className="page-header-person-filter">
          <PersonFilterChips
            people={activePeople}
            selectedPeople={selectedPeople}
            onSelectPerson={selectOnlyPerson}
            onClear={clearSelection}
          />
        </div>
      }
      backHref="/dashboard"
      illustratedHeader
      disablePadding
      className="timeline-page"
    >
      {(people.isLoading || lifeEvents.isLoading) && LOADING_STATE}
      {(people.error || lifeEvents.error) && <p>Failed to load timeline.</p>}
      {!people.isLoading &&
        !lifeEvents.isLoading &&
        !people.error &&
        !lifeEvents.error && (
          <div className="timeline-layout">
            {filteredEvents.length === 0 ? (
              EMPTY_TIMELINE_STATE
            ) : (
              <div className="timeline-groups">
                {Array.from(groupedEvents.entries()).map(([dateKey, events]) => (
                  <section
                    key={dateKey}
                    ref={(element) => setDayRef(dateKey, element)}
                    data-date={dateKey}
                    className="timeline-day"
                  >
                    <DayBadge dateKey={dateKey} />
                    <div className="timeline-day__events">
                      {events.map((event) => (
                        <TimelineEventRow
                          key={event.id}
                          event={event}
                          onOpen={(selected) =>
                            history.push(
                              `/person/${selected.personId}?viewDate=${toLocalDateKey(new Date(selected.occurredAt))}`,
                            )
                          }
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}
    </Page>
  )
}

export default TimelinePage
