export interface SafetySettings {
  country: 'US' | 'CA' | 'GB' | 'AU' | 'OTHER'
  trustedContact: string
  trustedPhone: string
  safePlace: string
  calmingSteps: string
}

import { accountStorageKey } from '../../lib/accountStorage'

export const DEFAULT_SAFETY_SETTINGS: SafetySettings = {
  country: 'US',
  trustedContact: '',
  trustedPhone: '',
  safePlace: '',
  calmingSteps: '',
}

export const readSafetySettings = (accountId?: string): SafetySettings => {
  try {
    return { ...DEFAULT_SAFETY_SETTINGS, ...JSON.parse(localStorage.getItem(accountStorageKey(accountId, 'safety-plan')) ?? '{}') }
  } catch {
    return DEFAULT_SAFETY_SETTINGS
  }
}

export const writeSafetySettings = (accountId: string | undefined, value: SafetySettings): void =>
  localStorage.setItem(accountStorageKey(accountId, 'safety-plan'), JSON.stringify(value))
