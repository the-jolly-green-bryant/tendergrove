import {
  IonBackButton,
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
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react'
import {
  add,
  chevronForwardOutline,
  informationCircleOutline,
  trash,
} from 'ionicons/icons'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { LoadingState } from '../../../components/LoadingState'
import { useIndicators, type Indicator } from './useIndicators'
import { useIndicatorMutations } from './useIndicatorMutations'
import { polarityMeta, type Polarity } from './indicatorMeta'

type Filter = 'all' | Polarity

/**
 *
 */
export default function ManageIndicatorsPage() {
  const router = useIonRouter()
  const { personId } = useParams<{ personId: string }>()
  const { data: indicators, isLoading, error } = useIndicators(personId)
  const { remove } = useIndicatorMutations(personId)

  const [filter, setFilter] = useState<Filter>('all')

  const addIndicator = (polarity: Polarity) =>
    router.push(`/person/${personId}/indicators/new/${polarity}`, 'forward')

  const editIndicator = (indicatorId: string) =>
    router.push(`/person/${personId}/indicators/${indicatorId}/edit`, 'forward')

  const byPolarity = (polarity: Polarity) =>
    (indicators ?? []).filter((indicator) => indicator.polarity === polarity)

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton
              defaultHref={`/person/${personId}`}
              text=""
            />
          </IonButtons>
          <IonTitle>Manage Indicators</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent
        fullscreen
        className="ion-padding safe-content"
      >
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
          Track what increases distress (undesired) and what supports well-being
          (desired).
        </p>

        {isLoading && <LoadingState />}
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
          <IonIcon
            icon={informationCircleOutline}
            color="primary"
          />
          <div>
            <strong>Why both?</strong>
            <p>
              Tracking both challenges and positive behaviors helps us see the full
              picture and spot patterns that matter.
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  )
}

const IndicatorSection = ({
  polarity,
  indicators,
  onAdd,
  onEdit,
  onDelete,
}: {
  readonly polarity: Polarity
  readonly indicators: Indicator[]
  readonly onAdd: () => void
  readonly onEdit: (id: string) => void
  readonly onDelete: (id: string) => void
}) => {
  const meta = polarityMeta[polarity]

  return (
    <section className="indicator-group">
      <div className="section-header">
        <h2>{meta.title} Indicators</h2>
        <IonButton
          fill="clear"
          size="small"
          onClick={onAdd}
          aria-label={`Add ${meta.title.toLowerCase()} indicator`}
        >
          <IonIcon
            slot="icon-only"
            icon={add}
          />
        </IonButton>
      </div>

      {indicators.length === 0 ? (
        <p className="section-empty">No {meta.title.toLowerCase()} indicators yet.</p>
      ) : (
        <IonList
          lines="none"
          className="indicator-list"
        >
          {indicators.map((indicator) => (
            <IonItemSliding key={indicator.id}>
              <IonItem
                button
                detail={false}
                onClick={() => onEdit(indicator.id)}
                className="indicator-row"
              >
                <IonIcon
                  slot="start"
                  icon={meta.icon}
                  color={meta.color}
                />
                <IonLabel>{indicator.name}</IonLabel>
                <IonIcon
                  slot="end"
                  icon={chevronForwardOutline}
                  color="medium"
                />
              </IonItem>
              <IonItemOptions side="end">
                <IonItemOption
                  color="danger"
                  onClick={() => onDelete(indicator.id)}
                >
                  <IonIcon
                    slot="icon-only"
                    icon={trash}
                  />
                </IonItemOption>
              </IonItemOptions>
            </IonItemSliding>
          ))}
        </IonList>
      )}
    </section>
  )
}
