import { useQueryClient } from '@tanstack/react-query'

import { client } from '../../../lib/api'
import { RawPerson } from '../../patterns/analytics'

// The generated client only exposes deployed models, so this is undefined
// until the LifeEvent table ships. Guard rather than crashing with a TypeError.
const model = () => {
  const lifeEvent = client.models.LifeEvent
  if (!lifeEvent) throw new Error(EVENTS_UNAVAILABLE_MESSAGE)
  return lifeEvent
}

const unwrap = <T extends { errors?: Array<{ message: string }> }>(result: T): T => {
  if (result.errors?.length) {
    throw new Error(result.errors[0].message)
  }
  return result
}

/** Shown when the LifeEvent table isn't deployed yet. */
export const EVENTS_UNAVAILABLE_MESSAGE =
  'Events aren’t available yet. Deploy the latest backend (run “ampx sandbox”) to start using them.'

export const useLifeEventMutations = (householdId: string | undefined) => {
  const queryClient = useQueryClient()

  const invalidate = async () =>
    await queryClient.invalidateQueries({ queryKey: ['lifeEvents', householdId] })

  return {
    /** Add a new event to the pool; returns its id (for immediate selection). */
    async create(label: string, nextSortOrder: number): Promise<string> {
      if (!householdId) {
        throw new Error('Cannot create a life event without a household')
      }
      const result = unwrap(
        await model().create({ householdId, label, sortOrder: nextSortOrder }),
      )
      await invalidate()
      return (result.data as unknown as RawPerson)?.id ?? ''
    },

    async rename(id: string, label: string) {
      unwrap(await model().update({ id, label }))
      await invalidate()
    },

    async remove(id: string) {
      unwrap(await model().delete({ id }))
      await invalidate()
    },
  }
}
