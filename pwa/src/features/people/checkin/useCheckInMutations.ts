import { useQueryClient } from '@tanstack/react-query'

import { client } from '../../../lib/api'
import type { CheckInAnswers } from './checkInUtils'
import { parseAnswers } from './checkInUtils'
import { isSameLocalDay } from '../../../lib/dateKeys'
import { countBand, trackProductEvent } from '../../../lib/productAnalytics'
import type { RawCheckIn, RawPerson } from '../../patterns/analytics'
import type { PatternsData } from '../../patterns/usePatternsData'
import { writeCachedValue } from '../../../lib/resilientCache'

/**
 *
 */
export interface CheckInInput {
  occurredAt: string
  answers: CheckInAnswers
  note?: string
}

const updatePersonCheckIn = (
  person: RawPerson,
  personId: string,
  checkIn: RawCheckIn,
): RawPerson => {
  if (person.id !== personId) return person

  const checkIns = person.checkIns ?? []
  const existingIndex = checkIns.findIndex((item) => item.id === checkIn.id)
  const nextCheckIns =
    existingIndex === -1
      ? [...checkIns, checkIn]
      : checkIns.map((item, index) => (index === existingIndex ? checkIn : item))

  return { ...person, checkIns: nextCheckIns }
}

export const useCheckInMutations = (personId: string | undefined) => {
  const queryClient = useQueryClient()

  const cacheSavedCheckIn = (checkIn: RawCheckIn) => {
    if (!personId) return

    queryClient.setQueryData<RawPerson | null>(
      ['person', personId],
      (person) => (person ? updatePersonCheckIn(person, personId, checkIn) : person),
    )

    for (const [queryKey, people] of queryClient.getQueriesData<RawPerson[]>({
      queryKey: ['people'],
    })) {
      if (!people) continue
      const nextPeople = people.map((person) =>
        updatePersonCheckIn(person, personId, checkIn),
      )
      queryClient.setQueryData(queryKey, nextPeople)
      const accountKey = queryKey[1]
      if (typeof accountKey === 'string') {
        writeCachedValue(`${accountKey}:people`, nextPeople)
      }
    }

    for (const [queryKey, patterns] of queryClient.getQueriesData<PatternsData>({
      queryKey: ['patterns-data'],
    })) {
      if (!patterns) continue
      const nextPatterns = {
        ...patterns,
        people: patterns.people.map((person) =>
          updatePersonCheckIn(person, personId, checkIn),
        ),
      }
      queryClient.setQueryData(queryKey, nextPatterns)
      const accountKey = queryKey[1]
      if (typeof accountKey === 'string') {
        writeCachedValue(`${accountKey}:patterns`, nextPatterns)
      }
    }
  }

  const markCheckInQueriesStale = async () =>
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['person', personId],
        refetchType: 'none',
      }),
      queryClient.invalidateQueries({ queryKey: ['people'], refetchType: 'none' }),
      queryClient.invalidateQueries({
        queryKey: ['patterns-data'],
        refetchType: 'none',
      }),
    ])

  return {
    async create(input: CheckInInput) {
      if (!personId) {
        throw new Error('Cannot create a check-in without a person')
      }
      // Older deployed schemas do not know about the collaboration field and
      // throw while building the request (before a result exists). Keep basic
      // check-ins working while that schema rollout is in progress.
      let collaborators: string[] | undefined
      try {
        const person = await client.models.Person.get({ id: personId }, { selectionSet: ['collaborators'] })
        collaborators = person.errors?.length
          ? undefined
          : person.data?.collaborators?.filter((item): item is string => Boolean(item))
      } catch {
        collaborators = undefined
      }

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

      if (result.data) cacheSavedCheckIn(result.data as unknown as RawCheckIn)
      await markCheckInQueriesStale()
      void trackProductEvent('check_in_saved', {
        mode: 'created',
        selectedSignalCountBand: countBand(input.answers.checked?.length ?? 0),
        selectedEventCountBand: countBand(input.answers.events?.length ?? 0),
        hasNote: Boolean(input.note?.trim()),
      })
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

      if (result.data) cacheSavedCheckIn(result.data as unknown as RawCheckIn)
      await markCheckInQueriesStale()
      void trackProductEvent('check_in_saved', {
        mode: 'updated',
        selectedSignalCountBand: countBand(input.answers.checked?.length ?? 0),
        selectedEventCountBand: countBand(input.answers.events?.length ?? 0),
        hasNote: Boolean(input.note?.trim()),
      })
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

      await markCheckInQueriesStale()
    },
  }
}
