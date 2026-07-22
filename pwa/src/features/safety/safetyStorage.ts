export interface SafetySettings {
  country: 'US' | 'CA' | 'GB' | 'AU' | 'OTHER'
  trustedContact: string
  trustedPhone: string
  safePlace: string
  calmingSteps: string
}

const KEY = 'tendergrove:safety-plan'

export const DEFAULT_SAFETY_SETTINGS: SafetySettings = {
  country: 'US',
  trustedContact: '',
  trustedPhone: '',
  safePlace: '',
  calmingSteps: '',
}

export const readSafetySettings = (): SafetySettings => {
  try {
    return { ...DEFAULT_SAFETY_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULT_SAFETY_SETTINGS
  }
}

export const writeSafetySettings = (value: SafetySettings): void =>
  localStorage.setItem(KEY, JSON.stringify(value))
