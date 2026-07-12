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
    eventCount: 0,
  }))
}

describe('findTurningPoints', () => {
  it('detects a sustained rise in well-being and where it started', () => {
    const tps = findTurningPoints(
      household([45, 45, 45, 45, 45, 72, 72, 72, 72, 72, 72, 72]),
    )
    const rise = tps.find((t) => t.type === 'sustainedIncrease')
    expect(rise).toBeDefined()
    expect(rise!.beforeAverage).toBe(45)
    expect(rise!.afterAverage).toBe(72)
    expect(rise!.durationDays).toBeGreaterThanOrEqual(3)
    expect(rise!.summary).toMatch(/improved|hopeful/i)
  })

  it('classifies a rise from a low level as a recovery', () => {
    const tps = findTurningPoints(
      household([30, 30, 30, 30, 30, 60, 60, 60, 60, 60, 60, 60]),
    )
    expect(tps.some((t) => t.type === 'recovery')).toBe(true)
  })

  it('detects a one-day dip that bounces back', () => {
    const tps = findTurningPoints(household([70, 70, 70, 35, 70, 70, 70]))
    const spike = tps.find((t) => t.type === 'spike')
    expect(spike).toBeDefined()
    expect(spike!.durationDays).toBe(1)
    expect(spike!.afterAverage).toBe(35)
  })

  it('flags a gradual multi-day slide even when one day bucks it', () => {
    // Steady decline ~80 → 50 over ~13 days, with a single blip up on day 6.
    const tps = findTurningPoints(
      household([80, 78, 75, 72, 70, 78, 66, 63, 60, 57, 54, 51, 50, 50]),
    )
    const decline = tps.find((t) => t.type === 'sustainedDecrease')
    expect(decline).toBeDefined()
    expect(decline!.beforeAverage).toBeGreaterThan(decline!.afterAverage)
    expect(decline!.durationDays).toBeGreaterThanOrEqual(8)
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
