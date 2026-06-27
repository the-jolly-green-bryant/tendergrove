import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonChip,
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
  arrowBackOutline,
  checkmarkCircle,
  closeCircle,
  createOutline,
  listOutline,
  removeCircle,
  timeOutline,
} from 'ionicons/icons'
import { formatDistanceToNow } from 'date-fns'
import { useEffect, useMemo, useRef } from 'react'
import { useHistory, useLocation, useParams } from 'react-router-dom'

import { useSelectedDate } from '../../context/SelectedDateContext'

import { LoadingState } from '../../components/LoadingState'
import { usePerson } from './usePerson'
import { useArchivePerson } from './useArchivePerson'
import { parseAnswers } from './checkin/checkInUtils'
import { useDateNavigator } from '../../components/DateNavigator'
import { PersonAvatar } from '../../components/PersonAvatar'
import { PersonRole } from '../../lib/domain'
import { derivePersonStatus, todayEmoji } from '../../lib/status'

type Indicator = NonNullable<ReturnType<typeof usePerson>['data']>['indicators'][number]
type CheckIn = NonNullable<ReturnType<typeof usePerson>['data']>['checkIns'][number]

const roleLabels: Record<PersonRole, string> = {
  self: 'You',
  child: 'Child',
  spouse: 'Spouse',
  parent: 'Parent',
  caregiver: 'Caregiver',
  other: 'Other',
}

function latestCheckIn(checkIns: CheckIn[]): CheckIn | undefined {
  return [...checkIns].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
}

/** Return YYYY-MM-DD for a Date. */
function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isSameDay(occurredAt: string, date: Date): boolean {
  const d = new Date(occurredAt)
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  )
}

