import { IonButtons, IonHeader, IonMenu, IonTitle, IonToolbar } from '@ionic/react'
import type { ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'

export const RightDrawer = ({
  children,
  className = '',
  contentId = 'main-content',
  menuId,
  menuRef,
  onDidClose,
}: {
  readonly children: ReactNode
  readonly className?: string
  readonly contentId?: string
  readonly menuId: string
  readonly menuRef: RefObject<HTMLIonMenuElement | null>
  readonly onDidClose?: () => void
}) =>
  createPortal(
    <IonMenu
      ref={menuRef}
      side="end"
      type="overlay"
      menuId={menuId}
      contentId={contentId}
      className={`app-right-drawer ${className}`.trim()}
      onIonDidClose={onDidClose}
    >
      {children}
    </IonMenu>,
    document.querySelector('ion-app') ?? document.body,
  )

export const RightDrawerHeader = ({
  title,
  start,
  end,
}: {
  readonly title: ReactNode
  readonly start?: ReactNode
  readonly end?: ReactNode
}) => (
  <IonHeader className="app-right-drawer__header">
    <IonToolbar>
      {start && <IonButtons slot="start">{start}</IonButtons>}
      <IonTitle>{title}</IonTitle>
      {end && <IonButtons slot="end">{end}</IonButtons>}
    </IonToolbar>
  </IonHeader>
)
