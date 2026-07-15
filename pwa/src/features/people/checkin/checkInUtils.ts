import { isSameLocalDay } from '../../../lib/dateKeys'
import type { usePerson } from '../usePerson'

type Person = NonNullable<ReturnType<typeof usePerson>['data']>
/**
 *
 */
export type CheckIn = Person['checkIns'][number]

import { parseAnswers } from '../../patterns/analytics'
export { parseAnswers }
export type { ParsedAnswers as CheckInAnswers } from '../../patterns/analytics'

export const isToday = (occurredAt: string): boolean =>
  isSameLocalDay(new Date(occurredAt), new Date())

export const findTodaysCheckIn = (checkIns: CheckIn[]): CheckIn | undefined =>
  [...checkIns]
    .filter((checkIn) => isToday(checkIn.occurredAt))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
