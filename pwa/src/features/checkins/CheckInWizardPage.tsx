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
    IonPage,
    IonSpinner,
    IonTextarea,
    IonTitle,
    IonToolbar,
    useIonRouter,
} from '@ionic/react'
import { arrowBackOutline, checkmarkCircle, removeCircle } from 'ionicons/icons'
import { useEffect, useMemo, useState } from 'react'

import { PersonAvatar } from '../../components/PersonAvatar'
import { usePeople } from '../people/usePeople'
import { usePerson } from '../people/usePerson'
import { findTodaysCheckIn, parseAnswers } from '../people/checkin/checkInUtils'
import { useCheckInMutations } from '../people/checkin/useCheckInMutations'

type Indicator = NonNullable<ReturnType<typeof usePerson>['data']>['indicators'][number]

/**
 * Renders the check-in form for a single person inside the wizard.
 * Handles its own local state so each step is independent.
 */
function WizardStep({
    personId,
    onDone,
    onSkip,
}: {
    personId: string
    onDone: () => void
    onSkip: () => void
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
        () => findTodaysCheckIn(person?.checkIns ?? []),
        [person],
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

    function toggle(id: string) {
        setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
    }

    async function save() {
        if (saving) return

        const payload = {
            occurredAt: new Date().toISOString(),
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

    function renderGroup(title: string, items: Indicator[], icon: string, color: string) {
        if (items.length === 0) return null
        return (
            <>
                <h2 className="check-in__group-title">{title}</h2>
                <IonList inset>
                    {items.map((indicator) => (
                        <IonItem key={indicator.id}>
                            <IonIcon slot="start" icon={icon} color={color} />
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
    }

    if (isLoading) {
        return (
            <div className="person-page__center">
                <IonSpinner />
            </div>
        )
    }

    if (!person) return null

    return (
        <>
            <div className="wizard-step__hero">
                <PersonAvatar name={person.displayName} src={person.avatarUrl} className="wizard-step__avatar" />
                <h2 className="wizard-step__name">{person.displayName}</h2>
            </div>

            {indicators.length === 0 ? (
                <p className="section-empty">
                    No indicators yet — skip or{' '}
                    <a href={`/person/${personId}/indicators/new`} onClick={(e) => { e.preventDefault(); router.push(`/person/${personId}/indicators/new`, 'forward', 'push') }}>
                        add some first
                    </a>.
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
                        {existing ? "You're updating today's check-in." : "Saving records today's check-in."}
                    </IonNote>
                </>
            )}

            <div className="wizard-step__actions">
                <IonButton fill="outline" onClick={onSkip}>
                    Skip
                </IonButton>
                <IonButton disabled={saving || indicators.length === 0} onClick={save}>
                    {existing ? 'Update' : 'Save'} &amp; Next
                </IonButton>
            </div>
        </>
    )
}

export default function CheckInWizardPage() {
    const router = useIonRouter()
    const people = usePeople()

    const activePeople = useMemo(
        () => (people.data ?? []).filter((p) => !p.archived),
        [people.data],
    )

    const [currentIndex, setCurrentIndex] = useState(0)

    function advance() {
        const next = currentIndex + 1
        if (next >= activePeople.length) {
            router.push('/dashboard', 'back', 'pop')
        } else {
            setCurrentIndex(next)
        }
    }

    const currentPerson = activePeople[currentIndex]
    const total = activePeople.length

    return (
        <IonPage>
            <IonHeader translucent>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonButton fill="clear" onClick={() => router.push('/dashboard', 'back', 'pop')} aria-label="Go back">
                            <IonIcon slot="icon-only" icon={arrowBackOutline} />
                        </IonButton>
                    </IonButtons>
                    <IonTitle>
                        {total > 0
                            ? `Check-In (${currentIndex + 1} of ${total})`
                            : 'Check-In'}
                    </IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen className="ion-padding safe-content">
                {people.isLoading && (
                    <div className="person-page__center">
                        <IonSpinner />
                    </div>
                )}

                {!people.isLoading && activePeople.length === 0 && (
                    <p className="section-empty">No household members to check in.</p>
                )}

                {currentPerson && (
                    <WizardStep
                        key={currentPerson.id}
                        personId={currentPerson.id}
                        onDone={advance}
                        onSkip={advance}
                    />
                )}
            </IonContent>
        </IonPage>
    )
}
