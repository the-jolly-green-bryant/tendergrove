// src/AppShell.tsx
import { IonRouterOutlet } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Redirect, Route } from 'react-router-dom'

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

const appRoutes = [
  { path: '/dashboard', component: HouseholdPage },
  { path: '/household/recap', component: HouseholdRecapPage },
  { path: '/people/new', component: PersonFormPage },
  { path: '/person/:personId', component: PersonPage },
  { path: '/person/:personId/edit', component: PersonFormPage },
  { path: '/person/:personId/check-in', component: CheckInWizardPage },
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
  { path: '/check-in/wizard', component: CheckInWizardPage },
  { path: '/reports', component: InsightsPage },
  { path: '/reports/export', component: ReportsPage },
]

const renderRoutes = () => (
  <IonRouterOutlet>
    {appRoutes.map(({ path, component }) => (
      <Route
        key={path}
        exact
        path={path}
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

/**
 * Mounts the Ionic router.
 * @returns {React.JSX.Element}
 */
export default function AppShell() {
  return <IonReactRouter>{renderRoutes()}</IonReactRouter>
}
