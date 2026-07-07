import { describe, expect, it } from 'vitest'

import { findTurningPoints } from '../turningPoints'
import type { DailyHouseholdScore } from '../types'

function household(scores: (number | null)[]): DailyHouseholdScore[] {
  return scores.map((score, i) => ({
    date: `2025-05-${String(i + 1).padStart(2, '0')}`,
    score,
    contributingPeople: score === null ? 0 : 1,
    checkInCount: score === null ? 0 : 1,
    incidentCount: 0,
    positiveCount: 0,
    negativeCount: 0,
  }))
}

describe('findTurningPoints', () => {
  it('detects a sustained increase and where it started', () => {
    const tps = findTurningPoints(
      household([45, 45, 45, 45, 45, 72, 72, 72, 72, 72, 72, 72]),
    )
    const rise = tps.find((t) => t.type === 'sustainedIncrease')
    expect(rise).toBeDefined()
    expect(rise!.beforeAverage).toBe(45)
    expect(rise!.afterAverage).toBe(72)
    expect(rise!.durationDays).toBeGreaterThanOrEqual(3)
    expect(rise!.summary).toMatch(/rose|watching/i)
  })

  it('classifies a drop from an elevated level as a recovery', () => {
    const tps = findTurningPoints(
      household([70, 70, 70, 70, 70, 45, 45, 45, 45, 45, 45, 45]),
    )
    expect(tps.some((t) => t.type === 'recovery')).toBe(true)
  })

  it('detects a one-day spike that returns to baseline', () => {
    const tps = findTurningPoints(household([30, 30, 30, 65, 30, 30, 30]))
    const spike = tps.find((t) => t.type === 'spike')
    expect(spike).toBeDefined()
    expect(spike!.durationDays).toBe(1)
    expect(spike!.afterAverage).toBe(65)
  })

  it('ignores small wobble', () => {
    expect(
      findTurningPoints(household([50, 52, 48, 51, 49, 50, 53, 47, 50, 51])),
    ).toHaveLength(0)
  })

  it('returns nothing with too little data', () => {
    expect(findTurningPoints(household([50, 60, 70]))).toHaveLength(0)
  })
})
