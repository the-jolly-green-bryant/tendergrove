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
    useIonActionSheet,
    useIonAlert,
    useIonRouter,
} from '@ionic/react';
import {
    archiveOutline,
    arrowBackOutline,
    checkmarkCircle,
    closeCircle,
    createOutline,
    ellipseOutline,
    ellipsisHorizontal,
    listOutline,
    removeCircle,
    timeOutline,
} from 'ionicons/icons';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

import { usePerson } from './usePerson';
import { useArchivePerson } from './useArchivePerson';
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
    const isRealPerson = Boolean(personId && personId !== 'new');
    const { data: person, isLoading, error } = usePerson(isRealPerson ? personId : undefined);
    const hasRedirected = useRef(false);
    const [presentActionSheet] = useIonActionSheet();
    const [presentAlert] = useIonAlert();

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

    const checkInPath = `/person/${personId}/check-in`;

    // No check-in yet today → drop the caregiver straight into the check-in flow.
    useEffect(() => {
        if (!isRealPerson || isLoading || !person || hasRedirected.current) {
            return;
        }
        if (activeIndicators.length > 0 && !todaysCheckIn) {
            hasRedirected.current = true;
            router.push(checkInPath, 'forward', 'replace');
        }
    }, [isRealPerson, isLoading, person, activeIndicators.length, todaysCheckIn, router, checkInPath]);

    // When Ionic matches /people/new against /people/:personId, bail out so
    // PersonFormPage is the only visible page.
    if (!isRealPerson) {
        return null;
    }

    function goBack() {
        if (router.canGoBack()) {
            router.goBack();
            return;
        }

        router.push('/dashboard', 'back', 'pop');
    }

    function editPerson() {
        router.push(`/person/${personId}/edit`, 'forward');
    }

    function manageIndicators() {
        router.push(`/person/${personId}/indicators`, 'forward');
    }

    const archiveMutation = useArchivePerson();

    function doArchive(archive: boolean) {
        if (!person) return;
        archiveMutation.mutate(
            { id: person.id, archived: archive },
            {
                onSuccess: () => {
                    if (archive) {
                        router.push('/dashboard', 'back', 'pop');
                    }
                },
            },
        );
    }

    function toggleArchive() {
        if (!person) return;
        if (person.archived) {
            doArchive(false);
            return;
        }
        presentAlert({
            header: 'Archive this person?',
            message: 'Are you sure? You can unarchive people in the Settings section of the app.',
            buttons: [
                { text: 'Cancel', role: 'cancel' },
                {
                    text: 'Archive',
                    role: 'destructive',
                    handler: () => doArchive(true),
                },
            ],
        });
    }

    function showMoreOptions() {
        const isArchived = person?.archived;
        presentActionSheet({
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
        });
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
                        <IonButton fill="clear" onClick={showMoreOptions} aria-label="More options">
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
                                                                    : isDesired
                                                                        ? closeCircle
                                                                        : checkmarkCircle
                                                            }
                                                            color={
                                                                seen
                                                                    ? isDesired
                                                                        ? 'success'
                                                                        : 'danger'
                                                                    : isDesired
                                                                        ? 'danger'
                                                                        : 'success'
                                                            }
                                                        />
                                                        <IonLabel
                                                            className={
                                                                seen ? '' : 'check-in-summary__muted'
                                                            }
                                                            style={
                                                                !seen ? { textDecoration: 'line-through' } : undefined
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
