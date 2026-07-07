import { useQuery } from '@tanstack/react-query'

import { client } from '../../lib/api'
import type { RawPerson } from './analytics'

/**
 * Selection set for the Patterns analytics. This is intentionally a superset of
 * `usePeople` — analytics also needs indicator *names* (for readable
 * correlation copy) and *events* (to pull out incidents). Keeping it in its own
 * hook means the lighter dashboard queries stay lean.
 *
 * If analytics ever moves to a backend endpoint (see `analytics/index.ts`),
 * this hook becomes a simple fetch of the precomputed `AnalyticsResult` and the
 * selection set below moves server-side unchanged.
 */
const patternsSelectionSet = [
  'id',
  'displayName',
  'role',
  'avatarUrl',
  'archived',
  'indicators.id',
  'indicators.name',
  'indicators.polarity',
  'indicators.active',
  'checkIns.occurredAt',
  'checkIns.answersJson',
  'events.occurredAt',
  'events.type',
  'events.title',
] as const

/** Fetch every household member with the data the analytics engine needs. */
export function usePatternsData() {
  return useQuery({
    queryKey: ['patterns-data'],
    queryFn: async (): Promise<RawPerson[]> => {
      const result = await client.models.Person.list({
        selectionSet: patternsSelectionSet,
      })
      if (result.errors?.length) {
        throw new Error(result.errors[0].message)
      }
      // The selection-set shape is structurally compatible with RawPerson
      // (loose optionals); the analytics normalizer validates/parses everything.
      return result.data as unknown as RawPerson[]
    },
  })
}
