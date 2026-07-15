import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonActionSheet,
  useIonAlert,
  useIonRouter,
} from '@ionic/react'
import { formatDateLabel, isSameLocalDay, toLocalDateKey } from '../../lib/dateKeys'
import {
  archiveOutline,
  calendarOutline,
  chevronForwardOutline,
  createOutline,
  listOutline,
} from 'ionicons/icons'
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
import { RawCheckIn, RawIndicator } from '../patterns/analytics'

type Person = NonNullable<ReturnType<typeof usePerson>['data']>
type PersonStatus = ReturnType<typeof derivePersonStatus>
type PersonPageDateView = {
  readonly viewDate: Date
  readonly isTimelineView: boolean
}
type PersonPageSummary = {
  readonly eventDates: Set<string>
  readonly activeIndicators: RawIndicator[]
  readonly selectedCheckIn?: RawCheckIn
  readonly status: PersonStatus
  readonly emoji?: string | null
  readonly selectedDateNote: string | null
  readonly lastNoteCheckIn: RawCheckIn | null
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

const toISODate = toLocalDateKey

const isSameDay = (occurredAt: string, date: Date): boolean =>
  isSameLocalDay(new Date(occurredAt), date)

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
  const indicators = (person?.indicators ?? []) as RawIndicator[]
  const checkIns = (person?.checkIns ?? []) as RawCheckIn[]

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

  const doArchive = (archive: boolean) =>
    person &&
    archiveMutation.mutate(
      { id: person.id, archived: archive },
      {
        onSuccess: () => archive && router.push('/dashboard', 'back', 'pop'),
      },
    )

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
          handler: () => void doArchive(true),
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

const formatCheckInTitle = (date: Date): string => {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (isSameLocalDay(date, today)) return "Today's Check-In"
  if (isSameLocalDay(date, yesterday)) return "Yesterday's Check-In"

  const dateLabel = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  return `${dateLabel}'s Check-In`
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
}) => (
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
}) => (
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

const PersonCheckInPanel = ({
  person,
  status,
  emoji,
  viewDate,
  onStartCheckIn,
}: {
  readonly person: Person
  readonly status: PersonStatus
  readonly emoji?: string | null
  readonly viewDate: Date
  readonly onStartCheckIn: () => void
}) => (
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
}) => (
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

const TrackingSetupCards = ({
  onManageIndicators,
  onManageEvents,
}: {
  readonly onManageIndicators: () => void
  readonly onManageEvents: () => void
}) => (
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
}) => (
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
  const isTimeTravel = !isSameLocalDay(viewDate, new Date())
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
