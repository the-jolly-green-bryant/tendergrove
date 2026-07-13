import { IonItem, IonLabel, IonList } from '@ionic/react'

import { LoadingState } from '../../components/LoadingState'
import { Page } from '../../components/Page'
import { PersonAvatar } from '../../components/PersonAvatar'
import { usePeople } from './usePeople'
import { useArchivePerson } from './useArchivePerson'

const ArchivedPeoplePage = () => {
  const people = usePeople()
  const archiveMutation = useArchivePerson()

  const archivedPeople = people.data?.filter((p) => p.archived) ?? []

  function unarchive(id: string) {
    archiveMutation.mutate({ id, archived: false })
  }

  return (
    <Page title="Archived">
      {people.isLoading && <LoadingState />}

      {people.error && <p>Failed to load people.</p>}

      {!people.isLoading && archivedPeople.length === 0 && (
        <p className="ion-text-center ion-padding">No archived people.</p>
      )}

      <IonList>
        {archivedPeople.map((person) => (
          <IonItem key={person.id}>
            <PersonAvatar
              slot="start"
              name={person.displayName}
              src={person.avatarUrl}
            />
            <IonLabel>
              <h2>{person.displayName}</h2>
            </IonLabel>
            <IonLabel
              slot="end"
              color="primary"
              className="ion-text-end"
              onClick={() => unarchive(person.id)}
              style={{ cursor: 'pointer' }}
            >
              Unarchive
            </IonLabel>
          </IonItem>
        ))}
      </IonList>
    </Page>
  )
}

export default ArchivedPeoplePage
