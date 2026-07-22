import { useQueryClient } from '@tanstack/react-query'

import { client } from '../../../lib/api'
import type { CheckInAnswers } from './checkInUtils'
import { parseAnswers } from './checkInUtils'
import { isSameLocalDay } from '../../../lib/dateKeys'

/**
 *
 */
export interface CheckInInput {
  occurredAt: string
  answers: CheckInAnswers
  note?: string
}

export const useCheckInMutations = (personId: string | undefined) => {
  const queryClient = useQueryClient()

  const invalidate = async () =>
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['person', personId] }),
      queryClient.invalidateQueries({ queryKey: ['people'] }),
      queryClient.invalidateQueries({ queryKey: ['patterns-data'] }),
    ])

  return {
    async create(input: CheckInInput) {
      if (!personId) {
        throw new Error('Cannot create a check-in without a person')
      }
      const person = await client.models.Person.get({ id: personId }, { selectionSet: ['collaborators'] })
      const collaborators = person.errors?.length
        ? undefined
        : person.data?.collaborators?.filter((item): item is string => Boolean(item))

      const result = await client.models.CheckIn.create({
        personId,
        ...(collaborators ? { collaborators } : {}),
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

    /**
     * Events describe the household's day, even though legacy storage keeps
     * them inside check-in JSON. Keep every existing check-in for this
     * household/date in sync without creating empty check-ins for people who
     * have not checked in (which would incorrectly affect their score).
     */
    async syncHouseholdEventsForDate(
      householdId: string,
      occurredAt: string,
      eventIds: string[],
    ) {
      const peopleResult = await client.models.Person.list({
        filter: { householdId: { eq: householdId } },
        selectionSet: ['checkIns.id', 'checkIns.occurredAt', 'checkIns.answersJson'],
      })

      if (peopleResult.errors?.length) {
        throw new Error(peopleResult.errors[0].message)
      }

      const targetDate = new Date(occurredAt)
      const checkIns = peopleResult.data.flatMap((person) => person.checkIns ?? [])
      const matching = checkIns.filter((checkIn) =>
        isSameLocalDay(new Date(checkIn.occurredAt), targetDate),
      )

      const updates = await Promise.all(
        matching.map((checkIn) => {
          const answers = parseAnswers(checkIn.answersJson)
          return client.models.CheckIn.update({
            id: checkIn.id,
            answersJson: JSON.stringify({ ...answers, events: eventIds }),
          })
        }),
      )

      const firstError = updates.flatMap((result) => result.errors ?? [])[0]
      if (firstError) throw new Error(firstError.message)

      await invalidate()
    },
  }
}
