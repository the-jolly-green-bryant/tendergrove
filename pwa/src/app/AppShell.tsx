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
  analyticsOutline,
  documentTextOutline,
  heartOutline,
  homeOutline,
  warningOutline,
} from 'ionicons/icons'

import HouseholdPage from '../features/household/HouseholdPage'
import CheckInPage from '../features/checkins/CheckInPage'
import IncidentPage from '../features/incidents/IncidentPage'
import ParentCarePage from '../features/parent-care/ParentCarePage'
import ReportsPage from '../features/reports/ReportsPage'
import PersonFormPage from '../features/people/PersonFormPage'
import PersonPage from '../features/people/PersonPage'

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
            <IonLabel>Today</IonLabel>
          </IonTabButton>

          <IonTabButton
            tab="checkin"
            href="/check-in"
          >
            <IonIcon icon={analyticsOutline} />
            <IonLabel>Check-in</IonLabel>
          </IonTabButton>

          <IonTabButton
            tab="incident"
            href="/incident"
          >
            <IonIcon icon={warningOutline} />
            <IonLabel>Incident</IonLabel>
          </IonTabButton>

          <IonTabButton
            tab="care"
            href="/parent-care"
          >
            <IonIcon icon={heartOutline} />
            <IonLabel>Care</IonLabel>
          </IonTabButton>

          <IonTabButton
            tab="reports"
            href="/reports"
          >
            <IonIcon icon={documentTextOutline} />
            <IonLabel>Reports</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  )
}
