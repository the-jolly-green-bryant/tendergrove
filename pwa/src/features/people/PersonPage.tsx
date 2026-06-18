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
    IonSpinner,
    IonTitle,
    IonToolbar,
    useIonRouter,
} from '@ionic/react';
import {
    arrowBackOutline,
    checkmarkCircle,
    ellipseOutline,
    ellipsisHorizontal,
    removeCircle,
    timeOutline,
} from 'ionicons/icons';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

import { usePerson } from './usePerson';
import { findTodaysCheckIn, parseAnswers } from './checkin/checkInUtils';
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
    const hasRedirected = useRef(false);

    const indicators = (person?.indicators ?? []) as Indicator[];
    const checkIns = (person?.checkIns ?? []) as CheckIn[];
    const activeIndicators = indicators.filter((indicator) => indicator.active !== false);

    const distressIndicators = activeIndicators.filter(
        (indicator) => indicator.polarity === 'undesired',
    );

    const visibleDistress = distressIndicators.slice(0, MAX_VISIBLE_INDICATORS);
    const hiddenDistressCount = distressIndicators.length - visibleDistress.length;

    const recentCheckIn = latestCheckIn(checkIns);
    const status = deriveStatus(recentCheckIn);
    const todaysCheckIn = findTodaysCheckIn(checkIns);
    const noteCheckIn = checkIns.find((checkIn) => Boolean(checkIn.note));

    const checkInPath = `/people/${personId}/check-in`;

    // No check-in yet today → drop the caregiver straight into the check-in flow.
    useEffect(() => {
        if (isLoading || !person || hasRedirected.current) {
            return;
        }
        if (activeIndicators.length > 0 && !todaysCheckIn) {
            hasRedirected.current = true;
            router.push(checkInPath, 'forward', 'replace');
        }
    }, [isLoading, person, activeIndicators.length, todaysCheckIn, router, checkInPath]);

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

    function startCheckIn() {
        router.push(checkInPath, 'forward');
    }

    const checkedToday = todaysCheckIn ? new Set(parseAnswers(todaysCheckIn.answersJson).checked) : null;

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

                        {checkedToday && (
                            <IonCard>
                                <IonCardContent>
                                    <div className="section-header">
                                        <h2>Today’s Check-In</h2>
                                        <IonButton fill="clear" size="small" onClick={startCheckIn}>
                                            Edit
                                        </IonButton>
                                    </div>

                                    {activeIndicators.length === 0 ? (
                                        <p className="section-empty">No indicators tracked.</p>
                                    ) : (
                                        <IonList lines="none" className="check-in-summary">
                                            {activeIndicators.map((indicator) => {
                                                const seen = checkedToday.has(indicator.id);
                                                const isDesired = indicator.polarity === 'desired';
                                                return (
                                                    <IonItem key={indicator.id} className="check-in-summary__item">
                                                        <IonIcon
                                                            slot="start"
                                                            icon={
                                                                seen
                                                                    ? isDesired
                                                                        ? checkmarkCircle
                                                                        : removeCircle
                                                                    : ellipseOutline
                                                            }
                                                            color={
                                                                seen
                                                                    ? isDesired
                                                                        ? 'success'
                                                                        : 'danger'
                                                                    : 'medium'
                                                            }
                                                        />
                                                        <IonLabel
                                                            className={
                                                                seen ? '' : 'check-in-summary__muted'
                                                            }
                                                        >
                                                            {indicator.name}
                                                        </IonLabel>
                                                    </IonItem>
                                                );
                                            })}
                                        </IonList>
                                    )}
                                </IonCardContent>
                            </IonCard>
                        )}

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
