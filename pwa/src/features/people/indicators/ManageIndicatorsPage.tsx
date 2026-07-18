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
  IonTitle,
  IonToolbar,
  useIonAlert,
  useIonRouter,
} from '@ionic/react'
import {
  add,
  archiveOutline,
  chevronForwardOutline,
  informationCircleOutline,
  sparklesOutline,
} from 'ionicons/icons'
import { useParams } from 'react-router-dom'

import { LoadingState } from '../../../components/LoadingState'
import { useIndicators, type Indicator } from './useIndicators'
import { useIndicatorMutations } from './useIndicatorMutations'
import { polarityMeta, type InputType, type Polarity } from './indicatorMeta'

type AlertValues = { behavior?: string }

const normalizeIndicatorName = (values: AlertValues): string | false =>
  values.behavior?.trim() || false

const useIndicatorAlertActions = (personId: string) => {
  const { create, update, archive } = useIndicatorMutations(personId)
  const [presentAlert] = useIonAlert()

  const addIndicator = (polarity: Polarity) => {
    const meta = polarityMeta[polarity]
    void presentAlert({
      header: `Add ${meta.title} Signal`,
      inputs: [
        {
          name: 'behavior',
          type: 'text',
          placeholder: `e.g. ${meta.examples.split(',')[0]}`,
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (values: AlertValues) => {
            const name = normalizeIndicatorName(values)
            if (!name) return false
            void create({ name, polarity, inputType: 'boolean' })
            return true
          },
        },
      ],
    })
  }

  const editIndicator = (indicator: Indicator) => {
    const polarity = (indicator.polarity ?? 'undesired') as Polarity
    const inputType = (indicator.inputType ?? 'boolean') as InputType
    void presentAlert({
      header: 'Edit Signal',
      inputs: [
        {
          name: 'behavior',
          type: 'text',
          value: indicator.name,
          placeholder: 'Behavior',
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (values: AlertValues) => {
            const name = normalizeIndicatorName(values)
            if (!name) return false
            void update(indicator.id, {
              name,
              polarity,
              inputType,
              description: indicator.description ?? undefined,
              notes: indicator.notes ?? undefined,
            })
            return true
          },
        },
      ],
    })
  }

  const confirmArchiveIndicator = (indicator: Indicator) => {
    void presentAlert({
      header: 'Archive signal?',
      message:
        'It will stop appearing in new check-ins. Existing check-ins and historical trends will be preserved.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Archive',
          role: 'destructive',
          handler: () => void archive(indicator.id),
        },
      ],
    })
  }

  return { addIndicator, editIndicator, confirmArchiveIndicator }
}

const IndicatorsIntro = () => (
  <>
    <p className="indicator-intro">
      Track negative signals that increase distress and positive signals that support
      well-being.
    </p>

    <div className="indicator-why">
      <IonIcon
        icon={informationCircleOutline}
        color="primary"
      />
      <div>
        <strong>Why both?</strong>
        <p>
          Tracking both challenges and positive behaviors helps us see the full picture
          and spot patterns that matter.
        </p>
      </div>
    </div>
  </>
)

/**
 * Displays and edits a person's desired and undesired indicators.
 * @returns Indicator management page.
 */
const ManageIndicatorsPage = () => {
  const router = useIonRouter()
  const { personId } = useParams<{ personId: string }>()
  const { data: indicators, isLoading, error } = useIndicators(personId)
  const { addIndicator, editIndicator, confirmArchiveIndicator } =
    useIndicatorAlertActions(personId)

  const byPolarity = (polarity: Polarity) =>
    (indicators ?? []).filter(
      (indicator) => indicator.polarity === polarity && indicator.active !== false,
    )

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
          <IonTitle>Manage Signals</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent
        fullscreen
        className="ion-padding safe-content"
      >
        <IndicatorsIntro />

        {isLoading && (
          <LoadingState
            variant="list"
            label="Loading signals"
            rows={4}
          />
        )}
        {error && <p>Failed to load signals.</p>}

        {!isLoading && !error && (
          <>
            <IndicatorSection
              polarity="undesired"
              indicators={byPolarity('undesired')}
              onAdd={() => addIndicator('undesired')}
              onEdit={editIndicator}
              onArchive={confirmArchiveIndicator}
            />

            <IndicatorSection
              polarity="desired"
              indicators={byPolarity('desired')}
              onAdd={() => addIndicator('desired')}
              onEdit={editIndicator}
              onArchive={confirmArchiveIndicator}
            />

            <div className="wizard-footer">
              <IonButton
                expand="block"
                fill="outline"
                onClick={() =>
                  router.push(`/person/${personId}/indicators/suggest`, 'forward')
                }
              >
                <IonIcon
                  slot="start"
                  icon={sparklesOutline}
                />
                Suggest signals
              </IonButton>
            </div>
          </>
        )}
      </IonContent>
    </IonPage>
  )
}

const IndicatorSection = ({
  polarity,
  indicators,
  onAdd,
  onEdit,
  onArchive,
}: {
  readonly polarity: Polarity
  readonly indicators: Indicator[]
  readonly onAdd: () => void
  readonly onEdit: (indicator: Indicator) => void
  readonly onArchive: (indicator: Indicator) => void
}) => {
  const meta = polarityMeta[polarity]

  return (
    <section className="indicator-group">
      <div className="section-header">
        <h2>{meta.title} Signals</h2>
        <IonButton
          fill="clear"
          size="small"
          onClick={onAdd}
          aria-label={`Add ${meta.title.toLowerCase()} signal`}
        >
          <IonIcon
            slot="icon-only"
            icon={add}
          />
        </IonButton>
      </div>

      {indicators.length === 0 ? (
        <p className="section-empty">No {meta.title.toLowerCase()} signals yet.</p>
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
                onClick={() => onEdit(indicator)}
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
                  aria-label={`Archive ${indicator.name}`}
                  onClick={() => onArchive(indicator)}
                >
                  <IonIcon
                    slot="icon-only"
                    icon={archiveOutline}
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

export default ManageIndicatorsPage
