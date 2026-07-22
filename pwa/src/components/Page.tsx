import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuButton,
  IonMenuToggle,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react'
import {
  analyticsOutline,
  alertCircleOutline,
  archiveOutline,
  chevronBackOutline,
  chevronForwardOutline,
  documentTextOutline,
  homeOutline,
  logOutOutline,
  menuOutline,
  statsChartOutline,
  settingsOutline,
  timeOutline,
} from 'ionicons/icons'
import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

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
  readonly onBackClick?: () => void
  readonly transparentHeaderUntilScroll?: boolean
  readonly transparentHeaderMode?: 'scroll' | 'snap-panel'
  readonly forceOverscroll?: boolean
  /** Adds the dashboard's watercolor landscape and curved transition. */
  readonly illustratedHeader?: boolean
}

export const IllustratedHeaderTitle = ({
  title,
  start,
  end,
}: {
  readonly title: ReactNode
  readonly start?: ReactNode
  readonly end?: ReactNode
}) => (
  <div className="illustrated-header-title">
    {start && <div className="illustrated-header-title__start">{start}</div>}
    <h1>{title}</h1>
    <span
      className="illustrated-header-title__flourish"
      aria-hidden="true"
    >
      ⌁
    </span>
    {end && <div className="illustrated-header-title__end">{end}</div>}
  </div>
)

export const menuItems = [
  {
    href: '/help-now',
    direction: 'forward',
    icon: alertCircleOutline,
    label: 'Safety & support',
  },
  {
    href: '/dashboard',
    direction: 'root',
    icon: homeOutline,
    label: 'Home',
  },
  {
    href: '/check-in',
    direction: 'forward',
    icon: timeOutline,
    label: 'Timeline',
  },
  {
    href: '/patterns',
    direction: 'forward',
    icon: analyticsOutline,
    label: 'Patterns',
  },
  {
    href: '/reports',
    direction: 'forward',
    icon: documentTextOutline,
    label: 'Appointment prep',
  },
  {
    href: '/archived',
    direction: 'forward',
    icon: archiveOutline,
    label: 'Archive',
  },
  {
    href: '/settings',
    direction: 'forward',
    icon: settingsOutline,
    label: 'Settings',
  },
] as const

const MenuLink = ({
  href,
  direction,
  icon,
  label,
  active,
}: (typeof menuItems)[number] & { readonly active: boolean }) => (
  <IonMenuToggle
    menu="main-navigation"
    autoHide={false}
  >
    <IonItem
      button
      routerLink={href}
      routerDirection={direction}
      detail={false}
      className={`app-menu-link${active ? ' app-menu-link--active' : ''}`}
    >
      <IonIcon
        slot="start"
        icon={icon}
      />
      <IonLabel>{label}</IonLabel>
      <IonIcon
        slot="end"
        icon={chevronForwardOutline}
        className="app-menu-link__chevron"
      />
    </IonItem>
  </IonMenuToggle>
)

export const AppMenu = () => {
  const { signOut } = useAppAuth()
  const location = useLocation()
  const isActive = (href: string) =>
    location.pathname === href ||
    (href !== '/dashboard' && location.pathname.startsWith(`${href}/`))

  return (
    <IonMenu
      menuId="main-navigation"
      contentId="main-content"
      side="start"
      type="overlay"
      className="app-menu"
    >
      <IonContent className="app-menu__content">
        <div className="app-menu__layout">
          <div className="menu-logo-area">
            <img
              src="/favicon.png"
              alt=""
              className="menu-logo-mark"
            />
            <div>
              <img className="menu-wordmark" src="/assets/brand/grove-wordmark.png" alt="Grove" />
              <p className="menu-logo-tagline">
                Helping families notice the little things.
              </p>
            </div>
          </div>

          <IonList
            lines="none"
            className="app-menu__list"
          >
            {menuItems.slice(0, 3).map((item) => (
              <MenuLink
                key={item.href}
                {...item}
                active={isActive(item.href)}
              />
            ))}

            <div
              className="app-menu__divider"
              aria-hidden="true"
            >
              <span>⌁</span>
            </div>

            {menuItems.slice(3).map((item) => (
              <MenuLink
                key={item.href}
                {...item}
                active={isActive(item.href)}
              />
            ))}

            <div
              className="app-menu__divider"
              aria-hidden="true"
            >
              <span>⌁</span>
            </div>

            <IonMenuToggle
              menu="main-navigation"
              autoHide={false}
            >
              <IonItem
                button
                detail={false}
                className="app-menu-link app-menu-link--sign-out"
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

          <div
            className="app-menu__version"
            aria-label="App version 0.1.0"
          >
            <span aria-hidden="true">⌁</span>
            <span>v0.1.0</span>
            <span aria-hidden="true">⌁</span>
          </div>
        </div>
      </IonContent>
    </IonMenu>
  )
}

