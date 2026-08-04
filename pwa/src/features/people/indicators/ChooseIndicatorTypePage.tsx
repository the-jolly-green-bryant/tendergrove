import { FlippableCard } from '../../../components/FlippableCard'
import {
  IonBackButton,
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
import { chevronForwardOutline, informationCircleOutline } from 'ionicons/icons'
import { useParams } from 'react-router-dom'

import { polarityMeta, type Polarity } from './indicatorMeta'
import { AppDisclaimer } from '../../../components/AppDisclaimer'

const order: Polarity[] = ['undesired', 'desired']

const INTRO_TEXT = (
  <>
    <h1 className="choose-type__heading">What type of signal would you like to add?</h1>
    <p className="choose-type__sub">
      You can add either a challenge to watch for or a positive goal to support.
    </p>
  </>
)

const HELP_TEXT = (
  <div className="indicator-why">
    <IonIcon
      icon={informationCircleOutline}
      color="primary"
    />
    <div>
      <strong>You can always edit this later</strong>
      <p>Signals can be updated or moved between positive and negative.</p>
    </div>
  </div>
)

const ChooseIndicatorTypePage = () => {
  const router = useIonRouter()
  const { personId } = useParams<{ personId: string }>()

  const choose = (polarity: Polarity) =>
    router.push(`/person/${personId}/indicators/new/${polarity}`, 'forward')

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton
              defaultHref={`/person/${personId}/indicators`}
              text=""
            />
          </IonButtons>
          <IonTitle>Add Signal</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent
        fullscreen
        className="ion-padding safe-content"
      >
        {INTRO_TEXT}

        {order.map((polarity) => {
          const meta = polarityMeta[polarity]
          return (
            <FlippableCard
              key={polarity}
              button
              onClick={() => choose(polarity)}
              className={`choose-type-card choose-type-card--${meta.color}`}
              kicker={`${meta.title} signal`}
              description={meta.blurb}
            >
              <IonCardContent className="choose-type-card__body">
                <IonIcon
                  icon={meta.icon}
                  color={meta.color}
                  className="choose-type-card__icon"
                />
                <div className="choose-type-card__text">
                  <p className="choose-type-card__examples">
                    Examples: {meta.examples}
                  </p>
                </div>
                <IonIcon
                  icon={chevronForwardOutline}
                  color="medium"
                />
              </IonCardContent>
            </FlippableCard>
          )
        })}

        {HELP_TEXT}
        <AppDisclaimer />
      </IonContent>
    </IonPage>
  )
}

export default ChooseIndicatorTypePage
