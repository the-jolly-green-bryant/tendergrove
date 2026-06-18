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
    IonNote,
    IonPage,
    IonSpinner,
    IonTitle,
    IonToolbar,
    useIonRouter,
} from '@ionic/react';
import {
    arrowBackOutline,
    calculatorOutline,
    checkmarkCircleOutline,
    documentTextOutline,
    ellipsisHorizontal,
    happyOutline,
    repeatOutline,
    timeOutline,
    timerOutline,
} from 'ionicons/icons';
import { formatDistanceToNow } from 'date-fns';
import { useParams } from 'react-router-dom';

import { usePerson } from './usePerson';
import { PersonAvatar } from '../../components/PersonAvatar';
import { PersonRole } from '../../lib/domain';

type Indicator = NonNullable<ReturnType<typeof usePerson>['data']>['indicators'][number];
type CheckIn = NonNullable<ReturnType<typeof usePerson>['data']>['checkIns'][number];

const roleLabels: Record<PersonRole, string> = {
    self: 'You',
    child: 'Child',
    spouse: 'Spouse',
    parent: 'Parent',
    caregiver: 'Caregiver',
    other: 'Other',
};

const inputTypeLabels: Record<string, string> = {
    boolean: 'Yes / no',
    frequency: 'Frequency',
    scale: 'Intensity',
    count: 'Count',
    duration: 'Duration',
    text: 'Note',
};

const inputTypeIcons: Record<string, string> = {
    boolean: checkmarkCircleOutline,
    frequency: repeatOutline,
    scale: happyOutline,
    count: calculatorOutline,
    duration: timerOutline,
    text: documentTextOutline,
};

const MAX_VISIBLE_INDICATORS = 4;

function latestCheckIn(checkIns: CheckIn[]): CheckIn | undefined {
    return [...checkIns].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
}

function deriveStatus(checkIn: CheckIn | undefined): {
    label: string;
    color: 'success' | 'warning' | 'danger' | 'medium';
} {
    if (!checkIn) {
        return { label: 'No check-ins', color: 'medium' };
    }

    const ageMs = Date.now() - new Date(checkIn.occurredAt).getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    if (ageMs <= oneDay) {
        return { label: 'Up to date', color: 'success' };
    }

    if (ageMs <= 3 * oneDay) {
        return { label: 'Moderate', color: 'warning' };
    }

    return { label: 'Needs attention', color: 'danger' };
}

