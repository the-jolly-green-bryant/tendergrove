import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonActionSheet,
  useIonAlert,
  useIonRouter,
} from '@ionic/react'
import {
  archiveOutline,
  calendarOutline,
  checkmarkCircle,
  chevronForwardOutline,
  closeCircle,
  createOutline,
  listOutline,
  removeCircle,
} from 'ionicons/icons'
import { formatDistanceToNow } from 'date-fns'
import React, { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useHistory, useLocation, useParams } from 'react-router-dom'

import { useSelectedDate } from '../../context/SelectedDateContext'

import { LoadingState } from '../../components/LoadingState'
import { PastDataNotice } from '../../components/PastDataNotice'
import { usePerson } from './usePerson'
import { useArchivePerson } from './useArchivePerson'
import { parseAnswers } from './checkin/checkInUtils'
import { useDateNavigator } from '../../components/DateNavigator'
import { PersonAvatar } from '../../components/PersonAvatar'
import { PersonRole } from '../../lib/domain'
import { derivePersonStatus, todayEmoji } from '../../lib/status'
import { PersonPatternsSection } from '../patterns/PersonPatternsSection'

type Indicator = NonNullable<ReturnType<typeof usePerson>['data']>['indicators'][number]
type CheckIn = NonNullable<ReturnType<typeof usePerson>['data']>['checkIns'][number]
type Person = NonNullable<ReturnType<typeof usePerson>['data']>
type PersonStatus = ReturnType<typeof derivePersonStatus>
type PersonPageDateView = {
  readonly viewDate: Date
  readonly isTimelineView: boolean
}
type PersonPageSummary = {
  readonly eventDates: Set<string>
  readonly activeIndicators: Indicator[]
  readonly selectedCheckIn?: CheckIn
  readonly status: PersonStatus
  readonly emoji?: string | null
  readonly selectedDateNote: string | null
  readonly lastNoteCheckIn: CheckIn | null
  readonly checkedForDate?: Set<string>
}

const roleLabels: Record<PersonRole, string> = {
  self: 'You',
  child: 'Child',
  spouse: 'Spouse',
  parent: 'Parent',
  caregiver: 'Caregiver',
  other: 'Other',
}

const toISODate = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const isSameDay = (occurredAt: string, date: Date): boolean => {
  const d = new Date(occurredAt)
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  )
}

const isSameCalendarDate = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const parseDateKey = (dateKey: string | null): Date | null => {
  if (!dateKey) return null

  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return null

  return new Date(year, month - 1, day)
}

const getPersonPageDateView = (
  search: string,
  selectedDate: Date,
): PersonPageDateView => {
  const params = new URLSearchParams(search)

  return {
    viewDate: parseDateKey(params.get('viewDate')) ?? selectedDate,
    isTimelineView: params.has('viewDate'),
  }
}

const usePersonPageSummary = (
  person: Person | null | undefined,
  viewDate: Date,
  personId: string | undefined,
): PersonPageSummary => {
  const indicators = (person?.indicators ?? []) as Indicator[]
  const checkIns = (person?.checkIns ?? []) as CheckIn[]

  const eventDates = useMemo(
    () => new Set<string>(checkIns.map((ci) => toISODate(new Date(ci.occurredAt)))),
    [checkIns],
  )
  const activeIndicators = indicators.filter((indicator) => indicator.active !== false)

  const selectedCheckIn = checkIns.find((ci) => isSameDay(ci.occurredAt, viewDate))
  const status = derivePersonStatus(activeIndicators, checkIns)
  const emoji = todayEmoji(activeIndicators, checkIns, new Date(), personId)
  const selectedDateCheckIn = checkIns.find((ci) => isSameDay(ci.occurredAt, viewDate))
  const selectedDateNote = selectedDateCheckIn?.note || null
  const checkedForDate =
    selectedDateCheckIn &&
    new Set(parseAnswers(selectedDateCheckIn.answersJson).checked)

  const lastNoteCheckIn =
    [...checkIns]
      .filter((ci) => Boolean(ci.note) && !isSameDay(ci.occurredAt, viewDate))
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0] ?? null

  return {
    eventDates,
    activeIndicators,
    selectedCheckIn,
    status,
    emoji,
    selectedDateNote,
    lastNoteCheckIn,
    checkedForDate,
  }
}

