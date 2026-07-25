import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonIcon,
  IonItem,
  IonList,
  IonNote,
  IonTextarea,
  useIonAlert,
  useIonRouter,
} from '@ionic/react'
import {
  add,
  alertCircleOutline,
  calendarOutline,
  chevronBack,
  happyOutline,
} from 'ionicons/icons'
import { formatDateLabel, isSameLocalDay, toLocalDateKey } from '../../lib/dateKeys'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'

import { LoadingState } from '../../components/LoadingState'
import { PastDataNotice } from '../../components/PastDataNotice'
import { RightDrawerHeader } from '../../components/RightDrawer'
import { useRouteModal } from '../../components/RouteModalContext'
import { useSelectedDate } from '../../context/SelectedDateContext'
import { usePeople } from '../people/usePeople'
import { usePerson } from '../people/usePerson'
import { useHouseholdLifeEvents, type LifeEvent } from '../people/events/useLifeEvents'
import { useLifeEventMutations } from '../people/events/useLifeEventMutations'
import { useIndicators } from '../people/indicators/useIndicators'
import { parseAnswers } from '../people/checkin/checkInUtils'
import { useCheckInMutations } from '../people/checkin/useCheckInMutations'
import { PersonCheckInButton } from '../people/PersonPage'
import { RawCheckIn, RawIndicator } from '../patterns/analytics'
import { containsUrgentSafetySignal } from '../../lib/safety'
import { useAppAuth } from '../../auth/AuthContext'
import { accountStorageKey } from '../../lib/accountStorage'

const isSameDay = (occurredAt: string, date: Date): boolean =>
  isSameLocalDay(new Date(occurredAt), date)

type CheckedIndicators = Record<string, boolean>
/** A checkbox row: an indicator or a life event, reduced to id + label. */
interface ChecklistItem {
  id: string
  label: string
}

type WizardStepProps = {
  readonly personId: string
  readonly selectedDate: Date
  readonly hasNext: boolean
  readonly onDone: () => void
  readonly onSkip: () => void
  readonly step: StepState
}

const returnPathFromSearch = (search: string): string | undefined => {
  const returnTo = new URLSearchParams(search).get('returnTo')
  if (!returnTo?.startsWith('/')) return undefined
  if (returnTo.startsWith('//')) return undefined
  return returnTo
}

const ChecklistGroup = ({
  title,
  items,
  icon,
  color,
  checked,
  onToggle,
}: {
  readonly title: string
  readonly items: ChecklistItem[]
  readonly icon: string
  readonly color: string
  readonly checked: CheckedIndicators
  readonly onToggle: (id: string) => void
}) => {
  if (items.length === 0) return null

  return (
    <>
      <h2 className={`check-in__group-title check-in__group-title--${color}`}>
        <IonIcon
          icon={icon}
          aria-hidden="true"
        />
        {title}
      </h2>
      <IonList className="check-in__list">
        {items.map((item) => (
          <IonItem
            key={item.id}
            className="check-in__item"
          >
            <IonCheckbox
              justify="start"
              labelPlacement="end"
              checked={Boolean(checked[item.id])}
              onIonChange={() => onToggle(item.id)}
            >
              {item.label}
            </IonCheckbox>
          </IonItem>
        ))}
      </IonList>
    </>
  )
}

const indicatorItems = (indicators: RawIndicator[]): ChecklistItem[] =>
  indicators.map((i) => ({ id: i.id, label: i.name }))

const EmptyIndicatorsMessage = ({ personId }: { readonly personId: string }) => {
  const router = useIonRouter()
  const indicatorPath = `/person/${personId}/indicators/new`

  return (
    <p className="section-empty">
      No signals yet — skip or{' '}
      <a
        href={indicatorPath}
        onClick={(event) => {
          event.preventDefault()
          router.push(indicatorPath, 'forward', 'push')
        }}
      >
        add some first
      </a>
      .
    </p>
  )
}

