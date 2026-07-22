import { describe, expect, it } from 'vitest'
import { containsUrgentSafetySignal } from './safety'

describe('containsUrgentSafetySignal', () => {
  it('recognizes urgent safety language without requiring an exact phrase', () => {
    expect(containsUrgentSafetySignal(['Reported hallucinations this evening'])).toBe(true)
    expect(containsUrgentSafetySignal(['I cannot stay safe tonight'])).toBe(true)
  })

  it('does not classify ordinary difficult observations as emergencies', () => {
    expect(containsUrgentSafetySignal(['Poor sleep', 'School refusal'])).toBe(false)
  })
})
