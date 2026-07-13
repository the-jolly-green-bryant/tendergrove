import { useQuery } from '@tanstack/react-query'

import { client } from '../../../lib/api'

export const useIndicators = (personId: string | undefined) =>
  useQuery({
    enabled: Boolean(personId),
    queryKey: ['indicators', personId],
    queryFn: async () => {
      const result = await client.models.Indicator.list({
        filter: { personId: { eq: personId! } },
      })

      if (result.errors?.length) {
        throw new Error(result.errors[0].message)
      }

      return result.data
    },
  })

export type Indicator = NonNullable<ReturnType<typeof useIndicators>['data']>[number]
