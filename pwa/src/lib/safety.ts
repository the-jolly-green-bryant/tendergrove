export const URGENT_SAFETY_TERMS = [
  'suicid',
  'self harm',
  'self-harm',
  'hurt myself',
  'hurt themself',
  'hurt himself',
  'hurt herself',
  'cannot stay safe',
  "can't stay safe",
  'violence',
  'violent',
  'psychosis',
  'psychotic',
  'hallucinat',
] as const

export const containsUrgentSafetySignal = (values: string[]): boolean => {
  const normalized = values.join(' ').toLowerCase()
  return URGENT_SAFETY_TERMS.some((term) => normalized.includes(term))
}
