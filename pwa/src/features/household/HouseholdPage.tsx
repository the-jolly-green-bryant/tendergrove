import {
  IonSpinner,
} from '@ionic/react'
import { chevronForwardOutline } from 'ionicons/icons'
import { IonIcon } from '@ionic/react'
import { Page } from '../../components/Page'
import { PersonAvatar } from '../../components/PersonAvatar'
import { Greeting } from '../../components/Greeting'
import { useAppAuth } from '../../auth/AuthContext'
import { usePeople } from '../people/usePeople'
import { useHistory } from 'react-router-dom'

type StatusColor = 'success' | 'warning' | 'danger' | 'medium'

function personStatus(_person: { id: string }): { label: string; color: StatusColor } {
  // TODO: derive from latest check-in data
  return { label: 'Stable', color: 'success' }
}

export default function HouseholdPage() {
  const { user } = useAppAuth()
  if (!user) {
    throw new Error("Redirect back to logoin")
  }

  const people = usePeople()
  const history = useHistory()

  return (
    <Page title="Home">
      <Greeting />

      {people.isLoading && <IonSpinner />}

      {people.error && <p>Failed to load people.</p>}

      <div className="household-list">
        {people.data?.filter((p) => !p.archived).map((person) => {
          const status = personStatus(person)
          return (
            <button
              key={person.id}
              className="household-person-btn"
              onClick={() => history.push(`/person/${person.id}`)}
            >
              <PersonAvatar name={person.displayName} src={person.avatarUrl} className="household-person-btn__avatar" />
              <div className="household-person-btn__info">
                <span className="household-person-btn__name">
                  {person.displayName}{person.role === 'self' && ' (You)'}
                </span>
                <span className="household-person-btn__status">
                  <span className={`household-person-btn__dot household-person-btn__dot--${status.color}`} />
                  {status.label}
                </span>
              </div>
              <IonIcon icon={chevronForwardOutline} className="household-person-btn__chevron" />
            </button>
          )
        })}

        <button
          className="household-add-btn"
          onClick={() => history.push('/people/new')}
        >
          + Add Person
        </button>
      </div>
    </Page>
  )
}
