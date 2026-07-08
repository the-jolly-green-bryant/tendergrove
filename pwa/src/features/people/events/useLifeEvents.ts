import { useQuery } from '@tanstack/react-query'

import { client } from '../../../lib/api'

/**
 * Fetch the household's shared pool of life events (School, Therapy, …), ordered
 * for display. Missing `sortOrder` falls back to creation time.
 *
 * Resilient by design: if the LifeEvent table isn't deployed yet (or the request
 * otherwise fails) it returns an empty list rather than throwing, so the
 * check-in and the rest of the app keep working until the backend is deployed.
 */
export function useHouseholdLifeEvents(householdId: string | undefined) {
  return useQuery({
    enabled: Boolean(householdId),
    queryKey: ['lifeEvents', householdId],
    queryFn: async () => {
      try {
        const result = await client.models.LifeEvent.list({
          filter: { householdId: { eq: householdId! } },
        })
        if (result.errors?.length) return []
        return [...result.data].sort(bySortOrder)
      } catch {
        return []
      }
    },
  })
}

function bySortOrder(
  a: { sortOrder?: number | null; createdAt?: string | null },
  b: { sortOrder?: number | null; createdAt?: string | null },
): number {
  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER
  if (orderA !== orderB) return orderA - orderB
  return (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
}

/**
 *
 */
export type LifeEvent = NonNullable<
  ReturnType<typeof useHouseholdLifeEvents>['data']
>[number]
