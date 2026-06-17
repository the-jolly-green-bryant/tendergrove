import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonText,
  useIonViewWillEnter,
} from '@ionic/react'
import { formatDistanceToNow, isToday } from 'date-fns'
import { Page } from '../../components/Page'
import { StatCard } from '../../components/StatCard'
import { useTrackerStore } from '../../stores/trackerStore'
import { useAppAuth } from '../../auth/AuthContext'

export default function DashboardPage() {
  const { user, signOut } = useAppAuth()

  const { hydrate, checkIns, incidents, parentCare } = useTrackerStore()
  useIonViewWillEnter(() => {
    void hydrate()
  })

  const todaysCheckIn = checkIns.find((x) => isToday(new Date(x.createdAt)))
  const todaysCare = parentCare.find((x) => isToday(new Date(x.createdAt)))
  const recentIncidents = incidents.slice(0, 3)
  const highSeverityCount = incidents.filter((x) => x.severity >= 4).length

  return (
    <Page title="Today">
      <p>Signed in as {user?.signInDetails?.loginId}</p>

      <IonButton onClick={signOut}>Sign out</IonButton>

      <div className="hero-card">
        <h1>Fast checkpoint</h1>
        <p>Capture enough to see patterns without making your day harder.</p>
        <IonButton routerLink="/check-in">Child check-in</IonButton>
        <IonButton
          fill="outline"
          routerLink="/parent-care"
        >
          Parent care
        </IonButton>
      </div>
      <div className="stat-grid">
        <StatCard
          title="Child check-in"
          value={todaysCheckIn ? 'Done' : 'Missing'}
          note={todaysCheckIn?.mood}
        />
        <StatCard
          title="Parent care"
          value={todaysCare ? 'Done' : 'Missing'}
        />
        <StatCard
          title="High severity incidents"
          value={highSeverityCount}
          note="Severity 4 or 5"
        />
      </div>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Recent incidents</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          {recentIncidents.length === 0 && <IonText>No incidents logged yet.</IonText>}
          {recentIncidents.map((item) => (
            <p key={item.id}>
              <strong>Severity {item.severity}</strong> - {item.behavior} <br />
              <small>
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </small>
            </p>
          ))}
        </IonCardContent>
      </IonCard>
    </Page>
  )
}
