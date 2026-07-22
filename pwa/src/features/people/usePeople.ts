import { useQuery, UseQueryResult } from '@tanstack/react-query'

import { client } from '../../lib/api'
import { RawPerson } from '../patterns/analytics'
import { readCachedValue, writeCachedValue } from '../../lib/resilientCache'

const peopleSelectionSet = [
  'id',
  'householdId',
  'displayName',
  'role',
  'avatarUrl',
  'archived',
  'checkIns.id',
  'checkIns.createdAt',
  'checkIns.updatedAt',
  'checkIns.occurredAt',
  'checkIns.answersJson',
  'checkIns.note',
  'events.occurredAt',
  'events.type',
  'events.title',
  'events.description',
  'indicators.id',
  'indicators.polarity',
  'indicators.active',
  'indicators.name',
] as const

export const usePeople = (): UseQueryResult<RawPerson[]> =>
  useQuery({
    queryKey: ['people'],
    initialData: () => readCachedValue<RawPerson[]>('people')?.value,
    queryFn: async () => {
      const result = await client.models.Person.list({
        selectionSet: peopleSelectionSet,
      })

      if (result.errors?.length) {
        throw new Error(result.errors[0].message)
      }

      const people = result.data as unknown as RawPerson[]
      writeCachedValue('people', people)
      return people
    },
  })
