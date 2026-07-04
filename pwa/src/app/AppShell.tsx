// src/AppShell.tsx
import { IonModal, IonRouterOutlet } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { ComponentType } from 'react'
import { matchPath, Redirect, Route, useHistory, useLocation } from 'react-router-dom'

import HouseholdPage from '../features/household/HouseholdPage'
import HouseholdRecapPage from '../features/household/HouseholdRecapPage'
import TimelinePage from '../features/timeline/TimelinePage'
import ReportsPage from '../features/reports/ReportsPage'
import InsightsPage from '../features/insights/InsightsPage'
import PersonFormPage from '../features/people/PersonFormPage'
import PersonPage from '../features/people/PersonPage'
import ManageIndicatorsPage from '../features/people/indicators/ManageIndicatorsPage'
import IndicatorChecklistPage from '../features/people/indicators/IndicatorChecklistPage'
import ChooseIndicatorTypePage from '../features/people/indicators/ChooseIndicatorTypePage'
import IndicatorFormPage from '../features/people/indicators/IndicatorFormPage'
import ArchivedPeoplePage from '../features/people/ArchivedPeoplePage'
import { CheckInWizardPage } from '../features/checkins/CheckInWizardPage'
import { RouteModalProvider } from '../components/RouteModalContext'

const appRoutes = [
  { path: '/dashboard', component: HouseholdPage },
  { path: '/person/:personId', component: PersonPage },
  { path: '/person/:personId/edit', component: PersonFormPage },
  { path: '/person/:personId/indicators', component: ManageIndicatorsPage },
  {
    path: '/person/:personId/indicators/checklist',
    component: IndicatorChecklistPage,
  },
  {
    path: '/person/:personId/indicators/new',
    component: ChooseIndicatorTypePage,
  },
  {
    path: '/person/:personId/indicators/new/:polarity',
    component: IndicatorFormPage,
  },
  {
    path: '/person/:personId/indicators/:indicatorId/edit',
    component: IndicatorFormPage,
  },
  { path: '/archived', component: ArchivedPeoplePage },
  { path: '/check-in', component: TimelinePage },
  { path: '/reports', component: InsightsPage },
  { path: '/reports/export', component: ReportsPage },
]

const modalRoutes = [
  {
    path: '/household/recap',
    component: HouseholdRecapPage,
    fallback: '/dashboard',
  },
  {
    path: '/people/new',
    component: PersonFormPage,
    fallback: '/dashboard',
  },
  {
    path: '/person/:personId/check-in',
    component: CheckInWizardPage,
    fallback: '/person/:personId',
  },
  {
    path: '/check-in/wizard',
    component: CheckInWizardPage,
    fallback: '/check-in',
  },
] as const

function resolveModalFallback(fallback: string, url: string): string {
  if (fallback === '/person/:personId') {
    return url.replace(/\/check-in$/, '')
  }
  return fallback
}

function getBackgroundLocation(location: ReturnType<typeof useLocation>) {
  const modalRoute = modalRoutes.find(({ path }) =>
    matchPath(location.pathname, { path, exact: true }),
  )
  if (!modalRoute) return location

  const match = matchPath(location.pathname, {
    path: modalRoute.path,
    exact: true,
  })
  const pathname = resolveModalFallback(
    modalRoute.fallback,
    match?.url ?? location.pathname,
  )

  return {
    ...location,
    pathname,
    search: '',
    hash: '',
  }
}

const renderRoutes = (routeLocation: ReturnType<typeof useLocation>) => (
  <IonRouterOutlet>
    {appRoutes.map(({ path, component }) => (
      <Route
        key={path}
        exact
        path={path}
        location={routeLocation}
        component={component}
      />
    ))}
    <Route
      exact
      path="/"
    >
      <Redirect to="/dashboard" />
    </Route>
  </IonRouterOutlet>
)

function RouteModal({
  path,
  component: modalComponent,
  fallback,
}: {
  readonly path: string
  readonly component: ComponentType
  readonly fallback: string
}) {
  const history = useHistory()
  const location = useLocation()
  const ModalContent = modalComponent
  const dismiss = (targetPath?: string) => {
    history.replace(targetPath ?? resolveModalFallback(fallback, location.pathname))
  }

  return (
    <Route
      exact
      path={path}
    >
      {({ match }) => (
        <IonModal
          isOpen={Boolean(match)}
          breakpoints={[0, 1]}
          initialBreakpoint={1}
          handle
          className="route-modal"
          onDidDismiss={() => {
            if (match && location.pathname === match.url) {
              dismiss(resolveModalFallback(fallback, match.url))
            }
          }}
        >
          {match && (
            <RouteModalProvider value={{ isRouteModal: true, dismiss }}>
              <ModalContent />
            </RouteModalProvider>
          )}
        </IonModal>
      )}
    </Route>
  )
}

const renderModalRoutes = () =>
  modalRoutes.map(({ path, component, fallback }) => (
    <RouteModal
      key={path}
      path={path}
      component={component}
      fallback={fallback}
    />
  ))

function AppShellRoutes() {
  const location = useLocation()
  const backgroundLocation = getBackgroundLocation(location)

  return (
    <>
      {renderRoutes(backgroundLocation)}
      {renderModalRoutes()}
    </>
  )
}

/**
 * Mounts the Ionic router.
 * @returns {React.JSX.Element}
 */
export default function AppShell() {
  return (
    <IonReactRouter>
      <AppShellRoutes />
    </IonReactRouter>
  )
}
