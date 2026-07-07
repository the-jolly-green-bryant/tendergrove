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
  useIonViewWillEnter,
} from '@ionic/react'
import {
  analyticsOutline,
  archiveOutline,
  arrowBackOutline,
  homeOutline,
  logOutOutline,
  menuOutline,
  statsChartOutline,
  settingsOutline,
  timeOutline,
} from 'ionicons/icons'
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'

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
    href: '/patterns',
    direction: 'forward',
    icon: analyticsOutline,
    label: 'Patterns',
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

function useHeaderScrollState(
  transparentHeaderUntilScroll: boolean | undefined,
  transparentHeaderMode: PageProps['transparentHeaderMode'],
  className: string | undefined,
) {
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

function HeaderStartControl({
  backHref,
  onBackClick,
}: {
  readonly backHref?: string
  readonly onBackClick?: () => void
}) {
  let control: ReactNode
  if (onBackClick) {
    control = (
      <IonButton
        fill="clear"
        aria-label="Back"
        onClick={onBackClick}
      >
        <IonIcon
          slot="icon-only"
          icon={arrowBackOutline}
        />
      </IonButton>
    )
  } else if (backHref) {
    control = (
      <IonBackButton
        defaultHref={backHref}
        text=""
      />
    )
  } else {
    control = (
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
    )
  }

  return <IonButtons slot="start">{control}</IonButtons>
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
  onBackClick,
  transparentHeaderUntilScroll,
  transparentHeaderMode = 'scroll',
  forceOverscroll,
}: PageProps) {
  const { contentRef, isAtTop, updateHeaderPosition } = useHeaderScrollState(
    transparentHeaderUntilScroll,
    transparentHeaderMode,
    className,
  )
  const headerScrollClassName = isAtTop
    ? 'page-header--at-top'
    : 'page-header--scrolled'
  const headerClassName = transparentHeaderUntilScroll
    ? `page-header--transparent ${headerScrollClassName}`
    : ''
  const toolbarClassName = transparentHeaderUntilScroll
    ? 'page-toolbar--transparent'
    : ''

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
            <HeaderStartControl
              backHref={backHref}
              onBackClick={onBackClick}
            />
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
    </>
  )
}