const CheckInNotes = ({
  note,
  existing,
  dateLabel,
  onNoteChange,
}: {
  readonly note: string
  readonly existing: unknown
  readonly dateLabel: string
  readonly onNoteChange: (note: string) => void
}) => {
  const lowerDateLabel = dateLabel.toLowerCase()

  return (
    <>
      <h2 className="check-in__group-title">Notes</h2>
      <IonList className="check-in__list check-in__list--notes">
        <IonItem
          lines="none"
          className="check-in__item check-in__item--notes"
        >
          <IonTextarea
            label="Anything else worth remembering?"
            labelPlacement="stacked"
            autoGrow
            value={note}
            onIonInput={(event) => onNoteChange(event.detail.value ?? '')}
          />
        </IonItem>
      </IonList>

      <IonNote className="check-in__hint">
        {existing
          ? `You're updating ${lowerDateLabel}'s check-in.`
          : `Saving records ${lowerDateLabel}'s check-in.`}
      </IonNote>
    </>
  )
}

const buildCheckInPayload = (
  selectedDate: Date,
  checkedIndicatorIds: string[],
  checkedEventIds: string[],
  note: string,
) => {
  const occurDate = new Date(selectedDate)
  occurDate.setHours(12, 0, 0, 0)

  return {
    occurredAt: occurDate.toISOString(),
    answers: { checked: checkedIndicatorIds, events: checkedEventIds },
    note: note.trim() || undefined,
  }
}

const activeLifeEvents = (events: LifeEvent[]): ChecklistItem[] =>
  [...events]
    .filter((e) => e.archived !== true)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((e) => ({ id: e.id, label: e.label }))

const selectedIds = (items: ChecklistItem[], checked: CheckedIndicators): string[] =>
  items.filter((i) => checked[i.id]).map((i) => i.id)

const activeIndicators = (list: RawIndicator[]): RawIndicator[] =>
  list.filter((i) => i.active !== false)

type CheckInMutations = ReturnType<typeof useCheckInMutations>

const commitCheckIn = async (
  mutations: CheckInMutations,
  existing: { id: string } | undefined,
  payload: ReturnType<typeof buildCheckInPayload>,
): Promise<void> => {
  if (existing) await mutations.update(existing.id, payload)
  else await mutations.create(payload)
}

const useCheckInDraft = (
  accountId: string | undefined,
  personId: string,
  selectedDate: Date,
  existing: RawCheckIn | undefined,
  householdEventIds: string[],
  householdEventsLoading: boolean,
) => {
  const draftKey = accountStorageKey(
    accountId,
    `check-in-draft:${personId}:${toLocalDateKey(selectedDate)}`,
  )
  const [checked, setChecked] = useState<CheckedIndicators>({})
  const [checkedEvents, setCheckedEvents] = useState<CheckedIndicators>({})
  const [note, setNote] = useState('')
  const [prefilled, setPrefilled] = useState(false)

  useEffect(() => {
    let saved: {
      checked?: CheckedIndicators
      checkedEvents?: CheckedIndicators
      note?: string
    } = {}
    try {
      saved = JSON.parse(localStorage.getItem(draftKey) ?? '{}')
    } catch {
      /* ignore damaged drafts */
    }
    setChecked(saved.checked ?? {})
    setCheckedEvents(saved.checkedEvents ?? {})
    setNote(saved.note ?? '')
    setPrefilled(false)
  }, [draftKey, personId, selectedDate])

  useEffect(() => {
    if (prefilled || householdEventsLoading) return
    const answers = existing
      ? parseAnswers(existing.answersJson)
      : { checked: [], events: [] }
    const hasSavedDraft = localStorage.getItem(draftKey) !== null
    if (!hasSavedDraft) {
      setChecked(Object.fromEntries(answers.checked.map((id) => [id, true])))
      setCheckedEvents(Object.fromEntries(householdEventIds.map((id) => [id, true])))
      setNote(existing?.note ?? '')
    }
    setPrefilled(true)
  }, [
    existing,
    householdEventIds,
    householdEventsLoading,
    prefilled,
    personId,
    selectedDate,
    draftKey,
  ])

  useEffect(() => {
    if (!prefilled) return
    localStorage.setItem(draftKey, JSON.stringify({ checked, checkedEvents, note }))
  }, [checked, checkedEvents, draftKey, note, prefilled])

  return {
    checked,
    checkedEvents,
    note,
    setNote,
    clearDraft: () => localStorage.removeItem(draftKey),
    toggle: (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] })),
    toggleEvent: (id: string) =>
      setCheckedEvents((prev) => ({ ...prev, [id]: !prev[id] })),
  }
}

