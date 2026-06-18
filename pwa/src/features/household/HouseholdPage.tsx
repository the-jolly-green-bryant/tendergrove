import {
  IonAvatar,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader, IonCardSubtitle,
  IonCardTitle, IonItem, IonLabel, IonList, IonSpinner,
} from '@ionic/react'
import { Page } from '../../components/Page'
import { useAppAuth } from '../../auth/AuthContext'
import {usePeople} from '../people/usePeople'

export default function HouseholdPage() {
  const { user, signOut } = useAppAuth()
  if (!user) {
    throw new Error("Redirect back to logoin")
  }

  const people = usePeople();

  const getGreeting = () => `Howdy, INSERT_NAME 👋`

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
