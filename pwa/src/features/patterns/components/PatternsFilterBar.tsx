import { IonIcon } from '@ionic/react'
import { optionsOutline } from 'ionicons/icons'
import React, { useMemo, useState } from 'react'

import {
  PersonFilterChips,
  type FilterablePerson,
} from '../../../components/PersonFilterChips'
import type { RawPerson } from '../analytics'
import { usePatternsData } from '../usePatternsData'
import { usePatternsFilterStore } from '../patternsFilterStore'
import { FiltersModal } from './FiltersModal'

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
 * The shared Patterns filter row: person chips (Everyone + each household
 * member, shown when there are ≥2 people), an optional delta toggle, and a
 * Filters button that opens the filters as an in-place modal. Selection lives
 * in a store, so it carries across every Patterns page and scopes the charts.
 *
 * Filters open as a modal (not a route), so dismissing pops it and returns the
 * caregiver to exactly the page they were on — no back-stack to unwind.
 */
export function PatternsFilterBar({
  showDeltaToggle = false,
}: {
  readonly showDeltaToggle?: boolean
}): React.JSX.Element {
  const { data } = usePatternsData()
  const personIds = usePatternsFilterStore((s) => s.personIds)
  const setPerson = usePatternsFilterStore((s) => s.setPerson)
  const showDelta = usePatternsFilterStore((s) => s.showDelta)
  const toggleDelta = usePatternsFilterStore((s) => s.toggleDelta)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const people = useMemo(() => toFilterablePeople(data?.people), [data])
  const selectedPeople = useMemo(() => new Set(personIds), [personIds])

  return (
    <>
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
          <button
            type="button"
            className="patterns-pill"
            onClick={() => setFiltersOpen(true)}
          >
            <IonIcon
              icon={optionsOutline}
              aria-hidden="true"
            />
            Filters
          </button>
        </div>
      </div>
      <FiltersModal
        isOpen={filtersOpen}
        onDismiss={() => setFiltersOpen(false)}
      />
    </>
  )
}