const useWizardStepState = ({
  personId,
  selectedDate,
}: Pick<WizardStepProps, 'personId' | 'selectedDate'>) => {
  const { user } = useAppAuth()
  const { data: person, isLoading } = usePerson(personId)
  const peopleQuery = usePeople()
  const indicatorsQuery = useIndicators(personId)
  const lifeEventsQuery = useHouseholdLifeEvents(person?.householdId)
  const mutations = useCheckInMutations(personId)
  const [saving, setSaving] = useState(false)
  const indicators = useMemo(
    () =>
      activeIndicators(
        (indicatorsQuery.data ?? person?.indicators ?? []) as RawIndicator[],
      ),
    [indicatorsQuery.data, person],
  )
  const events = useMemo(
    () => activeLifeEvents(lifeEventsQuery.data ?? []),
    [lifeEventsQuery.data],
  )
  const existing = useMemo(
    () => (person?.checkIns ?? []).find((ci) => isSameDay(ci.occurredAt, selectedDate)),
    [person, selectedDate],
  )
  const householdEventIds = useMemo(() => {
    if (!person?.householdId) return []
    const ids = new Set<string>()
    for (const householdPerson of peopleQuery.data ?? []) {
      if (householdPerson.householdId !== person.householdId) continue
      for (const checkIn of householdPerson.checkIns ?? []) {
        if (!isSameDay(checkIn.occurredAt, selectedDate)) continue
        for (const eventId of parseAnswers(checkIn.answersJson).events) ids.add(eventId)
      }
    }
    return [...ids].sort()
  }, [peopleQuery.data, person?.householdId, selectedDate])
  const draft = useCheckInDraft(
    user?.userId,
    personId,
    selectedDate,
    existing,
    householdEventIds,
    peopleQuery.isLoading,
  )

  const save = async (): Promise<boolean> => {
    if (saving) return false
    setSaving(true)
    try {
      const payload = buildCheckInPayload(
        selectedDate,
        selectedIds(indicatorItems(indicators), draft.checked),
        selectedIds(events, draft.checkedEvents),
        draft.note,
      )
      await commitCheckIn(mutations, existing, payload)
      if (person?.householdId) {
        await mutations.syncHouseholdEventsForDate(
          person.householdId,
          payload.occurredAt,
          payload.answers.events,
        )
      }
      draft.clearDraft()
      return true
    } finally {
      setSaving(false)
    }
  }

  return {
    person,
    householdId: person?.householdId,
    isLoading:
      isLoading ||
      peopleQuery.isLoading ||
      indicatorsQuery.isLoading ||
      lifeEventsQuery.isLoading,
    indicators,
    events,
    existing,
    saving,
    ...draft,
    save,
  }
}

/**
 * Renders the check-in form (and, after saving, the review) for a single
 * person inside the wizard. Handles its own local state so each step is
 * independent.
 */
type StepState = ReturnType<typeof useWizardStepState>

const EventsSection = ({
  events,
  checked,
  householdId,
  onToggle,
}: {
  readonly events: ChecklistItem[]
  readonly checked: CheckedIndicators
  readonly householdId: string | undefined
  readonly onToggle: (id: string) => void
}) => {
  const { create } = useLifeEventMutations(householdId)
  const [presentAlert] = useIonAlert()

  const reportError = (error: unknown) =>
    void presentAlert({
      header: 'Couldn’t add event',
      message: error instanceof Error ? error.message : 'Please try again.',
      buttons: ['OK'],
    })

  const addEvent = () =>
    void presentAlert({
      header: 'Add event',
      message: 'Adds to your household’s shared list of events.',
      inputs: [
        { name: 'label', type: 'text', placeholder: 'e.g. Therapy Appointment' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (values: { label?: string }) => {
            const label = values.label?.trim()
            if (!label) return false
            create(label, events.length)
              .then((id) => id && onToggle(id))
              .catch(reportError)
            return true
          },
        },
      ],
    })

  return (
    <>
      <h2 className="check-in__group-title check-in__group-title--primary">
        <IonIcon
          icon={calendarOutline}
          aria-hidden="true"
        />
        Events that occurred
      </h2>
      <CheckboxList
        items={events}
        checked={checked}
        onToggle={onToggle}
      />
      <IonButton
        fill="clear"
        size="small"
        className="check-in__add-event"
        onClick={addEvent}
      >
        <IonIcon
          slot="start"
          icon={add}
        />
        Add event
      </IonButton>
    </>
  )
}

