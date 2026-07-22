import { useQuery } from '@tanstack/react-query'

import { client } from '../../lib/api'
import type { RawLifeEvent, RawPerson } from './analytics'
import { readCachedValue, writeCachedValue } from '../../lib/resilientCache'
import { useAppAuth } from '../../auth/AuthContext'

const patternsSelectionSet = [
  'id',
  'householdId',
  'displayName',
  'role',
  'avatarUrl',
  'archived',
  'indicators.id',
  'indicators.name',
  'indicators.polarity',
  'indicators.active',
  'indicators.createdAt',
  'indicators.updatedAt',
  'checkIns.occurredAt',
  'checkIns.answersJson',
  'events.occurredAt',
  'events.type',
  'events.title',
] as const

const lifeEventSelectionSet = ['id', 'label', 'archived'] as const

/**
 *
 */
export interface PatternsData {
  people: RawPerson[]
  lifeEvents: RawLifeEvent[]
}

export const usePatternsData = () => {
  const { user } = useAppAuth()
  const accountKey = user?.userId ?? 'signed-out'
  return useQuery({
    queryKey: ['patterns-data', accountKey],
    enabled: Boolean(user),
    initialData: () => readCachedValue<PatternsData>(`${accountKey}:patterns`)?.value,

    queryFn: async (): Promise<PatternsData> => {
      const [peopleResult, lifeEventsResult] = await Promise.all([
        client.models.Person.list({
          selectionSet: patternsSelectionSet,
        }),

        client.models.LifeEvent.list({
          selectionSet: lifeEventSelectionSet,
        }),
      ])

      const firstError = peopleResult.errors?.[0] ?? lifeEventsResult.errors?.[0]

      if (firstError) {
        throw new Error(firstError.message)
      }

      const data = {
        people: peopleResult.data as unknown as RawPerson[],

        lifeEvents: (lifeEventsResult.data as unknown as RawLifeEvent[]).filter(
          (event) => event.archived !== true,
        ),
      }
      writeCachedValue(`${accountKey}:patterns`, data)
      return data
    },
  })
}