export default function PersonPage() {
    const router = useIonRouter();
    const { personId } = useParams<{ personId: string }>();
    const { data: person, isLoading, error } = usePerson(personId);

    function goBack() {
        if (router.canGoBack()) {
            router.goBack();
            return;
        }

        router.push('/dashboard', 'back', 'pop');
    }

    function editPerson() {
        router.push(`/people/${personId}/edit`, 'forward');
    }

    function manageIndicators() {
        router.push(`/people/${personId}/indicators`, 'forward');
    }

    const indicators = (person?.indicators ?? []) as Indicator[];
    const checkIns = (person?.checkIns ?? []) as CheckIn[];

    const distressIndicators = indicators.filter((indicator) => indicator.polarity === 'undesired');
    const checkInTypes = indicators.filter((indicator) => indicator.polarity !== 'undesired');

    const visibleDistress = distressIndicators.slice(0, MAX_VISIBLE_INDICATORS);
    const hiddenDistressCount = distressIndicators.length - visibleDistress.length;

    const recentCheckIn = latestCheckIn(checkIns);
    const status = deriveStatus(recentCheckIn);
    const noteCheckIn = checkIns.find((checkIn) => Boolean(checkIn.note));

    return (
        <IonPage>
            <IonHeader translucent>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonButton fill="clear" onClick={goBack} aria-label="Go back">
                            <IonIcon slot="icon-only" icon={arrowBackOutline} />
                        </IonButton>
                    </IonButtons>

                    <IonTitle>{person?.displayName ?? ''}</IonTitle>

                    <IonButtons slot="end">
                        <IonButton fill="clear" onClick={editPerson} aria-label="More options">
                            <IonIcon slot="icon-only" icon={ellipsisHorizontal} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen className="ion-padding safe-content">
                {isLoading && (
                    <div className="person-page__center">
                        <IonSpinner />
                    </div>
                )}

                {error && <p>Failed to load this person.</p>}

                {person && (
                    <>
                        <section className="person-hero">
                            <PersonAvatar
                                className="person-hero__avatar"
                                name={person.displayName}
                                src={person.avatarUrl}
                            />

                            <h1 className="person-hero__name">{person.displayName}</h1>
                            <p className="person-hero__subtitle">
                                {roleLabels[person.role as PersonRole] ?? 'Person'}
                            </p>

                            <div className="person-status">
                                <IonChip color={status.color} className="person-status__chip">
                                    <span className="person-status__dot" />
                                    <IonLabel>{status.label}</IonLabel>
                                </IonChip>
                                <span className="person-status__caption">Current Status</span>
                            </div>

                            <div className="person-hero__last-checkin">
                                <IonIcon icon={timeOutline} />
                                <span>
                                    {recentCheckIn
                                        ? `Last check-in ${formatDistanceToNow(
                                              new Date(recentCheckIn.occurredAt),
                                              { addSuffix: true },
                                          )}`
                                        : 'No check-ins yet'}
                                </span>
                            </div>
                        </section>

                        <IonCard>
                            <IonCardContent>
                                <div className="section-header">
                                    <h2>Distress Indicators</h2>
                                    <IonButton fill="clear" size="small" onClick={manageIndicators}>
                                        Edit
                                    </IonButton>
                                </div>

                                {distressIndicators.length === 0 ? (
                                    <p className="section-empty">No distress indicators yet.</p>
                                ) : (
                                    <div className="indicator-chips">
                                        {visibleDistress.map((indicator) => (
                                            <IonChip
                                                key={indicator.id}
                                                color="warning"
                                                className="indicator-chip"
                                            >
                                                <IonLabel>{indicator.name}</IonLabel>
                                            </IonChip>
                                        ))}
                                        {hiddenDistressCount > 0 && (
                                            <IonChip className="indicator-chip indicator-chip--more">
                                                <IonLabel>+{hiddenDistressCount} more</IonLabel>
                                            </IonChip>
                                        )}
                                    </div>
                                )}
                            </IonCardContent>
                        </IonCard>

                        <IonCard>
                            <IonCardContent>
                                <div className="section-header">
                                    <h2>Check-In Types</h2>
                                    <IonButton fill="clear" size="small" onClick={manageIndicators}>
                                        Edit
                                    </IonButton>
                                </div>

                                {checkInTypes.length === 0 ? (
                                    <p className="section-empty">No check-in types yet.</p>
                                ) : (
                                    <IonList lines="none" className="check-in-types">
                                        {checkInTypes.map((indicator) => (
                                            <IonItem key={indicator.id} className="check-in-type">
                                                <IonIcon
                                                    slot="start"
                                                    icon={
                                                        inputTypeIcons[indicator.inputType ?? 'text'] ??
                                                        documentTextOutline
                                                    }
                                                    color="primary"
                                                />
                                                <IonLabel>{indicator.name}</IonLabel>
                                                <IonNote slot="end">
                                                    {inputTypeLabels[indicator.inputType ?? 'text'] ?? 'Note'}
                                                </IonNote>
                                            </IonItem>
                                        ))}
                                    </IonList>
                                )}
                            </IonCardContent>
                        </IonCard>

                        <IonCard>
                            <IonCardContent>
                                <div className="section-header">
                                    <h2>Notes</h2>
                                    {noteCheckIn && (
                                        <span className="section-header__meta">
                                            {formatDistanceToNow(new Date(noteCheckIn.occurredAt), {
                                                addSuffix: true,
                                            })}
                                        </span>
                                    )}
                                </div>

                                <p className="person-notes">
                                    {noteCheckIn?.note ?? 'No notes yet.'}
                                </p>
                            </IonCardContent>
                        </IonCard>
                    </>
                )}
            </IonContent>
        </IonPage>
    );
}
