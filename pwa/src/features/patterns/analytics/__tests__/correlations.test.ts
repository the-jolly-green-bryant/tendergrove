import { describe, expect, it } from 'vitest'

import { findCorrelations } from '../correlations'
import { checkIn, indicator, iso, person } from './fixtures'

describe('findCorrelations', () => {
  const sleep = indicator('undesired', 'poor sleep', { id: 'sleep' })
  const dysreg = indicator('undesired', 'dysregulation', { id: 'dysreg' })

  it('surfaces a strong next-day relationship and not its (absent) reverse', () => {
    // Poor sleep on days 1,5,9,13,17; dysregulation the day AFTER each (except last).
    const sleepDays = [1, 5, 9, 13, 17]
    const dysregDays = [2, 6, 10, 14]
    const checkIns = [
      ...sleepDays.map((d) => checkIn(iso(2025, 5, d), [sleep.id])),
      ...dysregDays.map((d) => checkIn(iso(2025, 5, d), [dysreg.id])),
    ]
    const p = person('p1', {
      displayName: 'Child A',
      indicators: [sleep, dysreg],
      checkIns,
    })

    const results = findCorrelations([p])
    const link = results.find(
      (c) => c.sourceLabel === 'poor sleep' && c.targetLabel === 'dysregulation',
    )

    expect(link).toBeDefined()
    expect(link!.lagDays).toBe(1)
    expect(link!.opportunities).toBe(5)
    expect(link!.occurrences).toBe(4)
    expect(link!.ratio).toBeCloseTo(0.8)
    expect(link!.confidence).toBe('high')
    // Non-causal wording only.
    expect(link!.summary).toMatch(/appears|worth watching/i)
    expect(link!.summary).not.toMatch(/caus|diagnos|treat/i)

    // The reverse (dysregulation → poor sleep) never happens, so it's dropped.
    const reverse = results.find(
      (c) => c.sourceLabel === 'dysregulation' && c.targetLabel === 'poor sleep',
    )
    expect(reverse).toBeUndefined()
  })

  it('drops weak links below the conservative threshold', () => {
    // Sleep 5 times, dysregulation follows only once → ratio 0.2, dropped.
    const checkIns = [
      ...[1, 3, 5, 7, 9].map((d) => checkIn(iso(2025, 5, d), [sleep.id])),
      checkIn(iso(2025, 5, 2), [dysreg.id]),
    ]
    const p = person('p1', { indicators: [sleep, dysreg], checkIns })
    expect(findCorrelations([p])).toHaveLength(0)
  })

  it('returns nothing with too little data', () => {
    const p = person('p1', {
      indicators: [sleep, dysreg],
      checkIns: [checkIn(iso(2025, 5, 1), [sleep.id])],
    })
    expect(findCorrelations([p])).toHaveLength(0)
  })
})