const useHeaderScrollState = (
  transparentHeaderUntilScroll: boolean | undefined,
  transparentHeaderMode: PageProps['transparentHeaderMode'],
  className: string | undefined,
) => {
  const [isAtTop, setIsAtTop] = useState(true)
  const contentRef = useRef<HTMLIonContentElement | null>(null)
  const updateHeaderPosition = useCallback(
    (scrollTop: number) => {
      const scrollElement = contentRef.current?.shadowRoot?.querySelector(
        '[part="scroll"]',
      ) as HTMLElement | null
      const threshold =
        transparentHeaderMode === 'snap-panel'
          ? (scrollElement?.clientHeight ?? window.innerHeight) / 2
          : 1
      const nextIsAtTop = scrollTop < threshold
      setIsAtTop((currentIsAtTop) =>
        currentIsAtTop === nextIsAtTop ? currentIsAtTop : nextIsAtTop,
      )
    },
    [transparentHeaderMode],
  )
  const syncHeaderPosition = useCallback(async () => {
    const scrollElement = await contentRef.current?.getScrollElement()
    if (!scrollElement) return
    updateHeaderPosition(scrollElement.scrollTop)
  }, [updateHeaderPosition])

  useEffect(() => {
    if (!transparentHeaderUntilScroll) return

    let cancelled = false
    const syncIfActive = async () => {
      if (cancelled) return
      await syncHeaderPosition()
    }

    void syncIfActive()
    const frame = requestAnimationFrame(() => void syncIfActive())

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [transparentHeaderUntilScroll, className, syncHeaderPosition])

  useIonViewWillEnter(() => {
    if (!transparentHeaderUntilScroll) return
    if (transparentHeaderMode === 'snap-panel') {
      setIsAtTop(true)
    }
    void syncHeaderPosition()
  }, [transparentHeaderMode, transparentHeaderUntilScroll, syncHeaderPosition])

  return { contentRef, isAtTop, updateHeaderPosition }
}

export const Page = ({
  title,
  children,
  headerContent,
  subHeaderContent,
  disablePadding,
  className,
  transparentHeaderUntilScroll,
  transparentHeaderMode = 'scroll',
  forceOverscroll,
  illustratedHeader,
  backHref,
}: PageProps): React.JSX.Element => {
  const { contentRef, isAtTop, updateHeaderPosition } = useHeaderScrollState(
    transparentHeaderUntilScroll,
    transparentHeaderMode,
    className,
  )
  const headerScrollClassName = isAtTop
    ? 'page-header--at-top'
    : 'page-header--scrolled'
  let headerClassName = ''
  if (transparentHeaderUntilScroll) {
    headerClassName = `page-header--transparent ${headerScrollClassName}`
  } else if (illustratedHeader) {
    headerClassName = `page-header--illustrated${subHeaderContent ? '' : ' page-header--illustrated-compact'}`
  }
  const toolbarClassName = transparentHeaderUntilScroll
    ? 'page-toolbar page-toolbar--transparent'
    : 'page-toolbar'

  return (
    <IonPage>
      <IonHeader
        className={headerClassName}
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
                icon={chevronBackOutline}
                text=""
                aria-label="Back"
              />
            ) : (
              <IonMenuButton menu="main-navigation" aria-label="Open menu">
                <IonIcon icon={menuOutline} aria-hidden="true" />
              </IonMenuButton>
            )}
          </IonButtons>
          {headerContent ?? <IonTitle>{title}</IonTitle>}
        </IonToolbar>
        {subHeaderContent}
      </IonHeader>
      <IonContent
        ref={contentRef}
        fullscreen
        forceOverscroll={forceOverscroll}
        scrollEvents={transparentHeaderUntilScroll}
        onIonScroll={(event) => {
          if (!transparentHeaderUntilScroll) return
          updateHeaderPosition(event.detail.scrollTop)
        }}
        className={`${disablePadding ? '' : 'ion-padding'} safe-content ${className ?? ''}`}
      >
        {children}
      </IonContent>
    </IonPage>
  )
}
