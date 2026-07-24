import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { accountStorageKey } from '../../lib/accountStorage'

export const CHECK_IN_REMINDER_ROUTE =
  '/check-in/wizard?returnTo=%2Fdashboard'

export const CHECK_IN_REMINDER_TITLE = "Ready for today's check-in?"

export const CHECK_IN_REMINDER_BODY =
  'Take a moment to record today’s observations in Grove.'

export const checkInReminderExtra = {
  route: CHECK_IN_REMINDER_ROUTE,
  purpose: 'daily-check-in',
} as const

export const CHECK_IN_REMINDER_VERSION = 2

export interface ReminderValue {
  enabled: boolean
  time: string
  skippedDate?: string
  scheduleVersion?: number
}

export const readReminder = (accountId?: string): ReminderValue => {
  try {
    return {
      enabled: false,
      time: '20:00',
      ...JSON.parse(
        localStorage.getItem(accountStorageKey(accountId, 'gentle-reminder')) ??
          '{}',
      ),
    }
  } catch {
    return { enabled: false, time: '20:00' }
  }
}

export const scheduleReminder = async (
  accountId: string | undefined,
  value: ReminderValue,
) => {
  const next = { ...value, scheduleVersion: CHECK_IN_REMINDER_VERSION }
  localStorage.setItem(
    accountStorageKey(accountId, 'gentle-reminder'),
    JSON.stringify(next),
  )
  if (!Capacitor.isNativePlatform()) return next
  await LocalNotifications.cancel({
    notifications: Array.from({ length: 7 }, (_, index) => ({
      id: 4200 + index,
    })),
  })
  if (!next.enabled) return next
  const permission = await LocalNotifications.requestPermissions()
  if (permission.display !== 'granted') return next
  const [hour, minute] = next.time.split(':').map(Number)
  await LocalNotifications.schedule({
    notifications: Array.from({ length: 7 }, (_, index) => ({
      id: 4200 + index,
      title: CHECK_IN_REMINDER_TITLE,
      body: CHECK_IN_REMINDER_BODY,
      extra: checkInReminderExtra,
      schedule: { on: { weekday: index + 1, hour, minute }, repeats: true },
    })),
  })
  return next
}

export const reminderRouteFromExtra = (
  extra: Record<string, unknown> | undefined,
): string | null => {
  if (extra?.purpose !== 'daily-check-in') return null
  const route = extra.route
  if (typeof route !== 'string' || !route.startsWith('/') || route.startsWith('//'))
    return null
  return route
}
