import { useQuery, UseQueryResult } from '@tanstack/react-query'

import { client } from '../../lib/api'
import { RawPerson } from '../patterns/analytics'

const peopleSelectionSet = [
  'id',
  'displayName',
  'role',
  'avatarUrl',
  'archived',
  'checkIns.id',
  'checkIns.createdAt',
  'checkIns.updatedAt',
  'checkIns.occurredAt',
  'checkIns.answersJson',
  'indicators.id',
  'indicators.polarity',
  'indicators.active',
  'indicators.name',
] as const

export const usePeople = (): UseQueryResult<RawPerson[]> =>
  useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const result = await client.models.Person.list({
        selectionSet: peopleSelectionSet,
      })

      if (result.errors?.length) {
        throw new Error(result.errors[0].message)
      }

      return result.data
    },
  })
