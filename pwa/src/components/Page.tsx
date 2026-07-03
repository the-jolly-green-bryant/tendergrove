import {
  IonBackButton,
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
  statsChartOutline,
  settingsOutline,
  timeOutline,
} from 'ionicons/icons'
import { ReactNode, useState } from 'react'

import { useAppAuth } from '../auth/AuthContext'

interface PageProps {
  readonly title: string
  readonly children: ReactNode
  /** Optional content rendered inside the toolbar next to the hamburger menu. */
  readonly headerContent?: ReactNode
  /** Optional content rendered below the toolbar (e.g. calendar dropdown). */
  readonly subHeaderContent?: ReactNode
  readonly disablePadding?: boolean
  readonly className?: string
  readonly backHref?: string
  readonly transparentHeaderUntilScroll?: boolean
}

const menuItems = [
  {
    href: '/dashboard',
    direction: 'root',
    icon: homeOutline,
    label: 'Household',
  },
  {
    href: '/archived',
    direction: 'forward',
    icon: archiveOutline,
    label: 'Archived',
  },
  {
    href: '/check-in',
    direction: 'forward',
    icon: timeOutline,
    label: 'Timeline',
  },
  {
    href: '/reports',
    direction: 'forward',
    icon: statsChartOutline,
    label: 'Insights',
  },
  {
    href: '/parent-care',
    direction: 'forward',
    icon: settingsOutline,
    label: 'Settings',
  },
] as const

function MenuLink({ href, direction, icon, label }: (typeof menuItems)[number]) {
  return (
    <IonMenuToggle autoHide={false}>
      <IonItem
        button
        routerLink={href}
        routerDirection={direction}
      >
        <IonIcon
          slot="start"
          icon={icon}
        />
        <IonLabel>{label}</IonLabel>
      </IonItem>
    </IonMenuToggle>
  )
}

const renderMenu = () => {
  const { signOut } = useAppAuth()
  return (
    <IonMenu contentId="main-content">
      <IonContent>
        <div className="menu-logo-area">
          <h2 className="menu-logo-text">Tendergrove</h2>
        </div>

        <IonList lines="none">
          {menuItems.map((item) => (
            <MenuLink
              key={item.href}
              {...item}
            />
          ))}
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
  )
}

/**
 * A wrapper for a page with a toolbar and content.
 * @param {PageProps} param0
 * @param {string} param0.title
 * @param {React.ReactNode} param0.children
 * @param {React.ReactNode} param0.headerContent
 * @param {React.ReactNode} param0.subHeaderContent
 * @param {boolean} param0.disablePadding
 * @returns {React.JSX.Element}
 * @constructor
 */
export function Page({
  title,
  children,
  headerContent,
  subHeaderContent,
  disablePadding,
  className,
  backHref,
  transparentHeaderUntilScroll,
}: PageProps) {
  const [hasScrolled, setHasScrolled] = useState(false)
  const headerClassName =
    transparentHeaderUntilScroll && !hasScrolled ? 'page-header--transparent' : ''
  const toolbarClassName = headerClassName ? 'page-toolbar--transparent' : ''

  return (
    <>
      {renderMenu()}
      <IonPage id="main-content">
        <IonHeader
          className={headerClassName}
          collapse={'fade'}
          mode={'ios'}
        >
          <IonToolbar
            className={toolbarClassName}
            mode={'ios'}
          >
            <IonButtons slot="start">
              {backHref ? (
                <IonBackButton
                  defaultHref={backHref}
                  text=""
                />
              ) : (
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
              )}
            </IonButtons>
            {headerContent ?? <IonTitle>{title}</IonTitle>}
          </IonToolbar>
          {subHeaderContent}
        </IonHeader>
        <IonContent
          fullscreen
          scrollEvents={transparentHeaderUntilScroll}
          onIonScroll={(event) => {
            if (!transparentHeaderUntilScroll) return
            setHasScrolled(event.detail.scrollTop > 8)
          }}
          className={`${disablePadding ? '' : 'ion-padding'} safe-content ${className ?? ''}`}
        >
          {children}
        </IonContent>
      </IonPage>
    </>
  )
}
