import { useQuery } from '@tanstack/react-query'

import { client } from '../../../lib/api'

export const useHouseholdLifeEvents = (householdId: string | undefined) => {
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
