import { useQuery } from '@tanstack/react-query'

import { client } from '../../lib/api'
import type { RawLifeEvent, RawPerson } from './analytics'

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

const lifeEventSelectionSet = ['id', 'label', 'archived'] as const

export interface PatternsData {
  people: RawPerson[]
  lifeEvents: RawLifeEvent[]
}

/**
 * Fetch all data required by the frontend analytics engine.
 */
export function usePatternsData() {
  return useQuery({
    queryKey: ['patterns-data'],

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

      return {
        people: peopleResult.data as unknown as RawPerson[],

        lifeEvents: (lifeEventsResult.data as unknown as RawLifeEvent[]).filter(
          (event) => event.archived !== true,
        ),
      }
    },
  })
}
