import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader, IonCardSubtitle,
  IonCardTitle, IonItem, IonLabel, IonList, IonSpinner,
} from '@ionic/react'
import { Page } from '../../components/Page'
import { PersonAvatar } from '../../components/PersonAvatar'
import { Greeting } from '../../components/Greeting'
import { useAppAuth } from '../../auth/AuthContext'
import {usePeople} from '../people/usePeople'

type StatusColor = 'success' | 'warning' | 'danger' | 'medium'

function personStatus(_person: { id: string }): { label: string; color: StatusColor } {
  // TODO: derive from latest check-in data
  return { label: 'Stable', color: 'success' }
}

export default function HouseholdPage() {
  const { user, signOut } = useAppAuth()
  if (!user) {
    throw new Error("Redirect back to logoin")
  }

  const people = usePeople();

  return (
    <Page title="Home">
      <Greeting />

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
        {people.data?.map((person) => {
            const status = personStatus(person)
            return (
              <IonItem key={person.id} button
                       detail
                       routerLink={`/person/${person.id}`}>

                <PersonAvatar slot="start" name={person.displayName} src={person.avatarUrl} />

                <IonLabel>
                  <h2>{person.displayName}{person.role === 'self' && ' (You)'}</h2>
                  <div className="person-item__status">
                    <span className={`person-item__status-dot person-item__status-dot--${status.color}`} />
                    <span className="person-item__status-label">{status.label}</span>
                  </div>
                </IonLabel>
              </IonItem>
            )
        })}
        <IonItem
            button
            detail={false}
            routerLink="/people/new"
            className="add-person-item"
        >
          <IonLabel className="ion-text-center">
            + Add Person
          </IonLabel>
        </IonItem>
      </IonList>

      {/* Move this somewhere else. */}
      <IonButton onClick={signOut}>Sign out</IonButton>
    </Page>
  )
}
