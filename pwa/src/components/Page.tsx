import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import {
  archiveOutline,
  homeOutline,
  menuOutline,
  settingsOutline,
} from 'ionicons/icons'
import { ReactNode } from 'react'

export function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <IonMenu contentId="main-content">
        <IonContent>
          <div className="menu-logo-area">
            <h2 className="menu-logo-text">Tendergrove</h2>
          </div>

          <IonList lines="none">
            <IonMenuToggle autoHide={false}>
              <IonItem button routerLink="/dashboard" routerDirection="root">
                <IonIcon slot="start" icon={homeOutline} />
                <IonLabel>Household</IonLabel>
              </IonItem>
            </IonMenuToggle>
            <IonMenuToggle autoHide={false}>
              <IonItem button routerLink="/archived" routerDirection="forward">
                <IonIcon slot="start" icon={archiveOutline} />
                <IonLabel>Archived</IonLabel>
              </IonItem>
            </IonMenuToggle>
            <IonMenuToggle autoHide={false}>
              <IonItem button routerLink="/parent-care" routerDirection="forward">
                <IonIcon slot="start" icon={settingsOutline} />
                <IonLabel>Settings</IonLabel>
              </IonItem>
            </IonMenuToggle>
          </IonList>
        </IonContent>
      </IonMenu>

      <IonPage id="main-content">
        <IonHeader translucent>
          <IonToolbar>
            <IonButtons slot="start">
              <IonMenuToggle autoHide={false}>
                <IonButton fill="clear" aria-label="Menu">
                  <IonIcon slot="icon-only" icon={menuOutline} />
                </IonButton>
              </IonMenuToggle>
            </IonButtons>
            <IonTitle>{title}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent
          fullscreen
          className="ion-padding safe-content"
        >
          {children}
        </IonContent>
      </IonPage>
    </>
  )
}
