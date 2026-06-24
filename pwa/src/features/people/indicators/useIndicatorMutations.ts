import { useQueryClient } from '@tanstack/react-query'

import { client } from '../../../lib/api'
import type { Schema } from '../../../../../amplify/data/resource'

type Polarity = NonNullable<Schema['Indicator']['type']['polarity']>
type InputType = NonNullable<Schema['Indicator']['type']['inputType']>

/**
 *
 */
export interface IndicatorInput {
  name: string
  description?: string
  notes?: string
  polarity: Polarity
  inputType: InputType
}

/**
 *
 */
export function useIndicatorMutations(personId: string | undefined) {
  const queryClient = useQueryClient()

  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['indicators', personId] }),
      queryClient.invalidateQueries({ queryKey: ['person', personId] }),
      queryClient.invalidateQueries({ queryKey: ['people'] }),
    ])
  }

  function unwrap<T extends { errors?: Array<{ message: string }> }>(result: T): T {
    if (result.errors?.length) {
      throw new Error(result.errors[0].message)
    }
    return result
  }

  return {
    async create(input: IndicatorInput) {
      if (!personId) {
        throw new Error('Cannot create an indicator without a person')
      }

      unwrap(await client.models.Indicator.create({ personId, ...input }))
      await invalidate()
    },

    async update(id: string, input: IndicatorInput) {
      unwrap(await client.models.Indicator.update({ id, ...input }))
      await invalidate()
    },

    async remove(id: string) {
      unwrap(await client.models.Indicator.delete({ id }))
      await invalidate()
    },
  }
}
