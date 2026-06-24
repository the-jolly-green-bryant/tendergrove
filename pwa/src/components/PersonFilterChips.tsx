import { IonChip, IonIcon, IonLabel } from '@ionic/react'
import { peopleOutline } from 'ionicons/icons'
import { useState } from 'react'

import { PersonAvatar } from './PersonAvatar'

/**
 *
 */
export interface FilterablePerson {
  id: string
  displayName: string
  avatarUrl: string | null
}

interface PersonFilterChipsProps {
  readonly people: FilterablePerson[]
  readonly selectedPeople: Set<string>
  readonly onToggle: (personId: string) => void
  readonly onClear: () => void
  readonly className?: string
}

export function PersonFilterChips({
  people,
  selectedPeople,
  onToggle,
  onClear,
  className,
}: PersonFilterChipsProps) {
  const showAll = selectedPeople.size === 0

  return (
    <div className={className}>
      <IonChip
        className={`person-filter-chip ${showAll ? 'person-filter-chip--active' : ''}`}
        onClick={onClear}
      >
        <IonIcon icon={peopleOutline} />
        <IonLabel>All People</IonLabel>
      </IonChip>

      {people.map((person) => {
        const isSelected = selectedPeople.has(person.id)
        return (
          <IonChip
            key={person.id}
            className={`person-filter-chip ${isSelected ? 'person-filter-chip--active' : ''}`}
            onClick={() => onToggle(person.id)}
          >
            <PersonAvatar
              name={person.displayName}
              src={person.avatarUrl}
              className="person-filter-chip__avatar"
            />
            <IonLabel>{person.displayName}</IonLabel>
          </IonChip>
        )
      })}
    </div>
  )
}

/**
 *
 */
export function usePersonFilter() {
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set())

  const togglePerson = (personId: string) => {
    setSelectedPeople((prev: Set<string>) => {
      const next = new Set(prev)
      if (next.has(personId)) {
        next.delete(personId)
      } else {
        next.add(personId)
      }
      return next
    })
  }

  const clearSelection = () => setSelectedPeople(new Set())

  return { selectedPeople, togglePerson, clearSelection }
}
