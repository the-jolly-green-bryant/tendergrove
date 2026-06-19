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
  addOutline,
  homeOutline,
  statsChartOutline,
  settingsOutline,
  timeOutline,
} from 'ionicons/icons'

import HouseholdPage from '../features/household/HouseholdPage'
import CheckInPage from '../features/checkins/CheckInPage'
import IncidentPage from '../features/incidents/IncidentPage'
import ParentCarePage from '../features/parent-care/ParentCarePage'
import ReportsPage from '../features/reports/ReportsPage'
import PersonFormPage from '../features/people/PersonFormPage'
import PersonPage from '../features/people/PersonPage'
import PersonCheckInPage from '../features/people/checkin/PersonCheckInPage'
import ManageIndicatorsPage from '../features/people/indicators/ManageIndicatorsPage'
import ChooseIndicatorTypePage from '../features/people/indicators/ChooseIndicatorTypePage'
import IndicatorFormPage from '../features/people/indicators/IndicatorFormPage'

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
              path="/people/:personId"
              component={PersonPage}
          />

          <Route
              exact
              path="/people/:personId/edit"
              component={PersonFormPage}
          />

          <Route
              exact
              path="/people/:personId/check-in"
              component={PersonCheckInPage}
          />

          <Route
              exact
              path="/people/:personId/indicators"
              component={ManageIndicatorsPage}
          />

          <Route
              exact
              path="/people/:personId/indicators/new"
              component={ChooseIndicatorTypePage}
          />

          <Route
              exact
              path="/people/:personId/indicators/new/:polarity"
              component={IndicatorFormPage}
          />

          <Route
              exact
              path="/people/:personId/indicators/:indicatorId/edit"
              component={IndicatorFormPage}
          />

          <Route
            exact
            path="/check-in"
            component={CheckInPage}
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
            <IonLabel>Home</IonLabel>
          </IonTabButton>

          <IonTabButton
            tab="checkin"
            href="/check-in"
          >
            <IonIcon icon={timeOutline} />
            <IonLabel>Timeline</IonLabel>
          </IonTabButton>

          <IonTabButton
            tab="add"
            href="/people/new"
            className="tab-bar__fab"
          >
            <IonIcon icon={addOutline} />
          </IonTabButton>

          <IonTabButton
            tab="reports"
            href="/reports"
          >
            <IonIcon icon={statsChartOutline} />
            <IonLabel>Insights</IonLabel>
          </IonTabButton>

          <IonTabButton
            tab="settings"
            href="/parent-care"
          >
            <IonIcon icon={settingsOutline} />
            <IonLabel>Settings</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  )
}