/** A bare checkbox list (no heading), used inside sections. */
const CheckboxList = ({
  items,
  checked,
  onToggle,
}: {
  readonly items: ChecklistItem[]
  readonly checked: CheckedIndicators
  readonly onToggle: (id: string) => void
}) => {
  if (items.length === 0) return null
  return (
    <IonList className="check-in__list">
      {items.map((item) => (
        <IonItem
          key={item.id}
          className="check-in__item"
        >
          <IonCheckbox
            justify="start"
            labelPlacement="end"
            checked={Boolean(checked[item.id])}
            onIonChange={() => onToggle(item.id)}
          >
            {item.label}
          </IonCheckbox>
        </IonItem>
      ))}
    </IonList>
  )
}

const CheckInSections = ({
  step,
  challenges,
  positives,
  selectedDate,
}: {
  readonly step: StepState
  readonly challenges: ChecklistItem[]
  readonly positives: ChecklistItem[]
  readonly selectedDate: Date
}) => (
  <>
    <ChecklistGroup
      title="Challenges"
      items={challenges}
      icon={alertCircleOutline}
      color="danger"
      checked={step.checked}
      onToggle={step.toggle}
    />
    <ChecklistGroup
      title="Positive Signs"
      items={positives}
      icon={happyOutline}
      color="success"
      checked={step.checked}
      onToggle={step.toggle}
    />
    <EventsSection
      events={step.events}
      checked={step.checkedEvents}
      householdId={step.householdId}
      onToggle={step.toggleEvent}
    />
    <CheckInNotes
      note={step.note}
      existing={step.existing}
      dateLabel={formatDateLabel(selectedDate)}
      onNoteChange={step.setNote}
    />
  </>
)

const WizardStep = ({ personId, selectedDate, step }: WizardStepProps) => {
  const [continuedAfterSafety, setContinuedAfterSafety] = useState(false)
  const challenges = indicatorItems(
    step.indicators.filter((i) => i.polarity === 'undesired'),
  )
  const positives = indicatorItems(
    step.indicators.filter((i) => i.polarity === 'desired'),
  )
  const nothingToTrack = step.indicators.length === 0 && step.events.length === 0
  const urgentSignal = containsUrgentSafetySignal([
    step.note,
    ...step.indicators
      .filter((indicator) => step.checked[indicator.id])
      .map((indicator) => indicator.name),
  ])
  useEffect(() => {
    if (!urgentSignal) setContinuedAfterSafety(false)
  }, [urgentSignal])

  if (step.isLoading)
    return (
      <LoadingState
        variant="form"
        label="Loading check-in"
        rows={4}
      />
    )
  if (!step.person) return null

  return (
    <>
      <PersonCheckInButton
        person={step.person}
        status={undefined}
        title={formatDateLabel(selectedDate)}
        onClick={undefined}
      />
      {urgentSignal && (
        <section
          className="safety-escalation"
          role="alert"
        >
          <h2>Pause and check immediate safety</h2>
          <p>
            This entry may describe an urgent safety concern. Grove cannot assess the
            danger. If anyone may be unsafe, contact trained help now.
          </p>
          <IonButton
            color="danger"
            routerLink="/help-now"
          >
            View support options
          </IonButton>
          {!continuedAfterSafety && (
            <IonButton
              fill="outline"
              color="danger"
              onClick={() => setContinuedAfterSafety(true)}
            >
              I’m safe enough to continue recording
            </IonButton>
          )}
        </section>
      )}
      {urgentSignal && !continuedAfterSafety ? (
        <p className="safety-escalation__pause">
          The ordinary check-in is paused until you choose a safety option above.
        </p>
      ) : nothingToTrack ? (
        <EmptyIndicatorsMessage personId={personId} />
      ) : (
        <CheckInSections
          step={step}
          challenges={challenges}
          positives={positives}
          selectedDate={selectedDate}
        />
      )}
    </>
  )
}

