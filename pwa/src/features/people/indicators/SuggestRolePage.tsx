import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react'
import { useParams } from 'react-router-dom'

import { roleKeys, roleTemplates, type RoleKey } from '../../../templates/roleTemplates'

/**
 * Lets the user pick a role whose starter indicators will be suggested for the
 * person. Choosing a role opens the add/subtract review page.
 * @returns Role picker page.
 */
const SuggestRolePage = () => {
  const router = useIonRouter()
  const { personId } = useParams<{ personId: string }>()

  const choose = (roleKey: RoleKey) =>
    router.push(`/person/${personId}/indicators/suggest/${roleKey}`, 'forward')

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
          <IonTitle>Suggest Indicators</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent
        fullscreen
        className="ion-padding safe-content"
      >
        <p className="indicator-intro">
          Pick a role and we&rsquo;ll suggest a thoughtful set of indicators. You can
          choose which to add on the next screen — existing indicators are kept.
        </p>

        <div className="role-grid">
          {roleKeys.map((key) => {
            const template = roleTemplates[key]
            return (
              <button
                key={key}
                type="button"
                className="role-card"
                onClick={() => choose(key)}
              >
                <IonIcon
                  className="role-card__icon"
                  icon={template.icon}
                />
                <span className="role-card__text">
                  <span className="role-card__label">{template.label}</span>
                  <span className="role-card__desc">{template.description}</span>
                </span>
              </button>
            )
          })}
        </div>
      </IonContent>
    </IonPage>
  )
}

export default SuggestRolePage
