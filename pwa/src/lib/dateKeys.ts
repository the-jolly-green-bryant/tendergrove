/** Returns true when two dates fall on the same local calendar day. */
export const isSameLocalDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

/** Return YYYY-MM-DD for a Date in local time. */
export const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Formats a date for display (e.g. "Today" or "Mon, Oct 24"). */
export const formatDateLabel = (date: Date): string => {
  const today = new Date()
  if (isSameLocalDay(date, today)) {
    return 'Today'
  }
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
