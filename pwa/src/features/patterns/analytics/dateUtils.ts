/**
 * Small, dependency-free date helpers for the analytics layer.
 *
 * All keys are LOCAL calendar days (`YYYY-MM-DD`). We deliberately avoid UTC so
 * that "Tuesday" means the caregiver's Tuesday. `date-fns` is available in the
 * app, but analytics stays free of it so it can move to a backend unchanged.
 */

import type { DateKey } from './types'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export const toDateKey = (date: Date): DateKey => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const isoToDateKey = (iso: string): DateKey => toDateKey(new Date(iso))

export const startOfLocalDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

export const dateKeyToDate = (key: DateKey): Date => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const addDaysToKey = (key: DateKey, days: number): DateKey => {
  const date = dateKeyToDate(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export const daysBetween = (a: DateKey, b: DateKey): number => {
  const diff = dateKeyToDate(a).getTime() - dateKeyToDate(b).getTime()
  return Math.round(diff / MS_PER_DAY)
}

export const buildDateWindow = (endDate: Date, windowDays: number): DateKey[] => {
  const endKey = toDateKey(endDate)
  const keys: DateKey[] = []
  for (let offset = windowDays - 1; offset >= 0; offset--) {
    keys.push(addDaysToKey(endKey, -offset))
  }
  return keys
}

export const safeRound = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  return Math.round(value)
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

export const mean = (values: number[]): number | null => {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export const formatDayLabel = (key: DateKey): string =>
  dateKeyToDate(key).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

export const formatRangeLabel = (startKey: DateKey, endKey: DateKey): string => {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const start = dateKeyToDate(startKey).toLocaleDateString(undefined, opts)
  const end = dateKeyToDate(endKey).toLocaleDateString(undefined, opts)
  return `${start} – ${end}`
}