function formatUpdatedLabel(checkIn: CheckIn): string | null {
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

function formatDateLabel(date: Date): string {
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

/**
 * Displays check-in status of a given person.
 * @returns {React.JSX.Element | null}
 * @constructor
 */
export default function PersonPage() {
  const router = useIonRouter()
  const history = useHistory()
  const { personId } = useParams<{ personId: string }>()
  const isRealPerson = Boolean(personId && personId !== 'new')
  const {
    data: person,
    isLoading,
    error,
  } = usePerson(isRealPerson ? personId : undefined)
  const hasRedirected = useRef(false)
  const [presentActionSheet] = useIonActionSheet()
  const [presentAlert] = useIonAlert()
  const { selectedDate, setSelectedDate } = useSelectedDate()
  const location = useLocation()

  // If navigated from timeline with ?viewDate=YYYY-MM-DD, use that date
  // for display without changing the app's master selectedDate.
  const viewDate = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const vd = params.get('viewDate')
    if (vd) {
      const [y, m, d] = vd.split('-').map(Number)
      if (y && m && d) return new Date(y, m - 1, d)
    }
    return selectedDate
  }, [location.search, selectedDate])

  const isTimelineView = new URLSearchParams(location.search).has('viewDate')

  const indicators = (person?.indicators ?? []) as Indicator[]
  const checkIns = (person?.checkIns ?? []) as CheckIn[]

  /** Collect YYYY-MM-DD strings for this person's check-ins (for calendar dots). */
  const eventDates = useMemo(
    () => new Set<string>(checkIns.map((ci) => toISODate(new Date(ci.occurredAt)))),
    [checkIns],
  )
  const activeIndicators = indicators.filter((indicator) => indicator.active !== false)

  const recentCheckIn = latestCheckIn(checkIns)
  const selectedCheckIn = checkIns.find((ci) => isSameDay(ci.occurredAt, viewDate))
  const status = derivePersonStatus(activeIndicators, checkIns)
  const emoji = todayEmoji(activeIndicators, checkIns, new Date(), personId)
  const selectedDateCheckIn = checkIns.find((ci) => isSameDay(ci.occurredAt, viewDate))
  /** Note for the currently viewed date. */
  const selectedDateNote = selectedDateCheckIn?.note || null

  /** Most recent check-in with a note on a *different* day (for "Last notes" fallback). */
  const lastNoteCheckIn =
    [...checkIns]
      .filter((ci) => Boolean(ci.note) && !isSameDay(ci.occurredAt, viewDate))
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0] ?? null

  const checkInPath = `/person/${personId}/check-in`

  // No check-in yet for today → drop the caregiver straight into the check-in flow.
  // Only auto-redirect when viewing today's date (not past dates) and not from the timeline.
  const isViewingToday = isSameDay(new Date().toISOString(), viewDate)
  useEffect(() => {
    if (
      !isRealPerson ||
      isLoading ||
      !person ||
      hasRedirected.current ||
      isTimelineView ||
      !isViewingToday
    ) {
      return
    }
    if (activeIndicators.length > 0 && !selectedDateCheckIn) {
      hasRedirected.current = true
      history.push(checkInPath)
    }
  }, [
    isRealPerson,
    isLoading,
    person,
    activeIndicators.length,
    selectedDateCheckIn,
    history,
    checkInPath,
    isTimelineView,
    isViewingToday,
  ])

  // When Ionic matches /people/new against /people/:personId, bail out so
  // PersonFormPage is the only visible page.
  if (!isRealPerson) {
    return null
  }

  const goBack = () =>
    router.canGoBack() ? router.goBack() : router.push('/dashboard', 'back', 'pop')

  const editPerson = () => router.push(`/person/${personId}/edit`, 'forward')

  const manageIndicators = () =>
    router.push(`/person/${personId}/indicators`, 'forward')

  const archiveMutation = useArchivePerson()

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
        {
          text: 'Edit Person',
          icon: createOutline,
          handler: editPerson,
        },
        {
          text: 'Edit Indicators',
          icon: listOutline,
          handler: manageIndicators,
        },
        {
          text: isArchived ? 'Unarchive' : 'Archive',
          icon: archiveOutline,
          role: isArchived ? undefined : 'destructive',
          handler: toggleArchive,
        },
        {
          text: 'Cancel',
          role: 'cancel',
        },
      ],
    })
  }

  const startCheckIn = () => router.push(checkInPath, 'forward')

  const checkedForDate =
    selectedDateCheckIn &&
    new Set(parseAnswers(selectedDateCheckIn.answersJson).checked)

  const { headerElement, calendarElement } = useDateNavigator({
    date: viewDate,
    onChange: setSelectedDate,
    eventDates,
  })

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton
              fill="clear"
              onClick={goBack}
              aria-label="Go back"
            >
              <IonIcon
                slot="icon-only"
                icon={arrowBackOutline}
              />
            </IonButton>
          </IonButtons>

          {!isTimelineView ? (
            headerElement
          ) : (
            <IonTitle>{person?.displayName ?? ''}</IonTitle>
          )}
        </IonToolbar>
        {!isTimelineView && calendarElement}
      </IonHeader>

      <IonContent
        fullscreen
        className="ion-padding safe-content"
      >
        {isLoading && <LoadingState />}

        {error && <p>Failed to load this person.</p>}

        {person && (
          <>
            <section className="person-hero person-hero--compact">
              <div className="avatar-emoji-wrapper">
                <PersonAvatar
                  className="person-hero__avatar"
                  name={person.displayName}
                  src={person.avatarUrl}
                />
                {emoji && <span className="avatar-emoji-badge">{emoji}</span>}
              </div>

              <div className="person-hero__info">
                <div className="person-hero__name-row">
                  <h1 className="person-hero__name">{person.displayName}</h1>
                  <span className="person-hero__role">
                    {roleLabels[person.role as PersonRole] ?? 'Person'}
                  </span>
                </div>

                <div className="person-hero__meta">
                  <IonChip
                    color={status.color}
                    className="person-status__chip person-status__chip--sm"
                  >
                    <span className="person-status__dot" />
                    <IonLabel>{status.label}</IonLabel>
                  </IonChip>

                  <span className="person-hero__timestamp">
                    <IonIcon icon={timeOutline} />
                    {recentCheckIn
                      ? formatDistanceToNow(new Date(recentCheckIn.occurredAt), {
                          addSuffix: true,
                        })
                      : 'No check-ins yet'}
                  </span>
                </div>
              </div>
            </section>

            {isTimelineView && (
              <p className="person-hero__date-label">
                Viewing: {formatDateLabel(viewDate)}
              </p>
            )}

            {!checkedForDate && (
              <IonCard className="no-checkin-card">
                <IonCardContent className="no-checkin-card__body">
                  <p className="no-checkin-card__message">
                    No check-in recorded for {formatDateLabel(viewDate).toLowerCase()}.
                  </p>
                  <IonButton
                    expand="block"
                    onClick={startCheckIn}
                  >
                    Start Check-In
                  </IonButton>
                </IonCardContent>
              </IonCard>
            )}

            {checkedForDate && (
              <IonCard>
                <IonCardContent>
                  <div className="section-header">
                    <h2>{formatDateLabel(viewDate)} Check-In</h2>
                    <IonButton
                      fill="clear"
                      size="small"
                      onClick={startCheckIn}
                    >
                      Edit
                    </IonButton>
                  </div>

                  {selectedCheckIn && formatUpdatedLabel(selectedCheckIn) && (
                    <p className="check-in-updated">
                      {formatUpdatedLabel(selectedCheckIn)}
                    </p>
                  )}

                  {activeIndicators.length === 0 ? (
                    <p className="section-empty">No indicators tracked.</p>
                  ) : (
                    <IonList
                      lines="none"
                      className="check-in-summary"
                    >
                      {activeIndicators.map((indicator) => {
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
                              icon={
                                seen
                                  ? isDesired
                                    ? checkmarkCircle
                                    : removeCircle
                                  : isDesired
                                    ? closeCircle
                                    : checkmarkCircle
                              }
                              color={markGood ? 'success' : 'danger'}
                            />
                            <IonLabel
                              className={seen ? '' : 'check-in-summary__muted'}
                              style={
                                !seen ? { textDecoration: 'line-through' } : undefined
                              }
                            >
                              {indicator.name}
                            </IonLabel>
                          </IonItem>
                        )
                      })}
                    </IonList>
                  )}
                </IonCardContent>
              </IonCard>
            )}

            <IonCard>
              <IonCardContent>
                <div className="section-header">
                  <h2>{formatDateLabel(viewDate)} Notes</h2>
                </div>

                {selectedDateNote ? (
                  <p className="person-notes">{selectedDateNote}</p>
                ) : (
                  <>
                    <p className="person-notes person-notes--empty">
                      No notes for {formatDateLabel(viewDate).toLowerCase()}.
                    </p>

                    {lastNoteCheckIn && (
                      <div className="person-notes__last">
                        <div className="section-header">
                          <h3>Last Notes</h3>
                          <span className="section-header__meta">
                            {formatDistanceToNow(new Date(lastNoteCheckIn.occurredAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <p className="person-notes">{lastNoteCheckIn.note}</p>
                      </div>
                    )}
                  </>
                )}
              </IonCardContent>
            </IonCard>

            <div className="person-page__footer-actions">
              <IonButton
                expand="block"
                fill="outline"
                onClick={showMoreOptions}
              >
                <IonIcon
                  slot="start"
                  icon={createOutline}
                />
                Edit Person
              </IonButton>
            </div>
          </>
        )}
      </IonContent>
    </IonPage>
  )
}
