import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonNote,
  IonPage,
  IonTextarea,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react'
import { checkmarkCircle, removeCircle } from 'ionicons/icons'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'

import { LoadingState } from '../../components/LoadingState'
import { PersonAvatar } from '../../components/PersonAvatar'
import { useSelectedDate } from '../../context/SelectedDateContext'
import { usePeople } from '../people/usePeople'
import { usePerson } from '../people/usePerson'
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

function returnPathFromSearch(search: string): string | undefined {
  const returnTo = new URLSearchParams(search).get('returnTo')
  if (!returnTo?.startsWith('/')) return undefined
  if (returnTo.startsWith('//')) return undefined
  return returnTo
}

/**
 * Renders the check-in form for a single person inside the wizard.
 * Handles its own local state so each step is independent.
 */
function WizardStep({
  personId,
  selectedDate,
  onDone,
  onSkip,
}: {
  readonly personId: string
  readonly selectedDate: Date
  readonly onDone: () => void
  readonly onSkip: () => void
}) {
  const router = useIonRouter()
  const { data: person, isLoading } = usePerson(personId)
  const { create, update } = useCheckInMutations(personId)

  const indicators = useMemo(
    () => ((person?.indicators ?? []) as Indicator[]).filter((i) => i.active !== false),
    [person],
  )
  const desired = indicators.filter((i) => i.polarity === 'desired')
  const undesired = indicators.filter((i) => i.polarity === 'undesired')

  const existing = useMemo(
    () => (person?.checkIns ?? []).find((ci) => isSameDay(ci.occurredAt, selectedDate)),
    [person, selectedDate],
  )

  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [prefilled, setPrefilled] = useState(false)

  // Reset local state when the personId changes (new step).
  useEffect(() => {
    setChecked({})
    setNote('')
    setSaving(false)
    setPrefilled(false)
  }, [personId])

  // Prefill from an existing check-in for today.
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

    // Use noon on the selected date so the timestamp clearly belongs to that day.
    const occurDate = new Date(selectedDate)
    occurDate.setHours(12, 0, 0, 0)

    const payload = {
      occurredAt: occurDate.toISOString(),
      answers: { checked: indicators.filter((i) => checked[i.id]).map((i) => i.id) },
      note: note.trim() || undefined,
    }

    setSaving(true)
    try {
      if (existing) {
        await update(existing.id, payload)
      } else {
        await create(payload)
      }
      onDone()
    } finally {
      setSaving(false)
    }
  }

  const renderGroup = (
    title: string,
    items: Indicator[],
    icon: string,
    color: string,
  ) =>
    items.length > 0 && (
      <>
        <h2 className="check-in__group-title">{title}</h2>
        <IonList inset>
          {items.map((indicator) => (
            <IonItem key={indicator.id}>
              <IonIcon
                slot="start"
                icon={icon}
                color={color}
              />
              <IonCheckbox
                justify="space-between"
                checked={Boolean(checked[indicator.id])}
                onIonChange={() => toggle(indicator.id)}
              >
                {indicator.name}
              </IonCheckbox>
            </IonItem>
          ))}
        </IonList>
      </>
    )

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
          <p className="section-empty">
            No indicators yet — skip or{' '}
            <a
              href={`/person/${personId}/indicators/new`}
              onClick={(e) => {
                e.preventDefault()
                router.push(`/person/${personId}/indicators/new`, 'forward', 'push')
              }}
            >
              add some first
            </a>
            .
          </p>
        ) : (
          <>
            {renderGroup('What went well', desired, checkmarkCircle, 'success')}
            {renderGroup('What we watched for', undesired, removeCircle, 'danger')}

            <h2 className="check-in__group-title">Notes</h2>
            <IonList inset>
              <IonItem lines="none">
                <IonTextarea
                  label="Anything else worth remembering?"
                  labelPlacement="stacked"
                  autoGrow
                  value={note}
                  onIonInput={(e) => setNote(e.detail.value ?? '')}
                />
              </IonItem>
            </IonList>

            <IonNote className="check-in__hint">
              {existing
                ? "You're updating today's check-in."
                : "Saving records today's check-in."}
            </IonNote>
          </>
        )}

        <div className="wizard-step__actions">
          <IonButton
            fill="outline"
            onClick={onSkip}
          >
            Skip
          </IonButton>
          <IonButton
            disabled={saving || indicators.length === 0}
            onClick={save}
          >
            {existing ? 'Update' : 'Save'} &amp; Next
          </IonButton>
        </div>
      </>
    )
  )
}

/**
 * Allows users to create a check-in for a person.
 * @returns {React.JSX.Element}
 * @constructor
 */
export function CheckInWizardPage() {
  const router = useIonRouter()
  const { personId } = useParams<{ personId: string }>()
  const location = useLocation()
  const { selectedDate } = useSelectedDate()
  const people = usePeople()
  const returnPath = useMemo(
    () => returnPathFromSearch(location.search),
    [location.search],
  )

  const activePeople = useMemo(() => {
    const list = (people.data ?? []).filter((p) => !p.archived)
    if (personId) {
      return list.filter((p) => p.id === personId)
    }
    return list
  }, [people.data, personId])

  const [currentIndex, setCurrentIndex] = useState(0)

  function advance() {
    const next = currentIndex + 1
    if (next >= activePeople.length) {
      if (returnPath) {
        return router.push(returnPath, 'back', 'pop')
      }
      if (personId) {
        return router.push(`/person/${personId}`, 'back', 'pop')
      }
      return router.push('/dashboard', 'back', 'pop')
    }
    setCurrentIndex(next)
  }

  const currentPerson = activePeople[currentIndex]
  const total = activePeople.length

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color={'transparent'}>
          <IonButtons slot="start">
            <IonBackButton
              defaultHref={
                returnPath ?? (personId ? `/person/${personId}` : '/dashboard')
              }
              text=""
            />
          </IonButtons>
          <IonTitle>
            {total > 0 ? `Check-In (${currentIndex + 1} of ${total})` : 'Check-In'}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              disabled
              className="wizard-date-badge"
            >
              {formatDateLabel(selectedDate)}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent
        fullscreen
        className="ion-padding safe-content"
      >
        {people.isLoading && <LoadingState />}

        {!people.isLoading && activePeople.length === 0 && (
          <p className="section-empty">No household members to check in.</p>
        )}

        {currentPerson && (
          <WizardStep
            key={currentPerson.id}
            personId={currentPerson.id}
            selectedDate={selectedDate}
            onDone={advance}
            onSkip={advance}
          />
        )}
      </IonContent>
    </IonPage>
  )
}
