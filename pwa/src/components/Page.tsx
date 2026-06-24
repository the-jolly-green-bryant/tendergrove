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
  logOutOutline,
  menuOutline,
  settingsOutline,
} from 'ionicons/icons'
import { ReactNode } from 'react'

import { useAppAuth } from '../auth/AuthContext'

interface PageProps {
  title: string
  children: ReactNode
  /** Optional content rendered inside the toolbar next to the hamburger menu. */
  headerContent?: ReactNode
  /** Optional content rendered below the toolbar (e.g. calendar dropdown). */
  subHeaderContent?: ReactNode
}

export function Page({ title, children, headerContent, subHeaderContent }: PageProps) {
  const { signOut } = useAppAuth()
  return (
    <>
      <IonMenu contentId="main-content">
        <IonContent>
          <div className="menu-logo-area">
            <h2 className="menu-logo-text">Tendergrove</h2>
          </div>

          <IonList lines="none">
            <IonMenuToggle autoHide={false}>
              <IonItem
                button
                routerLink="/dashboard"
                routerDirection="root"
              >
                <IonIcon
                  slot="start"
                  icon={homeOutline}
                />
                <IonLabel>Household</IonLabel>
              </IonItem>
            </IonMenuToggle>
            <IonMenuToggle autoHide={false}>
              <IonItem
                button
                routerLink="/archived"
                routerDirection="forward"
              >
                <IonIcon
                  slot="start"
                  icon={archiveOutline}
                />
                <IonLabel>Archived</IonLabel>
              </IonItem>
            </IonMenuToggle>
            <IonMenuToggle autoHide={false}>
              <IonItem
                button
                routerLink="/parent-care"
                routerDirection="forward"
              >
                <IonIcon
                  slot="start"
                  icon={settingsOutline}
                />
                <IonLabel>Settings</IonLabel>
              </IonItem>
            </IonMenuToggle>
            <IonMenuToggle autoHide={false}>
              <IonItem
                button
                onClick={() => signOut?.()}
              >
                <IonIcon
                  slot="start"
                  icon={logOutOutline}
                />
                <IonLabel>Sign Out</IonLabel>
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
                <IonButton
                  fill="clear"
                  aria-label="Menu"
                >
                  <IonIcon
                    slot="icon-only"
                    icon={menuOutline}
                  />
                </IonButton>
              </IonMenuToggle>
            </IonButtons>
            {headerContent ?? <IonTitle>{title}</IonTitle>}
          </IonToolbar>
          {subHeaderContent}
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
