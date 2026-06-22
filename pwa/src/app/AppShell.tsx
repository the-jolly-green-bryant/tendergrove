// src/AppShell.tsx
import {
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Redirect, Route } from 'react-router-dom'
import {
  clipboardOutline,
  homeOutline,
  statsChartOutline,
  timeOutline,
} from 'ionicons/icons'

import HouseholdPage from '../features/household/HouseholdPage'
import CheckInPage from '../features/checkins/CheckInPage'
import TimelinePage from '../features/timeline/TimelinePage'
import IncidentPage from '../features/incidents/IncidentPage'
import ParentCarePage from '../features/parent-care/ParentCarePage'
import ReportsPage from '../features/reports/ReportsPage'
import PersonFormPage from '../features/people/PersonFormPage'
import PersonPage from '../features/people/PersonPage'
import PersonCheckInPage from '../features/people/checkin/PersonCheckInPage'
import ManageIndicatorsPage from '../features/people/indicators/ManageIndicatorsPage'
import IndicatorChecklistPage from '../features/people/indicators/IndicatorChecklistPage'
import ChooseIndicatorTypePage from '../features/people/indicators/ChooseIndicatorTypePage'
import IndicatorFormPage from '../features/people/indicators/IndicatorFormPage'
import ArchivedPeoplePage from '../features/people/ArchivedPeoplePage'
import CheckInWizardPage from '../features/checkins/CheckInWizardPage'

export default function AppShell() {
  return (
    <IonReactRouter>
      <IonTabs>
        <IonRouterOutlet>
          <Route
            exact
            path="/dashboard"
            component={HouseholdPage}
          />

          <Route
              exact
              path="/people/new"
              component={PersonFormPage}
          />

          <Route
              exact
              path="/person/:personId"
              component={PersonPage}
          />

          <Route
              exact
              path="/person/:personId/edit"
              component={PersonFormPage}
          />

          <Route
              exact
              path="/person/:personId/check-in"
              component={PersonCheckInPage}
          />

          <Route
              exact
              path="/person/:personId/indicators"
              component={ManageIndicatorsPage}
          />

          <Route
              exact
              path="/person/:personId/indicators/checklist"
              component={IndicatorChecklistPage}
          />

          <Route
              exact
              path="/person/:personId/indicators/new"
              component={ChooseIndicatorTypePage}
          />

          <Route
              exact
              path="/person/:personId/indicators/new/:polarity"
              component={IndicatorFormPage}
          />

          <Route
              exact
              path="/person/:personId/indicators/:indicatorId/edit"
              component={IndicatorFormPage}
          />

          <Route
              exact
              path="/archived"
              component={ArchivedPeoplePage}
          />

          <Route
            exact
            path="/check-in"
            component={TimelinePage}
          />
          <Route
            exact
            path="/check-in/wizard"
            component={CheckInWizardPage}
          />
          <Route
            exact
            path="/incident"
            component={IncidentPage}
          />
          <Route
            exact
            path="/parent-care"
            component={ParentCarePage}
          />
          <Route
            exact
            path="/reports"
            component={ReportsPage}
          />

          <Route
            exact
            path="/"
          >
            <Redirect to="/dashboard" />
          </Route>
        </IonRouterOutlet>

        <IonTabBar slot="bottom">
          <IonTabButton
            tab="dashboard"
            href="/dashboard"
          >
            <IonIcon icon={homeOutline} />
            <IonLabel>Household</IonLabel>
          </IonTabButton>

          <IonTabButton
            tab="checkin"
            href="/check-in"
          >
            <IonIcon icon={timeOutline} />
            <IonLabel>Timeline</IonLabel>
          </IonTabButton>

          <IonTabButton
            tab="reports"
            href="/reports"
          >
            <IonIcon icon={statsChartOutline} />
            <IonLabel>Insights</IonLabel>
          </IonTabButton>

          <IonTabButton
            tab="add"
            href="/check-in/wizard"
            className="tab-bar__fab"
          >
            <IonIcon icon={clipboardOutline} />
          </IonTabButton>

        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  )
}