const usePersonPageActions = (
  person: Person | null | undefined,
  personId: string | undefined,
) => {
  const router = useIonRouter()
  const location = useLocation()
  const [presentActionSheet] = useIonActionSheet()
  const [presentAlert] = useIonAlert()
  const archiveMutation = useArchivePerson()

  const editPerson = () => router.push(`/person/${personId}/edit`, 'forward')

  const manageIndicators = () =>
    router.push(`/person/${personId}/indicators`, 'forward')

  const manageEvents = () => router.push(`/person/${personId}/events`, 'forward')

  function doArchive(archive: boolean) {
    if (!person) return
    archiveMutation.mutate(
      { id: person.id, archived: archive },
      {
        onSuccess: () => archive && router.push('/dashboard', 'back', 'pop'),
      },
    )
  }

  const toggleArchive = () => {
    if (!person) return
    if (person.archived) {
      doArchive(false)
      return
    }

    void presentAlert({
      header: 'Archive this person?',
      message:
        'Are you sure? You can unarchive people in the Settings section of the app.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Archive',
          role: 'destructive',
          handler: () => doArchive(true),
        },
      ],
    })
  }

  const showMoreOptions = () => {
    const isArchived = person?.archived
    void presentActionSheet({
      buttons: [
        { text: 'Edit Person', icon: createOutline, handler: editPerson },
        { text: 'Edit Indicators', icon: listOutline, handler: manageIndicators },
        { text: 'Edit Events', icon: calendarOutline, handler: manageEvents },
        {
          text: isArchived ? 'Unarchive' : 'Archive',
          icon: archiveOutline,
          role: isArchived ? undefined : 'destructive',
          handler: toggleArchive,
        },
        { text: 'Cancel', role: 'cancel' },
      ],
    })
  }

  const startCheckIn = () => {
    // Return to the exact page (incl. any ?viewDate) after the check-in closes.
    const returnTo = encodeURIComponent(location.pathname + location.search)
    router.push(`/person/${personId}/check-in?returnTo=${returnTo}`, 'forward')
  }

  return { startCheckIn, showMoreOptions, manageIndicators, manageEvents }
}

const formatUpdatedLabel = (checkIn: CheckIn): string | null => {
  const updatedAt = checkIn.updatedAt
  const createdAt = checkIn.createdAt
  if (!updatedAt || !createdAt || updatedAt === createdAt) return null

  const created = new Date(createdAt)
  const updated = new Date(updatedAt)

  const sameDay =
    created.getFullYear() === updated.getFullYear() &&
    created.getMonth() === updated.getMonth() &&
    created.getDate() === updated.getDate()

  const time = updated.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

  if (sameDay) {
    return `Updated: ${time}`
  }

  const date = updated.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  return `Updated: ${date} - ${time}`
}

const formatDateLabel = (date: Date): string => {
  const today = new Date()
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return 'Today'
  }
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

const formatCheckInTitle = (date: Date): string => {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (isSameCalendarDate(date, today)) return "Today's Check-In"
  if (isSameCalendarDate(date, yesterday)) return "Yesterday's Check-In"

  const dateLabel = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  return `${dateLabel}'s Check-In`
}

const checkInSummaryIcon = (seen: boolean, isDesired: boolean): string => {
  if (seen) return isDesired ? checkmarkCircle : removeCircle
  return isDesired ? closeCircle : checkmarkCircle
}

const CheckInSummaryList = ({
  indicators,
  checkedForDate,
}: {
  readonly indicators: Indicator[]
  readonly checkedForDate: Set<string>
}) => {
  if (indicators.length === 0) {
    return <p className="section-empty">No indicators tracked.</p>
  }

  return (
    <IonList
      lines="none"
      className="check-in-summary person-checkin-panel__summary"
    >
      {indicators.map((indicator) => {
        const seen = checkedForDate.has(indicator.id)
        const isDesired = indicator.polarity === 'desired'
        const markGood = seen == isDesired
        return (
          <IonItem
            key={indicator.id}
            className="check-in-summary__item"
          >
            <IonIcon
              slot="start"
              icon={checkInSummaryIcon(seen, isDesired)}
              color={markGood ? 'success' : 'danger'}
            />
            <IonLabel
              className={seen ? '' : 'check-in-summary__muted'}
              style={!seen ? { textDecoration: 'line-through' } : undefined}
            >
              {indicator.name}
            </IonLabel>
          </IonItem>
        )
      })}
    </IonList>
  )
}

