import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonNote,
  IonTextarea,
  IonTitle,
  IonToolbar,
  useIonAlert,
  useIonRouter,
} from '@ionic/react'
import { add, alertCircleOutline, calendarOutline, happyOutline } from 'ionicons/icons'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'

import { LoadingState } from '../../components/LoadingState'
import { PastDataNotice } from '../../components/PastDataNotice'
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

const isSameDay = (occurredAt: string, date: Date): boolean => {
  const d = new Date(occurredAt)
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  )
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
      No indicators yet — skip or{' '}
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
  personId: string,
  selectedDate: Date,
  existing: RawCheckIn | undefined,
) => {
  const [checked, setChecked] = useState<CheckedIndicators>({})
  const [checkedEvents, setCheckedEvents] = useState<CheckedIndicators>({})
  const [note, setNote] = useState('')
  const [prefilled, setPrefilled] = useState(false)

  useEffect(() => {
    setChecked({})
    setCheckedEvents({})
    setNote('')
    setPrefilled(false)
  }, [personId, selectedDate])

  useEffect(() => {
    if (prefilled || !existing) return
    const answers = parseAnswers(existing.answersJson)
    setChecked(Object.fromEntries(answers.checked.map((id) => [id, true])))
    setCheckedEvents(Object.fromEntries(answers.events.map((id) => [id, true])))
    setNote(existing.note ?? '')
    setPrefilled(true)
  }, [existing, prefilled])

  return {
    checked,
    checkedEvents,
    note,
    setNote,
    toggle: (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] })),
    toggleEvent: (id: string) =>
      setCheckedEvents((prev) => ({ ...prev, [id]: !prev[id] })),
  }
}

const useWizardStepState = ({
  personId,
  selectedDate,
}: Pick<WizardStepProps, 'personId' | 'selectedDate'>) => {
  const { data: person, isLoading } = usePerson(personId)
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
  const draft = useCheckInDraft(personId, selectedDate, existing)

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
      return true
    } finally {
      setSaving(false)
    }
  }

  return {
    person,
    householdId: person?.householdId,
    isLoading: isLoading || indicatorsQuery.isLoading || lifeEventsQuery.isLoading,
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
  const challenges = indicatorItems(
    step.indicators.filter((i) => i.polarity === 'undesired'),
  )
  const positives = indicatorItems(
    step.indicators.filter((i) => i.polarity === 'desired'),
  )
  const nothingToTrack = step.indicators.length === 0 && step.events.length === 0

  if (step.isLoading) return <LoadingState />
  if (!step.person) return null

  return (
    <>
      <PersonCheckInButton
        person={step.person}
        status={undefined}
        title={formatDateLabel(selectedDate)}
        onClick={undefined}
      />
      {nothingToTrack ? (
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

  const step = useWizardStepState({ personId, selectedDate })
  const onSave = async () => (await step.save()) && advance()

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => routeModal.dismiss()}>Close</IonButton>
          </IonButtons>

          <IonTitle>
            {step?.person?.displayName} - {formatDateLabel(selectedDate)}
          </IonTitle>

          <IonButtons slot="end">
            <IonButton onClick={onSave}>{step.existing ? 'Update' : 'Save'}</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent
        className={`ion-padding check-in-wizard-content${isTimeTravel ? ' time-travel-surface' : ''}`}
      >
        {isTimeTravel &&
          renderTimeTravelNotice(selectedDate, () => setSelectedDate(new Date()))}

        {isLoadingPeople && <LoadingState />}

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