const useWizardPeople = (
  personId: string | undefined,
  people: ReturnType<typeof usePeople>,
) =>
  useMemo(() => {
    if (personId) return [{ id: personId }]
    return (people.data ?? []).filter((p) => !p.archived)
  }, [people.data, personId])

const useWizardAdvance =
  ({
    activePeopleLength,
    currentIndex,
    personId,
    returnPath,
    routeModal,
    router,
    setCurrentIndex,
  }: {
    readonly activePeopleLength: number
    readonly currentIndex: number
    readonly personId: string | undefined
    readonly returnPath: string | undefined
    readonly routeModal: ReturnType<typeof useRouteModal>
    readonly router: ReturnType<typeof useIonRouter>
    readonly setCurrentIndex: (index: number) => void
  }) =>
  () => {
    const next = currentIndex + 1
    if (next < activePeopleLength) {
      setCurrentIndex(next)
      return
    }
    // Honour an explicit ?returnTo= even when shown as a modal (e.g. opened
    // from the calendar heatmap), so we land back where we came from.
    if (routeModal.isRouteModal) return routeModal.dismiss(returnPath)
    if (returnPath) return router.push(returnPath, 'back', 'pop')
    if (personId) return router.push(`/person/${personId}`, 'back', 'pop')
    return router.push('/dashboard', 'back', 'pop')
  }

const renderTimeTravelNotice = (selectedDate: Date, callback: () => void) => (
  <PastDataNotice
    selectedDateLabel={formatDateLabel(selectedDate)}
    onReturnToToday={callback}
    className="past-data-notice--page"
  />
)

export const CheckInWizardPage = ({
  personIdOverride,
}: {
  readonly personIdOverride?: string
} = {}) => {
  const { personId: routePersonId } = useParams<{ personId: string }>()
  const personId = personIdOverride ?? routePersonId
  const location = useLocation()
  const { selectedDate, setSelectedDate } = useSelectedDate()
  const people = usePeople()
  const returnPath = useMemo(
    () => returnPathFromSearch(location.search),
    [location.search],
  )
  const activePeople = useWizardPeople(personId, people)
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentPerson = activePeople[currentIndex]
  const isLoadingPeople = !personId && people.isLoading
  const isTimeTravel = formatDateLabel(selectedDate) !== 'Today'
  const routeModal = useRouteModal()
  const advance = useWizardAdvance({
    activePeopleLength: activePeople.length,
    currentIndex,
    personId,
    returnPath,
    routeModal,
    router: useIonRouter(),
    setCurrentIndex,
  })

  const step = useWizardStepState({
    personId: currentPerson?.id,
    selectedDate,
  })
  const onSave = async () => (await step.save()) && advance()

  return (
    <>
      <RightDrawerHeader
        title={`${step?.person?.displayName ?? ''} - ${formatDateLabel(selectedDate)}`}
        start={
          <>
            {currentIndex > 0 ? (
              <IonButton onClick={() => setCurrentIndex(currentIndex - 1)}>
                <IonIcon
                  slot="icon-only"
                  icon={chevronBack}
                />
              </IonButton>
            ) : (
              <IonButton onClick={() => routeModal.dismiss()}>Close</IonButton>
            )}
          </>
        }
        end={
          <IonButton onClick={onSave}>{step.existing ? 'Update' : 'Save'}</IonButton>
        }
      />
      <IonContent
        className={`app-page ion-padding check-in-wizard-content${isTimeTravel ? ' time-travel-surface' : ''}`}
      >
        {isTimeTravel &&
          renderTimeTravelNotice(selectedDate, () => setSelectedDate(new Date()))}

        {isLoadingPeople && (
          <LoadingState
            variant="list"
            label="Loading household members"
          />
        )}

        {!isLoadingPeople && activePeople.length === 0 && (
          <p className="section-empty">No household members to check in.</p>
        )}

        {currentPerson && (
          <WizardStep
            key={currentPerson.id}
            personId={currentPerson.id}
            selectedDate={selectedDate}
            hasNext={currentIndex < activePeople.length - 1}
            onDone={advance}
            onSkip={advance}
            step={step}
          />
        )}
      </IonContent>
    </>
  )
}
