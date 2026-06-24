import type { usePerson } from '../usePerson'

type Person = NonNullable<ReturnType<typeof usePerson>['data']>
export type CheckIn = Person['checkIns'][number]

/** Shape persisted in CheckIn.answersJson. `checked` holds the ids of the
 *  indicators that occurred on the day of the check-in. */
export interface CheckInAnswers {
  checked: string[]
}

/** True when an ISO datetime falls on the same local calendar day as now. */
export function isToday(occurredAt: string): boolean {
  const date = new Date(occurredAt)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

/** The most recent check-in that happened today, if any. */
export function findTodaysCheckIn(checkIns: CheckIn[]): CheckIn | undefined {
  return [...checkIns]
    .filter((checkIn) => isToday(checkIn.occurredAt))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
}

/** Safely read the checked indicator ids out of a check-in's answers blob.
 *  Accepts either a parsed object or a JSON string (AWSJSON round-trips can
 *  surface either depending on the client path). */
export function parseAnswers(answersJson: unknown): CheckInAnswers {
  let value = answersJson
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return { checked: [] }
    }
  }

  if (value && typeof value === 'object' && 'checked' in value) {
    const checked = (value as { checked: unknown }).checked
    if (Array.isArray(checked)) {
      return { checked: checked.filter((id): id is string => typeof id === 'string') }
    }
  }
  return { checked: [] }
}
