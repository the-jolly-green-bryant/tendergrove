import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react'
import {
  arrowBackOutline,
  chevronForwardOutline,
  informationCircleOutline,
} from 'ionicons/icons'
import { useParams } from 'react-router-dom'

import { polarityMeta, type Polarity } from './indicatorMeta'

const order: Polarity[] = ['undesired', 'desired']

export default function ChooseIndicatorTypePage() {
  const router = useIonRouter()
  const { personId } = useParams<{ personId: string }>()

  function goBack() {
    if (router.canGoBack()) {
      router.goBack()
      return
    }
    router.push(`/person/${personId}/indicators`, 'back', 'pop')
  }

  function choose(polarity: Polarity) {
    router.push(`/person/${personId}/indicators/new/${polarity}`, 'forward')
  }

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton
              fill="clear"
              onClick={goBack}
              aria-label="Go back"
            >
              <IonIcon
                slot="icon-only"
                icon={arrowBackOutline}
              />
            </IonButton>
          </IonButtons>
          <IonTitle>Add Indicator</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent
        fullscreen
        className="ion-padding safe-content"
      >
        <h1 className="choose-type__heading">
          What type of indicator would you like to add?
        </h1>
        <p className="choose-type__sub">
          You can add either a challenge to watch for or a positive goal to support.
        </p>

        {order.map((polarity) => {
          const meta = polarityMeta[polarity]
          return (
            <IonCard
              key={polarity}
              button
              onClick={() => choose(polarity)}
              className={`choose-type-card choose-type-card--${meta.color}`}
            >
              <IonCardContent className="choose-type-card__body">
                <IonIcon
                  icon={meta.icon}
                  color={meta.color}
                  className="choose-type-card__icon"
                />
                <div className="choose-type-card__text">
                  <h2>{meta.title} Indicator</h2>
                  <p>{meta.blurb}</p>
                  <p className="choose-type-card__examples">
                    Examples: {meta.examples}
                  </p>
                </div>
                <IonIcon
                  icon={chevronForwardOutline}
                  color="medium"
                />
              </IonCardContent>
            </IonCard>
          )
        })}

        <div className="indicator-why">
          <IonIcon
            icon={informationCircleOutline}
            color="primary"
          />
          <div>
            <strong>You can always edit this later</strong>
            <p>Indicators can be updated or moved between desired and undesired.</p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  )
}
