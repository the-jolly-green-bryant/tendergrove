/**
 * Deterministic fixtures/builders for analytics tests.
 *
 * All times are noon local so `isoToDateKey` maps them to the intended calendar
 * day regardless of the CI machine's timezone.
 */

import type {
  AnalyticsCheckIn,
  AnalyticsIncident,
  AnalyticsIndicator,
  AnalyticsPerson,
  Polarity,
  PersonRole,
} from '../types'

/** ISO string for a given local date at noon (safe across timezones). */
export function iso(year: number, month1: number, day: number, hour = 12): string {
  return new Date(year, month1 - 1, day, hour, 0, 0).toISOString()
}

/** A fixed "now" used across tests so windows are stable. */
export const NOW = new Date(2025, 4, 31, 12, 0, 0) // May 31, 2025 noon local

let indicatorCounter = 0

/** Build an analytics indicator with a stable id. */
export function indicator(
  polarity: Polarity,
  name = `indicator-${++indicatorCounter}`,
  overrides: Partial<AnalyticsIndicator> = {},
): AnalyticsIndicator {
  return {
    id: overrides.id ?? name,
    name,
    polarity,
    active: overrides.active ?? true,
  }
}

/** Build a check-in that marks the given indicator ids as occurred. */
export function checkIn(
  occurredAt: string,
  checkedIndicatorIds: string[],
): AnalyticsCheckIn {
  return { occurredAt, checkedIndicatorIds }
}

/** Build an incident at the given time. */
export function incident(occurredAt: string, title = 'Incident'): AnalyticsIncident {
  return { occurredAt, title }
}

/** Build an analytics person with optional overrides. */
export function person(
  id: string,
  overrides: Partial<AnalyticsPerson> = {},
): AnalyticsPerson {
  return {
    id,
    displayName: overrides.displayName ?? id,
    role: (overrides.role ?? null) as PersonRole | null,
    indicators: overrides.indicators ?? [],
    checkIns: overrides.checkIns ?? [],
    incidents: overrides.incidents ?? [],
  }
}
