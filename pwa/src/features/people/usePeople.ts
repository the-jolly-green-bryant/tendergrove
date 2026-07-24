import { useQuery, UseQueryResult } from '@tanstack/react-query'

import { client } from '../../lib/api'
import { RawPerson } from '../patterns/analytics'
import { readCachedValue, writeCachedValue } from '../../lib/resilientCache'
import { useAppAuth } from '../../auth/AuthContext'

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
  'indicators.createdAt',
  'indicators.updatedAt',
] as const

export const usePeople = (): UseQueryResult<RawPerson[]> => {
  const { user } = useAppAuth()
  const accountKey = user?.userId ?? 'signed-out'
  return useQuery({
    queryKey: ['people', accountKey],
    enabled: Boolean(user),
    refetchOnMount: false,
    initialData: () => readCachedValue<RawPerson[]>(`${accountKey}:people`)?.value,
    queryFn: async () => {
      const result = await client.models.Person.list({
        selectionSet: peopleSelectionSet,
      })

      if (result.errors?.length) {
        throw new Error(result.errors[0].message)
      }

      const people = result.data as unknown as RawPerson[]
      writeCachedValue(`${accountKey}:people`, people)
      return people
    },
  })
}
