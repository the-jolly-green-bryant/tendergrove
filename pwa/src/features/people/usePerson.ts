import { useQuery } from '@tanstack/react-query'

import { client } from '../../lib/api'

const personSelectionSet = [
  'id',
  'displayName',
  'role',
  'avatarUrl',
  'archived',
  'householdId',
  'indicators.id',
  'indicators.name',
  'indicators.polarity',
  'indicators.inputType',
  'indicators.active',
  'checkIns.id',
  'checkIns.createdAt',
  'checkIns.updatedAt',
  'checkIns.occurredAt',
  'checkIns.answersJson',
  'checkIns.note',
] as const

export const usePerson = (personId: string | undefined) =>
  useQuery({
    enabled: Boolean(personId),
    queryKey: ['person', personId],
    queryFn: async () => {
      const result = await client.models.Person.get(
        { id: personId! },
        { selectionSet: personSelectionSet },
      )

      if (result.errors?.length) {
        throw new Error(result.errors[0].message)
      }

      return result.data
    },
  })
