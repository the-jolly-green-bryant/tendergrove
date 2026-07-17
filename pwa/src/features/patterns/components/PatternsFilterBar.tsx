import React, { useMemo } from 'react'

import {
  PersonFilterChips,
  type FilterablePerson,
} from '../../../components/PersonFilterChips'
import type { RawPerson } from '../analytics'
import { usePatternsData } from '../usePatternsData'
import { usePatternsFilterStore } from '../patternsFilterStore'

const toFilterablePeople = (raw: RawPerson[] | undefined): RawPerson[] =>
  (raw ?? [])
    .filter((p) => p.archived !== true)
    .map((p) => ({
      ...p,
      indicators: (p.indicators ?? []).filter(
        (i): i is NonNullable<typeof i> => i != null,
      ),
      checkIns: (p.checkIns ?? []).filter((c): c is NonNullable<typeof c> => c != null),
    }))

export const PatternsFilterBar = ({
  showDeltaToggle = false,
}: {
  readonly showDeltaToggle?: boolean
}): React.JSX.Element => {
  const { data } = usePatternsData()
  const personIds = usePatternsFilterStore((s) => s.personIds)
  const setPerson = usePatternsFilterStore((s) => s.setPerson)
  const showDelta = usePatternsFilterStore((s) => s.showDelta)
  const toggleDelta = usePatternsFilterStore((s) => s.toggleDelta)

  const people = useMemo(() => toFilterablePeople(data?.people), [data])
  const selectedPeople = useMemo(() => new Set(personIds), [personIds])

  return (
    <div className="patterns-filter-bar">
      {people.length >= 2 && (
        <PersonFilterChips
          people={people}
          selectedPeople={selectedPeople}
          onSelectPerson={setPerson}
          onClear={() => setPerson(null)}
        />
      )}
      <div className="patterns-filter-bar__actions">
        {showDeltaToggle && (
          <button
            type="button"
            className={`patterns-pill${showDelta ? ' patterns-pill--active' : ''}`}
            onClick={toggleDelta}
            aria-pressed={showDelta}
          >
            <span aria-hidden="true">Δ</span> Show change
          </button>
        )}
      </div>
    </div>
  )
}
