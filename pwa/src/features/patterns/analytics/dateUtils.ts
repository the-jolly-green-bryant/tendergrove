/**
 * Small, dependency-free date helpers for the analytics layer.
 *
 * All keys are LOCAL calendar days (`YYYY-MM-DD`). We deliberately avoid UTC so
 * that "Tuesday" means the caregiver's Tuesday. `date-fns` is available in the
 * app, but analytics stays free of it so it can move to a backend unchanged.
 */

import type { DateKey } from './types'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Local `YYYY-MM-DD` key for a Date. */
export function toDateKey(date: Date): DateKey {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Local `YYYY-MM-DD` key for an ISO datetime string. */
export function isoToDateKey(iso: string): DateKey {
  return toDateKey(new Date(iso))
}

/** Midnight (local) of the day a Date falls on. */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Parse a `YYYY-MM-DD` key back into a local Date at midnight. */
export function dateKeyToDate(key: DateKey): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Add (or subtract) whole days to a date key, returning a new key. */
export function addDaysToKey(key: DateKey, days: number): DateKey {
  const date = dateKeyToDate(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

/** Whole-day difference `a - b` (both are day keys). Positive when a is later. */
export function daysBetween(a: DateKey, b: DateKey): number {
  const diff = dateKeyToDate(a).getTime() - dateKeyToDate(b).getTime()
  return Math.round(diff / MS_PER_DAY)
}

/**
 * Build a contiguous, ascending list of day keys ending on `endDate` and
 * spanning `windowDays` days (inclusive of the end day). This gives every day a
 * slot even when nothing was logged, which is what honest trends and heatmaps
 * need.
 */
export function buildDateWindow(endDate: Date, windowDays: number): DateKey[] {
  const endKey = toDateKey(endDate)
  const keys: DateKey[] = []
  for (let offset = windowDays - 1; offset >= 0; offset--) {
    keys.push(addDaysToKey(endKey, -offset))
  }
  return keys
}

/** Rounds to a whole number, guarding against `NaN`/`Infinity`. */
export function safeRound(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value)
}

/** Clamp a number into the inclusive `[min, max]` range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Mean of an array, or `null` when empty. */
export function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** A short, friendly weekday + date label, e.g. "Tue, May 13". */
export function formatDayLabel(key: DateKey): string {
  return dateKeyToDate(key).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** A compact date range label, e.g. "May 4 – May 10". */
export function formatRangeLabel(startKey: DateKey, endKey: DateKey): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const start = dateKeyToDate(startKey).toLocaleDateString(undefined, opts)
  const end = dateKeyToDate(endKey).toLocaleDateString(undefined, opts)
  return `${start} – ${end}`
}
