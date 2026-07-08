import {
  IonButton,
  IonCheckbox,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonTextarea,
  useIonRouter,
} from '@ionic/react'
import { checkmarkCircle, removeCircle } from 'ionicons/icons'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'

import { LoadingState } from '../../components/LoadingState'
import { Page } from '../../components/Page'
import { PastDataNotice } from '../../components/PastDataNotice'
import { PersonAvatar } from '../../components/PersonAvatar'
import { useRouteModal } from '../../components/RouteModalContext'
import { useSelectedDate } from '../../context/SelectedDateContext'
import { usePeople } from '../people/usePeople'
import { usePerson } from '../people/usePerson'
import { useIndicators } from '../people/indicators/useIndicators'
import { parseAnswers } from '../people/checkin/checkInUtils'
import { useCheckInMutations } from '../people/checkin/useCheckInMutations'

function isSameDay(occurredAt: string, date: Date): boolean {
  const d = new Date(occurredAt)
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  )
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

type Indicator = NonNullable<ReturnType<typeof usePerson>['data']>['indicators'][number]
type CheckedIndicators = Record<string, boolean>
type WizardStepProps = {
  readonly personId: string
  readonly selectedDate: Date
  readonly hasNext: boolean
  readonly onDone: () => void
  readonly onSkip: () => void
}

function returnPathFromSearch(search: string): string | undefined {
  const returnTo = new URLSearchParams(search).get('returnTo')
  if (!returnTo?.startsWith('/')) return undefined
  if (returnTo.startsWith('//')) return undefined
  return returnTo
}

function IndicatorGroup({
  title,
  items,
  icon,
  color,
  checked,
  onToggle,
}: {
  readonly title: string
  readonly items: Indicator[]
  readonly icon: string
  readonly color: string
  readonly checked: CheckedIndicators
  readonly onToggle: (id: string) => void
}) {
  if (items.length === 0) return null

  return (
    <>
      <h2 className="check-in__group-title">{title}</h2>
      <IonList
        inset
        className="check-in__list"
      >
        {items.map((indicator) => (
          <IonItem
            key={indicator.id}
            className="check-in__item"
          >
            <IonIcon
              slot="start"
              icon={icon}
              color={color}
            />
            <IonCheckbox
              slot="end"
              aria-label={indicator.name}
              checked={Boolean(checked[indicator.id])}
              onIonChange={() => onToggle(indicator.id)}
            />
            <IonLabel className="check-in__item-label">{indicator.name}</IonLabel>
          </IonItem>
        ))}
      </IonList>
    </>
  )
}

