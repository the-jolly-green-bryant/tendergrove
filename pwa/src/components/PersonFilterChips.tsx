import { IonIcon } from '@ionic/react'
import { peopleOutline } from 'ionicons/icons'
import { useEffect, useState } from 'react'

import { derivePersonStatus, type Status } from '../lib/status'
import './PersonFilterChips.css'

const AVATAR_COLORS = ['147D7E', '75C8C4', '2FAE60', 'E88972', '8AA39B', 'C9A66B']

interface FilterableIndicator {
  id: string
  polarity: string | null
  active?: boolean | null
}

interface FilterableCheckIn {
  occurredAt: string
  answersJson?: unknown
}

/**
 *
 */
export interface FilterablePerson {
  id: string
  displayName: string
  avatarUrl: string | null
  indicators?: FilterableIndicator[] | null
  checkIns?: FilterableCheckIn[] | null
}

interface PersonFilterChipsProps {
  readonly people: FilterablePerson[]
  readonly selectedPeople: Set<string>
  readonly onSelectPerson: (personId: string) => void
  readonly onClear: () => void
  readonly className?: string
}

const getPersonStatusColor = (person: FilterablePerson): Status['color'] => {
  return derivePersonStatus(person.indicators ?? [], person.checkIns ?? []).color
}

const colorForName = (name: string): string => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const fallbackUrl = (name: string): string => {
  const bg = colorForName(name)
  return `https://ui-avatars.com/api/?background=${bg}&color=fff&bold=true&name=${encodeURIComponent(name || '?')}`
}

const PersonFilterAvatar = ({
  name,
  src,
}: {
  readonly name: string
  readonly src?: string | null
}): React.JSX.Element => {
  const fallback = fallbackUrl(name)
  const [imgSrc, setImgSrc] = useState(src || fallback)

  useEffect(() => {
    setImgSrc(src || fallback)
  }, [src, fallback])

  return (
    <img
      className="person-filter-chip__avatar"
      src={imgSrc}
      alt={name}
      onError={() => {
        if (imgSrc !== fallback) setImgSrc(fallback)
      }}
    />
  )
}

export const PersonFilterChips = ({
  people,
  selectedPeople,
  onSelectPerson,
  onClear,
  className,
}: PersonFilterChipsProps) => {
  const showAll = selectedPeople.size === 0
  const rootClassName = ['person-filter-chips', className].filter(Boolean).join(' ')

  return (
    <div className={rootClassName}>
      <button
        type="button"
        className={`person-filter-chip ${showAll ? 'person-filter-chip--active' : ''}`}
        onClick={onClear}
        aria-pressed={showAll}
      >
        <IonIcon icon={peopleOutline} />
        <span>Everyone</span>
      </button>

      {people.map((person) => {
        const isSelected = selectedPeople.has(person.id)
        const statusColor = getPersonStatusColor(person)
        return (
          <button
            type="button"
            key={person.id}
            className={`person-filter-chip person-filter-chip--avatar person-filter-chip--${statusColor} ${isSelected ? 'person-filter-chip--active' : ''
              }`}
            onClick={() => onSelectPerson(person.id)}
            aria-label={`Show ${person.displayName}`}
            aria-pressed={isSelected}
            title={person.displayName}
          >
            <PersonFilterAvatar
              name={person.displayName}
              src={person.avatarUrl}
            />
          </button>
        )
      })}
    </div>
  )
}

export const usePersonFilter = () => {
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
  const selectOnlyPerson = (personId: string) => setSelectedPeople(new Set([personId]))

  return { selectedPeople, togglePerson, clearSelection, selectOnlyPerson }
}
