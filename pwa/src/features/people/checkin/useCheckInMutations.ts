import { useQueryClient } from '@tanstack/react-query'

import { client } from '../../../lib/api'
import type { CheckInAnswers } from './checkInUtils'

/**
 *
 */
export interface CheckInInput {
  occurredAt: string
  answers: CheckInAnswers
  note?: string
}

/**
 *
 */
export function useCheckInMutations(personId: string | undefined) {
  const queryClient = useQueryClient()

  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['person', personId] }),
      queryClient.invalidateQueries({ queryKey: ['people'] }),
    ])
  }

  return {
    async create(input: CheckInInput) {
      if (!personId) {
        throw new Error('Cannot create a check-in without a person')
      }

      const result = await client.models.CheckIn.create({
        personId,
        occurredAt: input.occurredAt,
        answersJson: JSON.stringify(input.answers),
        note: input.note,
      })

      if (result.errors?.length) {
        throw new Error(result.errors[0].message)
      }

      await invalidate()
      return result.data
    },

    async update(id: string, input: CheckInInput) {
      const result = await client.models.CheckIn.update({
        id,
        occurredAt: input.occurredAt,
        answersJson: JSON.stringify(input.answers),
        note: input.note,
      })

      if (result.errors?.length) {
        throw new Error(result.errors[0].message)
      }

      await invalidate()
      return result.data
    },
  }
}
