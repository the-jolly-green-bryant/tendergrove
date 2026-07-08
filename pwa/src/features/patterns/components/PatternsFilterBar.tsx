import React, { useMemo } from 'react'

import {
  PersonFilterChips,
  type FilterablePerson,
} from '../../../components/PersonFilterChips'
import type { RawPerson } from '../analytics'
import { usePatternsData } from '../usePatternsData'
import { usePatternsFilterStore } from '../patternsFilterStore'

/** Map the fetched people into the shape `PersonFilterChips` expects. */
function toFilterablePeople(raw: RawPerson[] | undefined): FilterablePerson[] {
  return (raw ?? [])
    .filter((p) => p.archived !== true)
    .map((p) => ({
      id: p.id,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl ?? null,
      indicators: (p.indicators ?? [])
        .filter((i): i is NonNullable<typeof i> => i != null)
        .map((i) => ({ id: i.id, polarity: i.polarity ?? null, active: i.active })),
      checkIns: (p.checkIns ?? [])
        .filter((c): c is NonNullable<typeof c> => c != null)
        .map((c) => ({ occurredAt: c.occurredAt, answersJson: c.answersJson })),
    }))
}

/**
 * The shared Patterns filter: person chips (Everyone + each household member)
 * plus an optional delta toggle. Selection lives in a store, so it carries
 * across every Patterns page and scopes what the charts show.
 */
export function PatternsFilterBar({
  showDeltaToggle = false,
}: {
  readonly showDeltaToggle?: boolean
}): React.JSX.Element | null {
  const { data } = usePatternsData()
  const { selectedPersonId, setPerson, showDelta, toggleDelta } =
    usePatternsFilterStore()

  const people = useMemo(() => toFilterablePeople(data), [data])
  const selectedPeople = useMemo(
    () => (selectedPersonId ? new Set([selectedPersonId]) : new Set<string>()),
    [selectedPersonId],
  )

  // Nothing to filter with fewer than two people.
  if (people.length < 2) return null

  return (
    <div className="patterns-filter-bar">
      <PersonFilterChips
        people={people}
        selectedPeople={selectedPeople}
        onSelectPerson={setPerson}
        onClear={() => setPerson(null)}
      />
      {showDeltaToggle && (
        <button
          type="button"
          className={`patterns-delta-toggle${showDelta ? ' patterns-delta-toggle--active' : ''}`}
          onClick={toggleDelta}
          aria-pressed={showDelta}
        >
          <span aria-hidden="true">Δ</span> Show change
        </button>
      )}
    </div>
  )
}
