import { useMutation, useQueryClient } from '@tanstack/react-query'

import { client } from '../../lib/api'

export function useArchivePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const result = await client.models.Person.update({ id, archived })

      if (result.errors?.length) {
        throw new Error(result.errors[0].message)
      }

      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] })
      queryClient.invalidateQueries({ queryKey: ['person'] })
    },
  })
}