function EmptyIndicatorsMessage({ personId }: { readonly personId: string }) {
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

function CheckInNotes({
  note,
  existing,
  dateLabel,
  onNoteChange,
}: {
  readonly note: string
  readonly existing: unknown
  readonly dateLabel: string
  readonly onNoteChange: (note: string) => void
}) {
  const lowerDateLabel = dateLabel.toLowerCase()

  return (
    <>
      <h2 className="check-in__group-title">Notes</h2>
      <IonList
        inset
        className="check-in__list check-in__list--notes"
      >
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

function WizardActions({
  existing,
  saving,
  canSave,
  hasNext,
  onSkip,
  onSave,
}: {
  readonly existing: unknown
  readonly saving: boolean
  readonly canSave: boolean
  readonly hasNext: boolean
  readonly onSkip: () => void
  readonly onSave: () => void
}) {
  const saveLabel = `${existing ? 'Update' : 'Save'}${hasNext ? ' & Next' : ''}`

  return (
    <div className="wizard-step__actions">
      <IonButton
        fill="outline"
        onClick={onSkip}
      >
        Skip
      </IonButton>
      <IonButton
        disabled={saving || !canSave}
        onClick={onSave}
      >
        {saveLabel}
      </IonButton>
    </div>
  )
}

function buildCheckInPayload(
  selectedDate: Date,
  indicators: Indicator[],
  checked: CheckedIndicators,
  note: string,
) {
  const occurDate = new Date(selectedDate)
  occurDate.setHours(12, 0, 0, 0)

  return {
    occurredAt: occurDate.toISOString(),
    answers: { checked: indicators.filter((i) => checked[i.id]).map((i) => i.id) },
    note: note.trim() || undefined,
  }
}

function useWizardStepState({
  personId,
  selectedDate,
  onDone,
}: Pick<WizardStepProps, 'personId' | 'selectedDate' | 'onDone'>) {
  const { data: person, isLoading } = usePerson(personId)
  const indicatorsQuery = useIndicators(personId)
  const { create, update } = useCheckInMutations(personId)
  const indicators = useMemo(
    () =>
      ((indicatorsQuery.data ?? person?.indicators ?? []) as Indicator[]).filter(
        (i) => i.active !== false,
      ),
    [indicatorsQuery.data, person],
  )
  const existing = useMemo(
    () => (person?.checkIns ?? []).find((ci) => isSameDay(ci.occurredAt, selectedDate)),
    [person, selectedDate],
  )
  const [checked, setChecked] = useState<CheckedIndicators>({})
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [prefilled, setPrefilled] = useState(false)

  useEffect(() => {
    setChecked({})
    setNote('')
    setSaving(false)
    setPrefilled(false)
  }, [personId, selectedDate])

  useEffect(() => {
    if (prefilled || !existing) return
    const answers = parseAnswers(existing.answersJson)
    setChecked(Object.fromEntries(answers.checked.map((id) => [id, true])))
    setNote(existing.note ?? '')
    setPrefilled(true)
  }, [existing, prefilled])

  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }))

  async function save() {
    if (saving) return

    setSaving(true)
    try {
      const payload = buildCheckInPayload(selectedDate, indicators, checked, note)
      if (existing) await update(existing.id, payload)
      else await create(payload)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return {
    person,
    isLoading: isLoading || indicatorsQuery.isLoading,
    indicators,
    existing,
    checked,
    note,
    saving,
    setNote,
    toggle,
    save,
  }
}

/**
 * Renders the check-in form for a single person inside the wizard.
 * Handles its own local state so each step is independent.
 */
function WizardStep({
  personId,
  selectedDate,
  hasNext,
  onDone,
  onSkip,
}: WizardStepProps) {
  const step = useWizardStepState({ personId, selectedDate, onDone })
  const { person, isLoading, indicators, existing, checked, note, saving } = step
  const desired = indicators.filter((i) => i.polarity === 'desired')
  const undesired = indicators.filter((i) => i.polarity === 'undesired')

  if (isLoading) {
    return <LoadingState />
  }

  return (
    person && (
      <>
        <div className="wizard-step__hero">
          <PersonAvatar
            name={person.displayName}
            src={person.avatarUrl}
            className="wizard-step__avatar"
          />
          <h2 className="wizard-step__name">{person.displayName}</h2>
        </div>

        {indicators.length === 0 ? (
          <EmptyIndicatorsMessage personId={personId} />
        ) : (
          <>
            <IndicatorGroup
              title="What went well"
              items={desired}
              icon={checkmarkCircle}
              color="success"
              checked={checked}
              onToggle={step.toggle}
            />
            <IndicatorGroup
              title="What we watched for"
              items={undesired}
              icon={removeCircle}
              color="danger"
              checked={checked}
              onToggle={step.toggle}
            />
            <CheckInNotes
              note={note}
              existing={existing}
              dateLabel={formatDateLabel(selectedDate)}
              onNoteChange={step.setNote}
            />
          </>
        )}

        <WizardActions
          existing={existing}
          saving={saving}
          canSave={indicators.length > 0}
          hasNext={hasNext}
          onSkip={onSkip}
          onSave={step.save}
        />
      </>
    )
  )
}

function useWizardPeople(
  personId: string | undefined,
  people: ReturnType<typeof usePeople>,
) {
  return useMemo(() => {
    if (personId) return [{ id: personId }]
    return (people.data ?? []).filter((p) => !p.archived)
  }, [people.data, personId])
}

function useWizardAdvance({
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
}) {
  return () => {
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
}

/**
 * Allows users to create a check-in for a person.
 * @returns {React.JSX.Element}
 * @constructor
 */
export function CheckInWizardPage({
  personIdOverride,
}: {
  readonly personIdOverride?: string
} = {}) {
  const router = useIonRouter()
  const { personId: routePersonId } = useParams<{ personId: string }>()
  const personId = personIdOverride ?? routePersonId
  const location = useLocation()
  const routeModal = useRouteModal()
  const { selectedDate, setSelectedDate } = useSelectedDate()
  const people = usePeople()
  const returnPath = useMemo(
    () => returnPathFromSearch(location.search),
    [location.search],
  )
  const activePeople = useWizardPeople(personId, people)
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentPerson = activePeople[currentIndex]
  const total = activePeople.length
  const isLoadingPeople = !personId && people.isLoading
  const isTimeTravel = formatDateLabel(selectedDate) !== 'Today'
  const title = total > 1 ? `Check-In (${currentIndex + 1} of ${total})` : 'Check-In'
  const backHref = returnPath ?? (personId ? `/person/${personId}` : '/dashboard')
  const advance = useWizardAdvance({
    activePeopleLength: activePeople.length,
    currentIndex,
    personId,
    returnPath,
    routeModal,
    router,
    setCurrentIndex,
  })

  return (
    <Page
      title={title}
      backHref={backHref}
      onBackClick={routeModal.isRouteModal ? () => routeModal.dismiss() : undefined}
      className={`check-in-wizard-content${isTimeTravel ? ' time-travel-surface' : ''}`}
    >
      {isTimeTravel ? (
        <PastDataNotice
          selectedDateLabel={formatDateLabel(selectedDate)}
          onReturnToToday={() => setSelectedDate(new Date())}
          className="past-data-notice--page"
        />
      ) : (
        <p className="wizard-date-badge">{formatDateLabel(selectedDate)}</p>
      )}

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
        />
      )}
    </Page>
  )
}
