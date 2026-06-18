import {
  IonAvatar,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader, IonCardSubtitle,
  IonCardTitle, IonIcon, IonItem, IonLabel, IonList, IonSpinner,
  IonText,
  useIonViewWillEnter,
} from '@ionic/react'
import { formatDistanceToNow, isToday } from 'date-fns'
import { Page } from '../../components/Page'
import { StatCard } from '../../components/StatCard'
import { useTrackerStore } from '../../stores/trackerStore'
import { useAppAuth } from '../../auth/AuthContext'
import {usePeople} from '../people/usePeople'
import {client} from '../../lib/api'
import {chevronForwardOutline} from 'ionicons/icons'

export default function HouseholdPage() {
  const { user, signOut } = useAppAuth()
  if (!user) {
    throw new Error("Redirect back to logoin")
  }

  const people = usePeople();

  const { hydrate, checkIns, incidents, parentCare } = useTrackerStore()
  useIonViewWillEnter(() => {
    void hydrate()
  })

  const todaysCheckIn = checkIns.find((x) => isToday(new Date(x.createdAt)))
  const todaysCare = parentCare.find((x) => isToday(new Date(x.createdAt)))
  const recentIncidents = incidents.slice(0, 3)
  const highSeverityCount = incidents.filter((x) => x.severity >= 4).length

  const getGreeting = () => `Howdy, INSERT_NAME 👋`

  async function createTestPerson() {
    await client.models.Person.create({
      displayName: `Test Person ${Date.now()}`,
      role: 'self',
      householdId: crypto.randomUUID(),
    });

    await people.refetch();
  }

  return (
    <Page title="Today">
      <h1>{getGreeting()}</h1>
      <p>Here's how your household is doing.</p>

      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Household Distress Radar</IonCardTitle>
          <IonCardSubtitle>Tap a person to check in</IonCardSubtitle>
        </IonCardHeader>

        <IonCardContent>RADAR HERE, but to the right</IonCardContent>
      </IonCard>

      {people.isLoading && <IonSpinner />}

      {people.error && <p>Failed to load people.</p>}

      <IonList>
        {people.data?.map((person) => (
            <IonItem key={person.id} button
                     detail
                     routerLink={`/people/${person.id}`}>

              <IonAvatar slot="start">
                {person.avatarUrl ? (
                    <img
                        src={person.avatarUrl}
                        alt={person.displayName}
                    />
                ) : (
                    <img src={`https://ui-avatars.com/api/?background=random&name=${person.displayName}`} />
                )}
              </IonAvatar>

              <IonLabel>
                <h2>{person.displayName}{person.role === 'self' && ' (You)'}</h2>
                <p>STATUS</p>
              </IonLabel>
            </IonItem>
        ))}
        <IonItem>
          <IonButton onClick={createTestPerson}>
            Add [TEST] Person
          </IonButton>
        </IonItem>
      </IonList>

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

      {/* Move this somewhere else. */}
      <IonButton onClick={signOut}>Sign out</IonButton>
    </Page>
  )
}
