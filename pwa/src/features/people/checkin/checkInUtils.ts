import type { usePerson } from '../usePerson'

type Person = NonNullable<ReturnType<typeof usePerson>['data']>
/**
 *
 */
export type CheckIn = Person['checkIns'][number]

/** Shape persisted in CheckIn.answersJson. `checked` holds the ids of the
 *  indicators that occurred on the day of the check-in; `events` holds the ids
 *  of the life events (School, Therapy, …) that occurred that day. Events are
 *  context only — they never affect the well-being score. */
export interface CheckInAnswers {
  checked: string[]
  events: string[]
}

export const isToday = (occurredAt: string): boolean => {
  const date = new Date(occurredAt)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

export const findTodaysCheckIn = (checkIns: CheckIn[]): CheckIn | undefined =>
  [...checkIns]
    .filter((checkIn) => isToday(checkIn.occurredAt))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]

export const parseAnswers = (answersJson: unknown): CheckInAnswers => {
  let value = answersJson
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return { checked: [], events: [] }
    }
  }

  if (value && typeof value === 'object') {
    return {
      checked: stringIds((value as { checked?: unknown }).checked),
      events: stringIds((value as { events?: unknown }).events),
    }
  }
  return { checked: [], events: [] }
}

/** Coerce an unknown value into an array of string ids. */
function stringIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((id): id is string => typeof id === 'string')
    : []
}
