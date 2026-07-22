import { accountStorageKey } from '../../lib/accountStorage'

export interface ReportPin {
  id: string
  personId: string | null
  text: string
  addedAt: string
}

const key = (accountId?: string) => accountStorageKey(accountId, 'appointment-report-pins')

export const readReportPins = (accountId?: string): ReportPin[] => {
  try {
    return JSON.parse(localStorage.getItem(key(accountId)) ?? '[]') as ReportPin[]
  } catch {
    return []
  }
}

export const addReportPin = (
  accountId: string | undefined,
  pin: Omit<ReportPin, 'addedAt'>,
): ReportPin[] => {
  const current = readReportPins(accountId).filter((item) => item.id !== pin.id)
  const next = [...current, { ...pin, addedAt: new Date().toISOString() }]
  localStorage.setItem(key(accountId), JSON.stringify(next))
  return next
}

export const removeReportPin = (accountId: string | undefined, id: string): ReportPin[] => {
  const next = readReportPins(accountId).filter((item) => item.id !== id)
  localStorage.setItem(key(accountId), JSON.stringify(next))
  return next
}