export const PersonCheckInButton = ({
  person,
  status,
  emoji,
  title,
  onClick,
}: {
  readonly person: Person
  readonly status?: PersonStatus
  readonly emoji?: string | null
  readonly title: string
  readonly onClick?: () => void
}) => {
  return (
    <button
      type="button"
      className="person-checkin-button"
      onClick={onClick ?? (() => {})}
    >
      <div className="person-checkin-button__art avatar-emoji-wrapper">
        <PersonAvatar
          className="person-checkin-button__avatar"
          name={person.displayName}
          src={person.avatarUrl}
        />
        {emoji && <span className="avatar-emoji-badge">{emoji}</span>}
      </div>

      <span className="person-checkin-button__copy">
        <span>
          {person.displayName} · {roleLabels[person.role as PersonRole] ?? 'Person'}
        </span>

        <strong>{title}</strong>
        {status && (
          <span
            className={`person-checkin-button__status person-status--${status.color}`}
          >
            <span className="person-status__dot" />
            {status.label}
          </span>
        )}
      </span>

      {onClick && (
        <IonIcon
          icon={chevronForwardOutline}
          className="person-checkin-button__chevron"
        />
      )}
    </button>
  )
}

const PersonPageHeader = ({
  isTimelineView,
  displayName,
  headerElement,
  calendarElement,
}: {
  readonly isTimelineView: boolean
  readonly displayName: string
  readonly headerElement: ReactNode
  readonly calendarElement: ReactNode
}) => {
  return (
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton defaultHref={'/dashboard'} />
        </IonButtons>

        {!isTimelineView ? headerElement : <IonTitle>{displayName}</IonTitle>}
      </IonToolbar>
      {!isTimelineView && calendarElement}
    </IonHeader>
  )
}

const PersonCheckInPanel = ({
  person,
  status,
  emoji,
  viewDate,
  checkedForDate,
  selectedCheckIn,
  activeIndicators,
  onStartCheckIn,
}: {
  readonly person: Person
  readonly status: PersonStatus
  readonly emoji?: string | null
  readonly viewDate: Date
  readonly checkedForDate?: Set<string>
  readonly selectedCheckIn?: CheckIn
  readonly activeIndicators: Indicator[]
  readonly onStartCheckIn: () => void
}) => {
  const updatedLabel = selectedCheckIn ? formatUpdatedLabel(selectedCheckIn) : null

  return (
    <section className="person-checkin-panel">
      <PersonCheckInButton
        person={person}
        status={status}
        emoji={emoji}
        title={formatCheckInTitle(viewDate)}
        onClick={onStartCheckIn}
      />
    </section>
  )
}

const SetupNavCard = ({
  icon,
  title,
  subtitle,
  onClick,
}: {
  readonly icon: string
  readonly title: string
  readonly subtitle: string
  readonly onClick: () => void
}) => {
  return (
    <button
      type="button"
      className="person-setup-card"
      onClick={onClick}
    >
      <IonIcon
        className="person-setup-card__icon"
        icon={icon}
      />
      <span className="person-setup-card__body">
        <span className="person-setup-card__title">{title}</span>
        <span className="person-setup-card__sub">{subtitle}</span>
      </span>
      <IonIcon
        className="person-setup-card__chevron"
        icon={chevronForwardOutline}
      />
    </button>
  )
}

const TrackingSetupCards = ({
  onManageIndicators,
  onManageEvents,
}: {
  readonly onManageIndicators: () => void
  readonly onManageEvents: () => void
}) => {
  return (
    <div className="person-setup">
      <SetupNavCard
        icon={listOutline}
        title="Indicators"
        subtitle="Configure behaviors you want to track."
        onClick={onManageIndicators}
      />
      <SetupNavCard
        icon={calendarOutline}
        title="Events"
        subtitle="Configure common events that occur in this person's life."
        onClick={onManageEvents}
      />
    </div>
  )
}

const PersonDateBanner = ({
  viewDate,
  isTimeTravel,
  isTimelineView,
  onReturnToToday,
}: {
  readonly viewDate: Date
  readonly isTimeTravel: boolean
  readonly isTimelineView: boolean
  readonly onReturnToToday: () => void
}) => {
  if (isTimeTravel) {
    return (
      <PastDataNotice
        selectedDateLabel={formatDateLabel(viewDate)}
        onReturnToToday={onReturnToToday}
        className="past-data-notice--page"
      />
    )
  }
  if (!isTimelineView) return null
  return (
    <p className="person-hero__date-label ion-padding-horizontal">
      Viewing: {formatDateLabel(viewDate)}
    </p>
  )
}

