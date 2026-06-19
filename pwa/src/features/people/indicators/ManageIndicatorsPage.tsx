import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonItemOption,
    IonItemOptions,
    IonItemSliding,
    IonLabel,
    IonList,
    IonPage,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    IonTitle,
    IonToolbar,
    useIonRouter,
} from '@ionic/react';
import { add, arrowBackOutline, chevronForwardOutline, informationCircleOutline, trash } from 'ionicons/icons';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { useIndicators, type Indicator } from './useIndicators';
import { useIndicatorMutations } from './useIndicatorMutations';
import { polarityMeta, type Polarity } from './indicatorMeta';

type Filter = 'all' | Polarity;

export default function ManageIndicatorsPage() {
    const router = useIonRouter();
    const { personId } = useParams<{ personId: string }>();
    const { data: indicators, isLoading, error } = useIndicators(personId);
    const { remove } = useIndicatorMutations(personId);

    const [filter, setFilter] = useState<Filter>('all');

    function goBack() {
        if (router.canGoBack()) {
            router.goBack();
            return;
        }
        router.push(`/person/${personId}`, 'back', 'pop');
    }

    function addIndicator(polarity: Polarity) {
        router.push(`/person/${personId}/indicators/new/${polarity}`, 'forward');
    }

    function editIndicator(indicatorId: string) {
        router.push(`/person/${personId}/indicators/${indicatorId}/edit`, 'forward');
    }

    const all = indicators ?? [];
    const byPolarity = (polarity: Polarity) => all.filter((indicator) => indicator.polarity === polarity);

    return (
        <IonPage>
            <IonHeader translucent>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonButton fill="clear" onClick={goBack} aria-label="Go back">
                            <IonIcon slot="icon-only" icon={arrowBackOutline} />
                        </IonButton>
                    </IonButtons>
                    <IonTitle>Manage Indicators</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen className="ion-padding safe-content">
                <IonSegment
                    value={filter}
                    onIonChange={(event) => setFilter((event.detail.value as Filter) ?? 'all')}
                    className="indicator-segment"
                >
                    <IonSegmentButton value="all">
                        <IonLabel>All</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="undesired">
                        <IonLabel>Undesired</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="desired">
                        <IonLabel>Desired</IonLabel>
                    </IonSegmentButton>
                </IonSegment>

                <p className="indicator-intro">
                    Track what increases distress (undesired) and what supports well-being (desired).
                </p>

                {isLoading && <IonSpinner />}
                {error && <p>Failed to load indicators.</p>}

                {(filter === 'all' || filter === 'undesired') && (
                    <IndicatorSection
                        polarity="undesired"
                        indicators={byPolarity('undesired')}
                        onAdd={() => addIndicator('undesired')}
                        onEdit={editIndicator}
                        onDelete={(id) => remove(id)}
                    />
                )}

                {(filter === 'all' || filter === 'desired') && (
                    <IndicatorSection
                        polarity="desired"
                        indicators={byPolarity('desired')}
                        onAdd={() => addIndicator('desired')}
                        onEdit={editIndicator}
                        onDelete={(id) => remove(id)}
                    />
                )}

                <div className="indicator-why">
                    <IonIcon icon={informationCircleOutline} color="primary" />
                    <div>
                        <strong>Why both?</strong>
                        <p>
                            Tracking both challenges and positive behaviors helps us see the full picture and
                            spot patterns that matter.
                        </p>
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
}

function IndicatorSection({
    polarity,
    indicators,
    onAdd,
    onEdit,
    onDelete,
}: {
    polarity: Polarity;
    indicators: Indicator[];
    onAdd: () => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const meta = polarityMeta[polarity];

    return (
        <section className="indicator-group">
            <div className="section-header">
                <h2>{meta.title} Indicators</h2>
                <IonButton fill="clear" size="small" onClick={onAdd} aria-label={`Add ${meta.title.toLowerCase()} indicator`}>
                    <IonIcon slot="icon-only" icon={add} />
                </IonButton>
            </div>

            {indicators.length === 0 ? (
                <p className="section-empty">No {meta.title.toLowerCase()} indicators yet.</p>
            ) : (
                <IonList lines="none" className="indicator-list">
                    {indicators.map((indicator) => (
                        <IonItemSliding key={indicator.id}>
                            <IonItem button detail={false} onClick={() => onEdit(indicator.id)} className="indicator-row">
                                <IonIcon slot="start" icon={meta.icon} color={meta.color} />
                                <IonLabel>{indicator.name}</IonLabel>
                                <IonIcon slot="end" icon={chevronForwardOutline} color="medium" />
                            </IonItem>
                            <IonItemOptions side="end">
                                <IonItemOption color="danger" onClick={() => onDelete(indicator.id)}>
                                    <IonIcon slot="icon-only" icon={trash} />
                                </IonItemOption>
                            </IonItemOptions>
                        </IonItemSliding>
                    ))}
                </IonList>
            )}
        </section>
    );
}
