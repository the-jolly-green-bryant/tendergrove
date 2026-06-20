import {
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonChip,
    IonContent,
    IonDatetime,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonModal,
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
    calendarOutline,
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
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useSelectedDate } from '../../context/SelectedDateContext';

import { usePerson } from './usePerson';
import { useArchivePerson } from './useArchivePerson';
import { parseAnswers } from './checkin/checkInUtils';
import { PersonAvatar } from '../../components/PersonAvatar';
import { PersonRole } from '../../lib/domain';
import { derivePersonStatus } from '../../lib/status';

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


/** Return YYYY-MM-DD for a Date. */
function toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

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

export default function PersonPage() {
    const router = useIonRouter();
    const { personId } = useParams<{ personId: string }>();
    const isRealPerson = Boolean(personId && personId !== 'new');
    const { data: person, isLoading, error } = usePerson(isRealPerson ? personId : undefined);
    const hasRedirected = useRef(false);
    const [presentActionSheet] = useIonActionSheet();
    const [presentAlert] = useIonAlert();
    const { selectedDate, setSelectedDate } = useSelectedDate();
    const [datePickerOpen, setDatePickerOpen] = useState(false);

    const indicators = (person?.indicators ?? []) as Indicator[];
    const checkIns = (person?.checkIns ?? []) as CheckIn[];
    const activeIndicators = indicators.filter((indicator) => indicator.active !== false);

    const distressIndicators = activeIndicators.filter(
        (indicator) => indicator.polarity === 'undesired',
    );

    const visibleDistress = distressIndicators.slice(0, MAX_VISIBLE_INDICATORS);
    const hiddenDistressCount = distressIndicators.length - visibleDistress.length;

    const recentCheckIn = latestCheckIn(checkIns);
    const selectedCheckIn = checkIns.find((ci) => isSameDay(ci.occurredAt, selectedDate));
    const status = derivePersonStatus(activeIndicators, checkIns);
    const selectedDateCheckIn = checkIns.find((ci) => isSameDay(ci.occurredAt, selectedDate));
    const noteCheckIn = checkIns.find((checkIn) => Boolean(checkIn.note));

    const checkInPath = `/person/${personId}/check-in`;

    // No check-in yet for the selected date → drop the caregiver straight into the check-in flow.
    useEffect(() => {
        if (!isRealPerson || isLoading || !person || hasRedirected.current) {
            return;
        }
        if (activeIndicators.length > 0 && !selectedDateCheckIn) {
            hasRedirected.current = true;
            router.push(checkInPath, 'forward', 'replace');
        }
    }, [isRealPerson, isLoading, person, activeIndicators.length, selectedDateCheckIn, router, checkInPath]);

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

    const checkedForDate = selectedDateCheckIn ? new Set(parseAnswers(selectedDateCheckIn.answersJson).checked) : null;

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
                        <IonButton fill="clear" onClick={() => setDatePickerOpen(true)} aria-label="Pick date">
                            <IonIcon slot="icon-only" icon={calendarOutline} />
                        </IonButton>
                        <IonButton fill="clear" onClick={showMoreOptions} aria-label="More options">
                            <IonIcon slot="icon-only" icon={ellipsisHorizontal} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            <IonModal
                isOpen={datePickerOpen}
                onDidDismiss={() => setDatePickerOpen(false)}
                className="household-date-modal"
            >
                <IonDatetime
                    presentation="date"
                    value={toISODate(selectedDate)}
                    max={toISODate(new Date())}
                    onIonChange={(e) => {
                        const val = e.detail.value;
                        if (typeof val === 'string') {
                            const [y, m, d] = val.split('-').map(Number);
                            setSelectedDate(new Date(y, m - 1, d));
                        }
                        setDatePickerOpen(false);
                    }}
                />
            </IonModal>

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

                        <p className="person-hero__date-label">
                            Viewing: {formatDateLabel(selectedDate)}
                        </p>

                        {checkedForDate && (
                            <IonCard>
                                <IonCardContent>
                                    <div className="section-header">
                                        <h2>{formatDateLabel(selectedDate)} Check-In</h2>
                                        <IonButton fill="clear" size="small" onClick={startCheckIn}>
                                            Edit
                                        </IonButton>
                                    </div>

                                    {activeIndicators.length === 0 ? (
                                        <p className="section-empty">No indicators tracked.</p>
                                    ) : (
                                        <IonList lines="none" className="check-in-summary">
                                            {activeIndicators.map((indicator) => {
                                                const seen = checkedForDate.has(indicator.id);
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
