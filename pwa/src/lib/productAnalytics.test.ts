import { describe, expect, it } from 'vitest'

import {
  countBand,
  sanitizeAnalyticsPayload,
  screenNameForPath,
  wellnessBand,
} from './productAnalytics'

describe('privacy-safe product analytics', () => {
  it('uses coarse wellness and observation bands', () => {
    expect(wellnessBand(0)).toBe(0)
    expect(wellnessBand(57)).toBe(5)
    expect(wellnessBand(100)).toBe(9)
    expect(countBand(0)).toBe(0)
    expect(countBand(17)).toBe(4)
    expect(countBand(200)).toBe(6)
  })

  it('maps URLs without retaining identifiers or query strings', () => {
    expect(screenNameForPath('/person/private-id')).toBe('person')
    expect(screenNameForPath('/reports')).toBe('reports')
    expect(screenNameForPath('/unknown/private-value')).toBe('other')
  })

  it('drops arbitrary properties at the analytics boundary', () => {
    const payload = sanitizeAnalyticsPayload('check_in_saved', {
      mode: 'created',
      selectedSignalCountBand: 3,
      selectedEventCountBand: 1,
      hasNote: true,
      note: 'must never leave the device',
      personName: 'Private',
    } as never)

    expect(payload).toEqual({
      mode: 'created',
      selectedSignalCountBand: 3,
      selectedEventCountBand: 1,
      hasNote: true,
    })
    expect(JSON.stringify(payload)).not.toContain('Private')
  })

  it('clamps malformed profile values and strips identifiers', () => {
    const payload = sanitizeAnalyticsPayload('household_profile', {
      peopleCount: 200,
      selfTracked: true,
      profiles: [
        {
          role: 'child',
          wellnessBand: 100,
          strain: 'sustained',
          observationCountBand: 100,
          personId: 'private-id',
        },
      ],
    } as never)

    expect(payload.peopleCount).toBe(20)
    expect(payload.profiles[0]).toEqual({
      role: 'child',
      wellnessBand: 9,
      strain: 'sustained',
      observationCountBand: 6,
    })
  })
})
