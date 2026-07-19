import { IonPage } from '@ionic/react'
import { type ReactNode, useEffect, useRef } from 'react'

import { RightDrawer } from './RightDrawer'

export const CheckInDrawerSurface = ({
  children,
  isOpen,
  menuId,
  onDidClose,
}: {
  readonly children: ReactNode
  readonly isOpen: boolean
  readonly menuId: string
  readonly onDidClose: () => void
}) => {
  const menuRef = useRef<HTMLIonMenuElement>(null)

  useEffect(() => {
    if (isOpen) void menuRef.current?.open()
    else void menuRef.current?.close()
  }, [isOpen])

  return (
    <RightDrawer
      menuRef={menuRef}
      menuId={menuId}
      className="check-in-drawer"
      onDidClose={onDidClose}
    >
      <IonPage className="check-in-drawer__page">{children}</IonPage>
    </RightDrawer>
  )
}
