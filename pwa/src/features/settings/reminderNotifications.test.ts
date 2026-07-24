import { describe, expect, it } from 'vitest'
import {
  CHECK_IN_REMINDER_ROUTE,
  reminderRouteFromExtra,
} from './reminderNotifications'

describe('check-in reminder navigation', () => {
  it('opens the household check-in wizard for Grove reminders', () => {
    expect(
      reminderRouteFromExtra({
        purpose: 'daily-check-in',
        route: CHECK_IN_REMINDER_ROUTE,
      }),
    ).toBe(CHECK_IN_REMINDER_ROUTE)
  })

  it('rejects unrelated or unsafe notification routes', () => {
    expect(reminderRouteFromExtra({ purpose: 'other', route: '/settings' })).toBeNull()
    expect(
      reminderRouteFromExtra({
        purpose: 'daily-check-in',
        route: '//example.com',
      }),
    ).toBeNull()
  })
})
