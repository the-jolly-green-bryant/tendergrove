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
} from '@ionic/react';
import { arrowBackOutline, checkmarkCircle, removeCircle } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useSelectedDate } from '../../../context/SelectedDateContext';
import { usePerson } from '../usePerson';
import { parseAnswers } from './checkInUtils';
import { useCheckInMutations } from './useCheckInMutations';

function isSameDay(occurredAt: string, date: Date): boolean {
    const d = new Date(occurredAt);
    return (
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate()
    );
}

function formatDateLabel(date: Date): string {
    const today = new Date();
    if (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
    ) {
        return 'Today';
    }
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

type Indicator = NonNullable<ReturnType<typeof usePerson>['data']>['indicators'][number];

export default function PersonCheckInPage() {
    const router = useIonRouter();
    const { personId } = useParams<{ personId: string }>();
    const { selectedDate } = useSelectedDate();
    const { data: person, isLoading } = usePerson(personId);
    const { create, update } = useCheckInMutations(personId);

    const indicators = useMemo(
        () => ((person?.indicators ?? []) as Indicator[]).filter((indicator) => indicator.active !== false),
        [person],
    );
    const desired = indicators.filter((indicator) => indicator.polarity === 'desired');
    const undesired = indicators.filter((indicator) => indicator.polarity === 'undesired');

    const existing = useMemo(
        () => (person?.checkIns ?? []).find((ci) => isSameDay(ci.occurredAt, selectedDate)),
        [person, selectedDate],
    );

    const [checked, setChecked] = useState<Record<string, boolean>>({});
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [prefilled, setPrefilled] = useState(false);

    // Prefill from an existing check-in for today, once it has loaded.
    useEffect(() => {
        if (prefilled || !existing) {
            return;
        }
        const answers = parseAnswers(existing.answersJson);
        setChecked(Object.fromEntries(answers.checked.map((id) => [id, true])));
        setNote(existing.note ?? '');
        setPrefilled(true);
    }, [existing, prefilled]);

    function personPath() {
        return `/person/${personId}`;
    }

    function goBack() {
        router.push(personPath(), 'back', 'pop');
    }

    function toggle(id: string) {
        setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
    }

    async function save() {
        if (saving) {
            return;
        }

        const occurDate = new Date(selectedDate);
        occurDate.setHours(12, 0, 0, 0);

        const payload = {
            occurredAt: occurDate.toISOString(),
            answers: { checked: indicators.filter((i) => checked[i.id]).map((i) => i.id) },
            note: note.trim() || undefined,
        };

        setSaving(true);
        try {
            if (existing) {
                await update(existing.id, payload);
            } else {
                await create(payload);
            }
            router.push(personPath(), 'back', 'pop');
        } finally {
            setSaving(false);
        }
    }

    function renderGroup(title: string, items: Indicator[], icon: string, color: string) {
        if (items.length === 0) {
            return null;
        }
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
        );
    }

    return (
        <IonPage>
            <IonHeader translucent>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonButton fill="clear" onClick={goBack} aria-label="Go back">
                            <IonIcon slot="icon-only" icon={arrowBackOutline} />
                        </IonButton>
                    </IonButtons>
                    <IonTitle>{person ? `${person.displayName} — ${formatDateLabel(selectedDate)}` : 'Check-In'}</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen className="ion-padding safe-content">
                {isLoading && (
                    <div className="person-page__center">
                        <IonSpinner />
                    </div>
                )}

                {person && (
                    <>
                        <p className="check-in__intro">Check off everything you saw {formatDateLabel(selectedDate).toLowerCase() === 'today' ? 'today' : `on ${formatDateLabel(selectedDate)}`}.</p>

                        {indicators.length === 0 ? (
                            <p className="section-empty">
                                No indicators yet. Add some before checking in.
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
                                            onIonInput={(event) => setNote(event.detail.value ?? '')}
                                        />
                                    </IonItem>
                                </IonList>

                                <IonNote className="check-in__hint">
                                    {existing ? "You're updating today's check-in." : 'Saving records today’s check-in.'}
                                </IonNote>

                                <IonButton expand="block" disabled={saving} onClick={save}>
                                    {existing ? 'Update Check-In' : 'Save Check-In'}
                                </IonButton>
                            </>
                        )}
                    </>
                )}
            </IonContent>
        </IonPage>
    );
}
