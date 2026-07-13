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
import PatternsOverviewPage from '../features/patterns/PatternsOverviewPage'
import CalendarHeatmapPage from '../features/patterns/CalendarHeatmapPage'
import CorrelationsPage from '../features/patterns/CorrelationsPage'
import RelationshipsPage from '../features/patterns/RelationshipsPage'
import TurningPointsPage from '../features/patterns/TurningPointsPage'
import TrendsPage from '../features/patterns/TrendsPage'
import HeatmapPage from '../features/patterns/HeatmapPage'
import PatternInsightsPage from '../features/patterns/PatternInsightsPage'
import PersonFormPage from '../features/people/PersonFormPage'
import PersonPage from '../features/people/PersonPage'
import ManageIndicatorsPage from '../features/people/indicators/ManageIndicatorsPage'
import ManageEventsPage from '../features/people/events/ManageEventsPage'
import IndicatorChecklistPage from '../features/people/indicators/IndicatorChecklistPage'
import SuggestRolePage from '../features/people/indicators/SuggestRolePage'
import SuggestReviewPage from '../features/people/indicators/SuggestReviewPage'
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
  { path: '/person/:personId/events', component: ManageEventsPage },
  {
    path: '/person/:personId/indicators/checklist',
    component: IndicatorChecklistPage,
  },
  {
    path: '/person/:personId/indicators/suggest',
    component: SuggestRolePage,
  },
  {
    path: '/person/:personId/indicators/suggest/:roleKey',
    component: SuggestReviewPage,
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
  { path: '/patterns', component: PatternsOverviewPage },
  { path: '/patterns/calendar', component: CalendarHeatmapPage },
  { path: '/patterns/correlations', component: CorrelationsPage },
  { path: '/patterns/relationships', component: RelationshipsPage },
  { path: '/patterns/turning-points', component: TurningPointsPage },
  { path: '/patterns/trends', component: TrendsPage },
  { path: '/patterns/heatmap', component: HeatmapPage },
  { path: '/patterns/insights', component: PatternInsightsPage },
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

const resolveModalFallback = (fallback: string, url: string): string => {
  if (fallback === '/person/:personId') {
    return url.replace(/\/check-in$/, '')
  }
  return fallback
}

const returnToFromSearch = (search: string): string | undefined => {
  // URLSearchParams.get already decodes the value, so no manual decode here.
  const value = new URLSearchParams(search).get('returnTo')
  if (!value?.startsWith('/') || value.startsWith('//')) return undefined
  return value
}

const getBackgroundLocation = (location: ReturnType<typeof useLocation>) => {
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

const RouteModal = ({
  path,
  component: modalComponent,
  fallback,
}: {
  readonly path: string
  readonly component: ComponentType
  readonly fallback: string
}) => {
  const history = useHistory()
  const location = useLocation()
  const ModalContent = modalComponent
  // Dismiss priority: an explicit target, then the summoning page (?returnTo=),
  // then the modal's generic fallback.
  const dismiss = (targetPath?: string) => {
    const destination =
      targetPath ??
      returnToFromSearch(location.search) ??
      resolveModalFallback(fallback, location.pathname)
    history.replace(destination)
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
          handleBehavior="cycle"
          className="route-modal"
          onDidDismiss={() => {
            // Swipe-to-dismiss / backdrop tap: return to the summoning page
            // (?returnTo=) or the fallback, same as the back button.
            if (match && location.pathname === match.url) {
              dismiss()
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

const AppShellRoutes = () => {
  const location = useLocation()
  const backgroundLocation = getBackgroundLocation(location)

  return (
    <>
      {renderRoutes(backgroundLocation)}
      {renderModalRoutes()}
    </>
  )
}

const AppShell = () => {
  return (
    <IonReactRouter>
      <AppShellRoutes />
    </IonReactRouter>
  )
}

export default AppShell