const PersonPageLoadedContent = ({
  person,
  viewDate,
  isTimelineView,
  isTimeTravel,
  onReturnToToday,
  summary,
  onStartCheckIn,
  onShowMoreOptions,
  onManageIndicators,
  onManageEvents,
}: {
  readonly person: Person
  readonly viewDate: Date
  readonly isTimelineView: boolean
  readonly isTimeTravel: boolean
  readonly onReturnToToday: () => void
  readonly summary: PersonPageSummary
  readonly onStartCheckIn: () => void
  readonly onShowMoreOptions: () => void
  readonly onManageIndicators: () => void
  readonly onManageEvents: () => void
}) => {
  return (
    <>
      <PersonDateBanner
        viewDate={viewDate}
        isTimeTravel={isTimeTravel}
        isTimelineView={isTimelineView}
        onReturnToToday={onReturnToToday}
      />

      <div className="ion-padding">
        <PersonCheckInPanel
          person={person}
          status={summary.status}
          emoji={summary.emoji}
          viewDate={viewDate}
          checkedForDate={summary.checkedForDate}
          selectedCheckIn={summary.selectedCheckIn}
          activeIndicators={summary.activeIndicators}
          onStartCheckIn={onStartCheckIn}
        />

        <PersonPatternsSection
          personId={person.id}
          personName={person.displayName}
          personAvatarUrl={person.avatarUrl}
        />

        <TrackingSetupCards
          onManageIndicators={onManageIndicators}
          onManageEvents={onManageEvents}
        />

        <div className="person-page__footer-actions">
          <IonButton
            expand="block"
            fill="outline"
            onClick={onShowMoreOptions}
          >
            <IonIcon
              slot="start"
              icon={createOutline}
            />
            Edit Person
          </IonButton>
        </div>
      </div>
    </>
  )
}

const PersonPage = (): React.JSX.Element | null => {
  const { personId } = useParams<{ personId: string }>()
  const isRealPerson = Boolean(personId && personId !== 'new')
  const {
    data: person,
    isLoading,
    error,
  } = usePerson(isRealPerson ? personId : undefined)
  const { selectedDate, setSelectedDate } = useSelectedDate()
  const location = useLocation()
  const history = useHistory()
  const { startCheckIn, showMoreOptions, manageIndicators, manageEvents } =
    usePersonPageActions(person, personId)

  const { viewDate, isTimelineView } = useMemo(
    () => getPersonPageDateView(location.search, selectedDate),
    [location.search, selectedDate],
  )
  const isTimeTravel = !isSameCalendarDate(viewDate, new Date())
  const summary = usePersonPageSummary(person, viewDate, personId)
  const returnToToday = () => {
    setSelectedDate(new Date())
    if (isTimelineView) history.replace(`/person/${personId}`)
  }

  const { headerElement, calendarElement } = useDateNavigator({
    date: viewDate,
    onChange: setSelectedDate,
    eventDates: summary.eventDates,
  })

  // When Ionic matches /people/new against /people/:personId, bail out so
  // PersonFormPage is the only visible page.
  if (!isRealPerson) {
    return null
  }

  return (
    <IonPage>
      <PersonPageHeader
        isTimelineView={isTimelineView}
        displayName={person?.displayName ?? ''}
        headerElement={headerElement}
        calendarElement={calendarElement}
      />

      <IonContent
        fullscreen
        className={`safe-content person-page-content${
          isTimeTravel ? ' time-travel-surface' : ''
        }`}
      >
        {isLoading && <LoadingState />}

        {error && <p className="ion-padding">Failed to load this person.</p>}

        {person && (
          <PersonPageLoadedContent
            person={person}
            viewDate={viewDate}
            isTimelineView={isTimelineView}
            isTimeTravel={isTimeTravel}
            onReturnToToday={returnToToday}
            summary={summary}
            onStartCheckIn={startCheckIn}
            onShowMoreOptions={showMoreOptions}
            onManageIndicators={manageIndicators}
            onManageEvents={manageEvents}
          />
        )}
      </IonContent>
    </IonPage>
  )
}

export default PersonPage
